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
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["renter", "owner", "admin" , "Agent"],
      default: "renter",
    },
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
