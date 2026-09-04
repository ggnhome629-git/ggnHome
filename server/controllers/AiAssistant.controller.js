/**
 * AiAssistant.controller.js
 *
 * Controller for handling AI assistant responses.
 * Provides endpoints to save AI-generated responses associated with a user,
 * and to retrieve AI responses for a given user.
 */

const AiModel = require('../models/AiAssistant.model.js');
const User = require('../models/user.model.js');


// ==============================
// Save AI Responses
// ==============================
const saveAiResponses = async (req, res) => {
  // Destructure required fields from request body
  const { userEmail, sendType, responses } = req.body;

  try {
    // Validate presence and format of required fields
    if (!userEmail || !sendType || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ message: 'Missing required fields or invalid responses format.' });
    }

    // Find user by email to get their ObjectId
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      // Respond with 404 if user not found
      return res.status(404).json({ message: 'User not found for provided email.' });
    }

    // Check if an AI entry already exists for this user
    let aiEntry = await AiModel.findOne({ userEmail: user._id });

    if (aiEntry) {
      // Update existing entry with new responses and sendType
      aiEntry.responses = responses;
      aiEntry.sendType = sendType;
      await aiEntry.save();
    } else {
      // Create a new AI entry if none exists
      aiEntry = await AiModel.create({ userEmail: user._id, sendType, responses });
    }

    // Respond with success and the saved AI entry data
    res.status(201).json({ message: 'AI responses saved successfully.', data: aiEntry });

  } catch (error) {
    // Handle unexpected server errors
    res.status(500).json({ message: 'Server error while saving AI responses.' });
  }
};


// ==============================
// Get AI Responses for a User
// ==============================
const getAiResponses = async (req, res) => {
  // Destructure userEmail from query parameters
  const { userEmail } = req.query;

  try {
    // Validate presence of userEmail query parameter
    if (!userEmail) {
      return res.status(400).json({ message: 'userEmail query parameter is required.' });
    }

    // Retrieve AI responses linked to the userEmail, populating user details
    const aiResponses = await AiModel.find({ userEmail }).populate('userEmail', 'email mobileNumber');

    // Respond with the retrieved AI responses
    res.status(200).json({ data: aiResponses });

  } catch (error) {
    // Handle unexpected server errors
    res.status(500).json({ message: 'Server error while fetching AI responses.' });
  }
};


module.exports = {
  saveAiResponses,
  getAiResponses
};