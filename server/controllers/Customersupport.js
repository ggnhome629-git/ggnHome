// Controller for handling customer support-related operations, specifically managing callback requests.
// This controller validates incoming requests, creates new callback request entries,
// and handles responses to the client accordingly.

const CustomerSupport = require("../models/CustomerSupport.model.js");


// ==============================
// Callback Request Handler
// ==============================

exports.requestCallback = async (req, res) => {
  // Extract required fields from the request body
  const { name, phone, email, preferredTime, issue } = req.body;

  try {
    // Validate that all required fields are provided
    if (!name || !phone || !email || !preferredTime) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Create a new CustomerSupport document with the provided details and current timestamp
    const newRequest = new CustomerSupport({
      name,
      phone,
      email,
      preferredTime,
      issue,
      createdAt: new Date()
    });

    // Save the new callback request to the database
    await newRequest.save();

    // Respond with success status and the saved request data
    res.status(201).json({ message: "Callback request submitted successfully", data: newRequest });
  } catch (error) {
    // Handle any server errors during the process
    res.status(500).json({ message: "Server error while submitting callback request" });
  }
};
