/**************************************************************
 * Viewproperties.controller.js
 * 
 * Controller for handling property retrieval operations.
 * Supports fetching rental properties, sale properties,
 * and generic property lookup by ID, with detailed response
 * handling and error management.
 **************************************************************/

const RentalProperty = require("../models/Rentalproperty.model.js");
const SaleProperty = require("../models/SaleProperty.model.js");
const PropertyReviewStatus = require("../models/propertyReviewStatus.model.js");


// ==============================
// Fetch RentalProperty by ID
// ==============================
const getRentalPropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const propertyId = req.params.id;

    // Fetch rental property by ID and populate owner details
    const property = await RentalProperty.findById(propertyId).populate("owner", "name email");

    // Check if property exists
    if (!property) {
      return res.status(404).json({ message: "Rental property not found" });
    }

    // Send successful response with property data
    res.status(200).json(property);
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching rental property",
      error: error.message,
    });
  }
};


// ==============================
// Fetch SaleProperty by ID
// ==============================
const getSalePropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const propertyId = req.params.id;

    // Fetch sale property by ID and populate owner details
    const property = await SaleProperty.findById(propertyId).populate("ownerId", "name email");

    // Check if property exists
    if (!property) {
      return res.status(404).json({ message: "Sale property not found" });
    }

    // Send successful response with property data
    res.status(200).json(property);
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching sale property",
      error: error.message,
    });
  }
};


// ==============================
// Fetch Property by ID (Rental or Sale)
// ==============================
const getPropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const { id } = req.params;

    // Attempt to find property as a rental property and populate owner details
    let property = await RentalProperty.findById(id).populate("owner", "name email");
    if (property) {
      // Return rental property with category info
      return res.status(200).json({ ...property.toObject(), propertyCategory: "rental" });
    }

    // If not found as rental, attempt to find as sale property and populate owner details
    property = await SaleProperty.findById(id).populate("ownerId", "name email");
    if (property) {
      // Return sale property with category info
      return res.status(200).json({ ...property.toObject(), propertyCategory: "sale" });
    }

    // If property not found in either collection, respond with 404
    return res.status(404).json({ message: "Property not found" });
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching property",
      error: error.message,
    });
  }
};

const getAllActiveProperties = async (req, res) => {
  try {
    const { limit } = req.query;
    // Fetch all properties
    const rentalProperties = await RentalProperty.find({ isActive: true }).populate("owner", "name email");
    const saleProperties = await SaleProperty.find({ isActive: true }).populate("ownerId", "name email");

    const rentalLimit = limit && !isNaN(Number(limit)) ? Number(limit) : rentalProperties.length;
    const saleLimit = limit && !isNaN(Number(limit)) ? Number(limit) : saleProperties.length;
    const limitedRental = rentalProperties.slice(0, rentalLimit);
    const limitedSale = saleProperties.slice(0, saleLimit);

    // Fetch review statuses
    const reviewStatuses = await PropertyReviewStatus.find();

    // Merge review statuses into property data
    let allProperties = [
      ...limitedRental.map((prop) => {
        const review = reviewStatuses.find(
          (r) => r.propertyId.toString() === prop._id.toString()
        );
        return {
          ...prop.toObject(),
          defaultpropertytype: "rental",
          isReviewed: review ? review.isReviewed : false,
        };
      }),
      ...limitedSale.map((prop) => {
        const review = reviewStatuses.find(
          (r) => r.propertyId.toString() === prop._id.toString()
        );
        return {
          ...prop.toObject(),
          defaultpropertytype: "sale",
          isReviewed: review ? review.isReviewed : false,
        };
      }),
    ];

    const numericLimit = limit && !isNaN(Number(limit)) ? Number(limit) : null;
    if (numericLimit) {
      // Shuffle and take only the requested number of properties
      allProperties = allProperties
        .sort(() => 0.5 - Math.random()) // randomize order
        .slice(0, numericLimit);
    }

    res.status(200).json(allProperties);
  } catch (error) {
    console.error("Error fetching all properties:", error);
    res.status(500).json({
      message: "Server error while fetching all properties",
      error: error.message,
    });
  }
};


module.exports = {
  getRentalPropertyById,
  getSalePropertyById,
  getPropertyById,
  getAllActiveProperties,
};