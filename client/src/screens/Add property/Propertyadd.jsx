import React from "react";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useAuth } from "../../Context/AuthContext";
import PropertyPostForm from "./PropertyPostForm";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

/** /add-property — owners (and logged-in agents/admins using the main site). */
export default function PropertyListingForm() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  return (
    <PropertyPostForm
      mode="owner"
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      user={user}
      roleLabel={role === "admin" ? "Admin" : role === "agent" ? "Agent" : "Owner"}
      endpoints={{ rent: process.env.REACT_APP_ADD_RENT_PROPERTY_API, sale: process.env.REACT_APP_ADD_SALE_PROPERTY_API }}
      token={localStorage.getItem("accessToken")}
    />
  );
}
