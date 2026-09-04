// Controller for managing Sale Properties: creation, retrieval, and status toggling.
// Handles image uploads via Cloudinary, sector normalization, and property activation state.

const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { uploadWithFallback } = require("../config/FileHandling");
const User = require("../models/user.model.js");

const SaleProperty = require('../models/SaleProperty.model.js');
const Sector = require('../models/Sector.model.js');


// ================================
// Create a new Sale Property
// ================================
const createSaleProperty = async (req, res) => {
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

    const ownerId = req.user?._id || req.user?.id;
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

    // ------------------------------
    // Derive ownerType from authenticated user's role (BACKEND ONLY)
    // ------------------------------
    let ownerType = "Owner";
    if (req.user?.role === "Agent") ownerType = "Agent";
    else if (req.user?.role === "admin") ownerType = "Admin";

    // Step 5: Create new SaleProperty document with default isActive = false and isPostedNew = true
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
      ownerType, // ✅ backend-derived, never from client
      Sector: normalizedSector,
      isActive: false,
      isPostedNew: true,
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


// ================================
// Get all active Sale Properties
// Not used anywhere
// ================================
const getSaleProperties = async (req, res) => {
  try {
    // Step 1: Fetch properties where isActive is true
    const properties = await SaleProperty.find({ isActive: true });
    // Step 2: Respond with retrieved properties
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve properties' });
  }
};



module.exports = {
  createSaleProperty,
  getSaleProperties,
  
};
