import React from "react";
import { ClipboardList, Eye, PhoneCall, ShieldCheck } from "lucide-react";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useAuth } from "../../Context/AuthContext";
import PropertyPostForm from "../Add property/PropertyPostForm";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const ADMIN_POINTS = [
  { icon: PhoneCall, title: "Verify With The Owner", text: "Confirm price, availability and photos before saving." },
  { icon: ShieldCheck, title: "Owner Number Stays Private", text: "It's stored for the team, never shown on the listing." },
  { icon: ClipboardList, title: "Manage From Property Manager", text: "Review, approve or edit listings after saving." },
  { icon: Eye, title: "No Contact Details In Text", text: "Keep phone numbers and emails out of title and description." },
];

/**
 * /admin/add-property — the shared post form plus the admin-only fields:
 * owner's mobile number and the extra rental details (lease, policies,
 * neighbourhood).
 */
export default function AdminPropertyListingForm() {
  const { user } = useAuth();
  const base = process.env.REACT_APP_Base_API;
  return (
    <PropertyPostForm
      mode="admin"
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      user={user}
      roleLabel="Admin"
      endpoints={{ rent: `${base}/api/admin/addrentproperties`, sale: `${base}/api/admin/addsaleproperties` }}
      token={localStorage.getItem("accessToken")}
      managePath="/admin/propertymanager"
      manageLabel="Property Manager"
      draftKey="adminPostPropertyDraft:v2"
      askOwnerContact
      extendedFields
      extraFormFields={{ ownerType: "Admin" }}
      trustPoints={ADMIN_POINTS}
    />
  );
}
