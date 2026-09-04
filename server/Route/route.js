// ================== SERVICE REQUEST ROUTES ==================
const { createServiceRequest, getServiceRequests, updateServiceRequestStatus } = require("../controllers/Services.controller");

;
const express = require("express");
const router = express.Router();
const User = require("../models/user.model.js");

const multer = require("multer");
const excelUpload = multer({ storage: multer.memoryStorage() });

const upload = require("../middleware/multer");
const { verifyToken, verifyTokenOptional , verifyAgentToken , verifyAgentTokenOptional , verifyTokenOrAgent } = require("../middleware/auth");

// Controllers
const { requestOtp, verifyOtp, loginWithPassword, setPassword, checkMobile , setRecoveryEmail , changePasswordDirect } = require("../controllers/login.controller");
const { userDetails, saveUserDetails, getUserDetails, getMyProperties, updateProperty, deleteProperty } = require("../controllers/userdetails.controller");
const { logoutUser } = require("../controllers/logout.controller");
const { saveUserPreferencesARIA } = require("../controllers/userPreferencesARIA.controller.js");

const {
  createRentalProperty,
  getAllRentalProperties,
  
} = require("../controllers/Rentalproperty.controller.js");
const { getUserDashboard, searchProperties,getSectorSuggestions, getSearchHistory, searchPropertiesonLocation } = require("../controllers/Searchproperties.controller");
const { getPendingPayments, updatePaymentStatus, getApprovedPayments , getAdminOverview , getAllUsersDetailed , getCallbackRequests , getUserRewardsStatus, toggleActiveStatus, toggleReviewStatus, updateUserRole , getAllProperties , updateServiceRequestDetails , deletePropertyAdmin , updatePropertyAdmin  , createRentalPropertyAdmin , createSalePropertyAdmin} = require("../controllers/admin.controller");
const {
  getAllAgents,
  assignPreference,
  getAgentVisibility,
  setAgentVisibility,
  approveAgent,
  suspendAgent,
  getAgentClientViewedMobiles,
  resetAgentPasswordSoft
} = require("../controllers/admin.agent.controller.js");
const { predictPrice } = require("../controllers/aimodel.controller");
const { distributeReward, checkEligibility } = require("../controllers/rewards.controller");
const { createPayment, getPaymentsForUser } = require("../controllers/payment.controller");
const { requestCallback } = require("../controllers/Customersupport.js");
const { getChatResponse, getInitialQuestions } = require("../controllers/ChatBot.controller.js");
const { createSaleProperty, getSaleProperties } = require("../controllers/Saleproperty.controller");
const {getRentalPropertyById , getSalePropertyById , getPropertyById , getAllActiveProperties} = require("../controllers/Viewproperties.controller");
const { saveAiResponses, getAiResponses } = require("../controllers/AiAssistant.controller.js");
const { addView, addSave, addEngagementTime, addRating, getMetrics, getLeadConversion, getSavedProperties , getUserPropertyMetrics } = require("../controllers/PropertyAnalysis.controller.js");
const { getLocationIQApiKey } = require("../controllers/mapintegration.js");
const {getAccountsUsage , getBrevoUsage , getLocationIQUsage , getMongoUsage , getGNewsUsage} = require("../controllers/admin.Accountsusage.js");
const { getNews } = require("../controllers/news.controller");
const {savePreferenceForm, getPreferenceForm , listPreferenceForms , matchPreferencesToUsers , deletePreferenceForm} = require("../controllers/userpreferencesform.controller.js");
const { createListing, searchListings, getListing, deleteListing, updateListing, incrementView, flatmateListingDetails, flatmateEnquiry, getListingsByUser } = require("../controllers/Flatmates.controller.js");


// Agents
const {
  getUniqueAgentCode,
  registerAgent,
  requestOtpAgent,
  loginAgentOtp,
  loginAgentPassword,
  loginAgentSession,
  agentDetails,
  checkAgentExists,
  resetAgentPassword,
  setAgentRecoveryEmail
} = require("../controllers/agentLogin.controller.js");
const {
  getAgentDashboard,
  createRentalPropertyAgent,
  createSalePropertyAgent,
  revealLeadMobileNumber,
  updateAgentPreferredSectors
} = require("../controllers/agentDashboard.controller.js");

// Helper middleware to restrict access to admins only
const checkAdminEmail = async (req, res, next) => {
  try {
    // Ensure the user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No user data found" });
    }

    // Fetch the user from the database
    const user = await User.findById(req.user.id);

    // Check if user exists and has admin role
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    // Attach user to request for further usage
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in checkAdminEmail middleware:", error);
    res.status(500).json({ message: "Server error verifying admin access" });
  }
};
router.get("/api/users", verifyToken, checkAdminEmail, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("email role");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// ================== AUTH ROUTES ==================
router.post("/login/request-otp", requestOtp);
router.post("/login/password", loginWithPassword);
router.post("/login/verify-otp", verifyOtp);
router.post("/auth/set-password", setPassword);
router.post("/auth/check-mobile", checkMobile);
router.post("/auth/set-recovery-email", verifyToken, setRecoveryEmail);
router.post(
  "/auth/change-password-direct",
  verifyTokenOrAgent,
  changePasswordDirect
);

router.get("/auth/me", verifyToken, userDetails);
router.post("/auth/logout", verifyToken, verifyAgentTokenOptional, logoutUser);

// ================== USER ROUTES ==================
router.post("/api/user/save-details", verifyToken, saveUserDetails);
router.get("/api/user/details", verifyToken, getUserDetails);
router.get("/api/user/dashboard", verifyToken, getUserDashboard);
router.get("/api/properties/my", verifyTokenOrAgent, getMyProperties);
router.put(
  "/api/user/update-property/:id",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  updateProperty
);
router.delete("/api/user/delete-property/:id", verifyToken, deleteProperty);

// ================== PROPERTY ROUTES ==================
router.get("/api/activeproperties", verifyTokenOptional, getAllActiveProperties);
router.get("/api/getRentalproperties/:id", verifyTokenOptional, getRentalPropertyById);
router.get("/api/properties/:id", verifyTokenOptional, getPropertyById);

// ================== SEARCH ROUTES ==================
router.get("/api/search-properties", verifyTokenOptional, searchProperties);
router.get("/api/search-history", verifyToken, getSearchHistory);
router.post("/api/search-properties-on-location", verifyToken, searchPropertiesonLocation);
router.get("/api/get-sector-suggestions", verifyToken, getSectorSuggestions);

// ================== PAYMENT ROUTES ==================
router.post("/api/payment", verifyToken, createPayment);
router.get("/api/payment", verifyToken, getPaymentsForUser);

// ================== ADMIN ROUTES ==================
router.get("/admin/ping", (req, res) => {
  res.status(200).json({ message: "Admin route is working!" });
});
router.get("/api/admin/pending-payments", verifyToken, checkAdminEmail, getPendingPayments);
router.post("/api/admin/update-payment-status", verifyToken, checkAdminEmail, updatePaymentStatus);
router.get("/api/admin/approved-payments", verifyToken, checkAdminEmail, getApprovedPayments);
router.get('/api/admin/overview', verifyToken, checkAdminEmail, getAdminOverview);
router.get('/admin/usermanagement', verifyToken, checkAdminEmail, getAllUsersDetailed);
router.get("/api/get-callback-requests", verifyToken, checkAdminEmail, getCallbackRequests);
// New admin route for fetching reward status per user
router.get("/api/admin/rewards/:userId", verifyToken, checkAdminEmail, getUserRewardsStatus);

router.patch("/api/admin/update-role", verifyToken, checkAdminEmail, updateUserRole);
router.get("/api/properties", verifyToken, checkAdminEmail, getAllProperties);
router.get('/api/admin/cloudinary/usage',  getAccountsUsage);
router.get('/api/admin/brevo/usage', getBrevoUsage);
router.get('/api/admin/mongo/usage', getMongoUsage);
router.get('/api/admin/gnews/usage', getGNewsUsage);
router.get('/api/admin/locationiq/usage', getLocationIQUsage);
// Admin updates status of any request
router.patch("/api/admin/services/:id/status", verifyToken, checkAdminEmail, updateServiceRequestDetails)
router.put(
  "/api/admin/update-property/:id",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  updatePropertyAdmin
);
router.delete("/api/admin/delete-property/:id", verifyToken, deletePropertyAdmin);
router.patch("/api/admin/property/:id/toggle-active", verifyToken, checkAdminEmail, toggleActiveStatus);
router.patch("/api/admin/property/:id/toggle-review", verifyToken, checkAdminEmail, toggleReviewStatus);
router.post(
  "/api/admin/addsaleproperties",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createSalePropertyAdmin
);
router.post(
  "/api/admin/addrentproperties",
  verifyTokenOptional,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createRentalPropertyAdmin
);
router.get("/api/admin/preferences-form/list", verifyToken, checkAdminEmail, listPreferenceForms);
router.post("/api/admin/preferences-form/match-users", verifyToken, checkAdminEmail, matchPreferencesToUsers);
router.delete("/api/admin/preferences-form/:id", verifyToken, checkAdminEmail, deletePreferenceForm);
router.get("/api/admin/agents", verifyToken, checkAdminEmail, getAllAgents);
router.get("/api/admin/getvisibility/:agentId", verifyToken, checkAdminEmail, getAgentVisibility);
router.post("/api/admin/setvisibility/:agentId", verifyToken, checkAdminEmail, setAgentVisibility);
router.post("/api/admin/preferences/:prefId/assign", verifyToken, assignPreference);

router.post("/api/admin/approveagent/:agentId", verifyToken, checkAdminEmail, approveAgent);
router.post("/api/admin/suspendagent/:agentId", verifyToken, checkAdminEmail, suspendAgent);
// 🔐 Admin: Soft reset agent password (forces agent to set password again)
router.post(
  "/api/admin/agents/:agentId/reset-password",
  verifyToken,
  checkAdminEmail,
  resetAgentPasswordSoft
);
router.post(
  "/api/admin/agentclientviewed",
  verifyToken,
  checkAdminEmail,
  getAgentClientViewedMobiles
);



// ================== User Preference form ==================
router.post("/api/userpreferenceform", savePreferenceForm);
// ================== AI ROUTES ==================
router.post("/api/predict-price", verifyToken, predictPrice);

// ================== REWARDS ROUTES ==================
router.post("/api/distribute-reward", verifyToken, distributeReward);
router.get("/api/check-eligibility", verifyToken, checkEligibility);

// ================== CUSTOMER SUPPORT ROUTES ==================
router.post("/api/request-callback", verifyToken, requestCallback);

// ================== ENQUIRY ROUTES ==================
const {
  createEnquiry,
  getEnquiries,
  getAgentEnquiries,
  unlockEnquiryContact,
  deleteEnquiry
} = require("../controllers/Enquiry.controller.js");
const { verify } = require("jsonwebtoken");
router.post("/api/enquiry", verifyToken, createEnquiry);
router.get("/api/enquiry", verifyToken, checkAdminEmail, getEnquiries);
router.delete("/admin/api/deleteenquiry/:id", verifyToken, checkAdminEmail, deleteEnquiry);

// ================== CHATBOT ROUTES ==================
router.post("/api/chatbot", getChatResponse);
router.get("/api/chatbot/initial-questions", getInitialQuestions);

// ================== SALE & RENTAL PROPERTY ROUTES ==================
router.get("/api/getSaleproperties/:id", verifyTokenOptional, getSalePropertyById);
router.post(
  "/api/addsaleproperties",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createSaleProperty
);
router.post(
  "/api/addrentproperties",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createRentalProperty
);

// ================== MAP INTEGRATION ROUTES ==================
router.get("/api/locationqapi", getLocationIQApiKey);

// ================== PROPERTY ANALYTICS ROUTES ==================
router.post("/api/property-analysis/addView", verifyToken, addView);
router.post("/api/property-analysis/addSave", verifyToken, addSave);
// router.post("/api/property-analysis/addEnquiry", verifyToken, addEnquiry);
router.post("/api/property-analysis/addEngagementTime", verifyToken, addEngagementTime);
router.post("/api/property-analysis/addRating", verifyToken, addRating);
router.get("/api/property-analysis/:id", verifyToken, getMetrics);
router.get("/api/property-analysis/:id/conversion", verifyToken, getLeadConversion);
router.get("/api/propertyAanalysis/savedProperties", verifyToken, getSavedProperties);
router.get("/api/property-analytics/user-metrics", verifyToken, getUserPropertyMetrics);

// ================== USER PREFERENCES (ARIA ASSISTANT) ==================
router.post("/api/user/preferences-RENT-aria", verifyToken, (req, res) => {
  req.body.assistantType = "rental";
  saveUserPreferencesARIA(req, res);
})

router.post("/api/user/preferences-SALE-aria", verifyToken, (req, res) => {
  req.body.assistantType = "sale";
  saveUserPreferencesARIA(req, res);
});

// ================== Services API ==================
// Create a new service request (owner or renter)
router.post("/api/createservices", verifyToken, createServiceRequest);

// Fetch service requests with pagination (admin can view all, user sees only their own)
router.get("/api/services", verifyToken, getServiceRequests);

// User updates status of their own request
router.patch("/api/services/:id/status", verifyToken, updateServiceRequestStatus);


// ================== News API ==================
router.get('/api/news', getNews);


// ================== Flatmates Listing Routes ==================
router.post("/api/flatmates/listings", verifyToken, upload.fields([{ name: "images", maxCount: 8 }]), createListing);
router.get("/api/flatmates/listings/search", verifyTokenOptional, searchListings);
router.get("/api/flatmates/listings", getListing);
router.delete("/api/flatmates/listings/:id", verifyToken, deleteListing);
router.put("/api/flatmates/listings/:id", verifyToken, updateListing);
router.post("/api/flatmates/listings/:id/increment-view", incrementView);
router.get('/api/flatmates/user/listings', verifyToken, getListingsByUser);

router.get('/flatmatelistingdetails', verifyToken,flatmateListingDetails);
router.post('/flatmateenquiry',verifyToken,flatmateEnquiry);



//Agents
router.get("/api/agent/unique-code",verifyTokenOptional, getUniqueAgentCode);
router.post(
  "/api/agent/register",
  verifyTokenOptional,
  
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 3 },
  ]),
  registerAgent
);
router.post("/api/agentcheck", checkAgentExists);
router.post("/api/agent/send-otp", requestOtpAgent);
router.post("/api/agent/login/otp", verifyTokenOptional, loginAgentOtp);
router.post("/api/agent/login/password", verifyTokenOptional, loginAgentPassword);
router.post("/api/agent/reset-password", verifyTokenOptional, resetAgentPassword);
// 🔐 Session-based Agent Login (when USER cookies already exist)
router.post(
  "/api/agent/login/session",
  loginAgentSession
);
router.post("/agent/set-recovery-email", verifyAgentToken, setAgentRecoveryEmail);
router.get("/agent/me", verifyAgentToken, agentDetails);
router.get("/api/agent/me", verifyAgentToken, agentDetails);
router.get("/api/agent/dashboard", verifyTokenOptional, verifyAgentToken, getAgentDashboard);
router.post(
  "/api/agent/update-sectors",
  verifyTokenOptional,
  verifyAgentToken,
  updateAgentPreferredSectors
);
// Reveal lead mobile number after acceptance
router.post(
  "/api/agent/leadinfo",

  verifyAgentToken,
  revealLeadMobileNumber
);
router.post(
  "/api/Agent/addsaleproperties",
verifyAgentToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createSalePropertyAgent
);
router.post(
  "/api/agent/addrentproperties",
verifyAgentToken,
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "panoFiles", maxCount: 6 },
  ]),
  createRentalPropertyAgent
);

router.get("/api/agent/propertyEnquiries",  verifyAgentToken, getAgentEnquiries);
// 👁️ Unlock enquiry contact details (Agent)
router.post(
  "/api/agent/enquiries/:enquiryId/unlock",

  verifyAgentToken,
  unlockEnquiryContact
);





module.exports = router;

