const User = require("../models/user.model");
const sendEmail = require("../utils/sendEmail"); // Import the sendEmail module
const jwt = require("jsonwebtoken");

// Generate a random 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return "";
  const visible = name.slice(0, 1);
  return `${visible}***@${domain}`;
}

// Request OTP
exports.requestOtp = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    let emailMismatch = false;
    let maskedSavedEmail = null;

    let user = await User.findOne({ mobileNumber });
    if (user) {
      if (user.email) {
        // Check if frontend email differs from saved email
        if (email && email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
          emailMismatch = true;
          maskedSavedEmail = maskEmail(user.email);
        }
      } else {
        return res.status(403).json({
          message: "OTP login not enabled. Please login using password and add email first."
        });
      }
    } else {
      if (!email) {
        return res.status(400).json({ message: "Email is required for new users" });
      }
      // default new users are renters
      user = new User({
        mobileNumber,
        email,
        role: "renter",
      });
      await user.save();
    }

    // If user is admin, we DO NOT generate/send an OTP. Admins use the predefined code stored in DB in `otp` field.
    if (user.role === "admin") {
      // Do not create or overwrite user.otp; assume a predefined code is already present in DB.
      return res.status(200).json({ message: "Admin login uses predefined code; no OTP sent." });
    }

    // For non-admin users, proceed with normal OTP flow
    // Check if an existing OTP is still valid; reuse if so
    let otp;
    if (user.otp && user.otpExpiry && user.otpExpiry > Date.now()) {
      otp = user.otp; // reuse existing OTP
    } else {
      otp = generateOtp();
      user.otp = otp;
      user.otpExpiry = Date.now() + 5 * 60 * 1000; // valid for 5 minutes
      await user.save();
    }

 
    

    // Production mode: send via Brevo
    // Prefer using a Brevo template. Set BREVO_OTP_TEMPLATE_ID in env (numeric id).
    if (process.env.BREVO_OTP_TEMPLATE_ID) {
      const emailParams = {
        to: user.email,
        templateId: Number(process.env.BREVO_OTP_TEMPLATE_ID), // Brevo expects a numeric template id
        params: {
          otp_code: otp
        },
        // optional: templates may use their own subject; this will act as an override if needed
        subject: "Your OTP Code for www.ggnHome.com"
      };

      try {
        await sendEmail(emailParams);
        return res.status(200).json({
          message: emailMismatch
            ? "OTP has been sent to your previously registered email."
            : "OTP sent successfully",
          sentToSavedEmail: emailMismatch,
          maskedEmail: emailMismatch ? maskedSavedEmail : null
        });
      } catch (emailError) {
        return res.status(500).json({ message: "Failed to send OTP email", error: emailError.message });
      }
    } else {
      // Fallback: no template configured — send raw HTML/text
      const emailParams = {
        to: user.email,
        params: {
          otp_code: otp
        },
        subject: "Your OTP Code for www.ggnHome.com",
        text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        html: `<p><strong>Your OTP code:</strong> ${otp}</p><p>This code will expire in 5 minutes.</p>`
      };

      try {
        await sendEmail(emailParams);
        return res.status(200).json({
          message: emailMismatch
            ? "OTP has been sent to your previously registered email."
            : "OTP sent successfully",
          sentToSavedEmail: emailMismatch,
          maskedEmail: emailMismatch ? maskedSavedEmail : null
        });
      } catch (emailError) {
        return res.status(500).json({ message: "Failed to send OTP email", error: emailError.message });
      }
    }
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

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        message: "Mobile number and OTP are required"
      });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (email && user.email && user.email !== email) {
      return res.status(400).json({
        message: "This mobile number is already linked to a different email"
      });
    }

    // Removed mobile mismatch check

    // Admin flow: compare submitted otp with predefined code stored in `user.otp` without expiry check
    if (user.role === 'admin') {
      if (!user.otp) return res.status(400).json({ message: 'Admin code not set. Contact support.' });
      if (user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid admin code' });
      }
      // admin is verified — do NOT clear the stored predefined code (it is permanent)
      if (mobileNumber && !user.mobileNumber) {
        user.mobileNumber = mobileNumber;
      }
      if (email && !user.email) {
        user.email = email;
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
        message: "Admin login successful",
              accessToken,
  refreshToken,
        user: { email: user.email, role: user.role, name: user.name, mobileNumber: user.mobileNumber },
      });
    }

    // Non-admin flow: must match OTP and not be expired
    try {
      if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
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
    // clear one-time OTP fields for non-admin users
    user.otp = null;
    user.otpExpiry = null;

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
