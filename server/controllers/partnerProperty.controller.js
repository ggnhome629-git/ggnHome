const Agent = require('../models/Agent.model');
const SaleProperty = require('../models/SaleProperty.model');
const RentalProperty = require('../models/Rentalproperty.model');
const { uploadWithFallback } = require('../config/FileHandling');

const numberOrUndefined = value => value === '' || value == null ? undefined : Number(value);
const parseJsonArray = value => {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch (_) { return []; }
};

async function createPartnerProperty(req, res) {
  try {
    if (!req.agent) return res.status(401).json({ message: 'Partner authentication required' });
    const agent = await Agent.findById(req.agent._id);
    if (!agent || agent.status !== 'active') return res.status(403).json({ message: 'Partner account is not active' });

    const body = req.body || {};
    const purposeValue = String(body.purpose || '').toLowerCase();
    const purpose = ['rent', 'rental'].includes(purposeValue) ? 'rental' : ['sale', 'sell'].includes(purposeValue) ? 'sale' : '';
    const title = body.title;
    const propertyType = body.propertyType;
    const ownerMobile = String(body.ownerMobile || body.mobile || "").replace(/[\s-]/g, "");
    const address = body.address || body.location;
    const sector = body.sector || body.Sector;
    const price = purpose === 'rental' ? (body.monthlyRent || body.price) : body.price;
    const bedrooms = body.bedrooms || body.bhk;
    const bathrooms = body.bathrooms;
    const area = body.area || body['totalArea.sqft'];
    const floor = body.floor !== undefined ? body.floor : (body.floorForRent !== undefined ? body.floorForRent : body.floorNumber);
    const totalFloors = body.totalFloors;
    const cornerPosition = body.cornerPosition;
    const petPolicy = body.petPolicy;
    const furnishing = body.furnishing;
    const parking = body.parking;
    const latitude = body.latitude;
    const longitude = body.longitude;
    if (!purpose) return res.status(400).json({ message: 'Choose rent or sale.' });
    if (!ownerMobile || !String(address || '').trim() || !String(sector || '').trim()) {
      return res.status(400).json({ message: 'Owner mobile number, address and sector/locality are required.' });
    }
    if (!/^(?:\+?91)?[6-9]\d{9}$/.test(ownerMobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit owner mobile number.' });
    }
    }
    if (!Number(price) || Number(price) <= 0 || !Number(area) || Number(area) <= 0) {
      return res.status(400).json({ message: 'A valid price and property area are required.' });
    }
    const files = (req.files || []).filter(file => /^image\//.test(file.mimetype || ''));
    const categories = parseJsonArray(req.body.imageCategories);
    if (!files.length) return res.status(400).json({ message: 'Add at least one property photo.' });
    if (!files.some((file, i) => categories[i] === 'front')) return res.status(400).json({ message: 'Add at least one front/exterior photo.' });
    if (floor !== '' && totalFloors !== '' && Number(floor) > Number(totalFloors)) return res.status(400).json({ message: 'Floor number cannot exceed total floors.' });

    const amenities = parseJsonArray(req.body.amenities).map(item => ({
      category: String(item.category || '').slice(0, 40),
      name: String(item.name || '').slice(0, 160),
      distanceMeters: Number.isFinite(Number(item.distance)) && item.distance !== null && item.distance !== '' ? Math.max(0, Number(item.distance)) : undefined,
      distanceUnit: 'm',
      source: item.source === 'locationiq' ? 'locationiq' : 'partner',
      edited: Boolean(item.edited),
      latitude: numberOrUndefined(item.latitude),
      longitude: numberOrUndefined(item.longitude),
    })).filter(item => item.category && (item.name || item.distanceMeters !== undefined));

    const images = [];
    let cloudinaryAccountIndex = null;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const result = await uploadWithFallback(file.path, `partner-properties/${String(sector).replace(/[^a-zA-Z0-9-_]/g, '_')}`, cloudinaryAccountIndex, String(address).slice(0, 100));
      if (!result || !result.secure_url) throw new Error('An image could not be uploaded. Please retry.');
      images.push({ url: result.secure_url, category: String(categories[i] || 'other').slice(0, 30) });
      if (cloudinaryAccountIndex === null && Number.isInteger(result.accountIndex)) cloudinaryAccountIndex = result.accountIndex;
    }
    if (!images.some(image => image.category === 'front')) return res.status(400).json({ message: 'Front photo upload failed. Please try again.' });

    const common = {
      title: String(title || `${bedrooms || 'Property'} BHK ${purpose === 'rental' ? 'for Rent' : 'for Sale'} in ${sector}`).slice(0, 160),
      description: '',
      propertyType: propertyType || 'apartment',
      Sector: String(sector).trim().slice(0, 120),
      address: String(address).trim().slice(0, 500),
      location: String(address).trim().slice(0, 500),
      ownernumber: ownerMobile.slice(0, 20),
      partnerAgentId: agent._id,
      partnerName: String(agent.name || '').trim().slice(0, 120),
      partnerMobile: String(agent.mobileNumber || '').trim().slice(0, 20),
      partnerEmail: String(agent.email || '').trim().slice(0, 160).toLowerCase(),
      ownerType: 'Agent',
      agentUserId: agent.userId,
      bedrooms: numberOrUndefined(bedrooms),
      bathrooms: numberOrUndefined(bathrooms),
      totalArea: { sqft: Number(area), configuration: bedrooms ? `${bedrooms} BHK` : undefined },
      totalFloors: numberOrUndefined(totalFloors),
      floorNumber: numberOrUndefined(floor),
      floorForRent: numberOrUndefined(floor),
      furnishing: ['unfurnished', 'semi-furnished', 'furnished'].includes(furnishing) ? furnishing : undefined,
      parking: parking ? String(parking).slice(0, 100) : undefined,
      images: images.map(image => image.url),
      imageCategories: images,
      latitude: numberOrUndefined(latitude),
      longitude: numberOrUndefined(longitude),
      nearbyAmenities: amenities,
      cornerPosition: ['corner', 'middle', 'not_sure'].includes(cornerPosition) ? cornerPosition : 'not_sure',
      cloudinaryAccountIndex,
      isActive: true,
      isPostedNew: false,
      isEdited: false,
      ranking: { source: 'Partner' },
    };

    let property;
    if (purpose === 'sale') {
      property = await SaleProperty.create({ ...common, price: Number(price), defaultpropertytype: 'sale' });
    } else {
      property = await RentalProperty.create({
        ...common,
        monthlyRent: Number(price),
        defaultpropertytype: 'rental',
        petPolicy: ['allowed', 'not-allowed', 'not_sure'].includes(petPolicy) ? petPolicy : 'not_sure',
      });
    }
    return res.status(201).json({ message: 'Property published successfully', property: { _id: property._id, title: property.title, isActive: property.isActive, isPostedNew: property.isPostedNew, propertyType: purpose } });
  } catch (error) {
    console.error('createPartnerProperty failed:', error);
    return res.status(500).json({ message: error.message || 'Unable to publish property.' });
  }
}

module.exports = { createPartnerProperty };
