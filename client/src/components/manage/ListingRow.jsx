import React, { useState } from "react";
import { Box, Button, ButtonBase, IconButton, LinearProgress, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ImageOff, Info, MoreVertical } from "lucide-react";
import { cloudinaryUrl } from "../../utils/cloudinaryImage";
import { radii } from "../../theme/theme";

export const STATUS_TONES = {
  live: { bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" },
  review: { bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B" },
  inactive: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
};

/**
 * One row on a manage-listings page: photo, price, title, status, stats,
 * a quality meter and actions. Used for properties and flatmate rooms.
 *
 * actions: [{ label, icon, onClick, primary?, disabled?, tooltip? }]   (shown as buttons)
 * menu:    [{ label, icon, onClick, danger?, disabled? }]              (in the ⋮ menu)
 */
export default function ListingRow({ image, imageCount, badge, price, title, location, facts = [], status, stats = [], quality, actions = [], menu = [], onOpen, meta }) {
  const [anchor, setAnchor] = useState(null);
  const tone = STATUS_TONES[status?.key] || STATUS_TONES.inactive;

  return (
    <Box
      component={motion.div}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "220px minmax(0,1fr)", md: "260px minmax(0,1fr)" },
        borderRadius: `${radii.lg}px`,
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 14px rgba(0,51,102,0.05)",
        transition: "box-shadow .2s ease",
        "&:hover": { boxShadow: "0 12px 28px rgba(0,51,102,0.10)" },
      }}
    >
      <ButtonBase onClick={onOpen} aria-label={`Open ${title}`} sx={{ position: "relative", display: "block", aspectRatio: { xs: "16 / 9", sm: "auto" }, minHeight: { sm: 200 }, backgroundColor: "#E6EDF3" }}>
        {image ? (
          <img src={cloudinaryUrl(image, { width: 520 })} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: "absolute", inset: 0, color: "text.secondary" }}>
            <ImageOff size={26} />
            <Typography variant="caption">No photos yet</Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1.5} sx={{ position: "absolute", top: 10, left: 10 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.25, py: 0.75, borderRadius: 999, backgroundColor: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 800 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: tone.dot }} />
            <span>{status?.label}</span>
          </Stack>
          {badge && <Box sx={{ px: 2.25, py: 0.75, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.94)", color: "primary.main", fontSize: 12, fontWeight: 800 }}>{badge}</Box>}
        </Stack>
        {imageCount > 1 && <Box sx={{ position: "absolute", bottom: 10, left: 10, px: 2, py: 0.5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, fontWeight: 700 }}>{imageCount} photos</Box>}
      </ButtonBase>

      <Stack sx={{ p: { xs: 4, md: 5 }, minWidth: 0 }} spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: "1.15rem", md: "1.3rem" } }}>{price}</Typography>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }} noWrap title={title}>
              {title}
            </Typography>
            {location && (
              <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
                {location}
              </Typography>
            )}
          </Box>
          {menu.length > 0 && (
            <>
              <IconButton aria-label="More actions" onClick={(e) => setAnchor(e.currentTarget)} size="small" sx={{ mt: -1, mr: -1 }}>
                <MoreVertical size={18} />
              </IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                {menu.map(({ label, icon: Icon, onClick, danger, disabled }) => (
                  <MenuItem
                    key={label}
                    disabled={disabled}
                    onClick={() => {
                      setAnchor(null);
                      onClick();
                    }}
                    sx={{ color: danger ? "#DC2626" : undefined, fontWeight: 600, fontSize: 14 }}
                  >
                    {Icon && (
                      <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                        <Icon size={16} />
                      </ListItemIcon>
                    )}
                    {label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Stack>

        {facts.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1.5}>
            {facts.map((f) => (
              <Box key={f} sx={{ px: 2.25, py: 0.75, borderRadius: `${radii.sm}px`, backgroundColor: "#F4F7F9", fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>
                {f}
              </Box>
            ))}
          </Stack>
        )}

        {status?.note && (
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 3, py: 2, borderRadius: `${radii.md}px`, backgroundColor: tone.bg, color: tone.fg }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.45 }}>
              {status.note}
            </Typography>
          </Stack>
        )}

        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2.5, md: 5 }} alignItems={{ md: "center" }}>
          {stats.length > 0 && (
            <Stack direction="row" spacing={{ xs: 4, md: 5 }}>
              {stats.map(({ icon: Icon, label, value }) => (
                <Tooltip key={label} title={label}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                    <Icon size={15} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {value}
                    </Typography>
                    <Typography variant="caption" sx={{ display: { xs: "none", sm: "inline" } }}>
                      {label}
                    </Typography>
                  </Stack>
                </Tooltip>
              ))}
            </Stack>
          )}
          {quality && (
            <Tooltip title={quality.tip || ""}>
              <Box sx={{ flex: 1, minWidth: 140, maxWidth: { md: 240 } }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    Listing quality
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: quality.value >= 80 ? "#15803D" : quality.value >= 50 ? "#B45309" : "#DC2626" }}>
                    {quality.value}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={quality.value}
                  sx={{ height: 6, borderRadius: 3, backgroundColor: "#E6EDF3", "& .MuiLinearProgress-bar": { backgroundColor: quality.value >= 80 ? "#16A34A" : quality.value >= 50 ? "#F59E0B" : "#EF4444" } }}
                />
              </Box>
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" useFlexGap flexWrap="wrap" gap={2} alignItems="center" sx={{ pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          {actions.map(({ label, icon: Icon, onClick, primary, disabled, tooltip }) => {
            const btn = (
              <Button
                key={label}
                size="small"
                variant={primary ? "contained" : "outlined"}
                color={primary ? "secondary" : "primary"}
                startIcon={Icon ? <Icon size={15} /> : null}
                onClick={onClick}
                disabled={disabled}
                sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
              >
                {label}
              </Button>
            );
            return tooltip ? (
              <Tooltip key={label} title={tooltip}>
                <span>{btn}</span>
              </Tooltip>
            ) : (
              btn
            );
          })}
          {meta && (
            <Typography variant="caption" sx={{ color: "text.secondary", ml: { sm: "auto" } }}>
              {meta}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
