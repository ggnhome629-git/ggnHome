const crypto = require("crypto");
const ChatSession = require("../models/ChatSession.model");
const ChatMessage = require("../models/ChatMessage.model");
const SupportTicket = require("../models/SupportTicket.model");
const FaqArticle = require("../models/FaqArticle.model");
const ChatGap = require("../models/ChatGap.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// POST /api/chatbot
exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, message, mode, filters } = req.body;
    if (!message || !message.trim()) return jsonError(res, 400, "message required");
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ sessionId });
      if (!session) session = null;
    }
    if (!session) {
      session = await ChatSession.create({
        userId: req.user?._id || null,
        mode: mode || "rental",
        filters: filters || {},
        messages: [],
      });
    }
    const userText = message.trim();
    let reply = "";
    let quickReplies = [];
    let cards = [];
    let handoffSuggested = false;

    // Fallback: answer known FAQ keywords.
    const faq = await FaqArticle.findOne({ isPublished: true, question: { $regex: new RegExp(`\\b${userText.split(" ").join("|")}\\b`, "i") } });
    if (faq) {
      reply = `FAQ: ${faq.answer}`;
    } else if (userText.toLowerCase().includes("help") || userText.toLowerCase().includes("human")) {
      reply = "I'll connect you to a human agent.";
      handoffSuggested = true;
    } else {
      reply = "I didn't fully understand that. Try: 'rent 2 BHK', 'under 30k', 'Sector 57'.";
      quickReplies = ["rent 2 BHK", "under 30k", "Sector 57", "help"];
    }

    const record = {
      role: "user",
      text: userText,
      timestap: new Date(),
    };
    session.messages.push(record);
    session.lastActive = new Date();
    await session.save();

    await ChatMessage.create({ sessionId: session._id.toString(), role: "user", text: userText });

    // Echo the reply as a record too.
    const replyRecord = {
      role: "assistant",
      text: reply,
      cards,
      timestap: new Date(),
    };
    session.messages.push(replyRecord);
    await session.save();
    await ChatMessage.create({ sessionId: session._id.toString(), role: "assistant", text: reply, cards });

    // Keep only the last 50 messages in the session doc.
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
      await session.save();
    }

    return res.json({
      success: true,
      reply,
      quickReplies,
      cards,
      filters: session.filters,
      handoffSuggested,
      sessionId: session.sessionId,
    });
  } catch (err) {
    jsonError(res, 500, "Failed to send message");
  }
};

// GET /api/chatbot/session/:id
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findOne({ sessionId: id });
    if (!session) return jsonError(res, 404, "Session not found");
    if (session.userId.toString() !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "Not your session");
    }
    return res.json({ success: true, session });
  } catch (err) {
    jsonError(res, 500, "Failed to load session");
  }
};

// POST /api/chatbot/handoff — creates SupportTicket with transcript
exports.handoff = async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;
    const session = await ChatSession.findOne({ sessionId });
    if (!session) return jsonError(res, 404, "Session not found");
    if (session.userId.toString() !== req.user._id) return jsonError(res, 403, "Not your session");
    const ticket = await SupportTicket.create({
      userId: session.userId,
      name: session.userId ? (await User.findById(session.userId).select("name")).name : null,
      phone: session.userId ? (await User.findById(session.userId).select("mobileNumber")).mobileNumber : null,
      email: session.userId ? (await User.findById(session.userId).select("email")).email : null,
      topic: "Chatbot handoff",
      message: context || message || "User handed off from chatbot",
      channel: "callback",
      status: "open",
    });
    session.handoff = { requested: true, at: new Date(), ticketId: ticket.ticketId };
    await session.save();
    return res.status(201).json({ success: true, ticketId: ticket.ticketId });
  } catch (err) {
    jsonError(res, 500, "Failed to create handoff ticket");
  }
};

// POST /api/chatbot/feedback — thumbs up/down
exports.feedback = async (req, res) => {
  try {
    const { sessionId, messageIndex, rating } = req.body;
    if (!["up", "down"].includes(rating)) return jsonError(res, 400, "rating must be up or down");
    // No-op log in this build; real implementation stores feedback on the
    // No-op log here; production stores feedback on the ChatMessage docs.
    return res.json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Failed to record feedback");
  }
};

// GET /api/admin/chatbot/gaps
exports.adminGaps = async (req, res) => {
  try {
    const { top = 20 } = req.query;
    const num = Math.max(1, parseInt(top, 10) || 10);
    const chatGaps = await ChatGap.find({}, { question: 1, count: 1 }).sort({ count: -1 }).limit(num);
    const gaps = [
      { question: "parking availability", count: 12 },
      { question: "water connection", count: 8 },
      { question: "flatmate move in", count: 5 },
    ];
    return res.json({ success: true, gaps: chatGaps });
  } catch (err) {
    jsonError(res, 500, "Failed to load gaps");
  }
};

// GET /api/chatbot/initial-questions
exports.getInitialQuestions = async (req, res) => {
  try {
    const questions = [
      "Looking for a rental?",
      "Looking to buy/sell?",
      "Need a roommate?",
      "Commercial property?"
    ];
    return res.json({ success: true, questions });
  } catch (err) {
    jsonError(res, 500, "Failed to load initial questions");
  }
};

// POST /api/chatbot (alias for sendMessage)
exports.getChatResponse = exports.sendMessage;
