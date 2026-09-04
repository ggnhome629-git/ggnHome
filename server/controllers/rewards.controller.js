// rewards.controller.js
// Controller for managing reward distribution and eligibility checks.
// Provides functionality to distribute rewards to users and verify if a user is eligible for a reward.

const Reward = require("../models/Rewards.model");
const User = require("../models/user.model");


// ==============================
// Distribute Reward to a User
// ==============================
exports.distributeReward = async (req, res) => {
  
  // Extract input parameters from request body
  const { userId, email, message, adminId } = req.body;

  try {
    // Validate and determine target user ID
    let targetUserId = userId;
    
    // If email is provided but userId is not, find user by email
    if (email && !userId) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      targetUserId = user._id;
    }

    // If no user identifier is available, return bad request
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID or Email is required",
      });
    }

    // Check if a reward already exists for this user
    let existingReward = await Reward.findOne({ userId: targetUserId });

    if (existingReward) {
      // Update the existing reward instead of creating a new one
      existingReward.message = message || existingReward.message;
      existingReward.distributedAt = new Date();
      existingReward.isActive = true;
      await existingReward.save();

      return res.status(200).json({
        success: true,
        message: "Existing reward updated successfully",
        reward: existingReward,
      });
    }

    // If no reward exists, create a new one
    const reward = new Reward({
      userId: targetUserId,
      distributedBy: adminId || null,
      message: message || undefined,
    });

    // Save the reward to the database
    await reward.save();

    // Respond with success and the created reward details
    return res.status(201).json({
      success: true,
      message: "Reward distributed successfully",
      reward,
    });

  } catch (error) {
    // Handle unexpected server errors
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// ==============================
// Check User Reward Eligibility
// ==============================
exports.checkEligibility = async (req, res) => {
  
  try {
    // Validate logged-in user presence and token
    if (!req.user || !req.user._id) {
      return res.status(400).json({
        success: false,
        message: "Logged-in user not found or token invalid",
      });
    }

    // Extract user ID from authenticated request
    const targetUserId = req.user._id;

    // Fetch the most recent reward distributed to this user
    const latestReward = await Reward.findOne({ userId: targetUserId }).sort({ distributedAt: -1 });

    // If a reward exists, user is not eligible for a new one
    if (latestReward) {
      return res.status(200).json({
        success: true,
        eligible: false,
        message: "User already received a reward",
        reward: latestReward,
      });
    }

    // Otherwise, user is eligible for a reward
    return res.status(200).json({
      success: true,
      eligible: true,
      message: "User is eligible for the reward",
    });

  } catch (error) {
    // Handle unexpected server errors
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};