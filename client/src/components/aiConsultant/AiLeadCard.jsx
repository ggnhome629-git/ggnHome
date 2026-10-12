import React from "react";
import { Box, Chip, Divider, Link, Stack, Typography } from "@mui/material";
import { Bot, Mail, Phone, User } from "lucide-react";
import { NEARBY_PARAMETERS, POSITION_PARAMETER, formatDistance } from "../../data/propertyParameters";

const PositionIcon = POSITION_PARAMETER.icon;

export const LEAD_STATUS = {
  submitted: { label: "Submitted", color: "#64748B" },
  pending_assignment: { label: "Pending assignment", color: "#F59E0B" },
  assigned: { label: "Assigned", color: "#3B82F6" },
  contacted: { label: "Contacted", color: "#8B5CF6" },
  viewing_scheduled: { label: "Viewing scheduled", color: "#0EA5E9" },
  converted: { label: "Converted", color: "#10B981" },
  closed: { label: "Closed", color: "#475569" },
  lost: { label: "Lost", color: "#EF4444" },
};

const rupees = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${Math.round((v / 10000000) * 100) / 100} Cr`;
  if (v >= 100000) return `₹${Math.round((v / 100000) * 100) / 100} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

function requirementRows(lead) {
  const r = lead.requirements || {};
  const rows = [];
  const loc = r.anywhere ? "Anywhere in Gurgaon" : [...(r.sectors || []).map((s) => `Sector ${s}`), ...(r.localities || [])].join(", ");
  if (loc) rows.push(["Location", `${loc}${r.locationScope === "nearby" ? " (+ nearby)" : r.locationScope === "strict" ? " (strict)" : ""}`]);
  if (r.budgetFlexible) rows.push(["Budget", "Flexible"]);
  else if (r.budgetMax || r.budgetMin) {
    const range = r.budgetMin && r.budgetMax ? `${rupees(r.budgetMin)} – ${rupees(r.budgetMax)}` : r.budgetMax ? `up to ${rupees(r.budgetMax)}` : `from ${rupees(r.budgetMin)}`;
    rows.push(["Budget", `${r.budgetApprox ? "~" : ""}${range}${lead.mode === "rent" ? "/month" : ""}${r.budgetStretch ? " (can stretch 10%)" : ""}`]);
  }
  if ((r.bhk || []).length) rows.push(["Configuration", r.bhk.map((n) => (n === 0 ? "1 RK" : `${n} BHK`)).join(" / ") + (r.bhkPlus ? "+" : "")]);
  if ((r.propertyTypes || []).length) rows.push(["Type", r.propertyTypes.join(", ")]);
  if (r.furnishing) rows.push(["Furnishing", r.furnishing]);
  if (r.moveInLabel) rows.push(["Move-in", r.moveInLabel]);
  if (r.occupancy) rows.push(["Occupants", [r.occupancy.replace(/_/g, " "), r.people ? `${r.people} people` : null, r.pets === true ? "has pets" : r.pets === false ? "no pets" : null].filter(Boolean).join(" · ")]);
  if (r.minAreaSqft) rows.push(["Min. area", `${Number(r.minAreaSqft).toLocaleString("en-IN")} sq ft`]);
  if (r.possession) rows.push(["Possession", r.possession]);
  if (r.purpose) rows.push(["Purpose", r.purpose]);
  return rows;
}

/** Light-theme lead summary shared by the admin panel and PartnerHub. */
export default function AiLeadCard({ lead, children, contactHidden }) {
  const status = LEAD_STATUS[lead.status] || LEAD_STATUS.submitted;
  const r = lead.requirements || {};
  const priorities = Object.fromEntries((r.priorities || []).map((p) => [p.category, p.maxMeters]));
  return (
    <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: "14px", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", boxShadow: "0 2px 10px rgba(0,51,102,0.05)" }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#22d3ee,#3b82f6,#8b5cf6)", color: "#fff" }}>
          <Bot size={16} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontFamily: "ui-monospace, Menlo, monospace" }}>{lead.leadRef}</Typography>
        <Chip size="small" label={lead.mode === "sale" ? "Buy" : lead.mode === "rent" ? "Rent" : "Callback"} sx={{ fontWeight: 700 }} color={lead.mode === "sale" ? "secondary" : "primary"} variant="outlined" />
        <Chip size="small" label={status.label} sx={{ fontWeight: 700, color: "#fff", backgroundColor: status.color }} />
        {lead.aiAssisted ? <Chip size="small" label="AI-assisted" variant="outlined" sx={{ fontWeight: 600 }} /> : null}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {lead.createdAt ? new Date(lead.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
          {lead.language && lead.language !== "en" ? ` · ${lead.language === "hi" ? "Hindi" : "Hinglish"}` : ""}
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "minmax(0,1.2fr) minmax(0,1fr)" } }}>
        <Box>
          <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 3, rowGap: 1, fontSize: 14 }}>
            {requirementRows(lead).map(([k, v]) => (
              <React.Fragment key={k}>
                <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
                  {k}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600, textTransform: k === "Type" || k === "Furnishing" || k === "Possession" || k === "Purpose" ? "capitalize" : "none" }}>
                  {v}
                </Typography>
              </React.Fragment>
            ))}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {NEARBY_PARAMETERS.map((p) => {
              const on = p.key in priorities;
              const Icon = p.icon;
              return (
                <Chip
                  key={p.key}
                  size="small"
                  icon={<Icon size={14} color={on ? p.color : "#94A3B8"} />}
                  label={on ? `${p.short}${priorities[p.key] ? ` ≤ ${formatDistance(priorities[p.key])}` : ""}` : p.short}
                  variant="outlined"
                  sx={{ fontWeight: 600, opacity: on ? 1 : 0.45, borderColor: on ? `${p.color}88` : "divider" }}
                />
              );
            })}
            <Chip
              size="small"
              icon={<PositionIcon size={14} color={r.corner && r.corner !== "any" ? POSITION_PARAMETER.color : "#94A3B8"} />}
              label={r.corner === "corner" ? "Corner" : r.corner === "middle" ? "Middle" : "Any position"}
              variant="outlined"
              sx={{ fontWeight: 600, opacity: r.corner && r.corner !== "any" ? 1 : 0.45 }}
            />
          </Stack>
        </Box>

        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Contact
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <User size={14} /> <Typography variant="body2" sx={{ fontWeight: 600 }}>{lead.contact?.name || "—"}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Phone size={14} />
              {contactHidden ? (
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{lead.contact?.phone}</Typography>
              ) : (
                <Link href={`tel:+91${lead.contact?.phone}`} variant="body2" sx={{ fontWeight: 600 }}>
                  +91 {lead.contact?.phone}
                </Link>
              )}
            </Stack>
            {lead.contact?.email ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Mail size={14} />
                <Link href={`mailto:${lead.contact.email}`} variant="body2">
                  {lead.contact.email}
                </Link>
              </Stack>
            ) : null}
          </Stack>
          {(lead.matches || []).length ? (
            <>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Matched listings ({lead.matches.length})
              </Typography>
              <Stack spacing={0.5}>
                {lead.matches.slice(0, 5).map((m) => (
                  <Link key={m.propertyId} href={m.listingType === "sale" ? `/Saledetails/${m.propertyId}` : `/Rentaldetails/${m.propertyId}`} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.title || "Listing"} · {m.sector} · {rupees(m.price)}
                  </Link>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No listing matched at submission — find options for this buyer.
            </Typography>
          )}
        </Box>
      </Box>

      {children ? (
        <>
          <Divider sx={{ my: 3 }} />
          {children}
        </>
      ) : null}
    </Box>
  );
}
