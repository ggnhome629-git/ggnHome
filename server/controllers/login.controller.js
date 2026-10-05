const User = require("../models/user.model");
const sendEmail = require("../utils/sendEmail"); // Import the sendEmail module
const jwt = require("jsonwebtoken");
const { sendOtpSms, isSmsConfigured } = require("../utils/sendSms");
const { hasOnlineDevice } = require("./smsGateway.controller");
const crypto = require("crypto");
const { generateCode, normalizeCode } = require("../utils/otpCode");

// Generate a random 4-letter login code
function generateOtp() {
  return generateCode();
}

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return "";
  const visible = name.slice(0, 1);
  return `${visible}***@${domain}`;
}

// ---- OTP helpers -------------------------------------------------------

const OTP_TTL_MS = 5 * 60 * 1000;
// Minimum gap between OTP sends to the same account, so SMS can't be spammed.
const OTP_RESEND_GAP_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function maskMobile(mobile) {
  const m = String(mobile || "");
  return m.length >= 4 ? `${"•".repeat(Math.max(m.length - 4, 0))}${m.slice(-4)}` : m;
}

// Tiny in-memory per-IP limiter for the OTP endpoint (SMS costs real quota).
const ipHits = new Map();
function tooManyFromIp(req) {
  // Behind Cloudflare/Render req.ip is the proxy, so prefer the forwarded client IP.
  const ip =
    req.headers["cf-connecting-ip"] ||
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.ip ||
    "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return hits.length > 15;
}

function otpEmailHtml(otp) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#F4F7F9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,51,102,0.10);">
    <div style="background:#003366;padding:20px 24px;">
      <img src="https://www.ggnhome.com/Logo2.jpg" alt="ggnHome" width="44" height="44" style="vertical-align:middle;border-radius:10px;background:#fff;">
      <span style="color:#fff;font-size:20px;font-weight:600;margin-left:12px;vertical-align:middle;">ggnHome</span>
    </div>
    <div style="padding:28px 24px;text-align:center;color:#1B2A3A;">
      <p style="margin:0 0 8px;font-size:16px;">Your login code is</p>
      <div style="font-size:38px;letter-spacing:10px;font-weight:700;color:#003366;margin:12px 0 18px;">${otp}</div>
      <p style="margin:0;color:#5B6B7B;font-size:14px;">Valid for 5 minutes. Never share this code with anyone &mdash; ggnHome will never ask for it.</p>
      <a href="https://www.ggnhome.com" style="display:inline-block;margin-top:24px;background:#00A79D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:24px;font-weight:600;">Open www.ggnhome.com</a>
    </div>
    <div style="padding:14px 24px;background:#F4F7F9;color:#8A98A5;font-size:12px;text-align:center;">
      Didn't request this? You can safely ignore this email.
    </div>
  </div>
</body></html>`;
}

async function sendOtpEmail(user, otp) {
  const emailParams = process.env.BREVO_OTP_TEMPLATE_ID
    ? {
        to: user.email,
        templateId: Number(process.env.BREVO_OTP_TEMPLATE_ID),
        params: { otp_code: otp },
        subject: "Your OTP Code for www.ggnHome.com",
      }
    : {
        to: user.email,
        params: { otp_code: otp },
        subject: "Your OTP Code for www.ggnHome.com",
        text: `Hi, ${otp} is code for your app. Valid for 5 minutes. Never share it with anyone. www.ggnhome.com`,
        html: otpEmailHtml(otp),
      };
  await sendEmail(emailParams);
}

// Request OTP
//   { mobileNumber }  -> OTP by SMS (creates the account for a new number)
//   { email }         -> OTP by email, for an existing account (email login)
exports.requestOtp = async (req, res) => {
  try {
    if (tooManyFromIp(req)) {
      return res.status(429).json({ message: "Too many requests. Please try again in a few minutes." });
    }

    const mobileNumber = req.body.mobileNumber ? String(req.body.mobileNumber).trim() : "";
    const email = req.body.email ? String(req.body.email).toLowerCase().trim() : "";
    const channel = mobileNumber ? "sms" : "email";

    if (!mobileNumber && !email) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    let user;
    if (channel === "sms") {
      if (!/^\d{10}$/.test(mobileNumber)) {
        return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
      }

      // "Didn't get the SMS?" -> send the code to the email saved on this
      // account. Reuses the code that was already sent by SMS while it is still
      // valid (so whichever arrives first works), otherwise makes a new one.
      if (req.body.via === "email") {
        const existing = await User.findOne({ mobileNumber });
        if (!existing) return res.status(404).json({ message: "Request a code by SMS first." });
        if (!existing.email) {
          return res.status(400).json({
            code: "NO_EMAIL",
            message: "There is no email saved on this account, so we can't email the code.",
          });
        }
        if (!existing.otp || !existing.otpExpiry || existing.otpExpiry.getTime() < Date.now()) {
          existing.otp = generateOtp();
          existing.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
          existing.otpAttempts = 0;
          await existing.save();
        }
        try {
          await sendOtpEmail(existing, existing.otp);
        } catch (emailError) {
          return res.status(500).json({ message: "Failed to send OTP email" });
        }
        return res.status(200).json({
          message: "We emailed the same code to your registered email",
          channel: "sms",
          emailFallback: true,
          maskedEmail: maskEmail(existing.email),
        });
      }

      user = await User.findOne({ mobileNumber });
      if (!user) {
        // New number: account is created from the number alone.
        user = new User({ mobileNumber, role: "renter" });
        if (email) user.email = email;
        await user.save();
      }
    } else {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: "No account found with this email. Sign in with your mobile number first.",
        });
      }
    }

    // Throttle: OTP creation time is otpExpiry - TTL.
    if (user.otpExpiry && user.otpExpiry.getTime() - OTP_TTL_MS > Date.now() - OTP_RESEND_GAP_MS) {
      return res.status(429).json({ message: "Please wait 30 seconds before requesting another code." });
    }

    // Always a fresh code on every request, for every role including admins.
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
    user.otpAttempts = 0;
    await user.save();

    if (channel === "email") {
      try {
        await sendOtpEmail(user, otp);
      } catch (emailError) {
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
      return res.status(200).json({
        message: "OTP sent to your email",
        channel: "email",
        maskedEmail: maskEmail(user.email),
      });
    }

    // SMS channel
    let smsQueued = false;
    let noPhoneOnline = false;
    if (isSmsConfigured()) {
      try {
        noPhoneOnline = !(await hasOnlineDevice());
        await sendOtpSms(user.mobileNumber, otp);
        smsQueued = true;
      } catch (smsError) {
        console.error("OTP SMS failed:", smsError.response?.data || smsError.message);
      }
    }

    // Safety net: no gateway phone online (or queueing failed) and the account
    // has an email -> also deliver by email so the user isn't locked out.
    let emailFallback = false;
    if ((!smsQueued || noPhoneOnline) && user.email) {
      try {
        await sendOtpEmail(user, otp);
        emailFallback = true;
      } catch (emailError) {
        console.error("OTP email fallback failed:", emailError.message);
      }
    }

    if (!smsQueued && !emailFallback) {
      return res.status(503).json({ message: "Could not send the OTP right now. Please try again shortly." });
    }

    return res.status(200).json({
      message: emailFallback && !smsQueued
        ? "SMS is unavailable right now, so we emailed your code instead."
        : emailFallback
          ? "OTP sent to your mobile number (and emailed as a backup)"
          : "OTP sent to your mobile number",
      channel: "sms",
      smsSent: smsQueued,
      emailFallback,
      maskedMobile: maskMobile(user.mobileNumber),
      maskedEmail: emailFallback ? maskEmail(user.email) : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Login with Password
exports.loginWithPassword = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({ message: "Mobile number and password are required" });
    }

    const user = await User.findOne({ mobileNumber }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "User not found with this mobile number" });
    }

    if (!user.passwordSet) {
      return res.status(400).json({ message: "Password not set. Please login using OTP." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    user.isVerified = true;

    const accessToken = user.getAccessToken();
    const refreshToken = user.getRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 65 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      requireEmailSetup: !user.email,
      user: {
        email: user.email,
        role: user.role,
        name: user.name,
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Set Password in Guest Mode (Login Page)
 * - If user with mobileNumber exists → set/update password
 * - If user does NOT exist → create new user with mobileNumber + password
 */
exports.setPassword = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({
        message: "Mobile number and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    let user = await User.findOne({ mobileNumber }).select("+password");

    // SECURITY: Do not allow overwriting an existing password in guest mode
    if (user && user.passwordSet) {
      return res.status(403).json({
        message: "Password already set. Please login or reset password using OTP."
      });
    }

    // If user does not exist, create new user
    if (!user) {
      user = new User({
        mobileNumber,
        role: "renter",
        password, // will be hashed by pre-save hook
        passwordSet: true,
        isVerified: true,
      });

      await user.save();

      return res.status(201).json({
        message: "User created and password set successfully",
        requireEmailSetup: true,
      });
    }

    // If user exists, set/update password
    user.password = password; // hashed by pre-save hook
    user.passwordSet = true;
    await user.save();

    return res.status(200).json({
      message: "Password set successfully",
      requireEmailSetup: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, mobileNumber } = req.body;

    if (!otp || (!mobileNumber && !email)) {
      return res.status(400).json({
        message: "Mobile number (or email) and OTP are required"
      });
    }

    // SMS login identifies the account by mobile number, email login by email.
    const user = mobileNumber
      ? await User.findOne({ mobileNumber })
      : await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (mobileNumber && email && user.email && user.email !== String(email).toLowerCase().trim()) {
      return res.status(400).json({
        message: "This mobile number is already linked to a different email"
      });
    }

    // Removed mobile mismatch check

    // All roles (admins included): must match the latest emailed/SMS OTP and not be expired
    try {
      if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ message: "Too many wrong attempts. Please request a new code." });
      }
      if (user.otp !== normalizeCode(otp) || !user.otpExpiry || user.otpExpiry < Date.now()) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        await user.save();
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (otpCheckError) {
      return res.status(500).json({ message: "Server error during OTP verification" });
    }

    // Removed mobileNumber assignment since mobileNumber is primary key

    // Removed this block as per instructions:
    // if (email && !user.email) {
    //   user.email = email;
    // }

    user.isVerified = true;
    // clear one-time OTP fields (single use, all roles)
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;

    const accessToken = user.getAccessToken();
    const refreshToken = user.getRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 65 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful",
      accessToken,
  refreshToken,
      user: { email: user.email, role: user.role, name: user.name, mobileNumber: user.mobileNumber },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Check Mobile Number
 * - Returns whether user exists
 * - Indicates if password is already set
 */
exports.checkMobile = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        message: "Mobile number is required",
      });
    }

    const user = await User.findOne({ mobileNumber });

    // User does not exist → create new user
    if (!user) {
      user = new User({
        mobileNumber,
        role: "renter",
        passwordSet: false,
        isVerified: false,
      });

      await user.save();

      return res.status(201).json({
        message: "User created",
        passwordSet: false,
      });
    }

    // User exists
    return res.status(200).json({
      message: "User found",
      passwordSet: Boolean(user.passwordSet),
    });
  } catch (error) {
    console.error("checkMobile error:", error);
    return res.status(500).json({
      message: "Server error checking mobile number",
    });
  }
};
exports.setRecoveryEmail = async (req, res) => {
  try {
    const userId = req.user?.id; // from session / cookie
    const { email } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Load user to verify password-based auth
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 SECURITY RULE:
    // Email can ONLY be set/changed if password is set
    if (!user.passwordSet) {
      return res.status(403).json({
        message: "Please login using password to set or change email"
      });
    }

    // Email is OPTIONAL
    if (!email) {
      return res.json({ success: true });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent overwriting another user's email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && String(existing._id) !== String(userId)) {
      return res.status(409).json({
        message: "Email already in use"
      });
    }

    user.email = normalizedEmail;
    user.isVerified = false; // verify later via OTP
    await user.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("setRecoveryEmail error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.changePasswordDirect = async (req, res) => {
  try {
    /**
     * ✅ SUPPORT BOTH AUTH FLOWS
     * - User login → req.user.id
     * - Agent login → req.agent.userId (linked User._id)
     */
    const userId =
      req.user?.id ||
      req.user?._id ||
      req.agent?.userId;

    const { newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: Access token not found"
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    /**
     * ✅ UPDATE PASSWORD
     * - Hashed automatically by User pre-save hook
     */
    user.password = newPassword;
    user.passwordSet = true;

    /**
     * 🔐 SECURITY
     * - Invalidate old sessions
     */
    user.refreshToken = null;
    user.isVerified = true;

    await user.save();

    return res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("changePasswordDirect error:", error);
    return res.status(500).json({
      message: "Server error while updating password"
    });
  }
};
