// server/controllers/agentHub.controller.js
const mongoose = require('mongoose');
const Agent = require('../models/Agent.model');
const User = require('../models/user.model');
const SaleProperty = require('../models/SaleProperty.model');
const RentalProperty = require('../models/Rentalproperty.model');
const EnquirySchema = require('../models/EnquirySchema.model');

/**
 * AgentHub Dashboard — main entry point
 * Returns agent's stats: properties, leads, recent activities
 */
const getAgentHubDashboard = async (req, res) => {
  try {
    // Agent auth via token (req.agent from verifyAgentToken middleware)
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized: Agent authentication required" });
    }

    const agent = await Agent.findById(req.agent._id);
    if (!agent || agent.status !== "active") {
      return res.status(403).json({ message: "Agent account is not active" });
    }

    // Count properties created by this agent
    const salePropertiesCount = await SaleProperty.countDocuments({ agentUserId: agent.userId, ownerType: "Agent" });
    const rentalPropertiesCount = await RentalProperty.countDocuments({ agentUserId: agent.userId, ownerType: "Agent" });
    const totalProperties = salePropertiesCount + rentalPropertiesCount;

    // Count active enquiries for agent's properties
    const salePropertyIds = await SaleProperty.find({ agentUserId: agent.userId, ownerType: "Agent" }).select('_id');
    const rentalPropertyIds = await RentalProperty.find({ agentUserId: agent.userId, ownerType: "Agent" }).select('_id');
    const allPropertyIds = [...salePropertyIds.map(p => p._id), ...rentalPropertyIds.map(p => p._id)];

    const enquiries = await EnquirySchema.find({ propertyId: { $in: allPropertyIds } });
    const totalEnquiries = enquiries.length;
    const newEnquiries = enquiries.filter(e => !e.responded).length;

    // Recent properties (last 5)
    const recentSaleProperties = await SaleProperty.find({ agentUserId: agent.userId, ownerType: "Agent" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title price Sector images createdAt');

    const recentRentalProperties = await RentalProperty.find({ agentUserId: agent.userId, ownerType: "Agent" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title monthlyRent Sector images createdAt');

    return res.json({
      agent: {
        name: agent.name,
        email: agent.email,
        mobileNumber: agent.mobileNumber,
        profilePhoto: agent.profilePhoto,
        status: agent.status,
        rating: agent.rating,
        ratingsCount: agent.ratingsCount,
      },
      stats: {
        totalProperties,
        saleProperties: salePropertiesCount,
        rentalProperties: rentalPropertiesCount,
        totalEnquiries,
        newEnquiries,
      },
      recentProperties: {
        sale: recentSaleProperties,
        rental: recentRentalProperties,
      },
    });
  } catch (error) {
    console.error("Error in getAgentHubDashboard:", error);
    res.status(500).json({ message: "Server error fetching dashboard" });
  }
};

/**
 * Get Agent's Properties — paginated list of all properties added by agent
 */
const getAgentProperties = async (req, res) => {
  try {
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page = 1, limit = 10, type = "all", status = "all" } = req.query;
    const skip = (page - 1) * limit;

    const agent = await Agent.findById(req.agent._id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const baseFilter = { agentUserId: agent.userId, ownerType: "Agent" };

    let saleProperties = [];
    let rentalProperties = [];
    let totalCount = 0;

    if (type === "all" || type === "sale") {
      const salesQuery = { ...baseFilter };
      if (status !== "all") {
        if (status === "active") salesQuery.isActive = true;
        if (status === "pending") salesQuery.isPostedNew = true;
      }

      const count = await SaleProperty.countDocuments(salesQuery);
      saleProperties = await SaleProperty.find(salesQuery)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? skip : 0)
        .limit(type === "all" ? limit : limit / 2)
        .select('_id title price Sector images createdAt isActive isPostedNew');

      if (type === "sale") totalCount = count;
    }

    if (type === "all" || type === "rental") {
      const rentalQuery = { ...baseFilter };
      if (status !== "all") {
        if (status === "active") rentalQuery.isActive = true;
        if (status === "pending") rentalQuery.isPostedNew = true;
      }

      const count = await RentalProperty.countDocuments(rentalQuery);
      rentalProperties = await RentalProperty.find(rentalQuery)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? skip : 0)
        .limit(type === "all" ? limit : limit / 2)
        .select('_id title monthlyRent Sector images createdAt isActive isPostedNew');

      if (type === "rental") totalCount = count;
    }

    if (type === "all") {
      totalCount = (await SaleProperty.countDocuments(baseFilter)) + (await RentalProperty.countDocuments(baseFilter));
    }

    const properties = [
      ...saleProperties.map(p => ({ ...p.toObject(), propertyType: 'sale' })),
      ...rentalProperties.map(p => ({ ...p.toObject(), propertyType: 'rental' })),
    ];

    return res.json({
      properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAgentProperties:", error);
    res.status(500).json({ message: "Server error fetching properties" });
  }
};

/**
 * Get Agent's Leads (Enquiries) — callback requests for agent's properties
 */
const getAgentLeads = async (req, res) => {
  try {
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page = 1, limit = 10, status = "all" } = req.query;
    const skip = (page - 1) * limit;

    const agent = await Agent.findById(req.agent._id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Get all property IDs for this agent
    const salePropertyIds = await SaleProperty.find({ agentUserId: agent.userId, ownerType: "Agent" }).select('_id');
    const rentalPropertyIds = await RentalProperty.find({ agentUserId: agent.userId, ownerType: "Agent" }).select('_id');
    const allPropertyIds = [...salePropertyIds.map(p => p._id), ...rentalPropertyIds.map(p => p._id)];

    if (allPropertyIds.length === 0) {
      return res.json({
        enquiries: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
      });
    }

    const enquiryQuery = { propertyId: { $in: allPropertyIds } };
    if (status !== "all") {
      if (status === "new") enquiryQuery.responded = false;
      if (status === "responded") enquiryQuery.responded = true;
    }

    const total = await EnquirySchema.countDocuments(enquiryQuery);
    const enquiries = await EnquirySchema.find(enquiryQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('propertyId', '_id title Sector price');

    return res.json({
      enquiries: enquiries.map(e => ({
        _id: e._id,
        propertyId: e.propertyId,
        name: e.name,
        mobile: e.mobile,
        email: e.email,
        message: e.message,
        responded: e.responded,
        createdAt: e.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAgentLeads:", error);
    res.status(500).json({ message: "Server error fetching leads" });
  }
};

/**
 * Update Lead Status (mark as responded)
 */
const updateLeadStatus = async (req, res) => {
  try {
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { enquiryId } = req.params;
    const { responded, response } = req.body;

    const enquiry = await EnquirySchema.findById(enquiryId);
    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    // Verify agent owns the property this enquiry is for
    const property = await SaleProperty.findById(enquiry.propertyId) || await RentalProperty.findById(enquiry.propertyId);
    if (!property || property.agentUserId.toString() !== req.agent.userId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this enquiry" });
    }

    enquiry.responded = responded || true;
    if (response) enquiry.response = response;
    enquiry.respondedAt = new Date();

    await enquiry.save();

    return res.json({
      message: "Enquiry status updated",
      enquiry: {
        _id: enquiry._id,
        responded: enquiry.responded,
        respondedAt: enquiry.respondedAt,
      },
    });
  } catch (error) {
    console.error("Error in updateLeadStatus:", error);
    res.status(500).json({ message: "Server error updating lead status" });
  }
};

/**
 * Get Agent Profile
 */
const getAgentProfile = async (req, res) => {
  try {
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const agent = await Agent.findById(req.agent._id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    return res.json({
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      mobileNumber: agent.mobileNumber,
      profilePhoto: agent.profilePhoto,
      agentType: agent.agentType,
      agencyName: agent.agencyName,
      status: agent.status,
      rating: agent.rating,
      ratingsCount: agent.ratingsCount,
      sectorsCovered: agent.sectorsCovered,
      createdAt: agent.createdAt,
    });
  } catch (error) {
    console.error("Error in getAgentProfile:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

/**
 * Update Agent Profile (partial updates only — name, email, phone, photo)
 */
const updateAgentProfile = async (req, res) => {
  try {
    if (!req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, email, profilePhoto } = req.body;
    const agent = await Agent.findById(req.agent._id);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (name) agent.name = name;
    if (email) agent.email = email;
    if (profilePhoto) agent.profilePhoto = profilePhoto;

    await agent.save();

    return res.json({
      message: "Profile updated successfully",
      agent: {
        name: agent.name,
        email: agent.email,
        profilePhoto: agent.profilePhoto,
      },
    });
  } catch (error) {
    console.error("Error in updateAgentProfile:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

module.exports = {
  getAgentHubDashboard,
  getAgentProperties,
  getAgentLeads,
  updateLeadStatus,
  getAgentProfile,
  updateAgentProfile,
};
