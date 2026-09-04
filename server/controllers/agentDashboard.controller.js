// server/controllers/agentDashboard.controller.js
const mongoose = require('mongoose');
const Agent = require('../models/Agent.model');
const UserPreferenceForm = require('../models/userpreferenceForm.model');
const SearchHistory = require("../models/SearchHistory.model.js");
const RentalProperty = require("../models/Rentalproperty.model.js");
const Sector = require("../models/Sector.model.js");

const multer = require("multer");
const xlsx = require("xlsx");
const { uploadWithFallback } = require("../config/FileHandling");




const SaleProperty = require('../models/SaleProperty.model.js');
const User = require('../models/user.model.js');


// ==============================
// 🔹 createRentalProperty
// ==============================
const createRentalPropertyAgent = async (req, res) => {
  try {
    // ------------------------------
    // Unified owner/agent resolution logic
    // ------------------------------
    let ownerId = null;
    let agentUserId = null;
    let ownerType = "Owner";

    // User-auth flow
    if (req.user) {
      ownerId = req.user._id;
      if (req.user.role === "Agent") {
        ownerType = "Agent";
        agentUserId = req.user._id; // User._id
      } else if (req.user.role === "admin") {
        ownerType = "Admin";
        agentUserId = req.user._id;
      }
    }

    // Agent-auth (incognito) flow
    else if (req.agent) {
      ownerId = req.agent._id;          // Agent owns property
      ownerType = "Agent";
      agentUserId = req.agent.userId;   // 🔑 User._id
    }

    // SAFETY GUARD
    if (!ownerId || !agentUserId) {
      return res.status(401).json({
        message: "Agent user linkage missing"
      });
    }

    const propertyData = {
      ...req.body,
      owner: ownerId,
      ownerType, // backend-derived
      images: [],

      // ✅ REQUIRED FOR AGENT / ADMIN OWNED PROPERTIES
      ...(agentUserId && { agentUserId })
    };

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
const createSalePropertyAgent = async (req, res) => {
  try {
    // Destructure request body
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

    // ------------------------------
    // Unified owner/agent resolution logic
    // ------------------------------
    let ownerId = null;
    let agentUserId = null;
    let ownerType = "Owner";

    // User-auth flow
    if (req.user) {
      ownerId = req.user._id;
      if (req.user.role === "Agent") {
        ownerType = "Agent";
        agentUserId = req.user._id; // User._id
      } else if (req.user.role === "admin") {
        ownerType = "Admin";
        agentUserId = req.user._id;
      }
    }

    // Agent-auth (incognito) flow
    else if (req.agent) {
      ownerId = req.agent._id;          // Agent owns property
      ownerType = "Agent";
      agentUserId = req.agent.userId;   // 🔑 User._id
    }

    // SAFETY GUARD
    if (!ownerId || !agentUserId) {
      return res.status(401).json({
        message: "Agent user linkage missing"
      });
    }

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

      ownerId,
      ownerType, // backend-derived
      Sector: normalizedSector,
      isActive: true,

      // ✅ REQUIRED FOR AGENT / ADMIN OWNED PROPERTIES
      ...(agentUserId && { agentUserId }),

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



/**
 * GET agent dashboard
 * GET /api/agent/dashboard
 *
 * Query/body params:
 * - visibilityMode: '0' (all active leads) or '1' (only assigned leads). default '0'
 * - page, limit for pagination
 * - Optional compatibility: assignFlag=1 + prefId + agentId => will attempt assignment (same atomic logic)
 *
 * Response: {
 *   agentDetails,
 *   userPreferenceForms: [...],
 *   stats: { totalLeads, newLeadsToday, pendingLeads },
 *   visibilityMode, page, limit, total, pages
 * }
 */
exports.getAgentDashboard = async (req, res) => {
  try {
    if (!req.agent || !req.agent._id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated agent' });
    }
    const requestingAgentId = req.agent._id;

    // pagination
    const pageStr = (req && req.query && req.query.page) || (req && req.body && req.body.page) || '1';
    const page = Math.max(1, parseInt(String(pageStr), 10) || 1);
    const limitStr = (req && req.query && req.query.limit) || (req && req.body && req.body.limit) || '50';
    const limit = Math.min(200, Math.max(1, parseInt(String(limitStr), 10) || 1));
    const skip = (page - 1) * limit;

    // optional assignment compatibility
    const { assignFlag, prefId, agentId } = req.body || req.query || {};
    if (assignFlag && (assignFlag === '1' || assignFlag === 1 || assignFlag === true)) {
      // call the same atomic assign logic (reuse function above by constructing a fake req/params is messy),
      // so we perform the transaction here inline (same as assignPreference)
      const isAdmin = req.user && req.user.isAdmin;
      const isSelfAssign = agentId && requestingAgentId && agentId.toString() === requestingAgentId.toString();
      if (!isAdmin && !isSelfAssign) {
        return res.status(403).json({ success: false, message: 'Forbidden to assign' });
      }
      if (!prefId || !agentId) return res.status(400).json({ success: false, message: 'prefId and agentId required' });

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const pref = await UserPreferenceForm.findOneAndUpdate(
          { _id: prefId },
          { $addToSet: { agentAssigned: mongoose.Types.ObjectId(agentId) } },
          { new: true, session }
        );
        if (!pref) {
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({ success: false, message: 'Preference not found' });
        }
        await Agent.findByIdAndUpdate(agentId, {
          $addToSet: { leadsAssigned: mongoose.Types.ObjectId(prefId) },
          $inc: { totalLeadsAssigned: 1 }
        }, { session });

        await session.commitTransaction();
        session.endSession();
        // continue — dashboard will be returned below
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('assignment transaction error:', err);
        return res.status(500).json({ success: false, message: 'Assignment failed', error: err.message });
      }
    }

    // decide visibility (only use Agent model for visibilityStatus)
    let visibilityStatus = '0';

    // fetch agent details
    const agent = await Agent.findById(requestingAgentId)
      .select('profilePhoto agentCode lastLoginAt experienceYears whatsappNumber bio availability leadsAssigned totalLeadsAssigned status visibilityStatus preferredSectors')
      .lean();
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    // Enforce agent-level visibility setting (only use Agent.visibilityStatus)
    // visibilityStatus stored on Agent: '0' => all leads visible, '1' => only assigned leads visible
    visibilityStatus = String(agent.visibilityStatus || '0');
    // console.log('DEBUG VISIBILITY (from Agent model):', { visibilityStatus, leadsAssigned: agent.leadsAssigned });

    const formProjection = 'userName preferredLocation budgetRange bhkSize propertyType furnishingLevel moveInDate brokerageAmount hasLoggedIn status agentAssigned createdAt updatedAt';

    // build and execute query
    let totalLeads = 0;
    let users = [];
    let leadIds = [];

    if (String(visibilityStatus) === '1') {
      // use the agent.leadsAssigned values directly (they may be ObjectId instances or strings)
      leadIds = Array.isArray(agent.leadsAssigned) ? agent.leadsAssigned.slice() : [];
      // log types, string forms and any _bsontype if present for debugging
    //   console.log('DEBUG RAW LEADS_ASSIGNED:', leadIds.map(id => ({ type: typeof id, str: String(id), bsontype: id && id._bsontype })));

      // Coerce each entry to a proper ObjectId if valid. Keep existing ObjectId instances as-is.
      leadIds = leadIds.map(id => {
        if (!id) return null;

        // If it's already a BSON ObjectId instance, keep it
        try {
          if (typeof id === 'object' && (id._bsontype === 'ObjectID' || (id.constructor && id.constructor.name === 'ObjectID'))) {
            return id;
          }
        } catch (e) {
          // ignore and try coercion below
        }

        // Otherwise coerce string/other types if valid. Always create with `new` to avoid "Class constructor ObjectId cannot be invoked without 'new'" errors
        try {
          const s = String(id);
          if (mongoose.isValidObjectId(s)) {
            return new mongoose.Types.ObjectId(s);
          }
        } catch (e) {
          console.error('leadId coercion error for id:', id, e && e.message);
        }

        // invalid entry => drop
        return null;
      }).filter(Boolean);

    //   console.log('DEBUG LEAD IDS AFTER COERCE:', leadIds.map(id => String(id)));

      // if there are no assigned leads, return empty results (count 0)
      if (leadIds.length === 0) {
        totalLeads = 0;
        users = [];
      } else {
        // fetch each assigned lead one-by-one (respecting the stored leadIds order), but only keep ACTIVE forms
        const fetchedForms = [];
        for (const lid of leadIds) {
          try {
            const form = await UserPreferenceForm.findOne({ _id: lid, status: 'ACTIVE' })
              .select(formProjection)
              .populate({ path: 'agentAssigned', select: 'name agentCode profilePhoto' })
              .lean();
            if (form) fetchedForms.push(form);
          } catch (e) {
            // log and continue on individual errors rather than failing the whole dashboard
            console.error('error fetching preference form for id', String(lid), e && e.message);
          }
        }

        // sort fetched forms by createdAt desc to match previous behavior
        fetchedForms.sort((a, b) => {
          const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

        totalLeads = fetchedForms.length;
        // apply pagination in-memory (skip & limit)
        users = fetchedForms.slice(skip, skip + limit);
      }
    } else {
      // Global mode: return all active forms (paginated)
      const globalQuery = { status: 'ACTIVE' };
      totalLeads = await UserPreferenceForm.countDocuments(globalQuery);
      users = await UserPreferenceForm.find(globalQuery)
        .select(formProjection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'agentAssigned', select: 'name agentCode profilePhoto' })
        .lean();
    }

    // Normalize userPreferenceForms: ensure mobileNumber excluded and agentAssigned populated with selected fields
    const normalizedUsers = (users || []).map(u => {
      const copy = { ...u };

      // Transform brokerageAmount for agent view: (X - 500) / 2
      if (typeof copy.brokerageAmount === 'number') {
        copy.brokerageAmount = Math.max(
          0,
          Math.floor((copy.brokerageAmount - 500) / 2)
        );
      }

      // normalize agentAssigned population
      if (Array.isArray(copy.agentAssigned)) {
        copy.agentAssigned = copy.agentAssigned.map(a => ({
          name: a.name,
          agentCode: a.agentCode,
          profilePhoto: a.profilePhoto,
          _id: a._id
        }));
      } else if (copy.agentAssigned && typeof copy.agentAssigned === 'object') {
        const a = copy.agentAssigned;
        copy.agentAssigned = {
          name: a.name,
          agentCode: a.agentCode,
          profilePhoto: a.profilePhoto,
          _id: a._id
        };
      }

      return copy;
    });

    // stats: new leads today and pending leads are computed globally (respecting visibilityMode)
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);

    const newLeadsTodayQuery = { status: 'ACTIVE', createdAt: { $gte: startOfToday, $lte: endOfToday } };
    if (String(visibilityStatus) === '1') newLeadsTodayQuery._id = { $in: leadIds };
    const newLeadsToday = await UserPreferenceForm.countDocuments(newLeadsTodayQuery);

    const pendingQuery = { status: 'ACTIVE', $or: [ { hasLoggedIn: false }, { contacted: { $ne: true } } ] };
    if (String(visibilityStatus) === '1') pendingQuery._id = { $in: leadIds };
    const pendingLeads = await UserPreferenceForm.countDocuments(pendingQuery);

    const stats = { totalLeads, newLeadsToday, pendingLeads };
    const pages = Math.ceil(totalLeads / limit);

    const agentDetailsResponse = {
      profilePhoto: agent.profilePhoto,
      agentCode: agent.agentCode,
      lastLoginAt: agent.lastLoginAt,
      experienceYears: agent.experienceYears,
      whatsappNumber: agent.whatsappNumber,
      bio: agent.bio,
      availability: agent.availability,
      leadsAssigned: agent.leadsAssigned,
      totalLeadsAssigned: agent.totalLeadsAssigned,
      preferredSectors: agent.preferredSectors || [],
      status: agent.status
    };

    // console.log('DEBUG FINAL COUNTS:', { totalLeads, returned: normalizedUsers.length, visibilityStatus });
    return res.json({
      success: true,
      agentDetails: agentDetailsResponse,
      userPreferenceForms: normalizedUsers,
        stats,
      status: agent.status,
      visibilityStatus: String(visibilityStatus),
      page,
      limit,
      total: totalLeads,
      pages
    });
  } catch (err) {
    console.error('getAgentDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


/**
 * POST /api/agent/leadinfo
 * Purpose: Allow agent to accept a lead and reveal mobile number
 * - Logs that the agent has viewed the mobile number
 * - Returns the mobile number only after acceptance
 */
exports.revealLeadMobileNumber = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const agentId = req.agent?._id;

    if (!isAdmin && !agentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated agent or admin'
      });
    }

    const { leadId } = req.body;

    if (!leadId || !mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ success: false, message: 'Invalid leadId' });
    }

    const lead = await UserPreferenceForm.findOne({
      _id: leadId,
      status: 'ACTIVE'
    }).select('mobileNumber agentAssigned mobileViewedByAgents mobileLock');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const now = new Date();

    // 🔒 Check if lead is currently locked by another agent (skip for Admin)
    if (
      !isAdmin &&
      lead.mobileLock &&
      lead.mobileLock.expiresAt &&
      new Date(lead.mobileLock.expiresAt) > now &&
      lead.mobileLock.lockedBy &&
      lead.mobileLock.lockedBy.toString() !== agentId.toString()
    ) {
      return res.status(423).json({
        success: false,
        message: "Lead is currently locked by another agent. Please try again after some time.",
        lockedUntil: lead.mobileLock.expiresAt
      });
    }


    // Admin view: allow mobile access WITHOUT locking or audit
    if (isAdmin) {
      return res.json({
        success: true,
        mobileNumber: lead.mobileNumber,
        viewedBy: 'admin',
        note: 'Admin view (no lock applied)'
      });
    }

    // Check if this agent has already viewed the mobile number
    const alreadyViewed = Array.isArray(lead.mobileViewedByAgents) &&
      lead.mobileViewedByAgents.some(
        v => v.agentId.toString() === agentId.toString()
      );

    // If not viewed earlier, log the view
    if (!alreadyViewed) {
      lead.mobileViewedByAgents.push({
        agentId,
        viewedAt: new Date()
      });

      // 🔒 Apply 15-minute lock for other agents
      const lockDurationMs = 15 * 60 * 1000;
      lead.mobileLock = {
        lockedBy: agentId,
        lockedAt: now,
        expiresAt: new Date(now.getTime() + lockDurationMs),
      };

      await lead.save();
    }

    return res.json({
      success: true,
      mobileNumber: lead.mobileNumber
    });

  } catch (error) {
    console.error('revealLeadMobileNumber error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reveal mobile number',
      error: error.message
    });
  }
};

exports.createRentalPropertyAgent = createRentalPropertyAgent;
exports.createSalePropertyAgent = createSalePropertyAgent;

/**
 * POST /api/agent/update-sectors
 * Update agent preferred sectors
 */
exports.updateAgentPreferredSectors = async (req, res) => {
  try {
    if (!req.agent || !req.agent._id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated agent' });
    }

    const { preferredSectors } = req.body;

    if (!Array.isArray(preferredSectors)) {
      return res.status(400).json({
        success: false,
        message: 'preferredSectors must be an array'
      });
    }

    const updated = await Agent.findByIdAndUpdate(
      req.agent._id,
      { preferredSectors },
      { new: true }
    ).select('preferredSectors');

    return res.json({
      success: true,
      preferredSectors: updated.preferredSectors
    });
  } catch (error) {
    console.error('updateAgentPreferredSectors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update preferred sectors',
      error: error.message
    });
  }
};