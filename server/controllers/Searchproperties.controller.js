// ===============================
// 🔸 IMPORTS & MODEL CONSTANTS
// ===============================
const Sector = require("../models/Sector.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const SearchHistory = require("../models/SearchHistory.model");
const UserPreferencesARIA = require("../models/UserPreferencesARIA.model");
const PropertyAnalysis = require("../models/PropertyAnalysis.model");

// ===============================
// 🛠️ Helper Utilities (internal-only, no API contract change)
// ===============================
const getPagination = (req) => {
  const rawLimit = Number(req.query.limit);
  const rawPage = Number(req.query.page);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const skip = (page - 1) * limit;
  return { limit, page, skip };
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MAX_QUERY_LENGTH = 100;
const BHK_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const STOP_WORDS = new Set(['in', 'at', 'near', 'for', 'the', 'of', 'a', 'an', 'flat', 'flats', 'apartment', 'apartments', 'property', 'properties', 'house', 'home']);

// Parses free text such as "2bhk in sec 46", "sector-46", "S46", "46" or "dlf phase 2"
// into structured parts: sector numbers, BHK count and any residual free text.
const parseSearchQuery = (raw) => {
  const result = { sectors: [], bhk: null, text: '' };
  if (!raw || typeof raw !== 'string') return result;

  let q = raw.toLowerCase().slice(0, MAX_QUERY_LENGTH).replace(/[^a-z0-9\s]/g, ' ');

  // "two bhk" -> "2 bhk"
  q = q.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b(?=\s*(?:bhk|bh|bed))/g, (w) => String(BHK_WORDS[w]));

  // BHK / bedroom count
  q = q.replace(/\b(\d{1,2})\s*(?:bhk|bh|b\s*h\s*k|bed(?:room)?s?)\b/, (_, n) => {
    result.bhk = Number(n);
    return ' ';
  });

  // Sector numbers: sector 46, sec46, sectr-46, s 46
  q = q.replace(/\b(?:sector|sectr|sec|s)\s*(\d{1,3})(?!\d)/g, (_, n) => {
    const num = String(Number(n));
    if (!result.sectors.includes(num)) result.sectors.push(num);
    return ' ';
  });

  const words = q.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w) && w !== 'sector' && w !== 'sec');

  // A bare number ("46", "2bhk in 46") is treated as a sector number
  if (!result.sectors.length && words.length === 1 && /^\d{1,3}$/.test(words[0])) {
    result.sectors.push(String(Number(words[0])));
    words.length = 0;
  }

  result.text = words.join(' ').trim();
  return result;
};

// Canonical string used for relevance scoring, e.g. "2 BHK in Sector-46"
const buildCanonicalQuery = ({ sectors, bhk, text }) => {
  const parts = [];
  if (bhk) parts.push(`${bhk} BHK`);
  if (sectors.length) parts.push(`${bhk ? 'in ' : ''}${sectors.map((s) => `Sector-${s}`).join(' ')}`);
  if (text) parts.push(text);
  return parts.join(' ').trim();
};

const sectorRegexFor = (num) => new RegExp(`^\\s*sector\\s*[-_.]?\\s*0*${num}(?!\\d)`, 'i');

const buildFilterObject = ({ parsed, extras = {} }) => {
  const filter = { isActive: true };
  const and = [];

  if (parsed.sectors.length) {
    // Strict: only properties located in the requested sector(s)
    and.push({ $or: parsed.sectors.map((n) => ({ Sector: sectorRegexFor(n) })) });
  }
  if (parsed.bhk) {
    and.push({ 'totalArea.configuration': new RegExp(`\\b0*${parsed.bhk}\\s*-?\\s*BHK`, 'i') });
  }
  // Free text only narrows results when no explicit sector was given
  if (parsed.text && !parsed.sectors.length) {
    const textRegex = new RegExp(escapeRegex(parsed.text), 'i');
    and.push({ $or: [{ Sector: textRegex }, { address: textRegex }, { description: textRegex }] });
  }

  // Optional *non-mandatory* extra filters (do not break API)
  const toNum = (v) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const price = toNum(extras.price);
  const minPrice = toNum(extras.minPrice);
  const maxPrice = toNum(extras.maxPrice);
  const minArea = toNum(extras.minArea);
  const maxArea = toNum(extras.maxArea);
  const bedrooms = toNum(extras.bedrooms);
  const bathrooms = toNum(extras.bathrooms);

  if (price !== null) {
    and.push({ $or: [{ monthlyRent: price }, { price }, { monthlyRent: String(price) }, { price: String(price) }] });
  } else if (minPrice !== null || maxPrice !== null) {
    const cond = {};
    if (minPrice !== null) cond.$gte = minPrice;
    if (maxPrice !== null) cond.$lte = maxPrice;
    and.push({ $or: [{ monthlyRent: cond }, { price: cond }] });
  }
  if (minArea !== null || maxArea !== null) {
    const cond = {};
    if (minArea !== null) cond.$gte = minArea;
    if (maxArea !== null) cond.$lte = maxArea;
    and.push({ $or: [{ area: cond }, { 'totalArea.sqft': cond }] });
  }
  if (bedrooms !== null) and.push({ bedrooms });
  if (bathrooms !== null) and.push({ bathrooms });

  // BHK chip from the UI: "1 RK", "2 BHK", "4+ BHK" (or a bare number)
  if (extras.bhk) {
    const raw = String(extras.bhk).toLowerCase();
    const num = (raw.match(/\d+/) || [])[0];
    if (raw.includes('rk')) {
      and.push({ 'totalArea.configuration': /\b1\s*-?\s*RK\b/i });
    } else if (num && raw.includes('+')) {
      and.push({ 'totalArea.configuration': new RegExp(`\\b0*([${num}-9]|\\d{2})\\s*-?\\s*BHK`, 'i') });
    } else if (num) {
      and.push({ 'totalArea.configuration': new RegExp(`\\b0*${num}\\s*-?\\s*BHK`, 'i') });
    }
  }
  if (extras.parking === 'Yes') {
    and.push({ parking: { $exists: true, $nin: ['', null], $not: /^\s*(no|none)\b/i } });
  } else if (extras.parking === 'No') {
    and.push({ $or: [{ parking: { $exists: false } }, { parking: { $in: ['', null] } }, { parking: /^\s*(no|none)\b/i }] });
  }
  const PROPERTY_TYPES = ['house', 'apartment', 'condo', 'townhouse', 'villa'];
  if (extras.propertyType && PROPERTY_TYPES.includes(String(extras.propertyType).toLowerCase())) {
    and.push({ propertyType: String(extras.propertyType).toLowerCase() });
  }
  if (extras.postedBy === 'Owner' || extras.postedBy === 'Agent') {
    and.push({ ownerType: extras.postedBy });
  }
  const listedWithin = toNum(extras.listedWithin);
  if (listedWithin !== null && listedWithin > 0) {
    and.push({ createdAt: { $gte: new Date(Date.now() - listedWithin * 24 * 60 * 60 * 1000) } });
  }
  if (extras.withPhotos === '1') {
    and.push({ 'images.0': { $exists: true } });
  }
  if (extras.moveInBy) {
    const d = new Date(extras.moveInBy);
    if (!Number.isNaN(d.getTime())) and.push({ moveInDate: { $lte: d } });
  }

  if (and.length) filter.$and = and;
  return filter;
};

// ===============================
// 🔹 SEARCH PROPERTIES
// ===============================
/**
 * Search for properties by address or area and save search history if user is logged in
 * - Constants grouped at top
 * - Normalization and extraction
 * - Main search logic
 * - User preferences scoring
 */
exports.searchProperties = async (req, res) => {
  try {
    // ---------- CONSTANTS & PARAMS ----------
    const { query, type } = req.query;
    const hasQuery = typeof query === 'string' && query.trim().length > 0;
    const normalizedType = type ? String(type).trim().toLowerCase() : '';
    const { limit: parsedLimit, skip } = getPagination(req);
    const userId = req.user?._id;
    const sortBy = String(req.query.sort || 'relevance');

    // ---------- QUERY NORMALIZATION ----------
    const rawQuery = hasQuery ? query : '';
    const parsedQuery = parseSearchQuery(rawQuery);
    const normalizedQuery = buildCanonicalQuery(parsedQuery);
    const sectorNameMatches = [];

    const filter = buildFilterObject({
      parsed: parsedQuery,
      extras: {
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        bedrooms: req.query.bedrooms,
        bathrooms: req.query.bathrooms,
        minArea: req.query.minArea,
        maxArea: req.query.maxArea,
        price: req.query.price,
        bhk: req.query.bhk,
        parking: req.query.parking,
        moveInBy: req.query.moveInBy,
        propertyType: req.query.propertyType,
        postedBy: req.query.postedBy,
        listedWithin: req.query.listedWithin,
        withPhotos: req.query.withPhotos,
      },
    });

    // ----------------------
    // Relevance scoring (enhanced)
    // ----------------------
    const computeRelevance = (prop, normalizedQuery, extras = {}) => {
      if (!prop || !normalizedQuery) return 0;
      let score = 0;
      const nq = normalizedQuery.toLowerCase();

      // 1) Exact Sector name match (highest priority)
      try {
        if (prop.Sector) {
          const propSector = String(prop.Sector || '').toLowerCase();
          if (propSector === nq || propSector === nq.replace(/\bsector-?\s*/i, '').trim()) {
            score += 70;
          } else if (nq && propSector.includes(nq)) {
            score += 40;
          }
        }
      } catch (e) {}

      // 2) boost matched sector names from Sector collection
      try {
        const sectorNames = Array.isArray(extras.sectorNames) ? extras.sectorNames : [];
        if (sectorNames.length) {
          for (const s of sectorNames) {
            if (!s) continue;
            const sLow = String(s).toLowerCase();
            if (prop.Sector && String(prop.Sector).toLowerCase().includes(sLow)) {
              score += 30;
              break;
            }
          }
        }
      } catch (e) {}

      // 3) BHK Boost
      try {
        const bhkMatch = nq.match(/(\d+)\s*BHK/i);
        if (bhkMatch && prop.totalArea?.configuration) {
          const cfg = String(prop.totalArea.configuration || '').toLowerCase();
          if (cfg.includes(bhkMatch[1])) score += 50;
        }
      } catch (e) {}

      // 4) numeric sector boost
      try {
        const sectorMatch = nq.match(/sector\s*-?\s*(\d+)/i);
        if (sectorMatch && prop.Sector) {
          if (String(prop.Sector).toLowerCase().includes(sectorMatch[1])) score += 50;
        }
      } catch (e) {}

      // 5) text-field phrase/token matching
      const textFields = [prop.address, prop.description, prop.localAmenities, prop.neighborhoodVibe]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (textFields && nq) {
        if (textFields.includes(nq)) {
          score += 45;
        } else {
          const parts = nq.split(/\s+/).filter(Boolean);
          let matchedTokens = 0;
          parts.forEach(p => { if (textFields.includes(p)) matchedTokens++; });
          score += matchedTokens * 12;
        }
      }

      if (Array.isArray(prop.images) && prop.images.length) score += 6;

      return score;
    };

    const applyRelevanceSort = (arr, extras = {}) => {
      if (!Array.isArray(arr) || !normalizedQuery) return arr;
      return arr
        .map(p => ({ ...p, __relevance: computeRelevance(p, normalizedQuery, extras) }))
        .sort((a,b) => (b.__relevance || 0) - (a.__relevance || 0));
    };

    // ---------- MAIN SEARCH LOGIC ----------
    const priceOf = (p) => Number(p.monthlyRent ?? p.price ?? 0) || 0;
    const sortFor = (kind) => {
      const priceField = kind === 'rent' ? 'monthlyRent' : 'price';
      if (sortBy === 'price-low') return { [priceField]: 1, _id: 1 };
      if (sortBy === 'price-high') return { [priceField]: -1, _id: 1 };
      if (sortBy === 'newest') return { createdAt: -1, _id: 1 };
      return { rankScore: -1, createdAt: -1, _id: 1 };
    };
    const fetchKind = async (kind, skipN, limitN) => {
      const Model = kind === 'rent' ? RentalProperty : SaleProperty;
      let q = Model.find(filter).sort(sortFor(kind)).skip(skipN).limit(limitN);
      q = kind === 'rent'
        ? q.populate('owner', 'name email')
        : q.populate({ path: 'ownerId', select: 'name email', strictPopulate: false });
      const docs = await q.lean();
      return docs.map((p) => ({ ...p, type: kind, defaultpropertytype: kind === 'rent' ? 'rental' : 'sale' }));
    };

    let mainResults = [];
    let total = 0;
    if (normalizedType === 'rent' || normalizedType === 'sale') {
      const Model = normalizedType === 'rent' ? RentalProperty : SaleProperty;
      [mainResults, total] = await Promise.all([
        fetchKind(normalizedType, skip, parsedLimit),
        Model.countDocuments(filter),
      ]);
    } else {
      // Both types: take the top (skip + limit) of each in the same order and
      // merge, so every page holds exactly `limit` items and none repeat.
      const [rentals, sales, rentCount, saleCount] = await Promise.all([
        fetchKind('rent', 0, skip + parsedLimit),
        fetchKind('sale', 0, skip + parsedLimit),
        RentalProperty.countDocuments(filter),
        SaleProperty.countDocuments(filter),
      ]);
      const byNewest = (x, y) => new Date(y.createdAt || 0) - new Date(x.createdAt || 0);
      const cmp =
        sortBy === 'price-low' ? (x, y) => priceOf(x) - priceOf(y)
        : sortBy === 'price-high' ? (x, y) => priceOf(y) - priceOf(x)
        : sortBy === 'newest' ? byNewest
        : (x, y) => (Number(y.rankScore) || 0) - (Number(x.rankScore) || 0) || byNewest(x, y);
      mainResults = [...rentals, ...sales].sort(cmp).slice(skip, skip + parsedLimit);
      total = rentCount + saleCount;
    }

    if (sortBy === 'relevance') {
      // Text relevance only breaks ties: rankScore decides visibility first.
      mainResults = applyRelevanceSort(mainResults, { sectorNames: sectorNameMatches })
        .sort((a, b) => (Number(b.rankScore) || 0) - (Number(a.rankScore) || 0));
    }

    // View counts and ratings ride along, so cards need no per-card requests.
    if (mainResults.length) {
      const stats = await PropertyAnalysis.aggregate([
        { $match: { property: { $in: mainResults.map((p) => p._id) } } },
        {
          $project: {
            property: 1,
            viewCount: { $size: { $ifNull: ['$views', []] } },
            avgRating: { $avg: '$ratings.rating' },
            ratingCount: { $size: { $ifNull: ['$ratings', []] } },
          },
        },
      ]);
      const byId = new Map(stats.map((st) => [String(st.property), st]));
      mainResults = mainResults.map((p) => {
        const st = byId.get(String(p._id));
        return {
          ...p,
          viewCount: st ? st.viewCount : 0,
          avgRating: st && st.ratingCount ? Math.round(st.avgRating * 10) / 10 : null,
        };
      });
    }
    res.set('X-Total-Count', String(total));

    // For compatibility with the rest of the code
    let allResults;
    let nearbyResults = [];
    const allResultsFinal = [
      ...(typeof allResults !== "undefined" ? allResults : mainResults),
      ...nearbyResults,
    ];

    // ---------- USER PREFERENCES MATCHING ----------
    if (req.user?._id) {
      const userPreferences = await UserPreferencesARIA.findOne({
        email: req.user.email,
      });
      if (userPreferences) {
        const prefs = userPreferences.preferences || {};
        // Scoring function for property match
        const calcMatch = (propertyDoc) => {
          const property = propertyDoc.toObject
            ? propertyDoc.toObject()
            : propertyDoc;
          // Weights for each preference
          const weights = {
            location: 0.25,
            budget: 0.25,
            size: 0.2,
            propertyType: 0.1,
            furnishing: 0.1,
            amenities: 0.1,
          };
          let totalWeight = 0;
          let weightedScore = 0;
          const {
            location,
            budget,
            size,
            furnishing,
            propertyType,
            amenities,
          } = prefs;
          // Fuzzy match helper
          const fuzzyMatch = (source, target) => {
            if (!source || !target) return false;
            const src = source.toLowerCase();
            const tgt = target.toLowerCase();
            return src.includes(tgt) || tgt.includes(src);
          };
          // Location
          if (location && (property.address || property.location)) {
            totalWeight += weights.location;
            const propLoc = `${
              property.address || property.location
            }`.toLowerCase();
            const exactMatch = propLoc === location.toLowerCase();
            const partialMatch = propLoc.includes(location.toLowerCase());
            const fuzzy = fuzzyMatch(propLoc, location);
            let locScore = 0;
            if (exactMatch) locScore = 1;
            else if (partialMatch) locScore = 0.75;
            else if (fuzzy) locScore = 0.5;
            weightedScore += locScore * weights.location;
          }
          // Budget
          if (budget && property.price) {
            totalWeight += weights.budget;
            const budgetNum = parseFloat(budget);
            const priceNum = parseFloat(property.price);
            const exactMatch =
              priceNum >= budgetNum * 0.95 && priceNum <= budgetNum * 1.05;
            const closeMatch =
              priceNum >= budgetNum * 0.8 && priceNum <= budgetNum * 1.2;
            let budgetScore = 0;
            if (exactMatch) budgetScore = 1;
            else if (closeMatch) budgetScore = 0.75;
            weightedScore += budgetScore * weights.budget;
          }
          // Size
          if (size && property.totalArea?.configuration) {
            totalWeight += weights.size;
            const propSize = property.totalArea.configuration.toLowerCase();
            const exactMatch = propSize === size.toLowerCase();
            const partialMatch = propSize.includes(size.toLowerCase());
            const fuzzy = fuzzyMatch(propSize, size);
            let sizeScore = 0;
            if (exactMatch) sizeScore = 1;
            else if (partialMatch) sizeScore = 0.75;
            else if (fuzzy) sizeScore = 0.5;
            weightedScore += sizeScore * weights.size;
          }
          // Property Type
          if (propertyType && property.propertyType) {
            totalWeight += weights.propertyType;
            const propType = property.propertyType.toLowerCase();
            const exactMatch = propType === propertyType.toLowerCase();
            const partialMatch = propType.includes(propertyType.toLowerCase());
            const fuzzy = fuzzyMatch(propType, propertyType);
            let typeScore = 0;
            if (exactMatch) typeScore = 1;
            else if (partialMatch) typeScore = 0.75;
            else if (fuzzy) typeScore = 0.5;
            weightedScore += typeScore * weights.propertyType;
          }
          // Furnishing
          if (furnishing && property.furnishing) {
            totalWeight += weights.furnishing;
            const propFurn = property.furnishing.toLowerCase();
            const exactMatch = propFurn === furnishing.toLowerCase();
            const partialMatch = propFurn.includes(furnishing.toLowerCase());
            const fuzzy = fuzzyMatch(propFurn, furnishing);
            let furnScore = 0;
            if (exactMatch) furnScore = 1;
            else if (partialMatch) furnScore = 0.75;
            else if (fuzzy) furnScore = 0.5;
            weightedScore += furnScore * weights.furnishing;
          }
          // Amenities
          if (Array.isArray(amenities) && property.amenities?.length) {
            totalWeight += weights.amenities;
            const matchCount = property.amenities.filter((a) =>
              amenities.some((p) => {
                const aLower = a.toLowerCase();
                const pLower = p.toLowerCase();
                return aLower.includes(pLower) || pLower.includes(aLower);
              })
            ).length;
            const amenitiesScore =
              matchCount > 0 ? matchCount / amenities.length : 0;
            weightedScore += amenitiesScore * weights.amenities;
          }
          // Final match %
          const matchPercentage =
            totalWeight > 0
              ? Math.round((weightedScore / totalWeight) * 100)
              : 0;
          return { ...property, matchPercentage };
        };
        // Attach match % to results
        const resultsWithMatch = allResultsFinal.map(calcMatch);
        return res.status(200).json(resultsWithMatch);
      }
    }
    // ---------- DEFAULT RETURN ----------
    res.status(200).json(allResultsFinal);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Server error while searching properties",
        error: error.message,
      });
  }
};

// ===============================
// 🔹 SEARCH AREA SUGGESTIONS
// ===============================
/**
 * Suggest sector/area names matching the user query
 */
exports.getSectorSuggestions = async (req, res) => {
  try {
    // ----- Extract query -----
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query is required" });
    // ----- Find sectors by name -----
    const regex = new RegExp(escapeRegex(String(query).trim().slice(0, MAX_QUERY_LENGTH)), "i");
    const sectors = await Sector.find({ name: regex }).limit(10);
    if (sectors.length === 0) {
      return res.status(200).json({ sectors: [] });
    }
    res.status(200).json({ sectors });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error fetching sector suggestions" });
  }
};

// ===============================
// 🔹 (COMMENTED OUT) SEARCH PROPERTIES BY SECTOR
// ===============================
// exports.getPropertiesBySector = async (req, res) => {
//   try {
//     const { sector } = req.params;
//     if (!sector) return res.status(400).json({ message: "Sector name is required" });
//     const regex = new RegExp(sector.trim(), "i");
//     const rentalProperties = await RentalProperty.find({ Sector: regex })
//       .populate("owner", "name email");
//     const saleProperties = await SaleProperty.find({ Sector: regex })
//       .populate({ path: "ownerId", select: "name email", strictPopulate: false });
//     const combined = [...rentalProperties, ...saleProperties];
//     res.status(200).json({ properties: combined });
//   } catch (error) {
//     res.status(500).json({ message: "Server error fetching properties by sector" });
//   }
// };

// ===============================
// 🔹 SEARCH HISTORY FOR USER
// ===============================
/**
 * Get search history for the logged-in user
 */
exports.getSearchHistory = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    // Fetch all search history, most recent first
    const history = await SearchHistory.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ history });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error while fetching search history" });
  }
};

// ===============================
// 🔹 SEARCH PROPERTIES BY LOCATION FIELDS
// ===============================
/**
 * Search properties by array of location fields (Sector, localAmenities, propertyType)
 */
exports.searchPropertiesonLocation = async (req, res) => {
  try {
    // ----- Extract query fields -----
    const { queryFields } = req.body; // array of location fields
    // console.log("🔍 Location-based search query fields:", queryFields);

    const userId = req.user?._id;
    // Add pagination parameters (global pagination applied after merging models)
    const { limit: parsedLimit, skip } = getPagination(req);

    if (!queryFields || !Array.isArray(queryFields) || queryFields.length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // ----- Save user search history (no duplicates) -----
    if (userId) {
      const currentQuery = queryFields.join(", ");
      const exists = await SearchHistory.findOne({ user: userId, query: currentQuery });
      if (!exists) {
        await SearchHistory.create({ user: userId, query: currentQuery, type: "location" });
      }
    }

    // ----- Build OR search conditions (dedupe & robust field coverage) -----
    const uniqueFields = [...new Set(queryFields.filter(Boolean))];
    const orConditions = uniqueFields.flatMap((field) => {
      const regex = new RegExp(String(field).trim(), "i");
      return [
        { Sector: regex },
        { address: regex },
        { city: regex },
        { state: regex },
        { locality: regex },
        // Optional fallbacks if your schema includes them
        { district: regex },
        { county: regex },
        { area: regex },
      ];
    });

    const baseFilter = { $and: [{ isActive: true }, { $or: orConditions }] };

    // ----- Query both models (pull extra to allow global slice) -----
    // We over-fetch then apply a global skip/limit post-merge for correct cross-model pagination.
    const overFetch = parsedLimit * 2 + skip; // try to ensure we have enough to slice globally

    const [rentalMatches, saleMatches] = await Promise.all([
      RentalProperty.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(overFetch)
        .populate("owner", "name email")
        .lean(),
      SaleProperty.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(overFetch)
        .populate({ path: "ownerId", select: "name email", strictPopulate: false })
        .lean(),
    ]);

    // Annotate with type and normalize defaultpropertytype
    const rentalsWithType = rentalMatches.map((p) => ({
      ...p,
      type: "rent",
      defaultpropertytype: "rental",
    }));
    const salesWithType = saleMatches.map((p) => ({
      ...p,
      type: "sale",
      defaultpropertytype: "sale",
    }));

    // Merge and sort by createdAt desc
    const merged = [...rentalsWithType, ...salesWithType].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

    // Apply global pagination
    const pageSlice = merged.slice(skip, skip + parsedLimit);

    // console.log("🔍 Location-based combined results count (pre-slice, post-merge):", merged.length);
    // console.log("🔍 Location-based returned page size:", pageSlice.length, "page:", Math.floor(skip / parsedLimit) + 1);

    // ----- Return results (array to keep API backward-compatible) -----
    return res.status(200).json(pageSlice);
  } catch (error) {
    console.error("❌ Location-based search error:", error);
    return res.status(500).json({ message: "Server error while searching properties" });
  }
};

// ===============================
// 🔹 USER DASHBOARD (RECENT SEARCHES & RECOMMENDED)
// ===============================
/**
 * Get dashboard for user: recent search history and recommended properties
 */
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    // ----- Fetch last 5 searches -----
    const history = await SearchHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);
    let recommended = [];
    if (history.length > 0) {
      // Take latest search query
      const lastQuery = history[0].query;
      // Split query into smaller searchable parts by spaces
      const queryParts = lastQuery
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
      // Build regex for each sub-part
      const regexArray = queryParts.map((word) => new RegExp(word, "i"));
      // Match against multiple fields for any sub-part
      const orConditions = regexArray.flatMap((r) => [
        { Sector: r },
        { localAmenities: r },
        { neighborhoodVibe: r },
      ]);
      // Query recommended rental properties
      const rentalRecommended = await RentalProperty.find({
        $and: [{ isActive: true }, { $or: orConditions }],
      })
        .limit(10)
        .populate("owner", "name email");

      // Query recommended sale properties
      const saleRecommended = await SaleProperty.find({
        $and: [{ isActive: true }, { $or: orConditions }],
      })
        .limit(10)
        .populate({ path: "ownerId", select: "name email", strictPopulate: false });

      // Mark type and normalize owners
      const rentalWithType = rentalRecommended.map((p) => ({
        ...p.toObject(),
        type: "rent",
      }));
      const saleWithType = saleRecommended.map((p) => ({
        ...p.toObject(),
        type: "sale",
      }));

      // Combine both rental and sale recommendations
      recommended = [...rentalWithType, ...saleWithType];
    }
    // ----- Return dashboard -----
    res.status(200).json({
      recentSearches: history,
      recommendedProperties: recommended,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching dashboard",
      error: error.message,
    });
  }
};
