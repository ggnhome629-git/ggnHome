import React from "react";
import PropertyDetailPage from "../../Property View/PropertyDetailPage";

/**
 * /partner/properties/sale/:id: the sale property page, shown inside the Partner portal
 * (partner menu and header) with the customer features of the public page turned off.
 */
export default function PartnerSalePropertyView() {
  return <PropertyDetailPage type="sale" partnerView />;
}
