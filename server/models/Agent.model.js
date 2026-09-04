const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');

const AgentSchema = new mongoose.Schema({
  // --- Personal Information ---
  name: { type: String, required: true },
  email: { type: String },
  mobileNumber: { type: String, required: true , unique: true },
  profilePhoto: { type: String },     // URL
  idProof: { type: String },          // URL
  idProofType: { type: String, enum: ["aadhar", "pan", "rera", "other"], default: "other" },
  idProofNumber: { type: String },

  // --- Access / Login ---
  agentCode: { type: String, required: true, unique: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
  lastLoginAt: { type: Date },
  dob: {
  type: Date,
  required: true
},

  // --- Professional Information ---
  agentType: {
    type: String,
    enum: ["individual", "agency", "builder-rep"],
    default: "individual"
  },
  agencyName: { type: String },
  experienceYears: { type: Number },
  reraNumber: { type: String },

  // --- Expertise ---
  sectorsCovered: [{ type: String }],        // e.g. ["Sector 57", "DLF 4"]
  preferredSectors: [{ type: String }],    // more explicit preferred sectors
  propertyTypes: [{ type: String }],       // e.g. ["rental", "sale"]
  specializations: [{ type: String }],     // e.g. ["builder floors", "luxury", "plots"]
  preferredBHK: [{ type: String }],        // e.g. ["1BHK","2BHK","3BHK"]
  preferredBudgetRange: {
    min: { type: Number },
    max: { type: Number }
  },
  languagesSpoken: [{ type: String }],

  // --- Lead/Performance & Reputation ---
  rating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  verifiedDeals: { type: Number, default: 0 },
  clientReviews: [
    {
      rating: Number,
      review: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  // store assigned preference ids as an array of ObjectIds (safe for multiple assignments)
  leadsAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserPreferenceForm' }],
  totalLeadsAssigned: { type: Number, default: 0 },
  totalLeadsClosed: { type: Number, default: 0 },
  responseTimeAvg: { type: Number, default: 0 }, // in minutes

  // --- Agency / Team Support ---
  parentAgencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }],

  // --- Monetization / Subscription ---
  planType: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  credits: { type: Number, default: 0 },
  subscriptionExpiresAt: { type: Date },
  leadLimit: { type: Number, default: 10 },

  // --- Social / Contact ---
  whatsappNumber: { type: String },
  linkedin: { type: String },
  instagram: { type: String },

  // --- Bio & Profile ---
  bio: { type: String, maxlength: 1000 },

  // --- Verification Workflow ---
  verificationStatus: {
    type: String,
    enum: ['pending', 'documents_submitted', 'interview_pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNotes: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin id or user id
  verifiedAt: { type: Date },

  // --- Availability & Preferences ---
  availability: {
    days: [{ type: String }], // e.g., ['Mon','Tue']
    timeFrom: { type: String }, // e.g., '09:00'
    timeTo: { type: String }
  },


  // --- Audit & Metadata ---
    score: { type: Number, default: 0 },
  visibilityStatus: { type: String,  default: '0' },
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
  unique: true,
  sparse: true
},
  // Tokens
  AccessTokenAgent: { type: String },
  RefreshTokenAgent: { type: String }
}, { timestamps: true });

// Optional text index for searching agents by name/areas/sectors (create in DB when ready)
// AgentSchema.index({ name: 'text', areasCovered: 'text', preferredSectors: 'text' });


// 🔑 Generate Access Token
AgentSchema.methods.getAccessToken = function () {
  const secret =
    process.env.ACCESS_TOKEN_AGENT_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  const expiresIn =
    process.env.ACCESS_TOKEN_AGENT_EXPIRE ||
    process.env.ACCESS_TOKEN_EXPIRE ||
    "1h";

  return jwt.sign(
    {
      agentId: this._id,
      userId: this.userId,
      role: "Agent"
    },
    secret,
    { expiresIn }
  );
};

AgentSchema.methods.getRefreshToken = function () {
  const secret =
    process.env.REFRESH_TOKEN_AGENT_SECRET ||
    process.env.REFRESH_TOKEN_SECRET ||
    process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  const expiresIn =
    process.env.REFRESH_TOKEN_AGENT_EXPIRE ||
    process.env.REFRESH_TOKEN_EXPIRE ||
    "7d";

  return jwt.sign(
    {
      agentId: this._id,
      userId: this.userId,
      role: "Agent"
    },
    secret,
    { expiresIn }
  );
};


module.exports = mongoose.model("Agent", AgentSchema);