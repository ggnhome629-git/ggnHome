import React, { useMemo, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PropertyCarousel from "../../components/property/PropertyCarousel";

const TABS = [
  { value: "all", label: "All homes" },
  { value: "rent", label: "For rent" },
  { value: "sale", label: "For sale" },
];

const kindOf = (p) => {
  const t = String(p.defaultpropertytype || p.type || "").toLowerCase();
  if (t.includes("rent")) return "rent";
  if (t.includes("sale")) return "sale";
  return p.monthlyRent ? "rent" : "sale";
};

/**
 * The dashboard's primary discovery rail — recommended properties for a
 * signed-in user, or a general explore feed otherwise — with Rent/Buy tabs.
 * "See all" hands the current list to SeeAllProperties.
 */
const PropertyDashboard = ({ properties = [], user, title, loading = false, onPropertyClick }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");

  const visible = useMemo(() => {
    const base = user ? properties : properties.slice(0, 12);
    return tab === "all" ? base : base.filter((p) => kindOf(p) === tab);
  }, [properties, user, tab]);

  return (
    <PropertyCarousel
      title={title}
      properties={visible}
      user={user}
      loading={loading}
      onPropertyClick={onPropertyClick}
      autoScroll
      toolbar={
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tab}
          onChange={(_, v) => v && setTab(v)}
          aria-label="Filter listings"
          sx={{
            "& .MuiToggleButton-root": {
              px: 4,
              textTransform: "none",
              fontWeight: 600,
              "&.Mui-selected": {
                color: "common.white",
                backgroundColor: "primary.main",
                "&:hover": { backgroundColor: "primary.dark" },
              },
            },
          }}
        >
          {TABS.map((t) => (
            <ToggleButton key={t.value} value={t.value}>
              {t.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
      onSeeAll={() => {
        if (user) {
          navigate("/seeAllproperties", {
            state: { recommendedProperties: visible, paginateActive: true },
          });
        } else {
          navigate("/login");
        }
      }}
      emptyTitle={tab === "all" ? "Nothing to explore yet" : "No homes in this category yet"}
      emptyDescription="New listings land here as soon as they're verified — check back shortly."
    />
  );
};

export default PropertyDashboard;
