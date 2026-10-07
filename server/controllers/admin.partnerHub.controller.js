// server/controllers/admin.agentHub.controller.js
const Agent = require('../models/Agent.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { sendOtpSms } = require('../utils/sendSms');
const { generateUniqueCode } = require('../utils/generateCode');

/**
 * Admin: Create/Register a new agent for AgentHub portal
 * Generates credentials and sends OTP to agent's mobile
 */
const createAgentForHub = async (req, res) => {
  try {
    const { name, mobileNumber, email, agentType = 'individual', agencyName } = req.body;

    // Validation
    if (!name || !mobileNumber) {
      return res.status(400).json({ message: 'Name and mobile number are required' });
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    // Check if agent already exists
    const existingAgent = await Agent.findOne({ mobileNumber });
    if (existingAgent) {
      return res.status(409).json({ message: 'Agent already exists with this mobile number' });
    }

    // Generate unique agent code
    const agentCode = await generateUniqueCode();

    // Create new agent
    const newAgent = new Agent({
      name,
      mobileNumber,
      email: email || null,
      agentType,
      agencyName: agencyName || null,
      agentCode,
      status: 'active', // Admin-created agents start as active
      isVerified: true, // Admin verification
      verificationStatus: 'approved',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    });

    await newAgent.save();

    // Send OTP SMS to agent
    const otp = Math.random().toString().slice(2, 6);
    newAgent.otp = otp;
    newAgent.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await newAgent.save();

    try {
      await sendOtpSms(mobileNumber, otp);
    } catch (smsErr) {
      console.error('SMS sending failed:', smsErr);
      // Don't fail the request if SMS fails
    }

    return res.status(201).json({
      message: 'Agent created successfully. OTP sent to their mobile.',
      agent: {
        _id: newAgent._id,
        name: newAgent.name,
        mobileNumber: newAgent.mobileNumber,
        email: newAgent.email,
        agentCode: newAgent.agentCode,
        status: newAgent.status,
        createdAt: newAgent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Server error creating agent' });
  }
};

/**
 * Admin: List all agents with pagination and filtering
 */
const listAgentsForHub = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Agent.countDocuments(query);
    const agents = await Agent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id name mobileNumber email status rating agentType createdAt verificationStatus');

    return res.json({
      agents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ message: 'Server error listing agents' });
  }
};

/**
 * Admin: Get agent details
 */
const getAgentDetailsForHub = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID' });
    }

    const agent = await Agent.findById(agentId).select('-otp -otpExpiry -AccessTokenAgent -RefreshTokenAgent');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.json(agent);
  } catch (error) {
    console.error('Error getting agent details:', error);
    res.status(500).json({ message: 'Server error fetching agent details' });
  }
};

/**
 * Admin: Update agent status (activate/deactivate/suspend)
 */
const updateAgentStatus = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or pending' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.status = status;
    await agent.save();

    return res.json({
      message: `Agent status updated to ${status}`,
      agent: {
        _id: agent._id,
        name: agent.name,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ message: 'Server error updating agent status' });
  }
};

/**
 * Admin: Update agent sectors covered
 */
const updateAgentSectors = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sectorsCovered } = req.body;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID' });
    }

    if (!Array.isArray(sectorsCovered)) {
      return res.status(400).json({ message: 'sectorsCovered must be an array' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.sectorsCovered = sectorsCovered;
    await agent.save();

    return res.json({
      message: 'Agent sectors updated',
      agent: {
        _id: agent._id,
        sectorsCovered: agent.sectorsCovered,
      },
    });
  } catch (error) {
    console.error('Error updating agent sectors:', error);
    res.status(500).json({ message: 'Server error updating agent sectors' });
  }
};

/**
 * Admin: Delete/Remove an agent from the system
 */
const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID' });
    }

    const agent = await Agent.findByIdAndDelete(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.json({
      message: 'Agent deleted successfully',
      agentId: agent._id,
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: 'Server error deleting agent' });
  }
};

/**
 * Admin: Get agent hub statistics
 */
const getAgentHubStats = async (req, res) => {
  try {
    const totalAgents = await Agent.countDocuments();
    const activeAgents = await Agent.countDocuments({ status: 'active' });
    const suspendedAgents = await Agent.countDocuments({ status: 'suspended' });
    const pendingAgents = await Agent.countDocuments({ status: 'pending' });

    // Get top-rated agents
    const topAgents = await Agent.find()
      .sort({ rating: -1 })
      .limit(5)
      .select('_id name rating ratingsCount');

    return res.json({
      stats: {
        totalAgents,
        activeAgents,
        suspendedAgents,
        pendingAgents,
        topAgents,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
};

module.exports = {
  createAgentForHub,
  listAgentsForHub,
  getAgentDetailsForHub,
  updateAgentStatus,
  updateAgentSectors,
  deleteAgent,
  getAgentHubStats,
};
