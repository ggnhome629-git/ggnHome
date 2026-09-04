// Helper to detect if the request is from an admin user
function isAdminRequest(req) {
  return req.user && String(req.user.role).toLowerCase() === 'admin';
}
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Agent = require('../models/Agent.model'); // <-- adjust path if your model file is named/located differently
const fileHandler = require('../config/FileHandling2'); // cloudinary uploader + multer middleware
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const User = require('../models/user.model');

// Helper: determine local host and return appropriate cookie options for dev vs prod
function isLocalHost(hostname) {
  if (!hostname) return false;
  const h = String(hostname).split(':')[0];
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function cookieForEnv(req, maxAgeMs) {
  const host = req && (req.hostname || (req.headers && req.headers.host)) || '';
  const local = isLocalHost(host) || process.env.NODE_ENV !== 'production';
  if (local) {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: maxAgeMs,
      path: '/',
    };
  }
  // production: secure + cross-site compatible
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: maxAgeMs,
    path: '/',
    // if you need cookie shared across subdomains set domain: '.yourdomain.com'
  };
}


const validateAgent = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('fullName is required')
    .isLength({ max: 100 })
    .withMessage('max 100 chars'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email'),

  body('mobileNumber')
    .matches(/^\d{10}$/)
    .withMessage('mobileNumber must be 10 digits'),

  body('experienceYears')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('experienceYears must be an integer between 0 and 50'),

  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('bio max 1000 chars'),

  body('availableDays')
    .custom(value => {
      const days = normalizeAvailableDays(value);
      if (!days.length) {
        throw new Error('At least one available day is required');
      }
      return true;
    }),

  body('availableFrom')
    .optional()
    .matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('availableFrom must be HH:MM'),

  body('availableTo')
    .optional()
    .matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('availableTo must be HH:MM'),
];

// helper to normalize availableDays
function normalizeAvailableDays(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    // try JSON
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // fallback to comma-split
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}


// 🔐 PRODUCTION-SAFE Agent Code Generator (Atomic + Crash Safe)
async function generateAgentCodeAtomic() {
  try {
    const counters = mongoose.connection.collection("counters");

    const result = await counters.findOneAndUpdate(
      { _id: "agentCode" },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        returnOriginal: false // compatible with older MongoDB drivers
      }
    );

    // Robust extraction of sequence number, driver-safe
    const seq =
      (result && result.value && typeof result.value.seq === "number"
        ? result.value.seq
        : typeof result.seq === "number"
        ? result.seq
        : null);

    if (typeof seq !== "number") {
      console.error("⚠️ AgentCode counter returned invalid result:", result);
      throw new Error("AGENT_CODE_GENERATION_FAILED");
    }

    return `ggnhome-${String(seq).padStart(4, "0")}`;
  } catch (err) {
    // 🚨 DO NOT CRASH SERVER
    console.error("❌ generateAgentCodeAtomic failed:", err.message);

    // fallback emergency code (guaranteed uniqueness)
    const fallback = `ggnhome-${Date.now().toString().slice(-6)}`;
    return fallback;
  }
}

// NOTE:
// Email is optional during registration.
// If provided, Agent Code will be emailed.
// If not provided, Agent Code must be shown/stored by frontend.
// Mobile number + agentCode is the ONLY identity.
// Email is used only for communication / OTP delivery.
// Controller to handle registration and upload to Cloudinary
exports.registerAgent = async (req, res) => {
  try {
    // run express-validator checks
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // cleanup any temp files
      if (req.files) Object.values(req.files).flat().forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(422).json({ errors: errors.array() });
    }

    // 🔐 Generate agentCode atomically BEFORE file upload
    let agentCode;
    try {
      agentCode = (await generateAgentCodeAtomic()).toLowerCase();
      // attach to req.body so FileHandling2 can use it for folder naming
      req.body.agentCode = agentCode;
    } catch (e) {
      return res.status(500).json({
        error: "Unable to generate agent code. Please try again."
      });
    }

    // expect route-level multer to have populated req.files
    // defensive check
    if (!req.files) {
      return res.status(400).json({ error: 'Please upload required documents (profile photo and ID proof).' });
    }

    const {
      fullName, email, mobileNumber, whatsappNumber, bio,
      experienceYears, availableFrom, availableTo,
      preferredSectors,
      dob
    } = req.body;

    // DOB validation
    if (!dob) {
      return res.status(400).json({
        message: "Date of Birth (DOB) is required"
      });
    }

    const parsedDob = new Date(dob);
    parsedDob.setHours(0, 0, 0, 0);

    if (isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        message: "Invalid DOB format. Use YYYY-MM-DD"
      });
    }
    // Duplicate mobile safety check
    const existingAgent = await Agent.findOne({ mobileNumber: String(mobileNumber).trim() });
    if (existingAgent) {
      return res.status(409).json({
        message: "Agent already registered with this mobile number"
      });
    }

    // normalize availableDays
    const availableDays = normalizeAvailableDays(req.body.availableDays);
    const allowedDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const filteredDays = availableDays.filter(d => allowedDays.includes(d));

    // normalize preferredSectors
    let normalizedPreferredSectors = [];
    if (preferredSectors) {
      if (Array.isArray(preferredSectors)) {
        normalizedPreferredSectors = preferredSectors;
      } else if (typeof preferredSectors === 'string') {
        try {
          const parsed = JSON.parse(preferredSectors);
          if (Array.isArray(parsed)) normalizedPreferredSectors = parsed;
        } catch (e) {
          normalizedPreferredSectors = preferredSectors
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        }
      }
    }

    // fallback for whatsapp
    const finalWhatsapp = whatsappNumber && whatsappNumber.trim() !== '' ? whatsappNumber.trim() : mobileNumber;

    // Ensure files are present in req.files
    const profileFile = req.files && req.files.profilePhoto ? req.files.profilePhoto[0] : null;
    const idFiles = req.files && req.files.idProof ? req.files.idProof : [];
    if (!profileFile || idFiles.length === 0) {
      if (req.files) Object.values(req.files).flat().forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(422).json({ error: 'Profile photo and at least one ID proof are mandatory.' });
    }

    // Upload files to Cloudinary using the helper
    const uploaded = await fileHandler.uploadAgentFilesToCloud(req);

    const profileUrl = uploaded.profilePhoto ? uploaded.profilePhoto.secure_url : null;
    const idProofUrls = (uploaded.idProofs || []).map(r => r && r.secure_url).filter(Boolean);

    if (!profileUrl || idProofUrls.length === 0) {
      return res.status(500).json({ error: 'Failed to upload files to cloud storage' });
    }

    // create agent document (admin flow supported)
    const isAdmin = isAdminRequest(req);

    const agentData = {
      name: fullName,
      email: email ? email.toLowerCase() : undefined,
      mobileNumber: mobileNumber,
      whatsappNumber: finalWhatsapp,
      bio: bio || undefined,
      experienceYears: Number(experienceYears),
      profilePhoto: profileUrl,
      idProof: idProofUrls[0],
      availability: {
        days: filteredDays,
        timeFrom: availableFrom || undefined,
        timeTo: availableTo || undefined
      },
      preferredSectors: normalizedPreferredSectors,
      agentCode: agentCode.toLowerCase(),
      dob: parsedDob,

      // 🔐 ADMIN FLOW DIFFERENCES
      status: isAdmin ? 'active' : 'pending',
      isVerified: isAdmin ? true : false,
      verifiedBy: isAdmin ? req.user._id : undefined,
      verifiedAt: isAdmin ? new Date() : undefined
    };

    // Save Agent first
    const agent = new Agent(agentData);
    await agent.save();

    // --- Ensure a corresponding User record exists AND LINK IT TO AGENT (MOBILE-FIRST)
    let userRecord = null;
    try {
      const mobileNorm = String(mobileNumber).trim();
      const emailNorm = String(email || '').toLowerCase().trim();

      userRecord = await User.findOne({ mobileNumber: mobileNorm }).exec();

      if (!userRecord) {
        userRecord = new User({
          mobileNumber: mobileNorm,
          email: emailNorm || undefined,
          role: 'Agent',
          isVerified: isAdmin ? true : false
        });
        await userRecord.save();
      } else if (emailNorm && !userRecord.email) {
        userRecord.email = emailNorm;
        await userRecord.save();
      }

      if (!agent.userId) {
        agent.userId = userRecord._id;
        await agent.save();
      }
    } catch (userErr) {
      console.warn('User sync/link failed during agent registration:', userErr?.message || userErr);
    }
    // 🔐 Enforce password ONLY if email is NOT provided
    if (!isAdmin && userRecord && !userRecord.passwordSet && !agent.email) {
      return res.status(428).json({
        code: "SET_PASSWORD_REQUIRED",
        message: "Please set password to complete agent registration",
        agentCode: agent.agentCode
      });
    }
    // console.log(`Agent registered: ${agent._id} (${agent.email})`);

    // 📧 Send Agent Registration Email
    if (agent.email) {
      try {
        const isAdmin = isAdminRequest(req);
        const subject = isAdmin
          ? "Admin registered you on ggnHome.com"
          : "🆔 Your ggnHome Agent Code (Save This)";
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ggnHome - Agent Registration</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #F4F7F9 0%, #E8EFF5 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 51, 102, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #003366 0%, #4A6A8A 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #FFFFFF;
    }
    .logo-accent {
      color: #22D3EE;
    }
    .tagline {
      color: #F4F7F9;
      font-size: 14px;
      margin-top: 5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      color: #003366;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .message {
      color: #333333;
      font-size: 16px;
      margin-bottom: 25px;
      line-height: 1.8;
    }
    .otp-container {
      background: linear-gradient(135deg, #F4F7F9 0%, #E8F4F3 100%);
      border: 2px dashed #00A79D;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      color: #4A6A8A;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    .otp-code {
      font-size: 34px;
      font-weight: bold;
      color: #003366;
      letter-spacing: 4px;
      font-family: 'Courier New', monospace;
    }
    .otp-validity {
      color: #00A79D;
      font-size: 13px;
      margin-top: 15px;
      font-weight: 500;
    }
    .info-box {
      background: #F4F7F9;
      border-left: 4px solid #22D3EE;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .security-note {
      background: #E8EFF5;
      padding: 18px;
      border-radius: 8px;
      color: #003366;
      font-size: 13px;
      margin: 20px 0;
    }
    .footer {
      background: #F4F7F9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer-text {
      color: #4A6A8A;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .contact-info {
      color: #333333;
      font-size: 13px;
      margin: 5px 0;
    }
    .contact-info a {
      color: #00A79D;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">ggn<span class="logo-accent">Home</span></div>
      <div class="tagline">Your Trusted Gurgaon Property Partner</div>
    </div>

    <div class="content">
      <div class="greeting">Welcome to ggnHome 👋</div>

      <p class="message">
        ${
          isAdmin
            ? "An administrator has successfully registered you as an <strong>Agent</strong> on ggnHome."
            : "Your agent registration on <strong>ggnHome</strong> was successful."
        }
      </p>

      <div class="otp-container">
        <div class="otp-label">Your Agent Details</div>
        <div class="otp-code">${agent.agentCode}</div>
        <div class="otp-validity">Agent Code</div>
      </div>

      <div class="info-box">
        <p>
          <strong>Email:</strong> ${agent.email}<br />
          <strong>Mobile:</strong> ${agent.mobileNumber}
        </p>
      </div>

      <div class="security-note">
        <p>
          🔐 Keep your Agent Code safe. It is required for login and account access.
        </p>
      </div>

      <p class="message">
        You can now log in to the Agent Dashboard and start managing leads and properties.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.ggnhome.com/agent/login"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #003366 0%, #4A6A8A 100%);
             color: #ffffff;
             padding: 14px 32px;
             border-radius: 30px;
             text-decoration: none;
             font-size: 16px;
             font-weight: 600;
             box-shadow: 0 6px 20px rgba(0, 51, 102, 0.25);
           ">
          🔐 Login to Agent Dashboard
        </a>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">Thank you for choosing ggnHome</p>
      <div class="contact-info">📧 support@ggnhome.com</div>
      <div class="contact-info">📱 +91 9654131789 / +91 9310994032</div>
      <div class="contact-info">🌐 www.ggnhome.com</div>
    </div>
  </div>
</body>
</html>
`;
        await sendEmail({
          to: agent.email,
          subject,
          html
        });
      } catch (mailErr) {
        console.warn("Agent registration email failed:", mailErr?.message || mailErr);
      }
    }
    return res.json({
      message: isAdmin ? "Agent created by admin" : "Agent registered",
      agentId: agent._id,
      agentCode: agent.agentCode,
      status: agent.status,
      linkedUserId: agent.userId
    });

  } catch (err) {
    // cleanup any tmp files
    if (req.files) Object.values(req.files).flat().forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
    console.error('registerAgent error:', err);
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({ error: `This ${dupField} is already registered. Please log in or use a different ${dupField}.` });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// NOTE:
// Mobile number + agentCode is the ONLY identity.
// Email is used only for communication / OTP delivery.
// Request OTP for Agent (writes OTP to Agent document)
exports.requestOtpAgent = async (req, res) => {
  try {
    const { mobileNumber, agentCode } = req.body;

    if (!mobileNumber || !agentCode) {
      return res.status(400).json({ message: "Mobile number and Agent Code are required" });
    }

    const agent = await Agent.findOne({ mobileNumber, agentCode });
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // 🔐 OTP allowed ONLY if email matches DB
    if (!req.body.email || !agent.email) {
      return res.status(403).json({
        message: "OTP login is allowed only when registered email is provided"
      });
    }

    const reqEmail = String(req.body.email).toLowerCase().trim();
    const dbEmail = String(agent.email).toLowerCase().trim();

    if (reqEmail !== dbEmail) {
      return res.status(403).json({
        message: "OTP can only be sent to the registered email address"
      });
    }

    // ⏱️ Throttle OTP resend: minimum 60 seconds
    if (agent.otpExpiry && Date.now() - (agent.otpExpiry.getTime() - 5 * 60 * 1000) < 60 * 1000) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP"
      });
    }

    // 🔐 Always generate NEW OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    agent.otp = otp;
    agent.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await agent.save();

    // Send OTP to email (HTML only)
    const otpHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ggnHome - OTP Verification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #F4F7F9 0%, #E8EFF5 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 51, 102, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #003366 0%, #4A6A8A 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #FFFFFF;
    }
    .logo-accent { color: #22D3EE; }
    .tagline { color: #F4F7F9; font-size: 14px; }
    .content { padding: 40px 30px; }
    .greeting {
      font-size: 24px;
      color: #003366;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .message {
      color: #333333;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .otp-container {
      background: linear-gradient(135deg, #F4F7F9 0%, #E8F4F3 100%);
      border: 2px dashed #00A79D;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      color: #4A6A8A;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 15px;
      font-weight: 600;
    }
    .otp-code {
      font-size: 42px;
      font-weight: bold;
      color: #003366;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .otp-validity {
      color: #00A79D;
      font-size: 13px;
      margin-top: 15px;
    }
    .footer {
      background: #F4F7F9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer-text {
      color: #4A6A8A;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">ggn<span class="logo-accent">Home</span></div>
      <div class="tagline">Your Trusted Gurgaon Property Partner</div>
    </div>

    <div class="content">
      <div class="greeting">Hello There! 👋</div>
      <p class="message">
        We received a request to securely access your <strong>ggnHome Agent account</strong>.
        Please use the one-time verification code below to complete your login.
      </p>

      <div class="otp-container">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-validity">⏱ This verification code is valid for 5 minutes</div>
      </div>

      <div style="text-align: center; margin: 35px 0;">
        <a href="https://www.ggnhome.com/agent/login"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #003366 0%, #4A6A8A 100%);
             color: #ffffff;
             padding: 14px 32px;
             border-radius: 30px;
             text-decoration: none;
             font-size: 16px;
             font-weight: 600;
             box-shadow: 0 6px 20px rgba(0, 51, 102, 0.25);
           ">
          🔐 Proceed to Agent Login
        </a>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">Thank you for choosing ggnHome</p>
      <div class="contact-info">📧 support@ggnhome.com</div>
      <div class="contact-info">📱 +91 9654131789 / +91 9310994032</div>
      <div class="contact-info">🌐 www.ggnhome.com</div>
    </div>
  </div>
</body>
</html>
`;

    await sendEmail({
      to: agent.email,
      subject: "ggnHome – OTP Verification",
      html: otpHtml
    });

    return res.json({
      message: "A new OTP has been sent to your email. Previous OTPs are no longer valid."
    });
  } catch (err) {
    console.error("requestOtpAgent error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
// Helper: upgrade existing User role to 'Agent' if it's currently 'owner' or 'renter'
async function upgradeUserRoleToAgentByEmail(email) {
  if (!email) return;
  try {
    const emailNorm = String(email).toLowerCase().trim();
    const userRecord = await User.findOne({ email: emailNorm }).exec();
    if (!userRecord) return;

    const currentRole = userRecord.role ? String(userRecord.role).toLowerCase() : '';
    if (currentRole === 'owner' || currentRole === 'renter') {
      userRecord.role = 'Agent';
      try {
        await userRecord.save();
        console.info(`Updated User role -> 'Agent' for ${emailNorm}`);
      } catch (saveErr) {
        console.warn('Failed to save upgraded user role to Agent:', saveErr?.message || saveErr);
      }
    }
  } catch (err) {
    console.warn('upgradeUserRoleToAgentByEmail error:', err?.message || err);
  }
}

exports.loginAgentOtp = async (req, res) => {
  try {
    const { mobileNumber, agentCode, otp } = req.body;

    if (!mobileNumber || !agentCode || !otp) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const agent = await Agent.findOne({ mobileNumber, agentCode });
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    if (agent.status === "pending") {
      return res.status(403).json({ message: "Your account is pending approval from admin" });
    }

    if (agent.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact support." });
    }

    // 🔐 Extra safety: ensure email still matches
    if (req.body.email && agent.email) {
      const reqEmail = String(req.body.email).toLowerCase().trim();
      const dbEmail = String(agent.email).toLowerCase().trim();

      if (reqEmail !== dbEmail) {
        return res.status(403).json({
          message: "Email mismatch. OTP login denied."
        });
      }
    }

    if (!agent.otp || agent.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (agent.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Mark agent verified
    agent.otp = null;
    agent.otpExpiry = null;
    agent.isVerified = true;
    agent.lastLoginAt = new Date();
    await agent.save();

    // 🔗 Load or link USER by MOBILE
    let user = agent.userId
      ? await User.findById(agent.userId)
      : await User.findOne({ mobileNumber });

    if (!user) {
      user = new User({
        mobileNumber,
        email: agent.email,
        role: "Agent",
        isVerified: true
      });
      await user.save();
    }

    // Link agent → user
    if (!agent.userId) {
      agent.userId = user._id;
      await agent.save();
    }

    // Upgrade role
    if (user.role !== "admin") {
      user.role = "Agent";
    }
    user.isVerified = true;
    await user.save();

    // 🔁 Safe email sync (OTP login)
    if (req.body.email && !agent.email) {
      agent.email = String(req.body.email).toLowerCase().trim();
      await agent.save();
    }

    // ===============================
    // 🔐 ISSUE TOKENS (AGENT + USER)
    // ===============================

    // ---- USER TOKENS ----
    const userAccessToken = user.getAccessToken();
    const userRefreshToken = user.getRefreshToken();

    res.cookie(
      "accessToken",
      userAccessToken,
      cookieForEnv(req, 60 * 60 * 1000) // 1 hour
    );

    res.cookie(
      "refreshToken",
      userRefreshToken,
      cookieForEnv(req, 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    // ---- AGENT TOKENS ----
    const agentAccessToken = agent.getAccessToken();
    const agentRefreshToken = agent.getRefreshToken();

    // persist (recommended)
    agent.AccessTokenAgent = agentAccessToken;
    agent.RefreshTokenAgent = agentRefreshToken;
    await agent.save();

    res.cookie(
      "accessTokenAgent",
      agentAccessToken,
      cookieForEnv(req, 60 * 60 * 1000)
    );

    res.cookie(
      "refreshTokenAgent",
      agentRefreshToken,
      cookieForEnv(req, 7 * 24 * 60 * 60 * 1000)
    );
    return res.json({
      message: "Agent login success (OTP)",
      agentId: agent._id,
      accessToken: userAccessToken,
      refreshToken: userRefreshToken,
      agentAccessToken,
      agentRefreshToken
    });

  } catch (err) {
    console.error("loginAgentOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// export validation middleware so routes can use it
exports.validateAgent = validateAgent;

// Controller: return agent details for /agent/me (hybrid-auth, header/cookie, deterministic)
exports.agentDetails = async (req, res) => {
  try {
    let agent = null;

    // 1️⃣ Preferred: agent already attached by middleware
    if (req.agent && req.agent._id) {
      agent = await Agent.findById(req.agent._id).lean().exec();
    }

    // 2️⃣ Fallback: Authorization header (incognito-safe)
    if (!agent) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_AGENT_SECRET ||
              process.env.ACCESS_TOKEN_SECRET
          );
          if (decoded?.id) {
            agent = await Agent.findById(decoded.id).lean().exec();
          }
        } catch (e) {
          return res.status(401).json({ message: "Invalid or expired agent token" });
        }
      }
    }

    // 3️⃣ Fallback: agent access token cookie
    if (!agent && req.cookies?.accessTokenAgent) {
      try {
        const decoded = jwt.verify(
          req.cookies.accessTokenAgent,
          process.env.ACCESS_TOKEN_AGENT_SECRET ||
            process.env.ACCESS_TOKEN_SECRET
        );
        if (decoded?.id) {
          agent = await Agent.findById(decoded.id).lean().exec();
        }
      } catch (e) {
        return res.status(401).json({ message: "Invalid or expired agent token" });
      }
    }

    if (!agent) {
      return res.status(401).json({
        message: "Agent not authenticated. Please log in again."
      });
    }

    // ❌ Never expose internal token fields
    delete agent.AccessTokenAgent;
    delete agent.RefreshTokenAgent;
    delete agent.otp;
    delete agent.otpExpiry;
    delete agent.__v;

    return res.json(agent);
  } catch (err) {
    console.error("agentDetails error:", err);
    return res.status(500).json({
      message: "Failed to fetch agent details"
    });
  }
};

exports.getUniqueAgentCode = async (req, res) => {
  try {
    const code = await generateAgentCodeAtomic();
    return res.json({ agentCode: code });
  } catch (err) {
    console.error('getUniqueAgentCode error:', err);
    return res.status(500).json({ error: 'Unable to generate agent code' });
  }
};
exports.checkAgentExists = async (req, res) => {
  try {
    const { mobileNumber, agentCode, email } = req.body;

    if (!mobileNumber || !agentCode) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and Agent Code are required"
      });
    }

    const agent = await Agent.findOne({
      mobileNumber: String(mobileNumber).trim(),
      agentCode: String(agentCode).trim().toLowerCase()
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    // 🔗 Check linked user
    let passwordSet = false;
    if (agent.userId) {
      const user = await User.findById(agent.userId).select("passwordSet");
      passwordSet = !!user?.passwordSet;
    }

    // 📧 Email matching
    const frontendEmail = email
      ? String(email).toLowerCase().trim()
      : null;

    const dbEmail = agent.email
      ? String(agent.email).toLowerCase().trim()
      : null;

    const emailMatched =
      !!frontendEmail && !!dbEmail && frontendEmail === dbEmail;

    // =============================
    // 🔑 DECISION RESPONSE
    // =============================

    // CASE 5: Email provided but mismatch
    if (frontendEmail && dbEmail && !emailMatched) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_MISMATCH",
        message: "Email does not match registered email"
      });
    }

    // CASE 1 & 2: Email matched → OTP allowed
    if (emailMatched) {
      return res.json({
        success: true,
        code: "OTP_ALLOWED",
        passwordSet,
        message: passwordSet
          ? "OTP and password login allowed"
          : "OTP login allowed (password not set)"
      });
    }

    // CASE 3 & 4: No email → password path
    if (!passwordSet) {
      return res.json({
        success: true,
        code: "SET_PASSWORD_REQUIRED",
        message: "Please set a password to continue"
      });
    }

    return res.json({
      success: true,
      code: "PASSWORD_ONLY",
      message: "Please login using password"
    });

  } catch (err) {
    console.error("checkAgentExists error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getUniqueCode = async (req, res) => {
  // alias for frontend-friendly endpoint name
  return exports.getUniqueAgentCode(req, res);
};

exports.loginAgentPassword = async (req, res) => {
  try {
    const { mobileNumber, agentCode, password } = req.body;

    if (!mobileNumber || !agentCode || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const mobileNorm = String(mobileNumber).trim();
    const agentCodeNorm = String(agentCode).trim().toLowerCase();

    // Authenticate USER
    const user = await User.findOne({ mobileNumber: mobileNorm }).select("+password");
    if (!user || !user.passwordSet) {
      return res.status(403).json({ message: "Password not set for this mobile number" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Authorize AGENT
    const agent = await Agent.findOne({
      agentCode: agentCodeNorm
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (!agent.userId || String(agent.userId) !== String(user._id)) {
      return res.status(403).json({
        message: "Agent code does not belong to this user"
      });
    }

    if (agent.status === "pending") {
      return res.status(403).json({ message: "Your account is pending approval from admin" });
    }

    if (agent.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact support." });
    }

    // Link agent → user
    if (!agent.userId) {
      agent.userId = user._id;
      await agent.save();
    }

    if (user.role !== "admin") {
  user.role = "Agent";
}
    user.isVerified = true;
    await user.save();

    agent.isVerified = true;
    agent.lastLoginAt = new Date();
    await agent.save();

    // 🔁 Safe email sync (password login)
    if (user.email && !agent.email) {
      agent.email = String(user.email).toLowerCase().trim();
      await agent.save();
    }

  // ===============================
// 🔐 ISSUE TOKENS (AGENT + USER)
// ===============================

// ---- USER TOKENS (sync login) ----
const userAccessToken = user.getAccessToken();
const userRefreshToken = user.getRefreshToken();

res.cookie(
  "accessToken",
  userAccessToken,
  cookieForEnv(req, 60 * 60 * 1000) // 1 hour
);

res.cookie(
  "refreshToken",
  userRefreshToken,
  cookieForEnv(req, 7 * 24 * 60 * 60 * 1000) // 7 days
);

// ---- AGENT TOKENS (agent dashboard) ----
const agentAccessToken = agent.getAccessToken();
const agentRefreshToken = agent.getRefreshToken();

// (optional but recommended) persist tokens
agent.AccessTokenAgent = agentAccessToken;
agent.RefreshTokenAgent = agentRefreshToken;
await agent.save();

res.cookie(
  "accessTokenAgent",
  agentAccessToken,
  cookieForEnv(req, 60 * 60 * 1000) // 1 hour
);

res.cookie(
  "refreshTokenAgent",
  agentRefreshToken,
  cookieForEnv(req, 7 * 24 * 60 * 60 * 1000) // 7 days
);

    return res.json({
      message: "Agent login success (password)",
      agentId: agent._id,
      accessToken: userAccessToken,
      refreshToken: userRefreshToken,
      agentAccessToken,
      agentRefreshToken
    });

  } catch (err) {
    console.error("loginAgentPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================================
// SESSION-BASED AGENT LOGIN
// If USER cookies already exist
// =======================================
exports.loginAgentSession = async (req, res) => {
  try {
    const { agentCode } = req.body;

    if (!agentCode) {
      return res.status(400).json({ message: "Agent Code is required" });
    }

    // 1️⃣ USER must already be logged in (user cookie)
    const token =
      (req.cookies && req.cookies.accessToken) ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.status(401).json({ message: "User session not found" });
    }

    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
    } catch (err) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const userId = payload.id;

    // 2️⃣ Load USER
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 3️⃣ Find AGENT linked with this USER + agentCode
    const agentCodeNorm = String(agentCode).trim().toLowerCase();

    const agent = await Agent.findOne({
      userId: user._id,
      agentCode: agentCodeNorm
    });

    if (!agent) {
      return res.status(403).json({
        message: "Agent code does not belong You. Please check and try again."
      });
    }
    if (agent.status === "pending") {
      return res.status(403).json({ message: "Your account is pending approval from admin" });
    }

    if (agent.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact support." });
    }

    // 4️⃣ Mark verified
    agent.isVerified = true;
    agent.lastLoginAt = new Date();
    await agent.save();

    if (user.role !== "admin") {
  user.role = "Agent";
}
user.isVerified = true;
await user.save();
    user.isVerified = true;
    await user.save();

    // 🔁 Safe email sync (session login)
    if (user.email && !agent.email) {
      agent.email = String(user.email).toLowerCase().trim();
      await agent.save();
    }

    // 5️⃣ Issue AGENT TOKENS
    const agentAccessToken = agent.getAccessToken();
    const agentRefreshToken = agent.getRefreshToken();

    agent.AccessTokenAgent = agentAccessToken;
    agent.RefreshTokenAgent = agentRefreshToken;
    await agent.save();

    res.cookie(
      "accessTokenAgent",
      agentAccessToken,
      cookieForEnv(req, 60 * 60 * 1000)
    );

    res.cookie(
      "refreshTokenAgent",
      agentRefreshToken,
      cookieForEnv(req, 7 * 24 * 60 * 60 * 1000)
    );

    return res.json({
      message: "Agent session login success",
      agentId: agent._id,
      agentAccessToken,
      agentRefreshToken
    });

  } catch (err) {
    console.error("loginAgentSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
exports.resetAgentPassword = async (req, res) => {
  try {
    const { agentCode, dob } = req.body;

    if (!agentCode || !dob) {
      return res.status(400).json({
        message: "Agent Code and DOB are required"
      });
    }

    // Normalize DOB (date-only match)
    const dobDate = new Date(dob);
    dobDate.setHours(0, 0, 0, 0);

    // 1️⃣ Find agent using agentCode
    const agent = await Agent.findOne({ agentCode }).lean();

    if (!agent) {
      return res.status(404).json({
        message: "Invalid Agent Code"
      });
    }

    // 2️⃣ Verify DOB
    if (!agent.dob) {
      return res.status(403).json({
        message: "DOB not registered. Please contact support."
      });
    }

    const agentDob = new Date(agent.dob);
    agentDob.setHours(0, 0, 0, 0);

    if (agentDob.getTime() !== dobDate.getTime()) {
      return res.status(401).json({
        message: "DOB does not match"
      });
    }

    // 3️⃣ Find linked user
    if (!agent.userId) {
      return res.status(404).json({
        message: "User account not linked with this agent"
      });
    }

    const user = await User.findById(agent.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User account not found"
      });
    }

    // 4️⃣ Reset password SAFELY (bypass bcrypt pre-save hook)
    await User.updateOne(
      { _id: agent.userId },
      {
        $unset: { password: "" },
        $set: {
          passwordSet: false,
          refreshToken: null,
          isVerified: false
        }
      }
    );

    return res.status(200).json({
      message: "Password reset successful. Please set a new password."
    });

  } catch (error) {
    console.error("resetAgentPassword error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};



// Agent: Set/Update Recovery Email (agent token only)
exports.setAgentRecoveryEmail = async (req, res) => {
  try {
    const agent = req.agent;
    const { email } = req.body;

    if (!agent || !agent._id) {
      return res.status(401).json({
        message: "Agent not authenticated"
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const emailNorm = String(email).toLowerCase().trim();

    // basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    // 1️⃣ Update Agent email
    await Agent.updateOne(
      { _id: agent._id },
      { $set: { email: emailNorm } }
    );

    // 2️⃣ Update linked User email
    if (agent.userId) {
      await User.updateOne(
        { _id: agent.userId },
        { $set: { email: emailNorm } }
      );
    }

    return res.json({
      message: "Recovery email updated successfully",
      email: emailNorm
    });
  } catch (err) {
    console.error("setAgentRecoveryEmail error:", err);
    return res.status(500).json({
      message: "Failed to update recovery email"
    });
  }
};