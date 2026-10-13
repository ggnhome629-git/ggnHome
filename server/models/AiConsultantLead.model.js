const mongoose = require("mongoose");

/**
 * A confirmed enquiry from the AI Property Consultant: the user's structured
 * preferences, the listings that matched, consented contact details and the
 * follow-up workflow shared by the admin panel and PartnerHub.
 *
 * Drafts are never stored — a document is created only when the user reviews
 * the summary, ticks consent and presses Submit. `idempotencyKey` makes a
 * retried submit return the same lead instead of creating a duplicate.
 */
const STATUSES = ["submitted", "pending_assignment", "assigned", "contacted", "viewing_scheduled", "converted", "closed", "lost"];

const matchSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    listingType: { type: String, enum: ["rental", "sale"], required: true },
    score: { type: Number, min: 0, max: 100 },
    title: { type: String, trim: true, maxlength: 200 },
    sector: { type: String, trim: true, maxlength: 120 },
    price: { type: Number, min: 0 },
    partnerAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    byType: { type: String, enum: ["admin", "partner", "system"], required: true },
    byId: { type: mongoose.Schema.Types.ObjectId, default: null },
    byName: { type: String, trim: true, maxlength: 120 },
    status: { type: String, enum: STATUSES },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const aiConsultantLeadSchema = new mongoose.Schema(
  {
    leadRef: { type: String, required: true, unique: true, trim: true },
    idempotencyKey: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    mode: { type: String, enum: ["rent", "sale", null], default: null, index: true },
    requirements: {
      sectors: [{ type: String, trim: true }],
      localities: [{ type: String, trim: true }],
      anywhere: { type: Boolean, default: false },
      locationScope: { type: String, enum: ["strict", "nearby", null], default: null },
      budgetMin: { type: Number, min: 0, default: null },
      budgetMax: { type: Number, min: 0, default: null },
      budgetApprox: { type: Boolean, default: false },
      budgetFlexible: { type: Boolean, default: false },
      budgetStretch: { type: Boolean, default: false },
      bhk: [{ type: Number, min: 0, max: 10 }],
      bhkPlus: { type: Boolean, default: false },
      propertyTypes: [{ type: String, trim: true }],
      furnishing: { type: String, default: null },
      moveInDays: { type: Number, default: null },
      moveInLabel: { type: String, default: null },
      occupancy: { type: String, default: null },
      people: { type: Number, default: null },
      pets: { type: Boolean, default: null },
      minAreaSqft: { type: Number, default: null },
      possession: { type: String, default: null },
      purpose: { type: String, default: null },
      // The seven property parameters: six nearby distances + corner/middle.
      priorities: [
        {
          _id: false,
          category: { type: String, enum: ["market", "metro", "hospital", "school", "park", "mall"] },
          maxMeters: { type: Number, default: null },
        },
      ],
      corner: { type: String, enum: ["corner", "middle", "any", null], default: null },
    },
    summaryText: { type: String, trim: true, maxlength: 2000 },
    contact: {
      name: { type: String, trim: true, maxlength: 60, required: true },
      phone: { type: String, trim: true, required: true, match: /^[6-9]\d{9}$/ },
      email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    },
    consent: {
      given: { type: Boolean, required: true },
      text: { type: String, required: true, maxlength: 600 },
      at: { type: Date, required: true },
    },
    matches: { type: [matchSchema], default: [] },
    language: { type: String, enum: ["en", "hinglish", "hi"], default: "en" },
    aiAssisted: { type: Boolean, default: false },
    transcript: {
      type: [{ _id: false, role: { type: String, enum: ["user", "assistant"] }, text: { type: String, maxlength: 600 } }],
      default: [],
    },
    // "captured": phone confirmed by a guest before the property search; "enquiry": full reviewed request.
    stage: { type: String, enum: ["captured", "enquiry"], default: "enquiry", index: true },
    status: { type: String, enum: STATUSES, default: "submitted", index: true },
    assignedPartners: [{ type: mongoose.Schema.Types.ObjectId, ref: "Agent", index: true }],
    assignment: {
      by: { type: String, enum: ["auto", "admin", "claim", null], default: null },
      at: { type: Date, default: null },
    },
    followUps: { type: [followUpSchema], default: [] },
  },
  { timestamps: true }
);

aiConsultantLeadSchema.index({ createdAt: -1 });
aiConsultantLeadSchema.index({ status: 1, createdAt: -1 });
aiConsultantLeadSchema.index({ "requirements.sectors": 1 });

aiConsultantLeadSchema.statics.STATUSES = STATUSES;
aiConsultantLeadSchema.statics.MAX_PARTNERS = 3;

module.exports = mongoose.model("AiConsultantLead", aiConsultantLeadSchema);
