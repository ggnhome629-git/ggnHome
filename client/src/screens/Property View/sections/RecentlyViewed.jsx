import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { formatArea, formatCompactCurrency, PROPERTY_TYPE } from "../../../utils/propertyModel";

const FALLBACK = "/default-property.jpg";

/**
 * Reads the visitor's own browsing history from localStorage — renders
 * nothing at all until they've actually viewed another listing.
 */
export default function RecentlyViewed({ items }) {
  const navigate = useNavigate();
  if (!items || items.length === 0) return null;

  return (
    <Box component="section">
      <Typography variant="h2" component="h2" sx={{ fontSize: { xs: "1.15rem", md: "1.4rem" }, color: "primary.main", mb: 5 }}>
        Recently viewed
      </Typography>

      <Stack direction="row" spacing={4} sx={{ overflowX: "auto", pb: 2, "&::-webkit-scrollbar": { display: "none" } }}>
        {items.map((item) => (
          <Box
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() =>
              navigate(item.type === PROPERTY_TYPE.RENTAL ? `/Rentaldetails/${item.id}` : `/Saledetails/${item.id}`)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(item.type === PROPERTY_TYPE.RENTAL ? `/Rentaldetails/${item.id}` : `/Saledetails/${item.id}`);
              }
            }}
            sx={{
              width: 240,
              flexShrink: 0,
              cursor: "pointer",
              borderRadius: `${radii.md}px`,
              overflow: "hidden",
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              transition: "box-shadow .2s ease, transform .2s ease",
              "&:hover": { boxShadow: elevationShadows[2], transform: "translateY(-3px)" },
            }}
          >
            <Box
              component="img"
              src={item.image || FALLBACK}
              alt={item.title}
              loading="lazy"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
              }}
              sx={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
            />
            <Box sx={{ p: 4 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }} noWrap>
                {item.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 1 }}>
                <MapPin size={12} color="#00A79D" />
                <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
                  {item.sector || "Gurgaon"}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "secondary.main" }}>
                {formatCompactCurrency(item.price) || "On request"}
                {item.builtUpArea ? (
                  <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 2 }}>
                    {formatArea(item.builtUpArea)}
                  </Typography>
                ) : null}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
