const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
  type: String,
  unique: true,
  sparse: true
},
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    passwordSet: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String, // you can also use Number if you prefer
    },
    otpExpiry: {
      type: Date, // when OTP should expire
    },
    otpAttempts: {
      type: Number, // wrong guesses against the current OTP
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["renter", "owner", "admin" , "Agent"],
      default: "renter",
    },

    // Fields accepted by POST /api/user/save-details (userdetails.controller.js).
    // That endpoint has no current frontend caller, but was silently discarding
    // every one of these on every call -- findByIdAndUpdate ran against a
    // schema that didn't declare them, so Mongoose's default strict mode
    // dropped them all while the endpoint still replied 200 "updated
    // successfully". Declared here so the endpoint actually persists what it
    // already accepts, whenever it's wired up to the client.
    name: { type: String, trim: true },
    fullName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    alternateContact: { type: String, trim: true },
    address: { type: String, trim: true },
    propertyTypePreference: { type: String, trim: true },
    budgetMin: { type: Number },
    budgetMax: { type: Number },
    preferredLocations: { type: [String], default: undefined },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    furnishingPreference: { type: String, trim: true },
    transactionType: { type: String, trim: true },
    occupation: { type: String, trim: true },
    monthlyIncome: { type: Number },
    // Free-form bank/payment details -- never returned by any route today
    // (saveUserDetails strips it along with refreshToken/otp before
    // responding), but keep it out of the default-selected field set too so
    // a future query that forgets to .select() it doesn't start leaking it.
    bankPaymentInfo: { type: mongoose.Schema.Types.Mixed, select: false },
    governmentID: { type: String, trim: true, select: false },
    kycDocuments: { type: [String], default: undefined, select: false },
    consentNotifications: { type: Boolean, default: false },

    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    Rewards: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },

  },
  { timestamps: true }
);

const jwt = require("jsonwebtoken");

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  this.passwordSet = true;
  next();
});

// 🔑 Generate Access Token
userSchema.methods.getAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, name: this.name },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRE }
  );
};

// 🔑 Generate Refresh Token
userSchema.methods.getRefreshToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, name: this.name },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRE }
  );
};

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
