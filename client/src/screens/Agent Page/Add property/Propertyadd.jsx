import React from "react";
import { Eye, LayoutDashboard, PencilLine, Wallet } from "lucide-react";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar.jsx";
import { useAgentAuth } from "../../../Context/AgentAuthContext.js";
import PropertyPostForm from "../../Add property/PropertyPostForm";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const AGENT_POINTS = [
  { icon: Wallet, title: "No Listing Fee", text: "Post as many client properties as you need." },
  { icon: LayoutDashboard, title: "Track In Your Dashboard", text: "See your listings and enquiries in one place." },
  { icon: PencilLine, title: "Edit Anytime", text: "Update price or details from My Properties." },
  { icon: Eye, title: "Contact Details Stay Private", text: "We keep phone numbers and emails out of listing text." },
];

/** /agent/add-property — same form as owners, posted to the agent endpoints. */
export default function PropertyListingFormAgent() {
  const { agent } = useAgentAuth();
  const base = process.env.REACT_APP_Base_API;
  return (
    <PropertyPostForm
      mode="agent"
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      user={agent}
      roleLabel="Agent"
      endpoints={{ rent: `${base}/api/agent/addrentproperties`, sale: `${base}/api/agent/addsaleproperties` }}
      token={localStorage.getItem("agentAccessToken")}
      loginPath="/agent/login"
      managePath="/agent/my-properties"
      manageLabel="My Properties"
      draftKey="agentPostPropertyDraft:v2"
      trustPoints={AGENT_POINTS}
      detailPath={(isRent, id) => (isRent ? `/agent/rentaldetails/${id}` : `/agent/saledetails/${id}`)}
    />
  );
}
