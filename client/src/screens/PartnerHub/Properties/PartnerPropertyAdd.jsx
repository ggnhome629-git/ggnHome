import React from "react";
import { useNavigate } from "react-router-dom";
import PropertyPostForm from "../../Add property/PropertyPostForm";

/**
 * PartnerHub uses the same guided, responsive property-posting experience as
 * the main Add Property page, with its own publishing endpoint and partner token.
 */
export default function PartnerPropertyAdd() {
  const navigate = useNavigate();
  const base = process.env.REACT_APP_Base_API;
  return (
    <PropertyPostForm
      mode="partner"
      user={null}
      roleLabel="Partner"
      endpoints={{ rent: `${base}/api/partner/properties`, sale: `${base}/api/partner/properties` }}
      token={localStorage.getItem("partnerAccessToken")}
      loginPath="/partner/login"
      managePath="/partner/properties"
      manageLabel="My Properties"
      draftKey="partnerPostPropertyDraft:v1"
      detailPath={(isRent, id) => `/partner/properties`}
    />
  );
}
