const User = require("../models/user.model.js");

const checkAdminEmail = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No user data found" });
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in checkAdminEmail middleware:", error);
    res.status(500).json({ message: "Server error verifying admin access" });
  }
};

module.exports = { checkAdminEmail };
