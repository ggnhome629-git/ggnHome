// server/controllers/admin.partnerHub.controller.js
const Agent = require('../models/Agent.model');
const mongoose = require('mongoose');

/**
 * Admin: Create/Register a new partner for PartnerHub portal
 * Partner can then login to their portal with mobile + OTP
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

    // Check if partner already exists
    const existingAgent = await Agent.findOne({ mobileNumber });
    if (existingAgent) {
      return res.status(409).json({ message: 'Partner already exists with this mobile number' });
    }

    // Create new partner
    const newAgent = new Agent({
      name,
      mobileNumber,
      email: email || null,
      agentType,
      agencyName: agencyName || null,
      status: 'active',
      isVerified: true,
      verificationStatus: 'approved',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    });

    await newAgent.save();

    return res.status(201).json({
      message: 'Partner created successfully. They can now login to their portal with mobile + OTP.',
      agent: {
        _id: newAgent._id,
        name: newAgent.name,
        mobileNumber: newAgent.mobileNumber,
        email: newAgent.email,
        status: newAgent.status,
        createdAt: newAgent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({ message: 'Server error creating partner' });
  }
};

/**
 * Admin: List all partners with pagination and filtering
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
    console.error('Error listing partners:', error);
    res.status(500).json({ message: 'Server error listing partners' });
  }
};

/**
 * Admin: Get partner details
 */
const getAgentDetailsForHub = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid partner ID' });
    }

    const agent = await Agent.findById(agentId).select('-otp -otpExpiry -AccessTokenAgent -RefreshTokenAgent');
    if (!agent) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    return res.json(agent);
  } catch (error) {
    console.error('Error getting partner details:', error);
    res.status(500).json({ message: 'Server error fetching partner details' });
  }
};

/**
 * Admin: Update partner status (activate/deactivate/suspend)
 */
const updateAgentStatus = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or pending' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid partner ID' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    agent.status = status;
    await agent.save();

    return res.json({
      message: `Partner status updated to ${status}`,
      agent: {
        _id: agent._id,
        name: agent.name,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    res.status(500).json({ message: 'Server error updating partner status' });
  }
};

/**
 * Admin: Update partner sectors covered
 */
const updateAgentSectors = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sectorsCovered } = req.body;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid partner ID' });
    }

    if (!Array.isArray(sectorsCovered)) {
      return res.status(400).json({ message: 'sectorsCovered must be an array' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    agent.sectorsCovered = sectorsCovered;
    await agent.save();

    return res.json({
      message: 'Partner sectors updated',
      agent: {
        _id: agent._id,
        sectorsCovered: agent.sectorsCovered,
      },
    });
  } catch (error) {
    console.error('Error updating partner sectors:', error);
    res.status(500).json({ message: 'Server error updating partner sectors' });
  }
};

/**
 * Admin: Delete/Remove a partner from the system
 */
const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid partner ID' });
    }

    const agent = await Agent.findByIdAndDelete(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    return res.json({
      message: 'Partner deleted successfully',
      agentId: agent._id,
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({ message: 'Server error deleting partner' });
  }
};

/**
 * Admin: Get partner hub statistics
 */
const getAgentHubStats = async (req, res) => {
  try {
    const totalAgents = await Agent.countDocuments();
    const activeAgents = await Agent.countDocuments({ status: 'active' });
    const suspendedAgents = await Agent.countDocuments({ status: 'suspended' });
    const pendingAgents = await Agent.countDocuments({ status: 'pending' });

    // Get top-rated partners
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
