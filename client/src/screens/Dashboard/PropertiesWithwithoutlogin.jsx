import React from "react";
import { useNavigate } from "react-router-dom";
import PropertyCarousel from "../../components/property/PropertyCarousel";

/**
 * The dashboard's primary discovery rail — recommended properties for a
 * signed-in user, or a general explore feed otherwise. Auto-advances gently
 * and pauses on hover; "See all" hands the current list to SeeAllProperties
 * so it can page from where this rail left off.
 */
const PropertyDashboard = ({ properties = [], user, title, onPropertyClick }) => {
  const navigate = useNavigate();

  return (
    <PropertyCarousel
      title={title}
      properties={user ? properties : properties.slice(0, 12)}
      user={user}
      onPropertyClick={onPropertyClick}
      autoScroll
      onSeeAll={() => {
        if (user) {
          navigate("/seeAllproperties", {
            state: { recommendedProperties: properties, paginateActive: true },
          });
        } else {
          navigate("/login");
        }
      }}
      emptyTitle="Nothing to explore yet"
      emptyDescription="New listings land here as soon as they're verified — check back shortly."
    />
  );
};

export default PropertyDashboard;
