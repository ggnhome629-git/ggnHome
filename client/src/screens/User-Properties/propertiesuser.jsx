import React from "react";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import Footer from "../Dashboard/Footer";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import { useAuth } from "../../Context/AuthContext";
import EditPropertyModal from "./editpropertymodal";
import ManageProperties from "./ManageProperties";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

/** /my-properties — an owner's rent and sale listings. */
export default function PropertyCards() {
  const { user } = useAuth();
  return (
    <ManageProperties
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      footer={
        <>
          <Footer user={user} />
          <MobileBottomNav user={user} />
        </>
      }
      token={localStorage.getItem("accessToken")}
      EditModal={EditPropertyModal}
    />
  );
}
