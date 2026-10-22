import React from "react";
import PropertyDetailPage from "../../Property View/PropertyDetailPage";

/**
 * /partner/properties/rental/:id: the rental property page, shown inside the Partner portal
 * (partner menu and header) with the customer features of the public page turned off.
 */
export default function PartnerRentalPropertyView() {
  return <PropertyDetailPage type="rental" partnerView />;
}
