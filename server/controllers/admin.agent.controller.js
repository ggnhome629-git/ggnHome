// server/controllers/admin.agent.controller.js
const Agent = require('../models/Agent.model');
const mongoose = require('mongoose');
const UserPreferenceForm = require('../models/userpreferenceForm.model');
const User = require('../models/user.model');

/**
 * GET /api/admin/agents
 * Returns a paginated list of agents with basic details and the sectors they deal in.
 * Query params (optional): page, limit, search, status
 */
exports.getAllAgents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const { search } = req.query; // removed status filtering per request

    const filter = {};

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // search across name, email, mobileNumber and sector arrays
      filter.$or = [
        { name: regex },
        { email: regex },
        { mobileNumber: regex },
        { areasCovered: regex },
        { preferredSectors: regex }
      ];
    }

    // Projection: include agent id, profile photo, id proof, and preferred sectors explicitly
    const projection = {
      _id: 1,                 // agent id
      name: 1,
      email: 1,
      mobileNumber: 1,
      profilePhoto: 1,        // profile photo
      idProof: 1,             // id proof URL
      agentCode: 1,
      status: 1,
      agentType: 1,
      agencyName: 1,
      experienceYears: 1,
      areasCovered: 1,
      preferredSectors: 1,    // preferred sectors
      propertyTypes: 1,
      preferredBHK: 1,
      totalLeadsAssigned: 1,
      rating: 1,
      createdAt: 1,
      visibilityStatus: 1
    };

    const [agents, total] = await Promise.all([
      Agent.find(filter, projection).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Agent.countDocuments(filter)
    ]);

    const pages = Math.ceil(total / limit);

    return res.json({ success: true, agents, total, page, pages, limit });
  } catch (err) {
    console.error('admin.getAllAgents error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching agents' });
  }
};

/**
 * GET /api/admin/agents/:agentId/visibility
 * Returns the visibilityStatus for a single agent
 */
exports.getAgentVisibility = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.query.agentId;
    if (!agentId) return res.status(400).json({ success: false, message: 'agentId required' });

    const agent = await Agent.findById(agentId).select('visibilityStatus').lean();
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    return res.json({ success: true, agentId, visibilityStatus: String(agent.visibilityStatus || '0') });
  } catch (err) {
    console.error('admin.getAgentVisibility error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/agents/:agentId/visibility
 * Body: { visibilityStatus: '0'|'1' }
 * Updates the agent's visibilityStatus (admin-only route)
 */
exports.setAgentVisibility = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.body.agentId;
    const visibilityStatus = typeof req.body.visibilityStatus !== 'undefined' ? String(req.body.visibilityStatus) : undefined;

    if (!agentId) return res.status(400).json({ success: false, message: 'agentId required' });
    if (typeof visibilityStatus === 'undefined' || !['0', '1'].includes(visibilityStatus)) {
      return res.status(400).json({ success: false, message: "visibilityStatus must be '0' or '1'" });
    }

    const agent = await Agent.findByIdAndUpdate(agentId, { $set: { visibilityStatus } }, { new: true }).select('visibilityStatus name email agentCode');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    return res.json({ success: true, agentId, visibilityStatus: agent.visibilityStatus });
  } catch (err) {
    console.error('admin.setAgentVisibility error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/agents/:agentId/approve
 * Sets agent.status = 'active'
 */
exports.approveAgent = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.body.agentId || req.query.agentId;
    if (!agentId) return res.status(400).json({ success: false, message: 'agentId required' });
    if (!mongoose.Types.ObjectId.isValid(agentId)) return res.status(400).json({ success: false, message: 'Invalid agentId' });

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { $set: { status: 'active' } },
      { new: true }
    ).select('status name email agentCode');

    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    return res.json({ success: true, agentId, status: agent.status });
  } catch (err) {
    console.error('admin.approveAgent error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/agents/:agentId/suspend
 * Sets agent.status = 'suspended'
 */
exports.suspendAgent = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.body.agentId || req.query.agentId;
    if (!agentId) return res.status(400).json({ success: false, message: 'agentId required' });
    if (!mongoose.Types.ObjectId.isValid(agentId)) return res.status(400).json({ success: false, message: 'Invalid agentId' });

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { $set: { status: 'suspended' } },
      { new: true }
    ).select('status name email agentCode');

    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    return res.json({ success: true, agentId, status: agent.status });
  } catch (err) {
    console.error('admin.suspendAgent error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/preferences/:prefId/assign
 * Assign a preference to an agent (atomic using transaction)
 */
// inside your admin.agent.controller.js (requires mongoose and UserPreferenceForm at top)
exports.assignPreference = async (req, res) => {
  const prefId = req.params.prefId || req.body.prefId || req.query.prefId;
  const agentId = req.body.agentId || req.query.agentId;

  try {
    if (!prefId || !agentId) return res.status(400).json({ success: false, message: 'prefId and agentId required' });

    // validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(prefId) || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Invalid prefId or agentId' });
    }



    const session = await mongoose.startSession();

    try {
      let resultPref = null;
      await session.withTransaction(async () => {
        // 1) Try to add agentId into pref.agentAssigned; check modifiedCount
        const prefUpdate = await UserPreferenceForm.updateOne(
          { _id: new mongoose.Types.ObjectId(prefId) },
          { $addToSet: { agentAssigned: new mongoose.Types.ObjectId(agentId) } },
          { session }
        );

        if (!prefUpdate.acknowledged) {
          // unexpected failure
          throw new Error('Preference update failed');
        }

        // If no document matched, pref doesn't exist
        if (prefUpdate.matchedCount === 0) {
          // cause transaction to abort by throwing
          throw new Error('Preference not found');
        }

        const agentWasAdded = prefUpdate.modifiedCount > 0; // true if addToSet actually added

        // 2) If agentWasAdded === true: push prefId to agent.leadsAssigned and increment counter
        if (agentWasAdded) {
          const agentUpdate = await Agent.updateOne(
            { _id: new mongoose.Types.ObjectId(agentId) },
            {
              $addToSet: { leadsAssigned: new mongoose.Types.ObjectId(prefId) },
              $inc: { totalLeadsAssigned: 1 }
            },
            { session }
          );

          if (!agentUpdate.acknowledged || agentUpdate.matchedCount === 0) {
            throw new Error('Agent not found or update failed');
          }
        }
        // read the pref to return in response (lean)
        resultPref = await UserPreferenceForm.findById(prefId).session(session).lean();
      }, {
        // optional transaction options
        readPreference: 'primary'
      });

      session.endSession();

      // If the agent was already assigned, inform the caller
      // We can detect that from resultPref.agentAssigned includes agentId
      const alreadyAssigned = Array.isArray(resultPref.agentAssigned) && resultPref.agentAssigned.some(a => a.toString() === agentId.toString());
      return res.json({ success: true, assigned: alreadyAssigned, pref: resultPref });

    } catch (txErr) {
      // Ensure session is ended and transaction aborted by withTransaction
      session.endSession();
      // if message was 'Preference not found' send 404, else 500
      if (txErr.message === 'Preference not found') {
        return res.status(404).json({ success: false, message: 'Preference not found' });
      }
      console.error('assignPreference transaction error:', txErr);
      return res.status(500).json({ success: false, message: 'Assignment failed', error: txErr.message });
    }
  } catch (err) {
    console.error('assignPreference error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


/**
 * GET /api/admin/agents/:agentId/viewed-leads
 * Returns all user preference forms where this agent has viewed the mobile number
 */
exports.getAgentViewedLeads = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.query.agentId;

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Valid agentId required' });
    }

    const leads = await UserPreferenceForm.find(
      {
        mobileViewedByAgents: {
          $elemMatch: { agentId: new mongoose.Types.ObjectId(agentId) }
        }
      }
    )
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      agentId,
      total: leads.length,
      leads
    });
  } catch (err) {
    console.error('admin.getAgentViewedLeads error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching viewed leads'
    });
  }
};


/**
 * POST /api/admin/agentclientviewed
 * Body: { agentId }
 * Returns all mobileViewedByAgents entries for the given agent
 * along with minimal lead context
 */
exports.getAgentClientViewedMobiles = async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid agentId is required'
      });
    }

    const results = await UserPreferenceForm.find(
      {
        mobileViewedByAgents: {
          $elemMatch: { agentId: new mongoose.Types.ObjectId(agentId) }
        }
      },
      {
        userName: 1,
        mobileNumber: 1,
        preferredLocation: 1,
        propertyType: 1,
        budgetRange: 1,
        createdAt: 1,
        mobileViewedByAgents: 1
      }
    )
      .sort({ updatedAt: -1 })
      .lean();

    // Extract only this agent's view entry per lead
    const formatted = results.map(lead => {
      const viewEntry = lead.mobileViewedByAgents.find(
        v => v.agentId.toString() === agentId.toString()
      );

      return {
        leadId: lead._id,
        userName: lead.userName,
        mobileNumber: lead.mobileNumber,
        preferredLocation: lead.preferredLocation,
        propertyType: lead.propertyType,
        budgetRange: lead.budgetRange,
        viewedAt: viewEntry?.viewedAt || null,
        createdAt: lead.createdAt
      };
    });

    return res.json({
      success: true,
      agentId,
      total: formatted.length,
      leads: formatted
    });
  } catch (error) {
    console.error('admin.getAgentClientViewedMobiles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching agent viewed mobiles'
    });
  }
};

/**
 * POST /api/admin/agents/:agentId/reset-password-soft
 * Admin-only:
 * - Removes password
 * - Sets passwordSet = false
 * - Invalidates sessions
 * User/Agent must set a new password again
 */
exports.resetAgentPasswordSoft = async (req, res) => {
  try {
    const agentId = req.params.agentId || req.body.agentId;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId required' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Invalid agentId' });
    }

    const agent = await Agent.findById(agentId).select('userId mobileNumber');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (!agent.userId) {
      return res.status(400).json({
        success: false,
        message: 'No user account linked to this agent'
      });
    }

    const user = await User.findById(agent.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Linked user not found' });
    }

    // 🔥 Soft reset password (SAFE: bypasses mongoose hooks & bcrypt)
    await User.updateOne(
      { _id: agent.userId },
      {
        $unset: { password: "" },
        $set: {
          passwordSet: false,
          refreshToken: null,
          isVerified: false
        }
      }
    );

    return res.json({
      success: true,
      message: 'Password reset successfully. User must set a new password.',
      agentId,
      mobileNumber: agent.mobileNumber
    });

  } catch (err) {
    console.error('admin.resetAgentPasswordSoft error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting agent password'
    });
  }
};

module.exports = exports;
