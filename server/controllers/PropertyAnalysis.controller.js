/**
 * PropertyAnalysis.controller.js
 * 
 * This controller manages property analysis metrics including views, saves,
 * lead conversion rates, engagement times, and ratings for properties.
 * It also provides endpoints to fetch metrics, saved properties, and user-specific
 * property analytics.
 */

const mongoose = require('mongoose');

const PropertyAnalysis = require('../models/PropertyAnalysis.model');
const Enquiry = require('../models/EnquirySchema.model');
const Payment = require('../models/Payment.model');
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");


/* ================================
   Controller: Add a View to Property
   ================================ */
const addView = async (req, res) => {
  try {
    // Extract propertyId from request body and userId from authenticated user
    const { propertyId } = req.body;
    const userId = req.user?._id || null;

    // Update or create PropertyAnalysis document by adding a view with the user reference
    const metrics = await PropertyAnalysis.findOneAndUpdate(
      { property: propertyId },
      { $push: { views: { user: userId } } },
      { upsert: true, new: true }
    );

    // Respond with updated metrics
    res.status(200).json(metrics);
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: 'Error adding view' });
  }
};


/* ================================
   Controller: Add a Save to Property
   ================================ */
const addSave = async (req, res) => {
  try {
    // Extract propertyId from request body and userId from authenticated user
    const { propertyId } = req.body;
    const userId = req.user._id;

    // Update or create PropertyAnalysis document by adding a save with the user reference
    const metrics = await PropertyAnalysis.findOneAndUpdate(
      { property: propertyId },
      { $push: { saves: { user: userId } } },
      { upsert: true, new: true }
    );

    // Respond with updated metrics
    res.status(200).json(metrics);
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: 'Error adding save' });
  }
};


/* ================================
   Controller: Get Lead Conversion Rate for a Property
   ================================ */
const getLeadConversion = async (req, res) => {
  try {
    // Extract propertyId from request parameters
    const propertyId = req.params.id;

    // Count total enquiries (leads) for the property
    const totalLeads = await Enquiry.countDocuments({ property: propertyId });

    // Count completed payments for the property
    const completedPayments = await Payment.countDocuments({ property: propertyId, status: 'completed' });

    // Calculate conversion rate as percentage
    const conversionRate = totalLeads > 0 ? (completedPayments / totalLeads) * 100 : 0;

    // Respond with lead conversion data rounded to 1 decimal place
    res.status(200).json({
      totalLeads,
      completedPayments,
      conversionRate: Number(conversionRate.toFixed(1))
    });
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: 'Error calculating lead conversion' });
  }
};


/* ================================
   Controller: Add Engagement Time for a Property
   ================================ */
const addEngagementTime = async (req, res) => {
  try {
    // Extract propertyId and seconds from request body, and userId from authenticated user
    const { propertyId, seconds } = req.body;
    const userId = req.user._id;

    // Update or create PropertyAnalysis document by adding engagement time with user and seconds
    const metrics = await PropertyAnalysis.findOneAndUpdate(
      { property: propertyId },
      { $push: { engagementTime: { user: userId, seconds } } },
      { upsert: true, new: true }
    );

    // Respond with updated metrics
    res.status(200).json(metrics);
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: 'Error adding engagement time' });
  }
};


/* ================================
   Controller: Add a Rating to a Property
   ================================ */
const addRating = async (req, res) => {
  try {
    // Extract propertyId, rating, and comment from request body, and userId from authenticated user
    const { propertyId, rating, comment } = req.body;
    const userId = req.user._id;

    // Update or create PropertyAnalysis document by adding a rating with user, rating, and comment
    const metrics = await PropertyAnalysis.findOneAndUpdate(
      { property: propertyId },
      { $push: { ratings: { user: userId, rating, comment } } },
      { upsert: true, new: true }
    );

    // Respond with updated metrics
    res.status(200).json(metrics);
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: 'Error adding rating' });
  }
};


/* ================================
   Controller: Get Metrics for a Property
   ================================ */
const getMetrics = async (req, res) => {
  try {
    // Extract propertyId from request parameters
    const propertyId = req.params.id;

    // Validate propertyId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    // Find existing PropertyAnalysis document and populate user references
    let metrics = await PropertyAnalysis.findOne({ property: propertyId })
      .populate('views.user', 'name email')
      .populate('saves.user', 'name email')
      .populate('engagementTime.user', 'name email')
      .populate('ratings.user', 'name email');

    // If no metrics found, create an empty PropertyAnalysis document
    if (!metrics) {
      metrics = new PropertyAnalysis({
        property: propertyId,
        views: [],
        saves: [],
        engagementTime: [],
        ratings: []
      });
      await metrics.save();
    }

    // Respond with the metrics document
    res.status(200).json(metrics);
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: "Server error fetching metrics" });
  }
};

/* ================================
   Controller: Get Saved Properties by User (with property details)
   ================================ */
const getSavedProperties = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); 
    const skip = (page - 1) * limit;

    // Total number of saved properties
    const total = await PropertyAnalysis.countDocuments({
      "saves.user": userId
    });

    if (total === 0) {
      return res.status(200).json({
        total: 0,
        page,
        limit,
        properties: []
      });
    }

    // Fetch only paged saved analysis docs
    const savedDocs = await PropertyAnalysis.find({ "saves.user": userId })
      .skip(skip)
      .limit(limit)
      .lean();

    // Extract property IDs
    const propertyIds = savedDocs
      .map(doc => doc.property)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id))
      .map(id => id.toString());

    if (propertyIds.length === 0) {
      return res.status(200).json({
        total,
        page,
        limit,
        properties: []
      });
    }

    // Fetch properties from both Rental & Sale collections
    const [rentalProps, saleProps] = await Promise.all([
      RentalProperty.find({ _id: { $in: propertyIds }, isActive: true }).lean(),
      SaleProperty.find({ _id: { $in: propertyIds }, isActive: true }).lean()
    ]);

    // Map for fast lookup
    const propertyMap = new Map();
    rentalProps.forEach(p => propertyMap.set(p._id.toString(), { ...p, propertyType: "rental" }));
    saleProps.forEach(p => propertyMap.set(p._id.toString(), { ...p, propertyType: "sale" }));

    // Final combined list (in same order as savedDocs)
    const populatedProperties = savedDocs
      .map(doc => {
        const id = doc.property.toString();
        const property = propertyMap.get(id);
        if (!property) return null;

        // Extract savedAt
        const savedEntry = (doc.saves || []).find(
          s => s.user?.toString() === userId.toString()
        );

        return {
          ...property,
          savedAt: savedEntry?.savedAt || null
        };
      })
      .filter(Boolean); // remove nulls

    return res.status(200).json({
      total,
      page,
      limit,
      properties: populatedProperties
    });
  } catch (error) {
    console.error("❌ Error in getSavedProperties:", error);
    res.status(500).json({
      error: "Server error fetching saved properties"
    });
  }
};

/* ================================
   Controller: Get User's Property Metrics Summary
   ================================ */
const getUserPropertyMetrics = async (req, res) => {
  try {
    // Extract userId from authenticated user or cookies
    const userId = req.user?._id || req.cookies?.userId;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Fetch active rental properties owned by user, selecting only _id
    const rentalProps = await RentalProperty.find({
      owner: userId,
      // Only active properties assumed by model or query
    }).select("_id");

    // Fetch active sale properties owned by user, selecting only _id
    const saleProps = await SaleProperty.find({
      owner: userId,
      // Only active properties assumed by model or query
    }).select("_id");

    // Combine all property IDs owned by user
    const allUserPropertyIds = [
      ...rentalProps.map(p => p._id),
      ...saleProps.map(p => p._id)
    ];

    // If user owns no properties, respond with 404
    if (allUserPropertyIds.length === 0) {
      return res.status(404).json({ message: "No properties found for this user" });
    }

    // Retrieve PropertyAnalysis documents for user's properties
    let analytics = await PropertyAnalysis.find({ property: { $in: allUserPropertyIds } });

    // Filter out analytics with invalid or missing property references
    analytics = analytics.filter(a => a.property && mongoose.Types.ObjectId.isValid(a.property));

    // If no analytics found, respond with zeroed metrics
    if (analytics.length === 0) {
      return res.status(200).json({
        totalProperties: 0,
        totalViews: 0,
        totalSaves: 0,
        totalRatings: 0,
        avgRating: 0,
        avgEngagement: 0,
      });
    }

    // Extract property IDs from analytics
    const analyzedPropertyIds = analytics.map(a => a.property.toString());

    // Calculate total views, saves, and ratings across all analytics
    const totalViews = analytics.reduce((sum, a) => sum + (a.views?.length || 0), 0);
    const totalSaves = analytics.reduce((sum, a) => sum + (a.saves?.length || 0), 0);
    const totalRatings = analytics.reduce((sum, a) => sum + (a.ratings?.length || 0), 0);

    // Calculate average rating if ratings exist
    const avgRating =
      totalRatings > 0
        ? (
            analytics.reduce((sum, a) => {
              const total = a.ratings?.reduce((acc, r) => acc + (r.rating || 0), 0) || 0;
              return sum + total;
            }, 0) / totalRatings
          ).toFixed(1)
        : 0;

    // Calculate average engagement time in seconds
    const avgEngagement =
      analytics.reduce((sum, a) => {
        const totalSeconds = a.engagementTime?.reduce((acc, e) => acc + (e.seconds || 0), 0) || 0;
        const count = a.engagementTime?.length || 0;
        return sum + (count > 0 ? totalSeconds / count : 0);
      }, 0) / analytics.length;

    // Respond with aggregated metrics
    res.status(200).json({
      totalProperties: analyzedPropertyIds.length,
      totalViews,
      totalSaves,
      totalRatings,
      avgRating,
      avgEngagement: Math.round(avgEngagement),
    });
  } catch (err) {
    // Handle errors and respond with status 500
    res.status(500).json({ error: "Server error fetching user property metrics" });
  }
};


/* ================================
   Export Controller Functions
   ================================ */
module.exports = {
  addView,
  addSave,
  getLeadConversion,
  addEngagementTime,
  addRating,
  getMetrics,
  getSavedProperties,
  getUserPropertyMetrics
};
