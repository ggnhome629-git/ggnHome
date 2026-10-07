import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ExternalLink, Info, Search } from "lucide-react";
import { sourcePortalLabel } from "../../../utils/propertyModel";
import { radii } from "../../../theme/theme";
import { primaryCtaSx } from "./ctaStyles";

/**
 * Section 8 of the upgrade guide — the only "contact" an affiliate (sourced)
 * listing gets. It replaces the contact card, callback dialog, schedule-visit
 * dialog and enquiry form: the listing lives on the source portal, so all we
 * do is hand the visitor there and back to our own search.
 */
export default function AffiliateListingCard({ property, onSearch, onEvent }) {
  const portal = sourcePortalLabel(property.sourcePortal);
  const copy =
    property.sourcePortal === "99acres"
      ? `This property is listed on ${portal}. View it there to contact the owner directly and get the latest updates.`
      : `This property is listed on ${portal}. View it there for the latest information and to reach the owner directly.`;

  return (
    <Box
      sx={{
        borderRadius: `${radii.lg}px`,
        backgroundColor: "rgba(0,167,157,0.05)",
        border: "1px solid",
        borderColor: "rgba(0,167,157,0.2)",
        p: 5,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Info size={24} color="#00A79D" style={{ flexShrink: 0 }} />
        <Typography variant="h4" sx={{ fontSize: "1rem", color: "primary.main" }}>
          External listing
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
        {copy}
      </Typography>

      <Button
        variant="contained"
        size="large"
        fullWidth
        endIcon={<ExternalLink size={16} />}
        href={property.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onEvent?.("source_cta_clicked", { portal: property.sourcePortal })}
        sx={{ ...primaryCtaSx, mb: 3 }}
      >
        View on {portal}
      </Button>

      <Button
        size="small"
        startIcon={<Search size={14} />}
        onClick={() => {
          onEvent?.("affiliate_search_fallback");
          onSearch?.();
        }}
        sx={{ color: "#00A79D", px: 0, "&:hover": { backgroundColor: "transparent", textDecoration: "underline" } }}
      >
        Can't find it here? Search GgnHome
      </Button>
    </Box>
  );
}
