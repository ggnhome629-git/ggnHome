/**
 * Payment Controller
 * ------------------
 * Handles payment-related operations for rental and sale properties,
 * including creation of new payments and retrieval of payments for users.
 * Integrates with RentalProperty and SaleProperty models to ensure
 * payments are associated with valid properties.
 */

const Payment = require("../models/Payment.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");


// ========================================================================
// Payment Creation Controller
// ========================================================================
exports.createPayment = async (req, res) => {
  // -------------------------------
  // 1. Extract and group constants
  // -------------------------------
  const {
    propertyId,
    amount,
    paymentMethod = "online",
    referenceNumber,
    notes,
  } = req.body;
  // Resident user id (populated by auth middleware)
  const residentId = req.user._id;

  try {
    // -----------------------------------------------------
    // 2. Validate required fields (propertyId, amount)
    // -----------------------------------------------------
    if (!propertyId || !amount) {
      return res
        .status(400)
        .json({ message: "Property ID and amount are required" });
    }

    // -----------------------------------------------------
    // 3. Check if property exists in RentalProperty first
    // -----------------------------------------------------
    let property = await RentalProperty.findById(propertyId);
    let propertyType = "rental";

    // -----------------------------------------------------
    // 4. If not found in rental, check in SaleProperty
    // -----------------------------------------------------
    if (!property) {
      property = await SaleProperty.findById(propertyId);
      propertyType = "sale";
    }

    // -----------------------------------------------------
    // 5. If property still not found, return error
    // -----------------------------------------------------
    if (!property) {
      return res.status(404).json({ message: "Property not found in rental or sale properties" });
    }

    // -----------------------------------------------------
    // 6. Create the payment record with all relevant info
    // -----------------------------------------------------
    const payment = new Payment({
      property: propertyId,        // Can be rental or sale property
      propertyType,                // "rental" or "sale"
      resident: residentId,        // User making the payment
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      status: "pending",           // Default payment status
    });

    // -----------------------------------------------------
    // 7. Save the payment to the database
    // -----------------------------------------------------
    const savedPayment = await payment.save();

    // -----------------------------------------------------
    // 8. Respond with success and the saved payment details
    // -----------------------------------------------------
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: savedPayment,
    });
  } catch (err) {
    // -----------------------------------------------------
    // 9. Generic error handling for server or DB errors
    // -----------------------------------------------------
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================================================
// Get Payments for a User Controller
// ========================================================================
exports.getPaymentsForUser = async (req, res) => {
  // -------------------------------
  // 1. Group constants
  // -------------------------------
  const residentId = req.user._id;

  try {
    // -----------------------------------------------------
    // 2. Find all payments for the current user, populate property details
    // -----------------------------------------------------
    const payments = await Payment.find({ resident: residentId })
      .populate({
        path: "property",
        select: "address monthlyRent price",
      })
      .sort({ paymentDate: -1 });

    // -----------------------------------------------------
    // 3. Respond with the payments array
    // -----------------------------------------------------
    res.status(200).json(payments);
  } catch (err) {
    // -----------------------------------------------------
    // 4. Generic error handling
    // -----------------------------------------------------
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================================================
// Exported Controller Functions
// ========================================================================
