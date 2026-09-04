import React, { useState } from "react";
import { Button, Dialog, IconButton, Stack, TextField, Typography } from "@mui/material";
import { X } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Replaces the old centered <Modal> with a proper MUI Dialog carrying the
 * same share actions (copy link, WhatsApp, Facebook, Twitter, native share).
 */
export default function ShareDialog({ open, onClose, link }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: `${radii.lg}px`, p: 2 } }}>
      <Stack spacing={5} sx={{ p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h3" sx={{ fontSize: "1.1rem", color: "primary.main" }}>
            Share property
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField value={link || ""} size="small" fullWidth InputProps={{ readOnly: true }} />
          <Button variant="contained" color="secondary" onClick={copyLink} sx={{ flexShrink: 0 }}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(link || "")}`, "_blank")}
            sx={{ backgroundColor: "#25D366", color: "common.white", "&:hover": { backgroundColor: "#1fb959" } }}
          >
            WhatsApp
          </Button>
          <Button
            fullWidth
            onClick={() =>
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link || "")}`, "_blank")
            }
            sx={{ backgroundColor: "#1877F2", color: "common.white", "&:hover": { backgroundColor: "#1461cc" } }}
          >
            Facebook
          </Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(link || "")}`, "_blank")}
            sx={{ backgroundColor: "#1DA1F2", color: "common.white", "&:hover": { backgroundColor: "#0d8ddb" } }}
          >
            Twitter
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Property from GgnHome", url: link }).catch(() => {});
              }
            }}
            sx={{ borderColor: "divider", color: "text.secondary" }}
          >
            More options
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
