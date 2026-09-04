// Controller: Handles user logout functionality by clearing authentication cookies and removing sensitive tokens from the database.

// ========================
// Import Dependencies
// ========================
const User = require("../models/user.model");
const Agent = require("../models/Agent.model");

// ========================
// Controller Functions
// ========================

const logoutUser = async (req, res) => {
  try {
    // Destructure user from request object
    const { user } = req;

    // Step 1: Clear all possible authentication cookies
    const cookieOptions = { path: "/", httpOnly: true, secure: true, sameSite: "none" };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    // Agent cookies (correct names)
    res.clearCookie("accessTokenAgent", cookieOptions);
    res.clearCookie("refreshTokenAgent", cookieOptions);

    // Step 2: If user is authenticated, clear OTP and refresh token stored in database
    if (user) {
      if (user.role === "admin") {
        user.refreshToken = undefined;
      } else {
        user.otp = undefined;
        user.refreshToken = undefined;
      }
      await user.save();
    }

// Agent logout (if agent is authenticated)
const agent = req.agent;
if (agent) {
  agent.AccessTokenAgent = undefined;
  agent.RefreshTokenAgent = undefined;
  await agent.save();
}

    // Step 3: Respond with success message after logout
    return res.status(200).json({ message: "Logged out successfully" });

  } catch (err) {
    // Handle unexpected errors during logout process
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ========================
// Module Exports
// ========================

module.exports = { logoutUser };