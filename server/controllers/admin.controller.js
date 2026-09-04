const Payment = require('../models/Payment.model');
const mongoose = require('mongoose');
const RentalProperty = mongoose.models.RentalProperty || require('../models/RentalProperty.model');
const SaleProperty = mongoose.models.SaleProperty || require('../models/SaleProperty.model');
const Sector = mongoose.models.Sector || require('../models/Sector.model');
const User = require('../models/user.model');
const UserPreferencesARIA = require('../models/UserPreferencesARIA.model');
const SearchHistory = require('../models/SearchHistory.model');
const PropertyAnalysis = require('../models/PropertyAnalysis.model');
const Reward = require('../models/Rewards.model');
const CustomerSupport = require('../models/CustomerSupport.model');
const ServiceRequest = require('../models/serviceRequests.model');
// ensure FileHandling runs so cloudinary is configured and we can use uploadWithFallback
const { uploadWithFallback } = require('../config/FileHandling');

// cloudinary client for Admin API calls (delete_resources, delete_resources_by_prefix, delete_folder)
const cloudinary = require('cloudinary').v2;



// Toggle ACTIVE / INACTIVE for Rental or Sale property
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find in RentalProperty first, then SaleProperty
    let property = await RentalProperty.findById(id) || await SaleProperty.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    const propertyType = property.defaultpropertytype;

    // Toggle active flag
    property.isActive = !property.isActive;
    // Clear the "isPostedNew" flag when an admin toggles active state so that
    // approving a property will also remove the 'newly posted' pending state.
    // When deactivating, also clear isPostedNew to avoid it being treated as 'pending'.
    property.isPostedNew = false;
    property.isEdited = false;

    await property.save();

    res.status(200).json({
      message: `Property (${propertyType}) ${property.isActive ? "activated" : "deactivated"} successfully.`,
      property,
    });
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({ message: "Error toggling property active status", error: error.message });
  }
};

// Toggle REVIEWED / NOT REVIEWED for Rental or Sale property (using PropertyReviewStatus model)
const PropertyReviewStatus = require('../models/propertyReviewStatus.model');
const toggleReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Detect property type automatically
    const rentalProp = await RentalProperty.findById(id);
    const saleProp = rentalProp ? null : await SaleProperty.findById(id);
    const property = rentalProp || saleProp;
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    const propertyType = property.defaultpropertytype;

    // Check if a review record exists for this property
    let reviewRecord = await PropertyReviewStatus.findOne({ propertyId: id });

    if (!reviewRecord) {
      // Create new review record if not exists
      reviewRecord = new PropertyReviewStatus({
        propertyId: id,
        propertyType: propertyType,
        isReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: req.user?.email || "admin"
      });
      await reviewRecord.save();

      return res.status(201).json({
        message: `Property (${propertyType}) marked as reviewed.`,
        reviewRecord
      });
    }

    // Toggle review state
    reviewRecord.isReviewed = !reviewRecord.isReviewed;
    reviewRecord.reviewedAt = reviewRecord.isReviewed ? new Date() : null;
    reviewRecord.reviewedBy = req.user?.email || "admin";
    await reviewRecord.save();

    res.status(200).json({
      message: `Property (${propertyType}) marked as ${reviewRecord.isReviewed ? "reviewed" : "not reviewed"}.`,
      reviewRecord
    });
  } catch (error) {
    console.error("Error toggling review status:", error);
    res.status(500).json({ message: "Error toggling property review status", error: error.message });
  }
};



const getCallbackRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { status, dateRange, sortBy = 'createdAt', order = 'desc', search } = req.query;

    // 1️⃣ Build filter
    const filter = {};

    if (status) filter.status = status;

    if (dateRange) {
      const [start, end] = dateRange.split(',');
      filter.createdAt = {
        $gte: new Date(start),
        $lte: end ? new Date(end) : new Date()
      };
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { issue: new RegExp(search, 'i') }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    // 2️⃣ RUN PAGINATION + COUNTS SEPARATELY (Mongo recommended)
    const [data, totalMatched, statusCounts, trendData] = await Promise.all([
      // paginated
      CustomerSupport.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),

      // total matched count
      CustomerSupport.countDocuments(filter),

      // status counts
      CustomerSupport.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // trend data
      CustomerSupport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    // --- Attach user.role to each callback request (batch fetch) ---
    // Collect possible emails and user ids from returned customer support docs
    const emails = [];
    const userIds = [];

    data.forEach(d => {
      if (d.email) emails.push(d.email);
      // common id-like fields used in different shapes
      if (d.user) userIds.push(d.user);
      if (d.userId) userIds.push(d.userId);
      if (d.createdBy) userIds.push(d.createdBy);
      if (d.resident) userIds.push(d.resident);
    });

    // normalize and dedupe
    const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean).map(id => String(id))));

    let usersMapByEmail = new Map();
    let usersMapById = new Map();

    if (uniqueEmails.length || uniqueIds.length) {
      // Build $or query parts
      const or = [];
      if (uniqueEmails.length) or.push({ email: { $in: uniqueEmails } });
      if (uniqueIds.length) or.push({ _id: { $in: uniqueIds } });

      const users = await User.find({ $or: or }).select('email role _id').lean();

      users.forEach(u => {
        if (u.email) usersMapByEmail.set(String(u.email).toLowerCase(), u);
        if (u._id) usersMapById.set(String(u._id), u);
      });
    }

    // Attach role field to each callback doc
    const dataWithRole = data.map(doc => {
      const out = { ...doc };
      let role = null;

      if (doc.email && usersMapByEmail.has(String(doc.email).toLowerCase())) {
        role = usersMapByEmail.get(String(doc.email).toLowerCase()).role;
      } else {
        // try id fields
        const candidateId = doc.user || doc.userId || doc.createdBy || doc.resident;
        if (candidateId && usersMapById.has(String(candidateId))) {
          role = usersMapById.get(String(candidateId)).role;
        }
      }

      out.userRole = role || null; // send `userRole` (null if unknown)
      return out;
    });

    // statusCountMap
    const statusCountMap = { pending: 0, resolved: 0, "in-progress": 0 };
    statusCounts.forEach(s => {
      statusCountMap[s._id] = s.count;
    });

    res.status(200).json({
      metadata: {
        total: totalMatched,
        totalRequests: statusCountMap.pending + statusCountMap.resolved + statusCountMap["in-progress"],
        pendingCount: statusCountMap.pending,
        resolvedCount: statusCountMap.resolved,
        inProgressCount: statusCountMap["in-progress"],
        page,
        limit,
        totalPages: Math.ceil(totalMatched / limit),
        sortBy,
        order
      },
      data: dataWithRole,
      trendData
    });

  } catch (error) {
    console.error("Error fetching callback requests:", error);
    res.status(500).json({
      message: "Server error while fetching callback requests",
      error: error.message,
    });
  }
};


const getPendingPayments = async (req, res) => {
  try {
    // Fetch all pending payments with resident populated
    const pendingPayments = await Payment.find({ status: 'pending' })
      .populate('resident')
      .lean();

    // Collect all property IDs
    const rentalIds = [];
    const saleIds = [];

    pendingPayments.forEach((payment) => {
      if (!payment.property) return;
      if (payment.propertyModel === 'RentalProperty') rentalIds.push(payment.property);
      if (payment.propertyModel === 'SaleProperty') saleIds.push(payment.property);
    });

    // Batch fetch properties
    const [rentalProps, saleProps] = await Promise.all([
      rentalIds.length
        ? RentalProperty.find({ _id: { $in: rentalIds } })
            .lean()
            .select('_id title address Sector owner images isActive createdAt')
        : [],
      saleIds.length
        ? SaleProperty.find({ _id: { $in: saleIds } })
            .lean()
            .select('_id title address Sector ownerId images isActive createdAt')
        : []
    ]);

    // Build maps for fast lookup
    const rentalMap = new Map(rentalProps.map((p) => [String(p._id), p]));
    const saleMap = new Map(saleProps.map((p) => [String(p._id), p]));

    // Attach properties
    const populatedPayments = pendingPayments.map((payment) => {
      let property = null;
      if (payment.propertyModel === 'RentalProperty') {
        property = rentalMap.get(String(payment.property)) || null;
      } else if (payment.propertyModel === 'SaleProperty') {
        property = saleMap.get(String(payment.property)) || null;
      }
      return { ...payment, property };
    });

    res.status(200).json(populatedPayments);
  } catch (error) {
    console.error('Error fetching pending payments (optimized):', error);
    res.status(500).json({
      message: 'Error fetching pending payments',
      error: error.message,
    });
  }
};


const updatePaymentStatus = async (req, res) => {
  const { paymentId, status } = req.body;
  try {
    const payment = await Payment.findByIdAndUpdate(paymentId, { status }, { new: true });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error });
  }
};


const getApprovedPayments = async (req, res) => {
  try {
    // Fetch all approved payments with resident populated
    const approvedPayments = await Payment.find({ status: 'approved' })
      .populate('resident')
      .lean();

    // Collect all property IDs from payments
    const rentalIds = [];
    const saleIds = [];

    approvedPayments.forEach((payment) => {
      if (!payment.property) return;
      if (payment.propertyModel === 'RentalProperty') rentalIds.push(payment.property);
      if (payment.propertyModel === 'SaleProperty') saleIds.push(payment.property);
    });

    // Batch fetch rental + sale properties
    const [rentalProps, saleProps] = await Promise.all([
      rentalIds.length
        ? RentalProperty.find({ _id: { $in: rentalIds } })
            .lean()
            .select('_id title address Sector owner images isActive createdAt')
        : [],
      saleIds.length
        ? SaleProperty.find({ _id: { $in: saleIds } })
            .lean()
            .select('_id title address Sector ownerId images isActive createdAt')
        : []
    ]);

    // Build maps for quick access
    const rentalMap = new Map(rentalProps.map((p) => [String(p._id), p]));
    const saleMap = new Map(saleProps.map((p) => [String(p._id), p]));

    // Attach property data to corresponding payment
    const populatedPayments = approvedPayments.map((payment) => {
      let property = null;
      if (payment.propertyModel === 'RentalProperty') {
        property = rentalMap.get(String(payment.property)) || null;
      } else if (payment.propertyModel === 'SaleProperty') {
        property = saleMap.get(String(payment.property)) || null;
      }
      return { ...payment, property };
    });

    res.status(200).json(populatedPayments);
  } catch (error) {
    console.error('Error fetching approved payments (optimized):', error);
    res.status(500).json({
      message: 'Error fetching approved payments',
      error: error.message,
    });
  }
};





const getAdminOverview = async (req, res) => {
  try {
    // --- PAGINATION + LIMITS ---
    const approvedPage = Math.max(1, parseInt(req.query.approvedPage, 10) || 1);
    const recentPage = Math.max(1, parseInt(req.query.recentPage, 10) || 1);
    const pageSize = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const approvedSkip = (approvedPage - 1) * pageSize;
    const recentSkip = (recentPage - 1) * pageSize;
    const topLimit = Math.max(3, parseInt(req.query.topLimit, 10) || 3);

    // --- CACHE (5 minutes) ---
    const CACHE_TTL = 1000 * 60 * 5;
    if (!global.__adminOverviewCache)
      global.__adminOverviewCache = { ts: 0, payload: null };
    const nowTs = Date.now();
    const useCache =
      global.__adminOverviewCache.ts &&
      nowTs - global.__adminOverviewCache.ts < CACHE_TTL &&
      !req.query.forceRefresh;

    // --- BATCH PROPERTY FETCH HELPER (reused) ---
    const fetchPropertiesByIds = async (ids = []) => {
      if (!ids.length) return new Map();
      const [rentalProps, saleProps] = await Promise.all([
        RentalProperty.find({ _id: { $in: ids } })
          .lean()
          .select(
            "_id title address Sector owner ownerId createdAt isActive ownerType"
          ),
        SaleProperty.find({ _id: { $in: ids } })
          .lean()
          .select(
            "_id title address Sector ownerId createdAt isActive ownerType"
          ),
      ]);

      const map = new Map();
      rentalProps.forEach((p) =>
        map.set(String(p._id), { ...p, defaultpropertytype: "rental" })
      );
      saleProps.forEach((p) =>
        map.set(String(p._id), { ...p, defaultpropertytype: "sale" })
      );
      return map;
    };

    // --- CACHE HIT: Only refresh paginated sections ---
    if (useCache) {
      const cached = global.__adminOverviewCache.payload;

      // Fetch paginated approved payments (lightweight fields) and recent activity concurrently
      const [approvedPaymentsRaw, recentUsers, recentRentalProperties, recentSaleProperties, recentPayments] = await Promise.all([
        Payment.find({ status: 'approved' }).sort({ paymentDate: -1 }).skip(approvedSkip).limit(pageSize).populate('resident', 'email').lean(),
        User.find().sort({ createdAt: -1 }).skip(recentSkip).limit(pageSize).select('email createdAt').lean(),
        RentalProperty.find({ isActive: true }).sort({ createdAt: -1 }).limit(pageSize).select('propertyType Sector address createdAt').lean(),
        SaleProperty.find({ isActive: true }).sort({ createdAt: -1 }).limit(pageSize).select('propertyType Sector address createdAt').lean(),
        Payment.find().sort({ paymentDate: -1 }).skip(recentSkip).limit(pageSize).select('amount resident paymentDate').populate('resident', 'email').lean()
      ]);

      // Attach properties to approved payments in batch to avoid per-item queries
      const approvedPropertyIds = approvedPaymentsRaw.map(p => p.property).filter(Boolean).map(String);
      const approvedPropsMap = await fetchPropertiesByIds(approvedPropertyIds);
      const approvedPayments = approvedPaymentsRaw.map(p => ({ ...p, property: approvedPropsMap.get(String(p.property)) || null }));

      // Build recentActivity (merge and sort small arrays)
      const recentProperties = [...(recentRentalProperties || []), ...(recentSaleProperties || [])].slice(0, pageSize);
      const recentUserActivities = (recentUsers || []).map(u => ({ type: 'user', user: u.email || 'Unknown User', action: 'New User Registered', location: '-', time: u.createdAt }));
      const recentPropertyActivities = recentProperties.map(p => ({ type: 'property', user: 'Admin', action: 'New Property Added', location: `${p.propertyType || 'Property'} in ${p.Sector || p.address || 'Unknown'}`, time: p.createdAt }));
      const recentPaymentActivities = (recentPayments || []).map(p => ({ type: 'payment', user: p.resident?.email || 'Unknown User', action: 'Payment Made', location: `₹${p.amount}`, time: p.paymentDate }));
      const recentActivity = [ ...recentUserActivities, ...recentPropertyActivities, ...recentPaymentActivities ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, pageSize);

      return res.status(200).json({
        summary: cached.summary,
        charts: cached.charts,
        recentActivity,
        approvedPayments,
        metadata: { approvedPage, recentPage, pageSize },
        cached: true
      });
    }

    // --- HEAVY SECTION OPTIMIZED: Consolidated parallel queries ---
    const [
      basicCounts,
      paymentAgg,
      revenueAgg,
      searchAgg,
      mostLocationAgg,
      ratingAgg,
      engagementAgg,
      growthAgg
    ] = await Promise.all([
      // Consolidated counts
      Promise.all([
        RentalProperty.countDocuments({ isActive: true }),
        SaleProperty.countDocuments({ isActive: true }),
        User.countDocuments(),
        User.countDocuments({ role: 'renter' }),
        User.countDocuments({ role: 'owner' }),
        User.countDocuments({ role: 'admin' }),
        UserPreferencesARIA.countDocuments(),
        SearchHistory.countDocuments()
      ]),
      // payment summary
      Payment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
      ]),
      // revenue
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // top searches
      SearchHistory.aggregate([
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      // top locations
      SearchHistory.aggregate([
        { $match: { location: { $exists: true, $ne: null } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // average rating
      PropertyAnalysis.aggregate([
        { $unwind: '$ratings' },
        { $match: { 'ratings.rating': { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$ratings.rating' } } }
      ]),
      // engagement total
      PropertyAnalysis.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $cond: [{ $isArray: '$views' }, { $size: '$views' }, 0] } },
            totalSaves: { $sum: { $cond: [{ $isArray: '$saves' }, { $size: '$saves' }, 0] } },
            totalRatings: { $sum: { $cond: [{ $isArray: '$ratings' }, { $size: '$ratings' }, 0] } }
          }
        }
      ]),
      // monthly user growth
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1) } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // destructure consolidated counts
    const [
      rentalCount,
      saleCount,
      totalUsers,
      renters,
      owners,
      admins,
      totalPreferences,
      totalSearches
    ] = basicCounts;

    const totalProperties = rentalCount + saleCount;

    // process paymentAgg into map
    const paymentSummary = (paymentAgg || []).reduce((acc, cur) => { acc[cur._id] = { count: cur.count, totalAmount: cur.totalAmount }; return acc; }, {});
    const totalRevenue =
      (revenueAgg && revenueAgg[0] && revenueAgg[0].total) || 0;

    // derive avgTransactionAmount from paymentAgg (defensive)
    const totalPaymentsCount = (paymentAgg || []).reduce((s, c) => s + (c.count || 0), 0);
    const totalPaymentsAmount = (paymentAgg || []).reduce((s, c) => s + (c.totalAmount || 0), 0);
    const avgTransactionAmount = totalPaymentsCount ? (totalPaymentsAmount / totalPaymentsCount) : 0;

    // process searches
    const topSearches = (searchAgg || []).map(s => ({ query: s._id, count: s.count }));
    const mostSearchedLocations = (mostLocationAgg || []).map(l => ({ location: l._id, count: l.count }));

    // Average searches per user (defensive: avoid division by zero)
    const uniqueSearchUsers = await SearchHistory.distinct('user');
    const uniqueSearchUsersCount = (Array.isArray(uniqueSearchUsers) && uniqueSearchUsers.length) ? uniqueSearchUsers.length : 1;
    const avgSearchesPerUser = totalSearches ? (totalSearches / uniqueSearchUsersCount) : 0;

    const averagePropertyRating = (ratingAgg && ratingAgg[0] && ratingAgg[0].avgRating) || 0;
    const engagementData = (engagementAgg && engagementAgg[0]) || { totalViews: 0, totalSaves: 0, totalRatings: 0 };
    const userGrowthFormatted = (growthAgg || []).map(item => ({ year: item._id.year, month: item._id.month, count: item.count }));

    // AI users count (distinct emails) - efficient distinct
    const aiUsers = await UserPreferencesARIA.distinct('email');

    // Rewards totals
    const totalRewardsDistributed = await Reward.countDocuments();
    const unclaimedRewards = await Reward.countDocuments({ claimed: { $ne: true } });
    const recentRewards = await Reward.find().sort({ createdAt: -1 }).limit(5).select('user message createdAt').lean();

    // Active users in last 30 days - use distinct on each collection then unify
    const last30Days = new Date(); last30Days.setDate(last30Days.getDate() - 30);
    const [activeUsersPayments, activeUsersSearches, activeUsersProperties, activeUsersPropertiesSale] = await Promise.all([
      Payment.distinct('resident', { paymentDate: { $gte: last30Days } }),
      SearchHistory.distinct('user', { createdAt: { $gte: last30Days } }),
      RentalProperty.distinct('owner', { createdAt: { $gte: last30Days } }),
      SaleProperty.distinct('ownerId', { createdAt: { $gte: last30Days } })
    ]);
    const activeUsersSet = new Set([...(activeUsersPayments || []), ...(activeUsersSearches || []), ...(activeUsersProperties || []), ...(activeUsersPropertiesSale || [])]);
    const activeUsersCount = activeUsersSet.size;
    const inactiveUsersCount = totalUsers - activeUsersCount;

    // --- Lightweight property engagement stats for rental and sale (avoid heavy lookups)
    // Fetch active property ids (only _id) for rental and sale
    const [rentalPropertyIds, salePropertyIds] = await Promise.all([
      RentalProperty.find({ isActive: true }).select('_id').lean().then(docs => docs.map(d => d._id)),
      SaleProperty.find({ isActive: true }).select('_id').lean().then(docs => docs.map(d => d._id))
    ]);

    // Aggregations to compute simple engagement metrics per type
    const [rentalStatsAgg, saleStatsAgg] = await Promise.all([
      rentalPropertyIds.length ? PropertyAnalysis.aggregate([
        { $match: { property: { $in: rentalPropertyIds } } },
        { $group: {
          _id: null,
          totalViews: { $sum: { $cond: [ { $isArray: '$views' }, { $size: '$views' }, 0 ] } },
          totalSaves: { $sum: { $cond: [ { $isArray: '$saves' }, { $size: '$saves' }, 0 ] } },
          avgEngagementTime: { $avg: '$engagementTime' },
          count: { $sum: 1 }
        } }
      ]) : Promise.resolve([]),
      salePropertyIds.length ? PropertyAnalysis.aggregate([
        { $match: { property: { $in: salePropertyIds } } },
        { $group: {
          _id: null,
          totalViews: { $sum: { $cond: [ { $isArray: '$views' }, { $size: '$views' }, 0 ] } },
          totalSaves: { $sum: { $cond: [ { $isArray: '$saves' }, { $size: '$saves' }, 0 ] } },
          avgEngagementTime: { $avg: '$engagementTime' },
          count: { $sum: 1 }
        } }
      ]) : Promise.resolve([])
    ]);

    const rentalStatsData = (rentalStatsAgg && rentalStatsAgg[0]) ? rentalStatsAgg[0] : { totalViews: 0, totalSaves: 0, avgEngagementTime: 0, count: 0 };
    const saleStatsData = (saleStatsAgg && saleStatsAgg[0]) ? saleStatsAgg[0] : { totalViews: 0, totalSaves: 0, avgEngagementTime: 0, count: 0 };

    // --- Top properties by views/saves/ratings (limit topLimit) ---
    const topPropsAgg = await Promise.all([
      // top by views
      PropertyAnalysis.aggregate([{ $project: { property: 1, viewsCount: { $cond: [{ $isArray: '$views' }, { $size: '$views' }, 0] } } }, { $sort: { viewsCount: -1 } }, { $limit: topLimit }]),
      // top by saves
      PropertyAnalysis.aggregate([{ $project: { property: 1, savesCount: { $cond: [{ $isArray: '$saves' }, { $size: '$saves' }, 0] } } }, { $sort: { savesCount: -1 } }, { $limit: topLimit }]),
      // top by avg rating
      PropertyAnalysis.aggregate([{ $unwind: '$ratings' }, { $group: { _id: '$property', avgRating: { $avg: '$ratings.rating' } } }, { $sort: { avgRating: -1 } }, { $limit: topLimit }])
    ]);

    const topViewedIds = (topPropsAgg[0] || []).map(a => String(a.property || a._id));
    const topSavedIds = (topPropsAgg[1] || []).map(a => String(a.property || a._id));
    const topRatedIds = (topPropsAgg[2] || []).map(a => String(a._id));

    const uniqueTopIds = Array.from(new Set([...topViewedIds, ...topSavedIds, ...topRatedIds]));
    const topPropsMap = await fetchPropertiesByIds(uniqueTopIds);

    const topViewed = (topPropsAgg[0] || []).map(a => ({ property: topPropsMap.get(String(a.property)) || null, viewsCount: a.viewsCount }));
    const topSaved = (topPropsAgg[1] || []).map(a => ({ property: topPropsMap.get(String(a.property)) || null, savesCount: a.savesCount }));
    const topRated = (topPropsAgg[2] || []).map(a => ({ property: topPropsMap.get(String(a._id)) || null, avgRating: a.avgRating }));

    // --- Recent activity and approved payments (paginated small sets) ---
    const [recentUsersPag, recentRentalPropsPag, recentSalePropsPag, recentPaymentsPag] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(recentSkip).limit(pageSize).select('email createdAt').lean(),
      RentalProperty.find({ isActive: true }).sort({ createdAt: -1 }).limit(pageSize).select('propertyType Sector address createdAt').lean(),
      SaleProperty.find({ isActive: true }).sort({ createdAt: -1 }).limit(pageSize).select('propertyType Sector address createdAt').lean(),
      Payment.find().sort({ paymentDate: -1 }).skip(recentSkip).limit(pageSize).select('amount resident paymentDate').populate('resident', 'email').lean()
    ]);

    const recentProperties = [...recentRentalPropsPag, ...recentSalePropsPag].slice(0, pageSize);
    const recentUserActivities = (recentUsersPag || []).map(u => ({ type: 'user', user: u.email || 'Unknown User', action: 'New User Registered', location: '-', time: u.createdAt }));
    const recentPropertyActivities = recentProperties.map(p => ({ type: 'property', user: 'Admin', action: 'New Property Added', location: `${p.propertyType || 'Property'} in ${p.Sector || p.address || 'Unknown'}`, time: p.createdAt }));
    const recentPaymentActivities = (recentPaymentsPag || []).map(p => ({ type: 'payment', user: p.resident?.email || 'Unknown User', action: 'Payment Made', location: `₹${p.amount}`, time: p.paymentDate }));
    const recentActivity = [ ...recentUserActivities, ...recentPropertyActivities, ...recentPaymentActivities ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, pageSize);

    // Approved payments paginated
    const approvedPaymentsRaw = await Payment.find({ status: 'approved' }).sort({ paymentDate: -1 }).skip(approvedSkip).limit(pageSize).populate('resident', 'email').lean();
    const approvedPropertyIds = approvedPaymentsRaw.map(p => p.property).filter(Boolean).map(String);
    const approvedPropsMapFinal = await fetchPropertiesByIds(approvedPropertyIds);
    const approvedPayments = approvedPaymentsRaw.map(p => ({ ...p, property: approvedPropsMapFinal.get(String(p.property)) || null }));

    // Build charts object (small)
    const charts = {
      userGrowth: userGrowthFormatted,
      aiUsageByRole: {},
      propertyStats: { rental: rentalStatsData, sale: saleStatsData, topViewed, topSaved, topRated },
      revenueByMethod: (paymentSummary || {}),
      engagement: engagementData,
      rewards: { totalRewards: totalRewardsDistributed, unclaimedRewards, recentRewards },
      searchInsights: { topSearches, mostSearchedLocations, avgSearchesPerUser }
    };

    // Summary object
    const summary = {
      totalUsers,
      renters,
      owners,
      admins,
      totalProperties,
      rentalCount,
      saleCount,
      pendingPayments: paymentSummary['pending']?.count || 0,
      approvedPayments: paymentSummary['approved']?.count || 0,
      approvedPaymentsThisMonth: (await Payment.countDocuments({ status: 'approved', paymentDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } })) || 0,
      completedPayments: paymentSummary['completed']?.count || 0,
      totalRevenue,
      totalPreferences,
      totalSearches,
      totalSearchesCount: totalSearches,
      averagePropertyRating,
      aiUsersCount: aiUsers.length,
      activeUsersCount,
      inactiveUsersCount,
      totalRewardsDistributed,
      totalRevenuePending: paymentSummary['pending']?.totalAmount || 0,
      totalRevenueCompleted: paymentSummary['completed']?.totalAmount || 0,
      totalRevenueApproved: paymentSummary['approved']?.totalAmount || 0,
      avgTransactionAmount: avgTransactionAmount
    };

    // Cache heavy payload (summary + charts) for short period
    global.__adminOverviewCache = { ts: nowTs, payload: { summary, charts } };

    return res.status(200).json({
      summary,
      charts,
      recentActivity,
      approvedPayments,
      metadata: { approvedPage, recentPage, pageSize, topLimit },
      cached: false
    });
  } catch (error) {
    console.error('Error fetching admin overview (optimized):', error);
    res.status(500).json({ message: 'Error fetching admin overview', error: error.message });
  }
};

const getAllUsersDetailed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // 1️⃣ Fetch users (page only)
    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .select("email role mobileNumber createdAt")
      .lean();

    const userIds = users.map((u) => u._id);
    const userEmails = users.map((u) => u.email);

    // 2️⃣ Batch fetch related collections (ONE query per collection)
    const [
      preferences,
      searches,
      payments,
      rentalProps,
      saleProps,
      rewardsDocs,
      analysisDocs
    ] = await Promise.all([
      UserPreferencesARIA.find({ email: { $in: userEmails } }).lean(),
      SearchHistory.find({ user: { $in: userIds } }).sort({ createdAt: -1 }).lean(),
      Payment.find({ resident: { $in: userIds } }).lean(),
      RentalProperty.find({ owner: { $in: userIds } }).lean(),
      SaleProperty.find({ ownerId: { $in: userIds } }).lean(),
      Reward.find({ userId: { $in: userIds } }).lean(),
      PropertyAnalysis.find({ user: { $in: userIds } }).lean()
    ]);

    // 3️⃣ Build maps for faster access
    const prefsByEmail = {};
    preferences.forEach((p) => {
      if (!prefsByEmail[p.email]) prefsByEmail[p.email] = [];
      prefsByEmail[p.email].push(p);
    });

    const searchesByUser = {};
    searches.forEach((s) => {
      if (!searchesByUser[s.user]) searchesByUser[s.user] = [];
      searchesByUser[s.user].push(s);
    });

    const paymentsByUser = {};
    payments.forEach((p) => {
      if (!paymentsByUser[p.resident]) paymentsByUser[p.resident] = [];
      paymentsByUser[p.resident].push(p);
    });

    const rentalPropsByOwner = {};
    rentalProps.forEach((p) => {
      if (!rentalPropsByOwner[p.owner]) rentalPropsByOwner[p.owner] = [];
      rentalPropsByOwner[p.owner].push(p);
    });

    const salePropsByOwner = {};
    saleProps.forEach((p) => {
      if (!salePropsByOwner[p.ownerId]) salePropsByOwner[p.ownerId] = [];
      salePropsByOwner[p.ownerId].push(p);
    });

    const rewardsByUser = {};
    rewardsDocs.forEach((r) => {
      if (!rewardsByUser[r.userId]) rewardsByUser[r.userId] = [];
      rewardsByUser[r.userId].push(r);
    });

    const analysisByUser = {};
    analysisDocs.forEach((a) => {
      if (!analysisByUser[a.user]) analysisByUser[a.user] = [];
      analysisByUser[a.user].push(a);
    });

    // 4️⃣ Build final response per user (same structure as before)
    const detailedUsers = users.map((user) => {
      const userId = user._id.toString();

      const userPrefs = prefsByEmail[user.email] || [];
      let formattedPrefs = null;
      if (userPrefs.length > 0) {
        formattedPrefs = { rentalPreferences: {}, salePreferences: {} };
        userPrefs.forEach((p) => {
          const type = (p.assistantType || "").toLowerCase();
          if (type === "rental") formattedPrefs.rentalPreferences = p.preferences || {};
          else if (type === "sale") formattedPrefs.salePreferences = p.preferences || {};
        });
      }

      const userRewards = rewardsByUser[userId] || [];
      const latestReward = userRewards.length ? userRewards[userRewards.length - 1] : null;

      const postedRental = rentalPropsByOwner[userId] || [];
      const postedSale = salePropsByOwner[userId] || [];
      const allPosted = [...postedRental, ...postedSale].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const engagementDocs = analysisByUser[userId] || [];
      const totalViews = engagementDocs.reduce((a, d) => a + (d.views?.length || 0), 0);
      const totalSaves = engagementDocs.reduce((a, d) => a + (d.saves?.length || 0), 0);
      const ratingsCount = engagementDocs.reduce((a, d) => a + (d.ratings?.length || 0), 0);

      const userSearches = searchesByUser[userId] || [];
      const userPayments = paymentsByUser[userId] || [];

      return {
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
        registeredAt: user.createdAt,

        aiAssistantUsage: formattedPrefs,

        rewards: {
          count: userRewards.length,
          latestMessage: latestReward ? latestReward.message : null,
        },

        searchHistory: userSearches.slice(0, 10).map((s) => ({
          query: s.query,
          timestamp: s.createdAt,
        })),

        payments: userPayments, // frontend shape preserved

        propertiesPosted: allPosted,

        engagementStats: {
          totalViews,
          totalSaves,
          ratingsCount,
        },

        averageRatingGiven: null // keeping placeholder for compatibility
      };
    });

    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users: detailedUsers,
    });
  } catch (error) {
    console.error("Optimized getAllUsersDetailed error:", error);
    res.status(500).json({ message: "Error fetching detailed user info", error: error.message });
  }
};




// Get user rewards status: active/inactive counts and rewards list for a userId
const getUserRewardsStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const rewards = await Reward.find({ userId }).select("message isActive distributedAt");

    const activeCount = rewards.filter(r => r.isActive).length;
    const inactiveCount = rewards.filter(r => !r.isActive).length;

    res.status(200).json({
      activeCount,
      inactiveCount,
      rewards
    });
  } catch (error) {
    console.error("Error fetching user reward status:", error);
    res.status(500).json({ message: "Error fetching user reward status", error: error.message });
  }
};

// Update a user's role (only admins can perform this)
const updateUserRole = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    // Verify the requester is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can update roles" });
    }

    // Update target user's role
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: `User role updated successfully to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Error updating user role", error: error.message });
  }
};
const getAllProperties = async (req, res) => {
  try {
    // Pagination params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    // Use MongoDB aggregation + unionWith; include isActive and images so frontend shows correct state
    const aggregated = await RentalProperty.aggregate([
      {
        $project: {
          _id: 1,
          title: 1,
          address: 1,
          Sector: 1,
          owner: '$owner',
          agentUserId: '$agentUserId',
          defaultpropertytype: { $literal: 'rental' },
          createdAt: 1,
          isActive: 1,
          images: 1,
          monthlyRent: 1,
          propertyType: '$propertyType',
          ownerType: '$ownerType',
          ownernumber: `$ownernumber`,
        }
      },
      {
        $unionWith: {
          coll: 'saleproperties',
          pipeline: [
            {
              $project: {
                _id: 1,
                title: 1,
                address: 1,
                Sector: 1,
                owner: '$ownerId',
                agentUserId: '$agentUserId',
                defaultpropertytype: { $literal: 'sale' },
                createdAt: 1,
                isActive: 1,
                images: 1,
                price: 1,
                propertyType: '$propertyType',
                ownerType: '$ownerType',
                ownernumber: `$ownernumber`,
              }
            }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [
            { $count: 'total' }
          ],
          data: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ]).allowDiskUse(true);

    const total = aggregated[0].metadata[0] ? aggregated[0].metadata[0].total : 0;
    const totalPages = Math.ceil(total / limit);
    const properties = aggregated[0].data || [];

    // Fetch review statuses in one query
    const ids = properties.map((p) => p._id);
    const reviewStatuses = await PropertyReviewStatus.find({ propertyId: { $in: ids } }).lean();
    const reviewMap = new Map(reviewStatuses.map(r => [String(r.propertyId), r.isReviewed]));

    // Populate owners (batch) — include possible ownerType stored on User model as a defensive measure
    const ownerIds = properties.map(p => p.owner).filter(Boolean);
    const agentUserIds = properties
      .map(p => p.agentUserId)
      .filter(Boolean);
    const owners = ownerIds.length
      ? await User.find({ _id: { $in: ownerIds } })
          .select('name email ownerType role mobileNumber')
          .lean()
      : [];

    const agents = agentUserIds.length
      ? await User.find({ _id: { $in: agentUserIds } })
          .select('name email mobileNumber')
          .lean()
      : [];

    const ownerMap = new Map(owners.map(o => [String(o._id), o]));
    const agentMap = new Map(agents.map(a => [String(a._id), a]));

    // Attach review + owner + agent (if ownerType === "Agent") + ensure isActive field is present for frontend
    const finalProperties = properties.map((p) => {
      const ownerObj = ownerMap.get(String(p.owner)) || null;
      // Determine ownerType priority:
      // 1) property.ownerType (explicitly saved on property)
      // 2) owner.ownerType (if populated on user)
      // 3) owner.role (fallback, may be 'agent'/'owner')
      const resolvedOwnerType = p.ownerType ?? ownerObj?.ownerType ?? ownerObj?.role ?? undefined;

      return {
        ...p,
        isReviewed: reviewMap.get(String(p._id)) || false,
        owner: ownerObj,
        ownerType: resolvedOwnerType,
        agent:
          p.ownerType === "Agent" && p.agentUserId
            ? agentMap.get(String(p.agentUserId)) || null
            : null,
        // Ensure boolean isActive (default true if missing) so frontend doesn't treat undefined as inactive
        isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
        // Ensure images is an array
        images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
      };
    });

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      properties: finalProperties
    });

  } catch (error) {
    console.error('Error fetching all properties (optimized):', error);
    return res.status(500).json({
      message: 'Server error while fetching all properties',
      error: error.message
    });
  }
};
// Admin can update any service request details (including status)

const updateServiceRequestDetails = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: Please log in.' });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    // Only admin can update request details
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admin can update request details' });
    }

    // Load current doc first (to compare changes + enforce renter/owner rule)
    const current = await ServiceRequest.findById(id);
    if (!current) return res.status(404).json({ message: 'Service request not found' });

    const {
      // core editable fields
      userRole,
      propertyType,
      propertyId,
      address,
      serviceType,
      contactNumber,
      preferredDate,
      notes,
      status,
      // optional: allow admin to reassign the ticket
      createdBy, // ObjectId (optional)
    } = req.body || {};
    // console.log("Incoming update payload:", req.body);

    // Build update operator
    const update = { $set: {}, $unset: {} };
    const changedFields = [];

    // (optional) reassign createdBy
    if (createdBy !== undefined) {
      if (!mongoose.isValidObjectId(createdBy)) {
        return res.status(400).json({ message: 'Invalid createdBy id' });
      }
      update.$set.createdBy = createdBy;
      changedFields.push('createdBy');
    }

    // Validate userRole
    let effectiveRole = current.userRole;
    if (userRole !== undefined) {
      const allowedRoles = ['owner', 'renter'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(400).json({ message: "Invalid userRole. Allowed: 'owner', 'renter'" });
      }
      update.$set.userRole = userRole;
      effectiveRole = userRole;
      changedFields.push('userRole');
    }

    // Validate serviceType
    if (serviceType !== undefined) {
      const allowedServices = ServiceRequest.schema.path('serviceType').enumValues;
      if (!allowedServices.includes(serviceType)) {
        return res.status(400).json({ message: `Invalid serviceType. Allowed: ${allowedServices.join(', ')}` });
      }
      update.$set.serviceType = serviceType;
      changedFields.push('serviceType');
    }

    // Validate status
    let statusChanged = false;
    if (status !== undefined) {
      const allowedStatuses = ServiceRequest.schema.path('status').enumValues;
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
      }
      if (current.status !== status) statusChanged = true;
      update.$set.status = status;
      changedFields.push('status');
    }

    // Normalize phone
    if (contactNumber !== undefined) {
      const normalizedPhone = String(contactNumber).replace(/\s|\-/g, '');
      update.$set.contactNumber = normalizedPhone;
      changedFields.push('contactNumber');
    }

    if (preferredDate !== undefined) {
      update.$set.preferredDate = preferredDate ? new Date(preferredDate) : null;
      changedFields.push('preferredDate');
    }

    if (notes !== undefined) {
      update.$set.notes = notes;
      changedFields.push('notes');
    }

    if (address !== undefined) {
      update.$set.address = address;
      changedFields.push('address');
    }

    // Property linkage rules based on role
    if (effectiveRole === 'owner') {
      if (propertyType !== undefined) {
        const allowedTypes = ['RentalProperty', 'SaleProperty'];
        if (!allowedTypes.includes(propertyType)) {
          return res.status(400).json({ message: "Invalid propertyType. Allowed: 'RentalProperty', 'SaleProperty'" });
        }
        update.$set.propertyType = propertyType;
        changedFields.push('propertyType');
      }
      if (propertyId !== undefined) {
        if (!mongoose.isValidObjectId(propertyId)) {
          return res.status(400).json({ message: 'Invalid propertyId' });
        }
        update.$set.propertyId = propertyId;
        changedFields.push('propertyId');
      }

      // If owner request ends up without propertyId, ensure address exists
      const finalPropId = (propertyId !== undefined) ? propertyId : current.propertyId;
      const finalAddr = (address !== undefined) ? address : current.address;
      if (!finalPropId && !finalAddr) {
        return res.status(400).json({ message: 'Either propertyId or address is required for owner requests.' });
      }
    } else {
      // renter: must have address; clear property link
      if (address === undefined && !current.address) {
        return res.status(400).json({ message: 'address is required for renter requests' });
      }
      update.$unset.propertyId = '';
      update.$unset.propertyType = '';
    }

    // Add audit trail / timeline entry
    // We maintain a "timeline" array (if present) with status changes & a condensed edit note.
    if (statusChanged) {
      update.$push = update.$push || {};
      update.$push.timeline = {
        status,
        date: new Date(),
        description: `Status updated to "${status}" by admin`,
      };
    } else if (changedFields.length > 0) {
      update.$push = update.$push || {};
      update.$push.timeline = {
        status: current.status,
        date: new Date(),
        description: `Fields updated by admin: ${changedFields.join(', ')}`,
      };
    }

    if (Object.keys(update.$unset).length === 0) delete update.$unset;

    // console.log("MongoDB update object:", JSON.stringify(update, null, 2));
    // Execute update
    const updatedDoc = await ServiceRequest.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    )
      .populate({ path: 'createdBy', select: 'name email mobileNumber' })
      .populate({
        path: 'propertyId',
        select: 'title address Sector location defaultpropertytype images',
        strictPopulate: false,
      })
      .lean();

    return res.status(200).json({
      message: 'Request updated successfully',
      request: updatedDoc,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error while updating request details',
      error: error.message,
    });
  }
};
const updatePropertyAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Only admin is allowed
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Admin only" });
    }

    // Rebuild totalArea if dotted keys exist
    if (req.body["totalArea.sqft"] || req.body["totalArea.configuration"]) {
      req.body.totalArea = {
        sqft: req.body["totalArea.sqft"] ? Number(req.body["totalArea.sqft"]) : undefined,
        configuration: req.body["totalArea.configuration"] || "",
      };
      delete req.body["totalArea.sqft"];
      delete req.body["totalArea.configuration"];
    }

    // Normalize BHK config
    if (req.body.totalArea?.configuration) {
      const num = req.body.totalArea.configuration.match(/\\d+/);
      req.body.totalArea.configuration = num ? `${num[0]} BHK` : req.body.totalArea.configuration.toUpperCase();
    }

    // Determine if rental or sale
    let property = await RentalProperty.findById(id) || await SaleProperty.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Stick to existing cloudinary folder
    const folderArg = property.cloudinaryFolder || "default";

    // ---- Image and pano uploads (same as your code) ----
    let stickyAccountIndex = property.cloudinaryAccountIndex ?? null;
    let existingImages = property.images || [];
    let existingPanos = property.panoramas || [];

    let normalFiles = [];
    let panoFiles = [];

    if (req.files) {
      normalFiles = req.files.images || [];
      panoFiles = req.files.panoFiles || [];
    }

    let newImageUrls = [];
    for (const file of normalFiles) {
      const { secure_url, accountIndex } = await uploadWithFallback(file.path, folderArg, stickyAccountIndex, null);
      if (secure_url) newImageUrls.push(secure_url);
      if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
        stickyAccountIndex = accountIndex;
      }
    }

    let newPanos = [];
    const titles = Array.isArray(req.body["panoTitles[]"]) ? req.body["panoTitles[]"] : req.body.panoTitles ? [req.body.panoTitles] : [];
    const yawArr = Array.isArray(req.body["panoYaw[]"]) ? req.body["panoYaw[]"] : req.body.panoYaw ? [req.body.panoYaw] : [];
    const pitchArr = Array.isArray(req.body["panoPitch[]"]) ? req.body["panoPitch[]"] : req.body.panoPitch ? [req.body.panoPitch] : [];
    const notesArr = Array.isArray(req.body["panoNotes[]"]) ? req.body["panoNotes[]"] : req.body.panoNotes ? [req.body.panoNotes] : [];

    for (let i = 0; i < panoFiles.length; i++) {
      const { secure_url } = await uploadWithFallback(panoFiles[i].path, `${folderArg}/360`, stickyAccountIndex, null);
      if (secure_url) {
        newPanos.push({
          title: titles[i] || `Scene ${i + 1}`,
          url: secure_url,
          yaw: Number(yawArr[i]) || 0,
          pitch: Number(pitchArr[i]) || 0,
          notes: notesArr[i] || ""
        });
      }
    }

    // Merge
    const mergedImages = [...existingImages, ...newImageUrls].slice(0, 8);
    const mergedPanos = [...existingPanos, ...newPanos].slice(0, 6);

    const updatePayload = {
      ...req.body,
      images: mergedImages,
      panoramas: mergedPanos,
      cloudinaryFolder: folderArg,
      cloudinaryAccountIndex: stickyAccountIndex
    };

    // If Sector present: preserve named societies containing 'DLF', otherwise try to normalize numeric sector
    if (updatePayload.Sector && typeof updatePayload.Sector === 'string') {
      const rawSector = updatePayload.Sector.trim();
      if (/\bdlf\b/i.test(rawSector)) {
        // contains 'DLF' (case-insensitive) — keep exactly as user provided (trimmed)
        updatePayload.Sector = rawSector;
      } else {
        const formatted = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        // match exact patterns like 'sector 46', 'sec46', or just digits
        const sectorMatch = formatted.match(/^(?:sector|sec)?\s*(\d+)$/);
        if (sectorMatch) {
          updatePayload.Sector = `Sector-${sectorMatch[1]}`;
        } else {
          // keep as a locality name, but capitalise first char
          updatePayload.Sector = rawSector.charAt(0).toUpperCase() + rawSector.slice(1);
        }
      }
    }

    // Update in correct collection
    let updatedProperty = await RentalProperty.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updatedProperty) {
      updatedProperty = await SaleProperty.findByIdAndUpdate(id, updatePayload, { new: true });
    }

    if (!updatedProperty) return res.status(404).json({ message: "Property not found" });

    return res.status(200).json({ message: "Property updated successfully", property: updatedProperty });

  } catch (error) {
    console.error("Admin update property error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const deletePropertyAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional query flags:
    // ?soft=true  -> only mark property inactive (soft-delete), don't remove Cloudinary assets or DB record
    // ?dryRun=true -> do not delete, only return the list of assets that WOULD be deleted
    const softDelete = String(req.query.soft || '').toLowerCase() === 'true';
    const dryRun = String(req.query.dryRun || '').toLowerCase() === 'true';

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Admin only' });
    }

    // Load property (rental or sale)
    let property = await RentalProperty.findById(id) || await SaleProperty.findById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // If soft delete requested, only mark inactive and exit
    if (softDelete) {
      property.isActive = false;
      property.isPostedNew = false;
      await property.save();
      return res.status(200).json({ message: 'Property soft-deleted (marked inactive)' });
    }

    const accountIndex = property.cloudinaryAccountIndex ?? null;

    // -------- collect public_ids from property images + panoramas (robust extraction) --------
    const publicIds = [];

    const extractPublicIdFromUrl = (urlStr) => {
      try {
        const u = new URL(urlStr);
        const parts = u.pathname.split('/').filter(Boolean); // remove empty segments
        const uploadIdx = parts.findIndex((p) => p === 'upload');
        if (uploadIdx === -1) return null;
        // find version token like v123
        let versionIdx = -1;
        for (let i = uploadIdx + 1; i < parts.length; i++) {
          if (/^v\d+$/.test(parts[i])) { versionIdx = i; break; }
        }
        const start = versionIdx >= 0 ? versionIdx + 1 : uploadIdx + 1;
        const candidate = parts.slice(start).join('/'); // folder/..../file.ext
        if (!candidate) return null;
        return candidate.replace(/\.[^/.]+$/, '');
      } catch (e) {
        return null;
      }
    };

    if (Array.isArray(property.images)) {
      for (const img of property.images) {
        if (!img) continue;
        if (typeof img === 'object' && img.public_id) {
          publicIds.push(img.public_id);
        } else if (typeof img === 'string') {
          const pid = extractPublicIdFromUrl(img);
          if (pid) publicIds.push(pid);
        }
      }
    }

    if (Array.isArray(property.panoramas)) {
      for (const pano of property.panoramas) {
        if (!pano) continue;
        if (typeof pano === 'object' && pano.public_id) {
          publicIds.push(pano.public_id);
        } else {
          const url = typeof pano === 'string' ? pano : pano.url;
          if (url) {
            const pid = extractPublicIdFromUrl(url);
            if (pid) publicIds.push(pid);
          }
        }
      }
    }

    // De-dupe and filter
    const uniqIds = Array.from(new Set(publicIds)).filter(Boolean);

    // If dryRun, return the list of public_ids that would be deleted and do not perform deletion
    if (dryRun) {
      return res.status(200).json({ message: 'Dry run - assets to delete', publicIds: uniqIds });
    }

    // -------- If no public ids found, simply remove DB doc(s) after logging --------
    if (!uniqIds.length) {
      console.info('No linked Cloudinary assets found for property', id);
      await RentalProperty.findByIdAndDelete(id);
      await SaleProperty.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Property deleted (no linked Cloudinary assets found)' });
    }

    // -------- Delete assets in chunks, with retries and fallback --------
    const CHUNK_SIZE = 100; // cloudinary accepts up to 100 ids
    const chunks = [];
    for (let i = 0; i < uniqIds.length; i += CHUNK_SIZE) chunks.push(uniqIds.slice(i, i + CHUNK_SIZE));

    const deletionResults = { deleted: [], notFound: [], errors: [] };

    const maxRetries = 2;
    for (const chunk of chunks) {
      let attempt = 0;
      let success = false;
      while (attempt <= maxRetries && !success) {
        try {
          attempt++;
          if (!cloudinary || !cloudinary.api || !cloudinary.api.delete_resources) {
            throw new Error('Cloudinary Admin API not configured');
          }
          const resp = await cloudinary.api.delete_resources(chunk, { resource_type: 'image' });
          // resp is object with results; mark successes
          // resp may contain 'deleted' map
          if (resp && resp.deleted) {
            for (const [pid, result] of Object.entries(resp.deleted)) {
              if (result === 'deleted' || result === 'ok') deletionResults.deleted.push(pid);
              else if (result === 'not found') deletionResults.notFound.push(pid);
              else deletionResults.errors.push({ pid, result });
            }
          }
          success = true;
        } catch (err) {
          console.warn('Cloudinary bulk delete attempt failed (attempt ' + attempt + '):', err && err.message);
          if (attempt > maxRetries) {
            // fallback per id using uploadWithFallback if available
            for (const pid of chunk) {
              try {
                if (typeof uploadWithFallback === 'function') {
                  // uploadWithFallback signature used earlier: uploadWithFallback(filePath, folder, accountIndex, publicIdToDelete, deleteFlag)
                  await uploadWithFallback(null, null, accountIndex, pid, true);
                  deletionResults.deleted.push(pid);
                } else {
                  deletionResults.errors.push({ pid, error: 'uploadWithFallback not available' });
                }
              } catch (e) {
                deletionResults.errors.push({ pid, error: e && e.message });
              }
            }
            break;
          } else {
            // wait a bit then retry
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }
    }

    // After attempting asset deletion, remove DB docs
    await RentalProperty.findByIdAndDelete(id);
    await SaleProperty.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Property deleted and linked assets attempted', result: deletionResults });
  } catch (error) {
    console.error('Admin delete property error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const createRentalPropertyAdmin = async (req, res) => {
  try {
    // ------------------------------
    // Prepare property data with images (owner is not set here)
    // ------------------------------
    const body = req.body || {};
    const propertyData = { ...body, images: [] };
    // Normalize owner contact number from different possible form-data keys
    const ownerCandidate =
      body.ownernumber ||
      body.ownerNumber ||
      body.ownerMobile ||
      body.owner_phone ||
      body.ownerPhone ||
      body.owner_contact ||
      body.ownerContact ||
      null;

    if (ownerCandidate) {
      propertyData.ownernumber = String(ownerCandidate).trim();
    }
    

    // --- Normalize frontend keys to schema keys (defensive mapping) ---
    propertyData.title = (propertyData.title || body.title || body.propertyTitle || "").toString().trim();

    // Sector - accept either casing / location
    propertyData.Sector = propertyData.Sector || body.Sector || body.sector || body.locationSector || "";

    // monthlyRent - coerce to Number from possible string fields: monthlyRent, rent, price
    const rentCandidate =
      propertyData.monthlyRent ?? body.monthlyRent ?? body.rent ?? body.price ?? body.monthlyrent;
    propertyData.monthlyRent = rentCandidate !== undefined && rentCandidate !== null
      ? Number(String(rentCandidate).trim()) || 0
      : 0;

    // totalArea normalization: prefer nested object, then dotted keys
    if (body.totalArea && typeof body.totalArea === 'object') {
      propertyData.totalArea = propertyData.totalArea || {};
      propertyData.totalArea.sqft = Number(body.totalArea.sqft) || Number(body.totalAreaSqft) || propertyData.totalArea.sqft || 0;
      propertyData.totalArea.configuration = (body.totalArea.configuration && String(body.totalArea.configuration).trim()) ||
        (body.totalAreaConfiguration && String(body.totalAreaConfiguration).trim()) ||
        (propertyData.totalArea && propertyData.totalArea.configuration) || "";
    } else {
      propertyData.totalArea = propertyData.totalArea || {};
      propertyData.totalArea.sqft = Number(body.totalAreaSqft) || Number(body["totalArea.sqft"]) || Number(propertyData.totalArea.sqft) || 0;
      propertyData.totalArea.configuration =
        (body.totalAreaConfiguration && String(body.totalAreaConfiguration).trim()) ||
        (body["totalArea.configuration"] && String(body["totalArea.configuration"]).trim()) ||
        (propertyData.totalArea && propertyData.totalArea.configuration) || "";
    }

    // Accept ownerNumber from frontend (camelCase) and map to backend key (ownernumber)
    if (!propertyData.ownernumber && (body.ownerNumber || propertyData.ownerNumber)) {
      propertyData.ownernumber = String(body.ownerNumber || propertyData.ownerNumber).trim();
      // Optionally remove camelCase to avoid duplicate storage
      if (propertyData.ownerNumber) delete propertyData.ownerNumber;
    }

    // Ensure images field is an array if frontend sent JSON array of URLs
    if (!Array.isArray(propertyData.images) && propertyData.images) {
      // if images is a comma-separated string, split; else wrap single string
      if (typeof propertyData.images === 'string') {
        propertyData.images = propertyData.images.includes(',') ? propertyData.images.split(',').map(s => s.trim()).filter(Boolean) : [propertyData.images];
      } else {
        propertyData.images = [];
      }
    }

    // Basic required-fields check (clear 400s)
    const missing = [];
    if (!propertyData.title) missing.push('title');
    if (!propertyData.Sector) missing.push('Sector');
    if (!propertyData.monthlyRent || Number(propertyData.monthlyRent) <= 0) missing.push('monthlyRent');

    if (missing.length) {
      return res.status(400).json({ message: 'Missing required fields', missing });
    }

    // Ensure ownernumber is only saved if a non-empty value is provided
    if (propertyData.hasOwnProperty('ownernumber')) {
      if (!propertyData.ownernumber || String(propertyData.ownernumber).trim() === '') {
        delete propertyData.ownernumber;
      } else {
        propertyData.ownernumber = String(propertyData.ownernumber).trim();
      }
    }

    // ------------------------------
    // Normalize totalArea object with sqft and configuration
    // Handles dotted keys and multiple input variants
    // ------------------------------
    propertyData.totalArea = {
      sqft:
        Number(req.body.totalAreaSqft) ||
        Number(req.body.totalArea?.sqft) ||
        Number(req.body["totalArea.sqft"]) ||
        0,
      configuration:
        req.body.totalAreaConfiguration?.trim() ||
        req.body.totalArea?.configuration?.trim() ||
        req.body["totalArea.configuration"]?.trim() ||
        "",
    };

    // ------------------------------
    // Normalize configuration string (e.g., "3 BHK", "2bhk", etc.)
    // ------------------------------
    if (propertyData.totalArea.configuration) {
      let rawConfig = propertyData.totalArea.configuration.trim().toLowerCase();

      // Match variants like "3bhk", "3 bhk", etc.
      const bhkMatch = rawConfig.match(/(\d+)\s*bhk/);
      const normalizedConfig = bhkMatch ? `${bhkMatch[1]} BHK` : rawConfig.toUpperCase();

      propertyData.totalArea.configuration = normalizedConfig;
      // console.log("✅ Normalized Configuration ->", normalizedConfig);
    }

    // ------------------------------
    // Normalize Sector field (handles variants like "sect 46", "sector46", "sec-46", "46", etc.)
    // ------------------------------
    if (propertyData.Sector) {
      const formattedSector = propertyData.Sector
        .trim()
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();

      let cleanSector = null;

      const match = formattedSector.match(/sector\s*(\d+)/);
      if (match) {
        cleanSector = `Sector-${match[1]}`;
      } else if (/^\d+$/.test(formattedSector)) {
        cleanSector = `Sector-${formattedSector}`;
      } else if (formattedSector.startsWith("sec")) {
        const num = formattedSector.replace("sec", "").trim();
        cleanSector = num ? `Sector-${num}` : "Sector-Unknown";
      } else {
        cleanSector =
          formattedSector.charAt(0).toUpperCase() + formattedSector.slice(1);
      }

      // console.log("✅ Normalized Sector ->", cleanSector);

      // ------------------------------
      // Save or update Sector collection with configurations
      // ------------------------------
      const existingSector = await Sector.findOne({
        name: { $regex: new RegExp(`^${cleanSector}$`, "i") },
      });

      if (existingSector) {
        if (propertyData.totalArea?.configuration) {
          const configValue = propertyData.totalArea.configuration.trim().toUpperCase();
          if (!existingSector.configurations?.includes(configValue)) {
            existingSector.configurations = existingSector.configurations || [];
            existingSector.configurations.push(configValue);
            await existingSector.save();
          }
        }
      } else {
        const newSector = new Sector({
          name: cleanSector,
          configurations: propertyData.totalArea?.configuration
            ? [propertyData.totalArea.configuration.trim().toUpperCase()]
            : [],
        });
        await newSector.save();
      }

      propertyData.Sector = cleanSector; // ensure normalized value is saved
    }

    // ------------------------------
    // Initialize arrays for uploaded files
    // ------------------------------
    let images = [];
    let panoramas = [];

    // ------------------------------
    // Determine Cloudinary folder (sector/address) and persist
    // ------------------------------
    const sectorFolder = propertyData.Sector
      ? propertyData.Sector.replace(/[^a-zA-Z0-9-_]/g, "_")
      : "Uncategorized";

    const addressSegment = propertyData.address
      ? propertyData.address.toString().replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 80)
      : null;

    const compositeFolder = addressSegment ? `${sectorFolder}/${addressSegment}` : sectorFolder;
    propertyData.cloudinaryFolder = compositeFolder;

    // ------------------------------
    // Collect files from multer (.fields or .array), split normal vs pano
    // ------------------------------
    let normalFiles = [];
    let panoFiles = [];

    if (req.files) {
      if (Array.isArray(req.files)) {
        // Using multer.array with mixed fieldnames
        normalFiles = req.files.filter((f) => f.fieldname === "images");
        panoFiles = req.files.filter((f) => f.fieldname === "panoFiles");
      } else {
        // Using multer.fields
        normalFiles = Array.isArray(req.files.images) ? req.files.images : [];
        panoFiles = Array.isArray(req.files.panoFiles) ? req.files.panoFiles : [];
      }
    }
    // Enforce caps: save only first 8 normal and first 6 pano images
if (normalFiles && normalFiles.length > 8) normalFiles = normalFiles.slice(0, 8);
if (panoFiles && panoFiles.length > 6) panoFiles = panoFiles.slice(0, 6);

    // ------------------------------
    // Upload normal images (stick to one Cloudinary account per property)
    // ------------------------------
    let stickyAccountIndex = null;

    if (normalFiles.length > 0) {
      for (const file of normalFiles) {
        const { secure_url, accountIndex } = await uploadWithFallback(
          file.path,
          compositeFolder,
          stickyAccountIndex,
          null
        );
        images.push(secure_url);
        if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
          stickyAccountIndex = accountIndex;
        }
      }
    }

    // ------------------------------
    // Parse pano metadata arrays from body (accept both with and without [] keys)
    // ------------------------------
    const toArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);
    const titles = toArray(req.body["panoTitles[]"] ?? req.body.panoTitles).map((t) =>
      (t || "").toString().trim()
    );
    const yaws = toArray(req.body["panoYaw[]"] ?? req.body.panoYaw).map((n) => Number(n) || 0);
    const pitches = toArray(req.body["panoPitch[]"] ?? req.body.panoPitch).map((n) => Number(n) || 0);
    const notesArr = toArray(req.body["panoNotes[]"] ?? req.body.panoNotes).map((s) =>
      (s || "").toString().trim()
    );

    // ------------------------------
    // Upload pano files into a nested /360 folder and build panoramas[]
    // ------------------------------
    if (panoFiles.length > 0) {
      const panoFolder = `${compositeFolder}/360`;
      for (let i = 0; i < panoFiles.length; i++) {
        const file = panoFiles[i];
        const title = titles[i] || `Scene ${i + 1}`;
        const yaw = yaws[i] ?? 0;
        const pitch = pitches[i] ?? 0;
        const note = notesArr[i] || "";

        const { secure_url, accountIndex } = await uploadWithFallback(
          file.path,
          panoFolder,
          // Keep same account for the whole property if already chosen
          stickyAccountIndex,
          null
        );

        panoramas.push({ title, url: secure_url, yaw, pitch, notes: note });
        if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
          stickyAccountIndex = accountIndex;
        }
      }
    }

    // ------------------------------
    // Persist the chosen account index on the property for future updates
    // ------------------------------
    if (stickyAccountIndex !== null) {
      propertyData.cloudinaryAccountIndex = stickyAccountIndex;
    }

    // Assign arrays to payload
    propertyData.images = images;
    if (panoramas.length > 0) {
      propertyData.panoramas = panoramas;
    }

    // ------------------------------
    // Create new RentalProperty document and save
    // ------------------------------
    const Rentalproperty = new RentalProperty(propertyData);
    const savedProperty = await Rentalproperty.save();

    // ------------------------------
    // Respond with success and saved property
    // ------------------------------
    res.status(201).json({
      message: "Property created successfully",
      property: savedProperty,
    });

  } catch (error) {
    console.error("❌ Property creation error:", error);
    res.status(500).json({
      message: "Server error while creating property",
      error: error.message,
    });
  }
};
const createSalePropertyAdmin = async (req, res) => {
  try {
    // Destructure request body and extract owner ID
    const {
      title,
      description,
      price,
      bedrooms,
      bathrooms,
      location,
      Sector: sectorRaw,
      "totalArea.sqft": totalAreaSqft,
      "totalArea.configuration": totalAreaConfiguration
    } = req.body;


    // Step 1: Validate required fields
    if (!title || !price) {
      return res.status(400).json({ message: "Title and Price are required." });
    }

    // Step 3: Normalize sector input and ensure sector exists in DB
    let normalizedSector = null;
    if (sectorRaw && typeof sectorRaw === "string") {
      const formattedSector = sectorRaw
        .trim()
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();

      const match = formattedSector.match(/sector\s*(\d+)/);
      if (match) {
        normalizedSector = `Sector-${match[1]}`;
      } else if (/^\d+$/.test(formattedSector)) {
        normalizedSector = `Sector-${formattedSector}`;
      } else if (formattedSector.startsWith("sec")) {
        const num = formattedSector.replace("sec", "").trim();
        normalizedSector = `Sector-${num}`;
      } else {
        normalizedSector =
          formattedSector.charAt(0).toUpperCase() + formattedSector.slice(1);
      }

      // Check if sector exists; create if not
      const existingSector = await Sector.findOne({ name: normalizedSector });
      if (!existingSector) {
        await Sector.create({ name: normalizedSector });
      }
    }

    // Determine address folder segment for Cloudinary (prefer explicit address, then location)
    const addressArg = (req.body.address && String(req.body.address))
      || (location && (location.address ? String(location.address) : String(location)))
      || null;

    // Build a stable composite folder: <Sector or 'sale-properties'>/<Address>
    const sectorFolder = (normalizedSector || 'sale-properties')
      .toString()
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 80);
    const addressSegment = addressArg
      ? addressArg.toString().replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80)
      : null;
    const compositeFolder = addressSegment ? `${sectorFolder}/${addressSegment}` : sectorFolder;

    // Step 2: Handle image uploads (normal + 360°) or accept image URLs
    // Normal photos -> properties/<sector>/<address>
    // 360° photos   -> properties/<sector>/<address>/360
    let images = [];
    let panoramas = [];
    let stickyAccountIndex = null; // ensure a single Cloudinary account per property

    // Collect files from multer (.fields or .array), split normal vs pano
    let normalFiles = [];
    let panoFiles = [];

    if (req.files) {
      if (Array.isArray(req.files)) {
        // Using multer.array with mixed fieldnames
        normalFiles = req.files.filter((f) => f.fieldname === "images");
        panoFiles = req.files.filter((f) => f.fieldname === "panoFiles");
      } else {
        // Using multer.fields
        normalFiles = Array.isArray(req.files.images) ? req.files.images : [];
        panoFiles = Array.isArray(req.files.panoFiles) ? req.files.panoFiles : [];
      }
    }
    // Enforce caps: save only first 8 normal and first 6 pano images
if (normalFiles && normalFiles.length > 8) normalFiles = normalFiles.slice(0, 8);
if (panoFiles && panoFiles.length > 6) panoFiles = panoFiles.slice(0, 6);

    // Upload normal images
    if (normalFiles.length > 0) {
      for (const file of normalFiles) {
        try {
          const { secure_url, accountIndex } = await uploadWithFallback(
            file.path,
            compositeFolder,
            stickyAccountIndex,
            null
          );
          images.push(secure_url);
          if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
            stickyAccountIndex = accountIndex;
          }
        } catch (uploadError) {
          console.error("❌ Cloudinary upload error (image):", uploadError);
        }
      }
    } else if (req.body.images && Array.isArray(req.body.images)) {
      // Fallback: accept direct URLs if provided
      images = req.body.images;
    }

    // Parse pano metadata arrays from body (accept both with and without [] keys)
    const toArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);
    const titles = toArray(req.body["panoTitles[]"] ?? req.body.panoTitles).map((t) =>
      (t || "").toString().trim()
    );
    const yaws = toArray(req.body["panoYaw[]"] ?? req.body.panoYaw).map((n) => Number(n) || 0);
    const pitches = toArray(req.body["panoPitch[]"] ?? req.body.panoPitch).map((n) => Number(n) || 0);
    const notesArr = toArray(req.body["panoNotes[]"] ?? req.body.panoNotes).map((s) =>
      (s || "").toString().trim()
    );

    // Upload 360° pano files into nested /360 folder and build panoramas[]
    if (panoFiles.length > 0) {
      const panoFolder = `${compositeFolder}/360`;
      for (let i = 0; i < panoFiles.length; i++) {
        const file = panoFiles[i];
        const title = titles[i] || `Scene ${i + 1}`;
        const yaw = yaws[i] ?? 0;
        const pitch = pitches[i] ?? 0;
        const note = notesArr[i] || "";
        try {
          const { secure_url, accountIndex } = await uploadWithFallback(
            file.path,
            panoFolder,
            // Keep same account for the whole property if already chosen
            stickyAccountIndex,
            null
          );
          panoramas.push({ title, url: secure_url, yaw, pitch, notes: note });
          if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
            stickyAccountIndex = accountIndex;
          }
        } catch (uploadError) {
          console.error("❌ Cloudinary upload error (pano):", uploadError);
        }
      }
    }

    // Step 4: Normalize totalArea configuration (e.g., "2 BHK", "3 BHK")
    let normalizedConfig;
    if (typeof totalAreaConfiguration === "string" && totalAreaConfiguration.trim()) {
      const numMatch = totalAreaConfiguration.trim().match(/(\d+)/);
      if (numMatch) {
        normalizedConfig = `${numMatch[1]} BHK`;
      } else {
        normalizedConfig = totalAreaConfiguration.trim().toUpperCase();
      }
    }

    const totalArea = {
      sqft: totalAreaSqft ? Number(totalAreaSqft) : undefined,
      configuration: normalizedConfig || undefined,
    };
    // Normalize owner contact number from different possible form-data keys
    const ownerCandidateSale =
      req.body.ownernumber ||
      req.body.ownerNumber ||
      req.body.ownerMobile ||
      req.body.owner_phone ||
      req.body.ownerPhone ||
      req.body.owner_contact ||
      req.body.ownerContact ||
      null;

    if (ownerCandidateSale) {
      // will be assigned into the newProperty below as ownernumber
    }

    // Step 5: Create new SaleProperty document with default isActive = true
    const newProperty = new SaleProperty({
      title,
      description,
      price,
      totalArea,
      bedrooms,
      bathrooms,
      location,
      images,
      panoramas: panoramas.length ? panoramas : undefined,
      ownernumber: ownerCandidateSale ? String(ownerCandidateSale).trim() : undefined,
      Sector: normalizedSector,
      isActive: true,
      cloudinaryAccountIndex: stickyAccountIndex !== null ? stickyAccountIndex : undefined,
      cloudinaryFolder: compositeFolder,
    });

    // Step 6: Save property and respond
    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);

  } catch (error) {
    res.status(500).json({ message: "Failed to create property", error: error.message });
  }
};


module.exports = {
  getPendingPayments,
  updatePaymentStatus,
  getApprovedPayments,
  getAdminOverview,
  getAllUsersDetailed,
  getCallbackRequests,
  getUserRewardsStatus,
  toggleActiveStatus,
  toggleReviewStatus,
  updateUserRole,
  getAllProperties,
  updateServiceRequestDetails,
  deletePropertyAdmin,
  updatePropertyAdmin,
  createRentalPropertyAdmin,
  createSalePropertyAdmin
  
};
