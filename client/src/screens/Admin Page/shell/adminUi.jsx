import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Skeleton,
  Stack,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { AnimatedNumber } from "../../../components/motion";

/**
 * Shared admin primitives (PART 5 of the admin upgrade spec). Every screen
 * pulls these from here so status colours, spacing, confirmations and empty
 * states stay identical across the console.
 */

const TONES = {
  // status -> { bg, fg } — one mapping for the whole product (5.5).
  pending: { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
  "pending-review": { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
  new: { bg: "rgba(139,92,246,0.14)", fg: "#6D28D9" },
  edited: { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
  "in-progress": { bg: "rgba(33,150,243,0.14)", fg: "#1565C0" },
  resolved: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  completed: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  approved: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  active: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  online: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  sent: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  live: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  rejected: { bg: "rgba(220,38,38,0.14)", fg: "#B91C1C" },
  failed: { bg: "rgba(220,38,38,0.14)", fg: "#B91C1C" },
  suspended: { bg: "rgba(220,38,38,0.14)", fg: "#B91C1C" },
  error: { bg: "rgba(220,38,38,0.14)", fg: "#B91C1C" },
  inactive: { bg: "rgba(100,116,139,0.16)", fg: "#475569" },
  disabled: { bg: "rgba(100,116,139,0.16)", fg: "#475569" },
  offline: { bg: "rgba(100,116,139,0.16)", fg: "#475569" },
  paused: { bg: "rgba(100,116,139,0.16)", fg: "#475569" },
  expired: { bg: "rgba(71,85,105,0.16)", fg: "#334155" },
  "cooling-down": { bg: "rgba(34,211,238,0.16)", fg: "#0E7490" },
  scheduled: { bg: "rgba(33,150,243,0.14)", fg: "#1565C0" },
  queued: { bg: "rgba(33,150,243,0.14)", fg: "#1565C0" },
};

const labelFor = (status) =>
  String(status)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Dot + label chip — never colour alone (5.5). */
export function StatusChip({ status, size = "small", sx }) {
  const key = String(status || "").toLowerCase();
  const tone = TONES[key] || { bg: "rgba(100,116,139,0.16)", fg: "#475569" };
  return (
    <Chip
      size={size}
      label={labelFor(status)}
      sx={{
        backgroundColor: tone.bg,
        color: tone.fg,
        fontWeight: 700,
        borderRadius: "999px",
        "& .MuiChip-dot": { backgroundColor: tone.fg },
        ...sx,
      }}
    />
  );
}

/** Title / description / actions row with optional tabs + last-updated (5.1). */
export function PageHeader({ title, description, actions, tabs, lastUpdated, onRefresh, children }) {
  return (
    <Box sx={{ mb: 5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" component="h1" sx={{ fontSize: "1.5rem", fontWeight: 700, color: "primary.main" }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
              {description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {lastUpdated && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {lastUpdated}
            </Typography>
          )}
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh} aria-label="Refresh data">
                <RefreshCw size={16} color="#5B6B7B" />
              </IconButton>
            </Tooltip>
          )}
          {actions}
        </Stack>
      </Stack>
      {tabs && <Box sx={{ mt: 3 }}>{tabs}</Box>}
      {children}
    </Box>
  );
}

/**
 * KPI tile: icon in a tinted circle, count-up number (AnimatedNumber, 700ms),
 * delta chip and an optional click that applies the matching filter (5.2).
 */
export function StatCard({ icon: Icon, label, value = 0, prefix = "", suffix = "", delta, hint, onClick, loading, tone = "#003366", decimals = 0 }) {
  const body = (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: `${tone}1A`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon && <Icon size={20} color={tone} />}
        </Box>
        {delta != null && (
          <Chip
            size="small"
            label={`${delta > 0 ? "+" : ""}${delta}%`}
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 700,
              borderRadius: "999px",
              backgroundColor: delta > 0 ? "rgba(16,185,129,0.14)" : delta < 0 ? "rgba(220,38,38,0.14)" : "rgba(100,116,139,0.16)",
              color: delta > 0 ? "#047857" : delta < 0 ? "#B91C1C" : "#475569",
            }}
          />
        )}
      </Stack>

      {loading ? (
        <Skeleton width="60%" height={34} />
      ) : (
        <Typography
          variant="h3"
          component="div"
          sx={{ fontSize: "1.75rem", fontWeight: 800, color: "text.primary", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}
        >
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} duration={0.7} />
        </Typography>
      )}

      <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </>
  );

  const sx = {
    p: 5,
    height: "100%",
    borderRadius: "12px",
    backgroundColor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 2px 8px rgba(0,51,102,0.05)",
    transition: "transform .15s ease, box-shadow .15s ease",
    cursor: onClick ? "pointer" : "default",
    "&:hover": onClick ? { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,51,102,0.10)" } : null,
    "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 2 },
  };

  if (onClick) {
    return (
      <Box component="button" type="button" onClick={onClick} sx={{ ...sx, appearance: "none", textAlign: "left", font: "inherit" }}>
        {body}
      </Box>
    );
  }
  return <Box sx={sx}>{body}</Box>;
}

/**
 * Every destructive action goes through this (5.6): it names the resource,
 * states the impact, focuses Cancel and can demand typed confirmation for
 * irreversible bulk actions.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  impact,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireText,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);
  const blocked = Boolean(requireText) && typed.trim() !== String(requireText);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: "12px" } } }}>
      <DialogTitle sx={{ fontSize: "1.05rem", fontWeight: 700, color: "primary.main", pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText sx={{ color: "text.secondary", fontSize: "0.9rem" }}>{message}</DialogContentText>}
        {impact && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: "8px", fontSize: "0.8rem" }}>
            {impact}
          </Alert>
        )}
        {requireText && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Type <b>{requireText}</b> to confirm
            </Typography>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={`Type ${requireText} to confirm`}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                border: "1px solid #E5E9EE",
                borderRadius: "8px",
                font: "inherit",
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} autoFocus sx={{ color: "text.secondary" }}>
          {cancelLabel}
        </Button>
        <Button
          disabled={blocked || loading}
          onClick={onConfirm}
          variant="contained"
          color={danger ? "error" : "primary"}
          sx={danger ? undefined : { backgroundColor: "#003366" }}
        >
          {loading ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Icon + explanation + the one next step to take (8.2). */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Stack spacing={3} alignItems="center" sx={{ py: 10, textAlign: "center" }}>
      {Icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "rgba(0,167,157,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={26} color="#00A79D" />
        </Box>
      )}
      <Box>
        <Typography variant="h4" sx={{ fontSize: "1rem", color: "primary.main", mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

/** Monospace value + copy button + "Copied" confirmation (5.11). */
export function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ minWidth: 0 }}>
        {label && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            {label}
          </Typography>
        )}
        <Typography variant="body2" sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "text.primary", wordBreak: "break-all" }}>
          {value}
        </Typography>
      </Box>
      <Tooltip title={copied ? "Copied" : "Copy"}>
        <IconButton
          size="small"
          aria-label={`Copy ${label || value}`}
          onClick={() => {
            navigator.clipboard?.writeText(String(value)).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              },
              () => {}
            );
          }}
        >
          {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} color="#5B6B7B" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

/** Phone masked by default, explicit reveal (8.9). */
export function MaskedPhone({ value, label }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  const masked =
    digits.length >= 6 ? `${digits.slice(0, 2)}•••• ••${digits.slice(-3)}` : "•••••";
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box>
        {label && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            {label}
          </Typography>
        )}
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
          {revealed ? `+${digits}` : `+${masked}`}
        </Typography>
      </Box>
      <Tooltip title={revealed ? "Hide number" : "Reveal number"}>
        <IconButton size="small" aria-label={revealed ? "Hide phone number" : "Reveal phone number"} onClick={() => setRevealed((v) => !v)}>
          {revealed ? <EyeOff size={15} color="#5B6B7B" /> : <Eye size={15} color="#5B6B7B" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
