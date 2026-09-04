import React, { useEffect } from "react";

import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { setupInterceptors } from "./utils/axiosInterceptor";
import { pageTransitionVariants } from "./theme/motion";
import Dashboard from "./screens/Dashboard/dashboard";
import LoginModal from "./screens/Login Page/login";
import PropertyCheckout from "./screens/Visit Schedule/Clientvist";

import PropertySearchInterface from "./screens/AI Assistant/ai";
import VoiceAssistantRent from "./screens/AI Assistant/Desktop/RENTAL_CLIENT_RASA_MODEL";
import VoiceAssistantSale from "./screens/AI Assistant/Desktop/SALE_CLIENT_RASA_MODEL";
import VoiceAssistantRentMobile from "./screens/AI Assistant/Mobile/RENTAL_CLIENT_RASA_MODEL";
import VoiceAssistantSaleMobile from "./screens/AI Assistant/Mobile/SALE_CLIENT_RASA_MODEL";
import PropertyListingForm from "./screens/Add property/Propertyadd";
import PropertyCards from "./screens/User-Properties/propertiesuser";
import Searchproperty from "./screens/Searches/Searchproperty";
import AdminProperties from "./screens/Admin Page/admin.properties";
import RewardsPage from "./screens/Rewards/reward";
// import UserDetailsForm from "./screens/User Details/user";
import PricePredictor from "./screens/Price Predictor Model/pricepredict";
import CustomerSupportPage from "./screens/Customer Support/Customersupport";
import  CallbackRequestsDashboard from "./screens/Admin Page/admin.customersupport";
import Chatbot from "./screens/Dashboard/ChatBot";
import PaymentsRewardsDashboard from "./screens/Admin Page/admin.enquiryproperties";
import SeeAllProperties from "./screens/Dashboard/SeeAllProperties";
import PropertyAnalytics from "./screens/User-Properties/PropertyAnalysis";
import Savedproperties from "./screens/Dashboard/savedproperties";
import AdminDashboard from "./screens/Admin Page/admin.dashboardoverview";
import UserManagementSystem from "./screens/Admin Page/admin.usermanagement";
import AdminLandingPage from "./screens/Admin Page/LandingAdminPage";
import EnquiryPage from "./screens/Visit Schedule/enquiry";
import AboutPage from "./screens/Customer Support/About";
import AdminPropertyManager from "./screens/Admin Page/admin.propertyManager";
import AdminProtectedRoute from "./screens/Admin Page/AdminProtectedRoutes";
import AdminPropertyListingForm from "./screens/Admin Page/admin.addproperty";
import InvestRealEstatePage from "./screens/Dashboard/InvestinRealEstateCardSection";
import ServiceRequestApp from "./screens/Managed Services/CreateServices";
import ServiceTrackingSystem from "./screens/Managed Services/ManageServices";
import AdminServiceTracking from "./screens/Admin Page/admin.servicesDashboard";
import VoiceVirtualTourModal from "./screens/3D View Property/propview";
import CloudinaryDashboard from "./screens/Admin Page/admin.usageManager";
import AdminUsageDashboard from "./screens/Admin Page/admin.usageManager2";
import PropertyListingPage from "./screens/Admin Page/admin.allproperties";
import AdminRewardsSection from "./screens/Admin Page/admin.RewardsSection";
import AdminUserPreferencesResponses from "./screens/Admin Page/admin.userpreferencesformresponses";
import UserPreferenceForm from "./screens/User Preference Form/userpreferenceform";
import FlatmatesDashboard from "./screens/Flatmates page/flatmatesdashboard";
import FlatmateDiscovery from "./screens/Flatmates page/flatmatessearch";
import CreateFlatmateListing from "./screens/Flatmates page/flatematespost";
import FlatmatesListings from "./screens/Flatmates page/flatmatesListings";
import FlatmateSearchPropertyModal from "./screens/Flatmates page/flatmatesearchpropertymodal"; 
import AgentRegistration from "./screens/Agent Page/Register Page/AgentRegister";
import AgentLogin from "./screens/Agent Page/Login Page/AgentLogin";
import AgentDashboard from "./screens/Agent Page/Dashboard/AgentDashboard";
import AgentManagement from "./screens/Admin Page/admin.AgentsManagement";
import PropertyListingFormAgent from "./screens/Agent Page/Add property/Propertyadd";
import PropertyCardsAgent from "./screens/Agent Page/User-Properties/propertiesuser";
import PropertyAnalyticsAgent from "./screens/Agent Page/User-Properties/PropertyAnalysis";
import AgentProtectedRoute from "./screens/Agent Page/Protected Routes/AgentProtectedroute";
import CustomerSupportPageAgent from "./screens/Agent Page/Customer Support/Customersupport";
import ProtectedRoutes from "./screens/Protected Routes/protectedroutes";
import AgentRegistrationAdmin from "./screens/Admin Page/Admin.AgentRegister";
// Static imports for agent property detail views
import RentalPropertyPageAgentDesktop from "./screens/Agent Page/Property View Agent/Desktop view/RentalPropertyPageView";
import SalePropertyPageAgentDesktop from "./screens/Agent Page/Property View Agent/Desktop view/SalePropertyPageView";
import RentalPropertyPageAgentMobile from "./screens/Agent Page/Property View Agent/Mobile view/RentalPropertyPageView";
import SalePropertyPageAgentMobile from "./screens/Agent Page/Property View Agent/Mobile view/SalePropertyPageView";



// Single responsive property detail views (MUI breakpoints handle
// desktop/mobile — no separate component trees per viewport).
import RentalPropertydetails from "./screens/Property View/RentalPropertyPageView";
import SalePropertyPage from "./screens/Property View/SalePropertyPageView";


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
        <Routes location={location}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<LoginModal />} />
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
      <Route path="/flatmateslistingform" element={<CreateFlatmateListing />} />
      <Route path="/flatmatesmylistings" element={<FlatmatesListings />} />
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

      
      
      <Route path="/admin/Landingpage" element={<AdminLandingPage />} />
      <Route path="/admin/Dashboard" element={<AdminProtectedRoute element={<AdminDashboard />} />} />
      <Route path="/admin/UserManagement" element={<AdminProtectedRoute element={<UserManagementSystem />} />} />
      <Route path="/admin/enquiries" element={<AdminProtectedRoute element={<PaymentsRewardsDashboard />} />} />
      <Route path="/admin/callback" element={<AdminProtectedRoute element={<CallbackRequestsDashboard />} />} />
      <Route path="/admin/rewardsproperties" element={<AdminProtectedRoute element={<PropertyListingPage />} />} />
      <Route path="/admin/propertymanager" element={<AdminProtectedRoute element={<AdminPropertyManager />} />} />
      <Route path="/admin/add-property" element={<AdminProtectedRoute element={<AdminPropertyListingForm />} />} />
      <Route path="/admin/services" element={<AdminProtectedRoute element={<AdminServiceTracking />} />} />
      <Route path="/admin/usagetrack" element={<CloudinaryDashboard />} />
      <Route path="/admin/usagetrack2" element={<AdminUsageDashboard />} />
      <Route path="/admin/rewards" element={<AdminRewardsSection />} />
      <Route path="/admin/userpreferenceformresponses" element={<AdminProtectedRoute element={<AdminUserPreferencesResponses />} />} />
      <Route path="/admin/agentsmanagement" element={<AdminProtectedRoute element={<AgentManagement />} />} />
      <Route path="/admin/agent-registration" element={<AgentRegistrationAdmin />} />



        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}



export default App;
