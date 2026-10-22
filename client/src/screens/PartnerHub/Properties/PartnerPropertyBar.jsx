import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react";

const GREEN = "#0f766e";

/**
 * The strip at the top of a property seen from the Partner portal. It replaces the
 * GgnHome website menu and breadcrumbs with the three things a partner needs:
 * go back to the list, share the listing, and see it the way a customer does.
 */
export default function PartnerPropertyBar({ isActive, publicLink, onBack, onShare }) {
  return (
    <Box sx={{ mb: 5 }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Button onClick={onBack} startIcon={<ArrowLeft size={20} />} sx={{ minHeight: 48, px: 2, fontWeight: 800, fontSize: 15, color: GREEN, border: "2px solid #b8dcd6", borderRadius: "12px", textTransform: "none" }}>
          My properties · मेरी प्रॉपर्टी
        </Button>
        <Chip
          label={isActive ? "Live · चालू" : "Waiting · जाँच में"}
          sx={{ fontWeight: 800, bgcolor: isActive ? "#d1fae5" : "#fef3c7", color: isActive ? "#065f46" : "#92400e" }}
        />
      </Stack>
      <Typography sx={{ mt: 3, fontSize: 14, color: "text.secondary" }}>
        This is how customers see your listing. · ग्राहक को आपकी लिस्टिंग ऐसी दिखती है।
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onShare} startIcon={<Share2 size={18} />} sx={{ minHeight: 48, fontWeight: 800, textTransform: "none", borderColor: "#b8dcd6", color: GREEN, borderRadius: "12px" }}>
          Share with a customer · शेयर करें
        </Button>
        <Button variant="outlined" component="a" href={publicLink} target="_blank" rel="noopener noreferrer" startIcon={<ExternalLink size={18} />} sx={{ minHeight: 48, fontWeight: 800, textTransform: "none", borderColor: "#d6dee8", color: "#334155", borderRadius: "12px" }}>
          Open public page · पब्लिक पेज
        </Button>
      </Stack>
    </Box>
  );
}
