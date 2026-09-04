/**
 * Controller: User Details
 * Description: Handles user-related operations including fetching, updating user details,
 *              managing user properties (rental and sale), and property updates/deletions.
 */

const User = require('../models/user.model');
const RentalProperty = require('../models/Rentalproperty.model');
const SaleProperty = require('../models/SaleProperty.model');
const PropertyReviewStatus = require('../models/propertyReviewStatus.model');

const { uploadWithFallback } = require("../config/FileHandling");
const fs = require("fs");

// ===============================
// 🔹 GET USER DETAILS (From req.user)
// ===============================
exports.getUserDetails = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Prepare user details response
    const userDetails = {
      name: req.user.name || "",
      email: req.user.email,
      mobileNumber: req.user.mobileNumber,
      role: req.user.role,
      createdAt: req.user.createdAt,
    };

    // Send user details to frontend
    return res.status(200).json({ user: userDetails });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 🔹 GET USER DETAILS (Alternative method)
// ===============================
exports.userDetails = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Send user details directly
    res.status(200).json({
      name: req.user.name || "",
      email: req.user.email,
      mobileNumber: req.user.mobileNumber,
      role: req.user.role,
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 🔹 SAVE OR UPDATE USER DETAILS
// ===============================
exports.saveUserDetails = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;
    const updateData = {};

    // Collect Personal Information
    if (req.body.fullName !== undefined) updateData.fullName = req.body.fullName;
    if (req.body.dateOfBirth !== undefined) updateData.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;

    // Collect Contact Information
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.mobileNumber !== undefined) updateData.mobileNumber = req.body.mobileNumber;
    if (req.body.alternateContact !== undefined) updateData.alternateContact = req.body.alternateContact;
    if (req.body.address !== undefined) updateData.address = req.body.address;

    // Collect User Preferences
    if (req.body.propertyTypePreference !== undefined) updateData.propertyTypePreference = req.body.propertyTypePreference;
    if (req.body.budgetMin !== undefined) updateData.budgetMin = req.body.budgetMin;
    if (req.body.budgetMax !== undefined) updateData.budgetMax = req.body.budgetMax;
    if (req.body.preferredLocations !== undefined) updateData.preferredLocations = req.body.preferredLocations;
    if (req.body.bedrooms !== undefined) updateData.bedrooms = req.body.bedrooms;
    if (req.body.bathrooms !== undefined) updateData.bathrooms = req.body.bathrooms;
    if (req.body.furnishingPreference !== undefined) updateData.furnishingPreference = req.body.furnishingPreference;
    if (req.body.transactionType !== undefined) updateData.transactionType = req.body.transactionType;

    // Collect Professional / Financial Info
    if (req.body.occupation !== undefined) updateData.occupation = req.body.occupation;
    if (req.body.monthlyIncome !== undefined) updateData.monthlyIncome = req.body.monthlyIncome;
    if (req.body.bankPaymentInfo !== undefined) updateData.bankPaymentInfo = req.body.bankPaymentInfo;

    // Collect Verification / Security Info
    if (req.body.governmentID !== undefined) updateData.governmentID = req.body.governmentID;
    if (req.body.kycDocuments !== undefined) updateData.kycDocuments = req.body.kycDocuments;
    if (req.body.consentNotifications !== undefined) updateData.consentNotifications = req.body.consentNotifications;

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Handle user not found
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send success response with updated user
    res.status(200).json({
      message: "User details updated successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 🔹 GET USER DETAILS FROM DATABASE
// ===============================
exports.getUserDetailsFromDB = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;

    // Fetch user from database selecting specific fields
    const user = await User.findById(userId).select('name email role createdAt');

    // Handle user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send user details from database
    res.status(200).json({
      user: {
        name: user.name || "",
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 🔹 GET USER'S PROPERTIES (Rental and Sale)
// ===============================
exports.getMyProperties = async (req, res) => {
  try {
    // Updated: Support both user and agent authentication
    if (!req.user && !req.agent) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Determine effective user ID (user._id or agent.userId)
    const effectiveUserId = req.user?._id || req.agent?.userId;
    if (!effectiveUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Pagination params
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    // Determine mobile number for admin-posted property matching (users only)
    const userMobile =
      req.user?.mobileNumber ||
      req.user?.mobile ||
      null;

    // Updated: Query for rental properties
    const rentalQuery = userMobile
      ? {
          $or: [
            { owner: effectiveUserId },        // normal users
            { agentUserId: effectiveUserId },  // agents
            { ownernumber: userMobile }        // admin-posted
          ]
        }
      : {
          $or: [
            { owner: effectiveUserId },
            { agentUserId: effectiveUserId }
          ]
        };

    // Updated: Query for sale properties
    const saleQuery = userMobile
      ? {
          $or: [
            { ownerId: effectiveUserId },       // normal users
            { agentUserId: effectiveUserId },   // agents
            { ownernumber: userMobile }
          ]
        }
      : {
          $or: [
            { ownerId: effectiveUserId },
            { agentUserId: effectiveUserId }
          ]
        };

    const [rentalMeta, saleMeta] = await Promise.all([
      RentalProperty.find(rentalQuery).select('_id createdAt').sort({ createdAt: -1 }).lean(),
      SaleProperty.find(saleQuery).select('_id createdAt').sort({ createdAt: -1 }).lean(),
    ]);

    const rentalCount = rentalMeta.length;
    const saleCount = saleMeta.length;
    const total = rentalCount + saleCount;

    // Merge and sort by createdAt (newest first) across both models
    const merged = [
      ...rentalMeta.map(p => ({ id: p._id, type: 'rental', createdAt: new Date(p.createdAt || 0) })),
      ...saleMeta.map(p => ({ id: p._id, type: 'sale', createdAt: new Date(p.createdAt || 0) })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination after global sort
    const paginated = merged.slice(skip, skip + limit);

    // Resolve full property data for the current page
    const properties = await Promise.all(
      paginated.map(async (item) => {
        if (item.type === 'rental') {
          return await RentalProperty.findById(item.id).lean().then(p => ({ ...p, propertyCategory: 'rental' }));
        } else {
          return await SaleProperty.findById(item.id).lean().then(p => ({ ...p, propertyCategory: 'sale' }));
        }
      })
    );

    // Send paginated response
    return res.status(200).json({
      total,
      rentalCount,
      saleCount,
      page,
      limit,
      properties,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching user's properties",
      error: error.message,
    });
  }
};

// ===============================
// 🔹 UPDATE PROPERTY (Rental or Sale)
// ===============================
// @desc Update a property (rental or sale)
// @route PUT /api/user/update-property/:id
// @access Private (owner only)
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }

    // Rebuild totalArea object if dotted fields exist (common in FormData)
    if (req.body["totalArea.sqft"] || req.body["totalArea.configuration"]) {
      req.body.totalArea = {
        sqft: req.body["totalArea.sqft"] ? Number(req.body["totalArea.sqft"]) : undefined,
        configuration: req.body["totalArea.configuration"] || "",
      };
      delete req.body["totalArea.sqft"];
      delete req.body["totalArea.configuration"];
    }

    // Normalize configuration for SaleProperty (always "X BHK" format)
    if (req.body.totalArea?.configuration) {
      const numMatch = req.body.totalArea.configuration.toString().match(/(\d+)/);
      if (numMatch) {
        req.body.totalArea.configuration = `${numMatch[1]} BHK`;
      } else {
        req.body.totalArea.configuration = req.body.totalArea.configuration.toString().trim().toUpperCase();
      }
    }

    // Fetch existing property for cloudinaryAccountIndex
    let existingPropertyForAccount = null;
    try {
      existingPropertyForAccount = (await RentalProperty.findById(id)) || (await SaleProperty.findById(id));
    } catch (_) {}
    let stickyAccountIndex = existingPropertyForAccount?.cloudinaryAccountIndex ?? null;

    // Determine address argument for Cloudinary foldering
    const addressArg = (req.body.address && String(req.body.address))
      || (existingPropertyForAccount && existingPropertyForAccount.address && String(existingPropertyForAccount.address))
      || null;

    // Determine the target Cloudinary folder (prefer stored folder to keep images together)
    let folderArg = (existingPropertyForAccount && existingPropertyForAccount.cloudinaryFolder) || null;
    if (!folderArg) {
      const sectorBase = (req.body.Sector && String(req.body.Sector))
        || (existingPropertyForAccount && existingPropertyForAccount.Sector && String(existingPropertyForAccount.Sector))
        || 'Uncategorized';
      const addressBase = addressArg || null;
      const sectorSan = sectorBase.toString().replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80);
      const addressSan = addressBase ? addressBase.toString().replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80) : null;
      folderArg = addressSan ? `${sectorSan}/${addressSan}` : sectorSan;
    }

    // Upload new images (normal + 360) to Cloudinary and merge with existing, enforcing caps
    try {
      // Determine existing arrays to compute remaining slots
      const existingImages = Array.isArray(existingPropertyForAccount?.images)
        ? existingPropertyForAccount.images.slice(0, 8)
        : [];
      const existingPanos = Array.isArray(existingPropertyForAccount?.panoramas)
        ? existingPropertyForAccount.panoramas.slice(0, 6)
        : [];

      // Split incoming files by fieldname (supports multer.fields or array)
      let normalFiles = [];
      let panoFiles = [];
      if (req.files) {
        if (Array.isArray(req.files)) {
          normalFiles = req.files.filter((f) => f.fieldname === 'images');
          panoFiles = req.files.filter((f) => f.fieldname === 'panoFiles');
        } else {
          normalFiles = Array.isArray(req.files.images) ? req.files.images : [];
          panoFiles = Array.isArray(req.files.panoFiles) ? req.files.panoFiles : [];
        }
      }

      // Enforce remaining slots (save only up to the cap total)
      const remainingImages = Math.max(0, 8 - existingImages.length);
      const remainingPanos = Math.max(0, 6 - existingPanos.length);
      if (normalFiles.length > remainingImages) normalFiles = normalFiles.slice(0, remainingImages);
      if (panoFiles.length > remainingPanos) panoFiles = panoFiles.slice(0, remainingPanos);

      // Upload normal images into the existing folder
      const newImageUrls = [];
      if (normalFiles.length > 0) {
        for (const file of normalFiles) {
          try {
            const { secure_url, accountIndex } = await uploadWithFallback(
              file.path,
              folderArg,
              stickyAccountIndex,
              null
            );
            if (secure_url) newImageUrls.push(secure_url);
            if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
              stickyAccountIndex = accountIndex;
            }
          } catch (_) {}
        }
      }

      // Parse pano metadata arrays (accept with or without [] keys)
      const toArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);
      const titles = toArray(req.body['panoTitles[]'] ?? req.body.panoTitles).map((t) => (t || '').toString().trim());
      const yaws = toArray(req.body['panoYaw[]'] ?? req.body.panoYaw).map((n) => Number(n) || 0);
      const pitches = toArray(req.body['panoPitch[]'] ?? req.body.panoPitch).map((n) => Number(n) || 0);
      const notesArr = toArray(req.body['panoNotes[]'] ?? req.body.panoNotes).map((s) => (s || '').toString().trim());

      // Upload pano files into nested /360 folder
      const newPanos = [];
      if (panoFiles.length > 0) {
        const panoFolder = `${folderArg}/360`;
        for (let i = 0; i < panoFiles.length; i++) {
          const file = panoFiles[i];
          const title = titles[i] || `Scene ${i + 1}`;
          const yaw = yaws[i] ?? 0;
          const pitch = pitches[i] ?? 0;
          const note = notesArr[i] || '';
          try {
            const { secure_url, accountIndex } = await uploadWithFallback(
              file.path,
              panoFolder,
              stickyAccountIndex,
              null
            );
            if (secure_url) newPanos.push({ title, url: secure_url, yaw, pitch, notes: note });
            if (stickyAccountIndex === null && Number.isInteger(accountIndex)) {
              stickyAccountIndex = accountIndex;
            }
          } catch (_) {}
        }
      }

      // Merge with existing and enforce final caps
      const mergedImages = [...existingImages, ...newImageUrls].slice(0, 8);
      const mergedPanos = [...existingPanos, ...newPanos].slice(0, 6);

      if (mergedImages.length) req.body.images = mergedImages;
      if (mergedPanos.length) req.body.panoramas = mergedPanos;

    } catch (err) {
      // Upload handling error suppressed to avoid blocking property update
    }

    const updateData = { ...req.body };
    // --- sanitize updateData: remove empty strings/nulls and trim strings ---
    Object.keys(updateData).forEach((key) => {
      const val = updateData[key];
      // Remove explicit empty values
      if (val === "" || val === null) {
        delete updateData[key];
        return;
      }

      // Trim string values
      if (typeof val === "string") {
        const t = val.trim();
        if (t === "") {
          delete updateData[key];
        } else {
          updateData[key] = t;
        }
        return;
      }

      // Recurse into shallow nested objects (e.g., totalArea)
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.keys(val).forEach((k2) => {
          const v2 = val[k2];
          if (v2 === "" || v2 === null) {
            delete val[k2];
          } else if (typeof v2 === 'string') {
            const tt = v2.trim();
            if (tt === "") delete val[k2];
            else val[k2] = tt;
          }
        });
        // remove the nested object entirely if it became empty
        if (Object.keys(val).length === 0) delete updateData[key];
      }
    });

    // --- enum validation: ensure propertyType is one of allowed values ---
    const allowedPropertyTypes = ['house','apartment','condo','townhouse','villa'];
    if (updateData.propertyType && !allowedPropertyTypes.includes(updateData.propertyType)) {
      // remove invalid enum to avoid Mongoose validation errors
      delete updateData.propertyType;
    }
    if (folderArg) updateData.cloudinaryFolder = folderArg;
    if (stickyAccountIndex !== null) updateData.cloudinaryAccountIndex = stickyAccountIndex;

    // Normalize totalArea.configuration (e.g., 2 BHK, 3 BHK)
    if (updateData.totalArea && updateData.totalArea.configuration) {
      let rawConfig = updateData.totalArea.configuration.trim().toLowerCase();
      const bhkMatch = rawConfig.match(/(\d+)\s*bhk/);
      const normalizedConfig = bhkMatch ? `${bhkMatch[1]} BHK` : rawConfig.toUpperCase();
      updateData.totalArea.configuration = normalizedConfig;
    }

    // Normalize Sector field (handles various formats)
    if (updateData.Sector && typeof updateData.Sector === 'string') {
      const rawSector = updateData.Sector.trim();

      // If the user mentions DLF (case-insensitive), preserve the user text but
      // normalise spacing and ensure the acronym DLF remains uppercase.
      if (/\bdlf\b/i.test(rawSector)) {
        const spaced = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        updateData.Sector = spaced.replace(/\b(dlf)\b/ig, 'DLF');
      } else {
        // Otherwise, try to detect clear sector forms like "sector 46", "sec46", or "46".
        const formatted = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

        // match patterns: 'sector 46' | 'sec46' | '46'
        const sectorMatch = formatted.match(/^(?:sector|sec)\s*(\d+)$/i) || formatted.match(/^(\d+)$/);
        if (sectorMatch) {
          updateData.Sector = `Sector-${sectorMatch[1]}`;
        } else {
          // Title-case the locality (capitalize each word) for nicer storage
          updateData.Sector = formatted
            .split(' ')
            .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w)
            .join(' ');
        }
      }
    }

    // Try updating rental property first
    let updatedProperty = await RentalProperty.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      updateData,
      { new: true }
    );

    // If not found, try updating sale property
    if (!updatedProperty) {
      // Rebuild totalArea object again if dotted fields exist (for sale property)
      if (req.body["totalArea.sqft"] || req.body["totalArea.configuration"]) {
        req.body.totalArea = {
          sqft: req.body["totalArea.sqft"] ? Number(req.body["totalArea.sqft"]) : undefined,
          configuration: req.body["totalArea.configuration"] || "",
        };
        delete req.body["totalArea.sqft"];
        delete req.body["totalArea.configuration"];
      }

      // Normalize configuration again
      if (req.body.totalArea?.configuration) {
        const numMatch = req.body.totalArea.configuration.toString().match(/(\d+)/);
        req.body.totalArea.configuration = numMatch
          ? `${numMatch[1]} BHK`
          : req.body.totalArea.configuration.toString().trim().toUpperCase();
      }

      const updateDataSale = { ...req.body };
      if (folderArg) updateDataSale.cloudinaryFolder = folderArg;
      if (stickyAccountIndex !== null) updateDataSale.cloudinaryAccountIndex = stickyAccountIndex;

      updatedProperty = await SaleProperty.findOneAndUpdate(
        { _id: id, ownerId: req.user._id },
        updateDataSale,
        { new: true }
      );
    }

    // Handle property not found or unauthorized
    if (!updatedProperty) {
      return res.status(404).json({ message: "Property not found or unauthorized" });
    }

    // Mark the property as edited and require admin review: hide it from public listings
    try {
      const editedUpdate = { isEdited: true, isActive: false , isPostedNew: true};

      // Try updating RentalProperty first; if not found, update SaleProperty
      const rentalEdit = await RentalProperty.findByIdAndUpdate(updatedProperty._id, { $set: editedUpdate }, { new: true });
      if (rentalEdit) {
        updatedProperty = rentalEdit;
      } else {
        const saleEdit = await SaleProperty.findByIdAndUpdate(updatedProperty._id, { $set: editedUpdate }, { new: true });
        if (saleEdit) updatedProperty = saleEdit;
      }

      // Ensure the separate PropertyReviewStatus document reflects that this property requires review
      // Upsert: set isReviewed=false and clear reviewer metadata
      await PropertyReviewStatus.findOneAndUpdate(
        { propertyId: updatedProperty._id },
        {
          $set: {
            propertyType: updatedProperty.defaultpropertytype === 'rental' ? 'rental' : 'sale',
            isReviewed: false,
            reviewedAt: null,
            reviewedBy: null,
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      // Don't fail the request if flagging fails; just log
      console.warn("Failed to mark property as edited/require review:", err);
    }

    // Send success response with updated property
    res.status(200).json({
      message: "Property updated successfully",
      property: updatedProperty,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating property", error: error.message });
  }
};

// ===============================
// 🔹 DELETE (TOGGLE) PROPERTY ACTIVE STATUS (Rental or Sale)
// ===============================
// @desc Toggle a property's isActive status (rental or sale)
// @route DELETE /api/user/delete-property/:id
// @access Private (owner only)
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }

    // Try finding rental property first
    let property = await RentalProperty.findOne({ _id: id, owner: req.user._id });

    // If not found, try sale property
    if (!property) {
      property = await SaleProperty.findOne({ _id: id, ownerId: req.user._id });
    }

    // Handle property not found or unauthorized
    if (!property) {
      return res.status(404).json({ message: "Property not found or unauthorized" });
    }

    // Toggle isActive status
    property.isActive = !property.isActive;
    await property.save();

    // Send response with updated status
    res.status(200).json({
      message: `Property is now ${property.isActive ? "active" : "inactive"}`,
      property,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while toggling property status",
      error: error.message,
    });
  }
};

exports.updateProperty = updateProperty;
exports.deleteProperty = deleteProperty;