// Controller for handling chatbot interactions:
// Provides endpoints to get chatbot responses based on user messages and to retrieve initial questions.

const fs = require('fs');
const path = require('path');


// ------------------------------
// Get Chatbot Response Controller
// ------------------------------
exports.getChatResponse = (req, res) => {
  // Extract message and parentId from request body
  const { message, parentId } = req.body;

  // Define path to dataset JSON file
  const datasetPath = path.join(__dirname, '../utils/Dataset.json');

  // Load and parse the dataset
  const rawData = fs.readFileSync(datasetPath);
  const dataset = JSON.parse(rawData);

  // Normalize all top-level questions for logging/debugging (not used further)
  const normalizedQuestions = dataset.map(q => q.question.toLowerCase());

  // Initialize variable to hold matched rule
  let rule;

  // If parentId is provided, attempt to find a matching follow-up question
  if (parentId) {
    // Find the parent question node in the dataset
    const parentNode = dataset.find(q => q.id === parentId);

    if (parentNode && parentNode.followUps) {
      // Map followUps to their full question objects in the dataset
      const followUpRules = parentNode.followUps
        .map(f => dataset.find(d => d.id === f.id))
        .filter(r => r); // filter out any undefined

      // Normalize follow-up questions for matching
      const normalizedFollowUpQuestions = followUpRules.map(r => r.question.toLowerCase());

      // Find a follow-up question that matches the input message (case-insensitive)
      rule = followUpRules.find(r => r.question.toLowerCase() === message.toLowerCase());
    }

    // If no matching follow-up found, fallback to searching top-level questions
    if (!rule) {
      rule = dataset.find(r => r.question.toLowerCase() === message.toLowerCase());
    }

  } else {
    // No parentId provided, search top-level questions for a match
    rule = dataset.find(r => r.question.toLowerCase() === message.toLowerCase());
  }

  // If no matching rule found, return a default response indicating lack of understanding
  if (!rule) {
    return res.json({
      reply: "Sorry, I don’t understand that yet. Please contact support or check our FAQ.",
      options: []
    });
  }

  // Return the matched response and any follow-up options
  res.json({
    reply: rule.response,
    options: rule.followUps || []  // array of next questions
  });
};


// ------------------------------
// Get Initial Questions Controller
// ------------------------------
exports.getInitialQuestions = (req, res) => {
  // Define path to dataset JSON file
  const datasetPath = path.join(__dirname, '../utils/Dataset.json');

  // Load and parse the dataset
  const rawData = fs.readFileSync(datasetPath);
  const dataset = JSON.parse(rawData);

  // Map top-level questions to an array of options with question text and id
  const options = dataset.map(q => ({
    question: q.question,
    id: q.id
  }));

  // Return the initial set of questions as options
  res.json({ options });
};