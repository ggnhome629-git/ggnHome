// Controller for managing user preferences related to ARIA rental and sale assistant types.
// Provides functions to save user preferences by handling requests, validating input,
// sanitizing data, checking for existing records, and updating or creating new entries.

const UserPreferencesARIA = require("../models/UserPreferencesARIA.model");

// ==============================
// Save or Update User Preferences (Rental / Sale)
// ==============================
exports.saveUserPreferencesARIA = async (req, res) => {
  try {
    const { email, assistantType, preferences } = req.body;

    // Validate required fields
    if (!email || !assistantType) {
      return res.status(400).json({ success: false, message: "Email and assistantType are required." });
    }

    // Sanitize preferences safely — only copy known fields, preserve arrays, and avoid writing invalid enum values
    const allowedFields = [
      'location',
      'sector',
      'budget',
      'size',
      'furnishing',
      'propertyType',
      'amenities',
      'purchasePurpose',
      'timeline'
    ];

    const safePreferences = {};

    (Object.keys(preferences || {})).forEach((key) => {
      if (!allowedFields.includes(key)) return; // ignore unexpected fields

      const value = preferences[key];

      // Preserve arrays for amenities; accept comma-separated string and convert to array
      if (key === 'amenities') {
        if (Array.isArray(value)) {
          safePreferences.amenities = value.map((v) => (v == null ? '' : String(v).trim())).filter((v) => v !== '');
        } else if (typeof value === 'string' && value.trim() !== '') {
          safePreferences.amenities = value.split(',').map((v) => v.trim()).filter((v) => v !== '');
        }
        return;
      }

      // Validate purchasePurpose enum — only accept known values
      if (key === 'purchasePurpose') {
        const allowedPurchase = ['personal', 'investment'];
        if (typeof value === 'string' && allowedPurchase.includes(value)) {
          safePreferences.purchasePurpose = value;
        }
        return;
      }

      // For everything else, only set the value if it's not null/undefined
      if (value !== null && value !== undefined) {
        safePreferences[key] = value;
      }
    });

    // Check if a preference record exists for this email + assistantType
    const existingPreference = await UserPreferencesARIA.findOne({ email, assistantType });

    if (existingPreference) {
      // ✅ Overwrite the preferences for this assistant type completely
      existingPreference.preferences = safePreferences; // overwrite completely
      await existingPreference.save();

      return res.status(200).json({
        success: true,
        message: `${assistantType.toUpperCase()} preferences updated successfully`,
        updated: true,
      });
    }

    // ✅ Otherwise create a new record for that assistant type
    const newPreference = new UserPreferencesARIA({
      email,
      assistantType,
      preferences: safePreferences,
    });

    await newPreference.save();

    return res.status(201).json({
      success: true,
      message: `${assistantType.toUpperCase()} preferences saved successfully`,
      created: true,
    });
  } catch (error) {
    console.error("❌ Error saving user preferences:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
