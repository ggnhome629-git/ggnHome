const UserPreferenceForm = require('../models/userpreferenceForm.model');
const User = require('../models/user.model');

// Helper to parse pagination params
function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// POST /api/preferences-form  -- create or update preference form
// NOTE: This endpoint NO LONGER auto-links preference -> User. Linking is handled
// by a separate endpoint `matchPreferencesToUsers` that your frontend can trigger.
exports.savePreferenceForm = async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.mobileNumber) {
      return res.status(400).json({ success: false, message: 'mobileNumber is required' });
    }

    // Try update if exists (prefer userId, then mobile number)
    let existing = null;
    if (payload.userId) {
      existing = await UserPreferenceForm.findOne({ userId: payload.userId });
    }
    if (!existing) {
      existing = await UserPreferenceForm.findOne({ mobileNumber: payload.mobileNumber });
    }

    if (existing) {
      // Only update known fields
      const updatable = [
        'userName',
        'mobileNumber',
        'preferredLocation',
        'budgetRange',
        'bhkSize',
        'propertyType',
        'furnishingLevel',
        'moveInDate',
        'brokerageAmount'
      ];
      console.log('Updating preference with brokerageAmount:', payload.brokerageAmount);
      updatable.forEach((k) => {
        if (typeof payload[k] !== 'undefined') existing[k] = payload[k];
      });
      existing.status = 'ACTIVE';
      existing.inactiveAt = null;
      await existing.save();
      return res.status(200).json({ success: true, message: 'Preferences updated', preferences: existing });
    }

    const created = await UserPreferenceForm.create(payload);
    return res.status(201).json({ success: true, message: 'Preferences saved', preferences: created });
  } catch (err) {
    console.error('savePreferenceForm error:', err);
    return res.status(500).json({ success: false, message: 'Server error while saving preferences', error: err.message });
  }
};

// GET /api/preferences-form  -- fetch single preference (by logged in user or mobileNumber query)
exports.getPreferenceForm = async (req, res) => {
  try {
    if (req.user && req.user._id) {
      const pref = await UserPreferenceForm.findOne({ userId: req.user._id });
      if (pref) return res.status(200).json({ success: true, preferences: pref });
      // fallback to mobileNumber if available
      if (req.user.mobileNumber) {
        const pref2 = await UserPreferenceForm.findOne({ mobileNumber: req.user.mobileNumber });
        return res.status(200).json({ success: true, preferences: pref2 || null });
      }
      return res.status(200).json({ success: true, preferences: null });
    }

    const mobileNumber = req.query.mobileNumber;
    if (!mobileNumber) return res.status(400).json({ success: false, message: 'mobileNumber query parameter required when not authenticated' });

    const pref = await UserPreferenceForm.findOne({ mobileNumber });
    return res.status(200).json({ success: true, preferences: pref || null });
  } catch (err) {
    console.error('getPreferenceForm error:', err);
    return res.status(500).json({ success: false, message: 'Server error while fetching preferences', error: err.message });
  }
};

// GET /api/preferences-form/list  -- paginated list (admin)
exports.listPreferenceForms = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    // Optional filters
    const q = {};
    if (req.query.mobileNumber) q.mobileNumber = req.query.mobileNumber;
    if (req.query.bhkSize) q.bhkSize = req.query.bhkSize;
    if (req.query.preferredLocation) q.preferredLocation = { $regex: req.query.preferredLocation, $options: 'i' };

    const [items, total] = await Promise.all([
      UserPreferenceForm.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserPreferenceForm.countDocuments(q)
    ]);

    return res.status(200).json({ success: true, data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('listPreferenceForms error:', err);
    return res.status(500).json({ success: false, message: 'Server error while listing preferences', error: err.message });
  }
};

// POST /api/preferences-form/match  -- Trigger matching of preference records to registered Users
// Body (optional): { id: '<preferenceId>' }  to run only for a single preference
exports.matchPreferencesToUsers = async (req, res) => {
  try {
    const targetId = req.body && req.body.id;
    const query = targetId ? { _id: targetId } : { userId: null };

    // Find candidates (unlinked preferences or single id)
    const candidates = await UserPreferenceForm.find(query).lean();
    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ success: true, message: 'No matching preference records found to process', processed: 0 });
    }

    let processed = 0;
    const updates = [];

    for (const pref of candidates) {
      // Try match by mobileNumber first
      let foundUser = null;
      if (pref.mobileNumber) {
        foundUser = await User.findOne({ mobileNumber: pref.mobileNumber }).lean();
      }

      // If not found, try matching by email or userName
      if (!foundUser && pref.userName) {
        // If userName looks like an email, try email match
        if (/@/.test(pref.userName)) {
          foundUser = await User.findOne({ email: pref.userName.toLowerCase().trim() }).lean();
        } else {
          // try by name (best effort)
          foundUser = await User.findOne({ name: pref.userName }).lean();
        }
      }

      if (foundUser) {
        updates.push({ prefId: pref._id, userId: foundUser._id });
      }
    }

    // Apply updates in bulk
    for (const u of updates) {
      await UserPreferenceForm.findByIdAndUpdate(u.prefId, { userId: u.userId, hasLoggedIn: true }, { new: true });
      processed++;
    }

    return res.status(200).json({ success: true, message: 'Matching completed', processed, attempted: candidates.length });
  } catch (err) {
    console.error('matchPreferencesToUsers error:', err);
    return res.status(500).json({ success: false, message: 'Server error while matching preferences', error: err.message });
  }
};


exports.deletePreferenceForm = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'id param required' });

    const pref = await UserPreferenceForm.findById(id);
    if (!pref) return res.status(404).json({ success: false, message: 'Preference not found' });

    // If already INACTIVE
    if (pref.status === 'INACTIVE') {
      // If inactiveAt is set, check 30-day window
      if (pref.inactiveAt) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const inactiveSince = Date.now() - new Date(pref.inactiveAt).getTime();

        if (inactiveSince >= thirtyDaysMs) {
          await UserPreferenceForm.findByIdAndDelete(id);
          return res.status(200).json({ success: true, message: 'Preference permanently deleted' });
        }

        const remainingMs = Math.max(0, thirtyDaysMs - inactiveSince);
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        return res.status(200).json({ success: true, message: `Preference is inactive and will be deleted in ${remainingDays} day(s)` });
      }

      // If status is INACTIVE but inactiveAt missing, set it now
      pref.inactiveAt = new Date();
      await pref.save();
      return res.status(200).json({ success: true, message: 'Preference marked INACTIVE. It will be auto-deleted after 30 days.' });
    }

    // If not already INACTIVE, mark as INACTIVE and set inactiveAt timestamp
    pref.status = 'INACTIVE';
    pref.inactiveAt = new Date();
    await pref.save();

    return res.status(200).json({ success: true, message: 'Preference marked INACTIVE. It will be auto-deleted after 30 days.' });
  } catch (err) {
    console.error('deletePreferenceForm error:', err);
    return res.status(500).json({ success: false, message: 'Server error while deleting preference', error: err.message });
  }
};
