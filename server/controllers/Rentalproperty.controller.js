// ==========================================
// Rental Property Controller
// Handles creation, retrieval, and management of rental properties,
// including normalization of data and integration with Cloudinary.
// ==========================================

// ==============================
// Imports
// ==============================
const SearchHistory = require("../models/SearchHistory.model.js");
const RentalProperty = require("../models/Rentalproperty.model.js");
const Sector = require("../models/Sector.model.js");
const User = require("../models/user.model.js");

const multer = require("multer");
const xlsx = require("xlsx");
const { uploadWithFallback } = require("../config/FileHandling");

// Multer setup for Excel file uploads (if needed)
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });

// ==============================
// 🔹 createRentalProperty
// ==============================
const createRentalProperty = async (req, res) => {
  try {
    // ------------------------------
    // Extract owner ID from authenticated user
    // ------------------------------
    const ownerId = req.user?._id || req.user?.id;
    // ------------------------------
    // Determine agentUserId (User._id of agent if applicable)
    // ------------------------------
    let agentUserId = null;

    if (req.user?.role === "Agent") {
      agentUserId = ownerId;
    }
    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized: Owner ID not found" });
    }
    // ------------------------------
    // Ensure user's role transitions from "renter" -> "owner" (unless agent/admin)
    // ------------------------------
    try {
      const postingUser = await User.findById(ownerId).select("role");
      if (postingUser) {
        const currentRole = (postingUser.role || "").toString().toLowerCase();
        // only change if currently 'renter'
        if (currentRole === "renter") {
          postingUser.role = "owner";
          await postingUser.save();
          // optionally: console.log(`User ${ownerId} role updated renter -> owner`);
        }
        // if 'agent' or 'admin' or already 'owner', do nothing
      }
    } catch (roleErr) {
      // don't fail the whole request if role update fails; log and continue
      console.error("Error updating user role after property post:", roleErr);
    }


    // ------------------------------
    // Derive ownerType from authenticated user's role (BACKEND ONLY)
    // ------------------------------
    let ownerType = "Owner";
    if (req.user?.role === "Agent") ownerType = "Agent";
    else if (req.user?.role === "admin") ownerType = "Admin";

    const propertyData = {
      ...req.body,
      owner: ownerId,
      ownerType, // ✅ backend-derived, never from client
      agentUserId, // ✅ required when posted by Agent
      images: []
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

// ==============================
// 🔹 getAllProperties
// Not Used At any where place
// ==============================
const getAllRentalProperties = async (req, res) => {
  try {
    // ------------------------------
    // Fetch all properties with populated owner details (name, email)
    // ------------------------------
    const properties = await RentalProperty.find().populate("owner", "name email");

    // ------------------------------
    // Respond with properties array
    // ------------------------------
    res.status(200).json(properties);

  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching properties",
      error: error.message,
    });
  }
};

// ==============================
// Module Exports
// ==============================
module.exports = {
  createRentalProperty,
  getAllRentalProperties,
};
