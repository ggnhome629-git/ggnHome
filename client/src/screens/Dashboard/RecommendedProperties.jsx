import React from "react";
import { useNavigate } from "react-router-dom";
import PropertyCarousel from "../../components/property/PropertyCarousel";

/**
 * "Properties in your area" rail. Pagination (Load more / end-of-list /
 * error) is owned by dashboard.jsx, which fetches each page and appends into
 * `properties` — this component only renders whatever it's handed.
 */
const RecommendedProperties = ({ properties = [], user, title, onPropertyClick, locationQueryFields }) => {
  const navigate = useNavigate();

  return (
    <PropertyCarousel
      title={title}
      properties={properties}
      user={user}
      onPropertyClick={onPropertyClick}
      onSeeAll={() => {
        if (!user) {
          navigate("/login");
          return;
        }
        navigate("/seeAllproperties", {
          state: {
            recommendedProperties: properties,
            locationQueryFields:
              Array.isArray(locationQueryFields) && locationQueryFields.length > 0
                ? locationQueryFields
                : undefined,
          },
        });
      }}
      emptyTitle="We don't have your area yet"
      emptyDescription="Share your location above and we'll surface homes nearby."
    />
  );
};

export default RecommendedProperties;
