import React, { lazy, Suspense, useEffect } from "react";

import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { setupInterceptors } from "./utils/axiosInterceptor";
import { pageTransitionVariants } from "./theme/motion";
import PageLoader from "./components/ui/PageLoader";
import Dashboard from "./screens/Dashboard/dashboard";
import LoginModal from "./screens/Login Page/login";
const SmsOtpTest = lazy(() => import("./screens/Test Page/SmsOtpTest"));
const PropertyCheckout = lazy(() => import("./screens/Visit Schedule/Clientvist"));

const PropertySearchInterface = lazy(() => import("./screens/AI Assistant/ai"));
const VoiceAssistantRent = lazy(() => import("./screens/AI Assistant/Desktop/RENTAL_CLIENT_RASA_MODEL"));
const VoiceAssistantSale = lazy(() => import("./screens/AI Assistant/Desktop/SALE_CLIENT_RASA_MODEL"));
const VoiceAssistantRentMobile = lazy(() => import("./screens/AI Assistant/Mobile/RENTAL_CLIENT_RASA_MODEL"));
const VoiceAssistantSaleMobile = lazy(() => import("./screens/AI Assistant/Mobile/SALE_CLIENT_RASA_MODEL"));
const PropertyListingForm = lazy(() => import("./screens/Add property/Propertyadd"));
const PropertyCards = lazy(() => import("./screens/User-Properties/propertiesuser"));
const Searchproperty = lazy(() => import("./screens/Searches/Searchproperty"));
const AdminProperties = lazy(() => import("./screens/Admin Page/admin.properties"));
const RewardsPage = lazy(() => import("./screens/Rewards/reward"));
// import UserDetailsForm from "./screens/User Details/user";
const PricePredictor = lazy(() => import("./screens/Price Predictor Model/pricepredict"));
const CustomerSupportPage = lazy(() => import("./screens/Customer Support/Customersupport"));
const CallbackRequestsDashboard = lazy(() => import("./screens/Admin Page/admin.customersupport"));
const Chatbot = lazy(() => import("./screens/Dashboard/ChatBot"));
const PaymentsRewardsDashboard = lazy(() => import("./screens/Admin Page/admin.enquiryproperties"));
const SeeAllProperties = lazy(() => import("./screens/Dashboard/SeeAllProperties"));
const PropertyAnalytics = lazy(() => import("./screens/User-Properties/PropertyAnalysis"));
const Savedproperties = lazy(() => import("./screens/Dashboard/savedproperties"));
const AdminDashboard = lazy(() => import("./screens/Admin Page/admin.dashboardoverview"));
const UserManagementSystem = lazy(() => import("./screens/Admin Page/admin.usermanagement"));
const AdminLandingPage = lazy(() => import("./screens/Admin Page/LandingAdminPage"));
const EnquiryPage = lazy(() => import("./screens/Visit Schedule/enquiry"));
const AboutPage = lazy(() => import("./screens/Customer Support/About"));
const AdminPropertyManager = lazy(() => import("./screens/Admin Page/admin.propertyManager"));
const AdminProtectedRoute = lazy(() => import("./screens/Admin Page/AdminProtectedRoutes"));
const AdminPropertyListingForm = lazy(() => import("./screens/Admin Page/admin.addproperty"));
const InvestRealEstatePage = lazy(() => import("./screens/Dashboard/InvestinRealEstateCardSection"));
const ServiceRequestApp = lazy(() => import("./screens/Managed Services/CreateServices"));
const ServiceTrackingSystem = lazy(() => import("./screens/Managed Services/ManageServices"));
const AdminServiceTracking = lazy(() => import("./screens/Admin Page/admin.servicesDashboard"));
const VoiceVirtualTourModal = lazy(() => import("./screens/3D View Property/propview"));
const CloudinaryDashboard = lazy(() => import("./screens/Admin Page/admin.usageManager"));
const AdminUsageDashboard = lazy(() => import("./screens/Admin Page/admin.usageManager2"));
const PropertyListingPage = lazy(() => import("./screens/Admin Page/admin.allproperties"));
const AdminRewardsSection = lazy(() => import("./screens/Admin Page/admin.RewardsSection"));
const AdminUserPreferencesResponses = lazy(() => import("./screens/Admin Page/admin.userpreferencesformresponses"));
const UserPreferenceForm = lazy(() => import("./screens/User Preference Form/userpreferenceform"));
const FlatmatesDashboard = lazy(() => import("./screens/Flatmates page/flatmatesdashboard"));
const FlatmateDiscovery = lazy(() => import("./screens/Flatmates page/flatmatessearch"));
const CreateFlatmateListing = lazy(() => import("./screens/Flatmates page/flatematespost"));
const FlatmatesListings = lazy(() => import("./screens/Flatmates page/flatmatesListings"));
const FlatmateSearchPropertyModal = lazy(() => import("./screens/Flatmates page/flatmatesearchpropertymodal")); 
const AgentRegistration = lazy(() => import("./screens/Agent Page/Register Page/AgentRegister"));
const AgentLogin = lazy(() => import("./screens/Agent Page/Login Page/AgentLogin"));
const AgentDashboard = lazy(() => import("./screens/Agent Page/Dashboard/AgentDashboard"));
const AgentManagement = lazy(() => import("./screens/Admin Page/admin.AgentsManagement"));
const AdminSmsDevices = lazy(() => import("./screens/Admin Page/admin.smsDevices"));
const AdminPromos = lazy(() => import("./screens/Admin Page/admin.promos"));
const PropertyListingFormAgent = lazy(() => import("./screens/Agent Page/Add property/Propertyadd"));
const PropertyCardsAgent = lazy(() => import("./screens/Agent Page/User-Properties/propertiesuser"));
const PropertyAnalyticsAgent = lazy(() => import("./screens/Agent Page/User-Properties/PropertyAnalysis"));
const AgentProtectedRoute = lazy(() => import("./screens/Agent Page/Protected Routes/AgentProtectedroute"));
const CustomerSupportPageAgent = lazy(() => import("./screens/Agent Page/Customer Support/Customersupport"));
const ProtectedRoutes = lazy(() => import("./screens/Protected Routes/protectedroutes"));
const AgentRegistrationAdmin = lazy(() => import("./screens/Admin Page/Admin.AgentRegister"));
const AdminLayout = lazy(() => import("./screens/Admin Page/shell/AdminLayout"));
const AdminPayments = lazy(() => import("./screens/Admin Page/admin.properties"));
// Static imports for agent property detail views
const RentalPropertyPageAgentDesktop = lazy(() => import("./screens/Agent Page/Property View Agent/Desktop view/RentalPropertyPageView"));
const SalePropertyPageAgentDesktop = lazy(() => import("./screens/Agent Page/Property View Agent/Desktop view/SalePropertyPageView"));
const RentalPropertyPageAgentMobile = lazy(() => import("./screens/Agent Page/Property View Agent/Mobile view/RentalPropertyPageView"));
const SalePropertyPageAgentMobile = lazy(() => import("./screens/Agent Page/Property View Agent/Mobile view/SalePropertyPageView"));



// Single responsive property detail views (MUI breakpoints handle
// desktop/mobile — no separate component trees per viewport).
const RentalPropertydetails = lazy(() => import("./screens/Property View/RentalPropertyPageView"));
const SalePropertyPage = lazy(() => import("./screens/Property View/SalePropertyPageView"));


// Responsive route components (decide at runtime and re-evaluate on resize)
const makeResponsiveComponent = (DesktopComp, MobileComp) => {
  return (props) => {
    const [isMobile, setIsMobile] = React.useState(
      typeof window !== 'undefined' && window.innerWidth <= 768
    );
    React.useEffect(() => {
      const onResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    const Comp = isMobile ? MobileComp : DesktopComp;
    return <Comp {...props} />;
  };
};

// Responsive agent components
const RentalPropertyPageAgent = makeResponsiveComponent(RentalPropertyPageAgentDesktop, RentalPropertyPageAgentMobile);
const SalePropertyPageAgent = makeResponsiveComponent(SalePropertyPageAgentDesktop, SalePropertyPageAgentMobile);


const MyProperties = RentalPropertydetails;
const VoiceAssistantRentResponsive = makeResponsiveComponent(VoiceAssistantRent, VoiceAssistantRentMobile);
const VoiceAssistantSaleResponsive = makeResponsiveComponent(VoiceAssistantSale, VoiceAssistantSaleMobile);




function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setupInterceptors(navigate);
  }, [navigate]);

  // Route changes don't reset scroll on their own — without this, navigating
  // to a new page (e.g. clicking a property card) keeps whatever scroll
  // position the previous page was at instead of opening at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageTransitionVariants}
      >
        <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<LoginModal />} />
      <Route path="/test" element={<SmsOtpTest />} />
      <Route path="/Rentaldetails/:id" element={<RentalPropertydetails />} />
      <Route path="/Saledetails/:id" element={<SalePropertyPage />} />

      
      <Route path="/about" element={<AboutPage />} />
      <Route path="/property-visit/:id" element={<PropertyCheckout />} />
      <Route path="/search" element={<Searchproperty />} />
      <Route path="/search/:query" element={<Searchproperty />} />
      <Route path="/userpreferenceform" element={<UserPreferenceForm />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/AIassistant" element={<PropertySearchInterface />} />
        <Route path="/AIassistant-Rent" element={<VoiceAssistantRentResponsive />} />
        <Route path="/AIassistant-Sale" element={<VoiceAssistantSaleResponsive />} />
        <Route path="/add-property" element={<PropertyListingForm />} />
        <Route path="/flatmateslistingform" element={<CreateFlatmateListing />} />
        <Route path="/flatmatesmylistings" element={<FlatmatesListings />} />
        <Route path="/my-properties/:id" element={<MyProperties />} />
        <Route path="/my-properties" element={<PropertyCards />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/price-predictor" element={<PricePredictor />} />
        <Route path="/investrealestate" element={<InvestRealEstatePage />} />
        <Route path="/support" element={<CustomerSupportPage />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/seeAllproperties" element={<SeeAllProperties />} />
        <Route path="/savedproperties" element={<Savedproperties />} />
        <Route path="/property-analytics/:id" element={<PropertyAnalytics />} />
        <Route path="/enquiry-page/:id" element={<EnquiryPage />} />
        <Route path="/servicesCreate" element={<ServiceRequestApp />} />
        <Route path="/services" element={<ServiceTrackingSystem />} />
        <Route path="/property/:id/virtual-tour" element={<VoiceVirtualTourModal />} />
      </Route>
      <Route path="/flatmatesdashboard" element={<FlatmatesDashboard />} />
      <Route path="/flatmatessearch" element={<FlatmateDiscovery />} />
      <Route path="/flatmatesearchpropertymodal/:id" element={<FlatmateSearchPropertyModal />} />
      <Route path="/agent/register" element={<AgentRegistration />} />
      <Route path="/agent/login" element={<AgentLogin />} />
      <Route element={<AgentProtectedRoute />}> 
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/agent/rentaldetails/:id" element={<RentalPropertyPageAgent />} />
        <Route path="/agent/saledetails/:id" element={<SalePropertyPageAgent />} />
        <Route path="/agent/add-property" element={<PropertyListingFormAgent />} />
        <Route path="/agent/my-properties" element={<PropertyCardsAgent />} />
        <Route path="/agent/property-analytics/:id" element={<PropertyAnalyticsAgent />} />
        <Route path="/agent/support" element={<CustomerSupportPageAgent />} />
      </Route>

      
      
      {/*
        Every admin screen renders inside the shared shell (navigation rail +
        top bar) and behind AdminProtectedRoute — including the five routes
        that previously had no guard at all (spec S1).
      */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="/admin/Landingpage" element={<AdminProtectedRoute element={<AdminLandingPage />} />} />
        <Route path="/admin/Dashboard" element={<AdminProtectedRoute element={<AdminDashboard />} />} />
        <Route path="/admin/UserManagement" element={<AdminProtectedRoute element={<UserManagementSystem />} />} />
        <Route path="/admin/enquiries" element={<AdminProtectedRoute element={<PaymentsRewardsDashboard />} />} />
        <Route path="/admin/callback" element={<AdminProtectedRoute element={<CallbackRequestsDashboard />} />} />
        <Route path="/admin/rewardsproperties" element={<AdminProtectedRoute element={<PropertyListingPage />} />} />
        <Route path="/admin/propertymanager" element={<AdminProtectedRoute element={<AdminPropertyManager />} />} />
        <Route path="/admin/add-property" element={<AdminProtectedRoute element={<AdminPropertyListingForm />} />} />
        <Route path="/admin/services" element={<AdminProtectedRoute element={<AdminServiceTracking />} />} />
        <Route path="/admin/usagetrack" element={<AdminProtectedRoute element={<CloudinaryDashboard />} />} />
        <Route path="/admin/usagetrack2" element={<AdminProtectedRoute element={<AdminUsageDashboard />} />} />
        <Route path="/admin/rewards" element={<AdminProtectedRoute element={<AdminRewardsSection />} />} />
        <Route path="/admin/payments" element={<AdminProtectedRoute element={<AdminPayments />} />} />
        <Route path="/admin/userpreferenceformresponses" element={<AdminProtectedRoute element={<AdminUserPreferencesResponses />} />} />
        <Route path="/admin/agentsmanagement" element={<AdminProtectedRoute element={<AgentManagement />} />} />
        <Route path="/admin/sms-devices" element={<AdminProtectedRoute element={<AdminSmsDevices />} />} />
        <Route path="/admin/promos" element={<AdminProtectedRoute element={<AdminPromos />} />} />
        <Route path="/admin/agent-registration" element={<AdminProtectedRoute element={<AgentRegistrationAdmin />} />} />
        {/* Renamed/legacy paths keep working (spec U10/U11) */}
        <Route path="/admin/all-properties" element={<Navigate replace to="/admin/rewardsproperties" />} />
        <Route path="/admin/propertymanager-old" element={<Navigate replace to="/admin/propertymanager" />} />
        <Route path="*" element={<Navigate replace to="/admin/Landingpage" />} />
      </Route>



        </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}



export default App;
