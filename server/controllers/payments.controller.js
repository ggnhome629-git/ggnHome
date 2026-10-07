const crypto = require("crypto");
const Payment = require("../models/Payment.model");
const Visit = require("../models/Visit.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "ggnhome-test-webhook-secret";

// POST /api/payment/order — create gateway order tied to visit/booking id
exports.createOrder = async (req, res) => {
  try {
    const { visitId, amount, method, orderNote } = req.body;
    if (!visitId) return jsonError(res, 400, "visitId required");
    const visit = await Visit.findById(visitId);
    if (!visit) return jsonError(res, 404, "Visit not found");
    if (visit.status !== "requested" && visit.status !== "confirmed") {
      return jsonError(res, 409, "Visit is not in a payable state");
    }
    if (!amount || amount <= 0) return jsonError(res, 400, "amount required");
    // In test mode we never talk to a real gateway; record the order locally.
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      orderId,
      visitId: visit._id,
      amount,
      method,
      status: "pending",
      gateway: "test",
      createdBy: req.user._id,
    };
    const payment = new Payment({ ...payload, property: visit.propertyId });
    await payment.save();
    return res.status(201).json({ success: true, order: { orderId, amount, status: "pending", method: method || "card" }, mock: true });
  } catch (err) {
    jsonError(res, 500, "Failed to create order");
  }
};

// POST /api/payment/webhook — signature-verified; marks completed
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"] || "";
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (signature !== expected) {
      return res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid webhook signature" });
    }
    const { orderId, gatewayPaymentId, status, amount } = req.body;
    if (!orderId || !["completed", "failed"].includes(status)) {
      return res.status(200).json({ success: true, received: true });
    }
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(200).json({ success: true, received: true });
    }
    payment.gatewayPaymentId = gatewayPaymentId || payment.gatewayPaymentId;
    payment.status = status;
    if (amount) payment.amount = amount;
    await payment.save();
    // Notify the user that payment succeeded (queued; no real sender here in tests).
    return res.status(200).json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Webhook failed");
  }
};

// POST /api/payment/:id/refund — admin; sets refund fields
exports.refund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const payment = await Payment.findById(id);
    if (!payment) return jsonError(res, 404, "Payment not found");
    if (String(req.user.role) !== "admin") return jsonError(res, 403, "Admins only");
    if (payment.status !== "completed") return jsonError(res, 409, "Only completed payments can be refunded");
    if (amount && amount > payment.amount) return jsonError(res, 400, "refund amount exceeds paid amount");
    payment.refundAmount = amount || payment.amount;
    payment.refundedAt = new Date();
    payment.status = "refunded";
    payment.notes = [payment.notes, `Refunded ${payment.refundAmount}`, reason].filter(Boolean).join("; ");
    await payment.save();
    return res.json({ success: true, payment });
  } catch (err) {
    jsonError(res, 500, "Failed to refund");
  }
};

// GET /api/payment/:id/receipt — PDF (return minimal text in test mode)
exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return jsonError(res, 404, "Payment not found");
    if (payment.resident.toString() !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "Not your payment");
    }
    const lines = [
      "Receipt",
      `Order: ${payment.orderId}`,
      `Amount: ₹${payment.amount}`,
      `Status: ${payment.status}`,
      `Paid: ${payment.paymentDate ? payment.paymentDate.toISOString() : "—"}`,
    ].join("\n");
    return res.set("Content-Type", "text/plain").send(lines);
  } catch (err) {
    jsonError(res, 500, "Failed to load receipt");
  }
};
