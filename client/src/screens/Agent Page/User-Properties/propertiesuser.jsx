import React from "react";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar.jsx";
import EditPropertyModal from "./editpropertymodal";
import ManageProperties from "../../User-Properties/ManageProperties";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

/** /agent/my-properties — listings an agent posted for clients. */
export default function PropertyCardsAgent() {
  return (
    <ManageProperties
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      token={localStorage.getItem("agentAccessToken")}
      EditModal={EditPropertyModal}
      eyebrow="Agent · My Properties"
      title="Client Listings"
      postPath="/agent/add-property"
      detailPath={(rent, id) => (rent ? `/agent/rentaldetails/${id}` : `/agent/saledetails/${id}`)}
      analyticsPath={(id) => `/agent/property-analytics/${id}`}
      supportPath="/agent/support"
      loginPath="/agent/login"
    />
  );
}
