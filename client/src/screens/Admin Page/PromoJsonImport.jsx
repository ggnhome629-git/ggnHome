import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PromoCard from "../../components/promo/PromoCard";
import { PROMO_ICONS, PROMO_THEMES } from "../../components/promo/promoData";

const PLACEMENTS = ["dashboard", "search", "banner"];
const AUDIENCES = ["all", "rent", "sale"];

// Friendlier names people tend to type, mapped to the real field names.
const ALIASES = {
  heading: "overline",
  smallHeading: "overline",
  description: "text",
  button: "ctaLabel",
  buttonLabel: "ctaLabel",
  url: "link",
  color: "theme",
  colour: "theme",
  image: "imageUrl",
  showOn: "placements",
  active: "isActive",
  live: "isActive",
  start: "startsAt",
  end: "endsAt",
};

export const EXAMPLE_PROMOS = [
  {
    overline: "ggnHome Rewards",
    title: "Close your deal, get gifts worth up to ₹1,000",
    text: "Register, finalise your home through ggnHome and we'll send you a thank-you hamper.",
    ctaLabel: "See how it works",
    link: "/rewards",
    theme: "gold",
    icon: "gift",
    placements: ["dashboard", "search", "banner"],
    audience: "all",
    weight: 5,
  },
  {
    overline: "Site visits",
    title: "Shortlisted a few homes? Your cab is on us",
    text: "Pick the homes you like and we'll plan your visits — free cab for every site visit.",
    ctaLabel: "Plan my visits",
    link: "/support",
    theme: "cyan",
    icon: "car",
    placements: ["dashboard", "search"],
    audience: "all",
    weight: 3,
  },
  {
    overline: "Own a home in Gurgaon?",
    title: "List it free, reach verified tenants & buyers",
    text: "No listing fee. Enquiries from interested tenants and buyers come straight to you.",
    ctaLabel: "Post property free",
    link: "/add-property",
    theme: "navy",
    icon: "home",
    placements: ["dashboard", "search"],
    audience: "all",
    weight: 3,
  },
  {
    overline: "Too many listings?",
    title: "Tell us what you need, we'll shortlist for you",
    text: "Share your budget, BHK and preferred sectors once — we match new homes to you as they're listed.",
    ctaLabel: "Share my preferences",
    link: "/userpreferenceform",
    theme: "teal",
    icon: "list",
    placements: ["dashboard", "search"],
    audience: "rent",
    weight: 3,
  },
  {
    overline: "Buying? Check the price first",
    title: "Is it fairly priced? Find out in seconds",
    text: "Our price predictor estimates a fair value from area, size and sector — before you negotiate.",
    ctaLabel: "Try price predictor",
    link: "/price-predictor",
    theme: "indigo",
    icon: "calculator",
    placements: ["dashboard", "search"],
    audience: "sale",
    weight: 3,
  },
  {
    overline: "Moving in?",
    title: "Cleaning, repairs & more — booked in a tap",
    text: "AC service, deep cleaning, plumbing and electrical work from trusted local professionals.",
    ctaLabel: "Book a service",
    link: "/servicesCreate",
    theme: "rose",
    icon: "sparkles",
    placements: ["dashboard"],
    audience: "all",
    weight: 2,
  },
];

/** Turns one pasted object into a promo payload plus a list of problems. */
export function normalisePromo(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { promo: null, errors: ["Each promo must be a JSON object { ... }"] };
  }
  const src = {};
  Object.entries(raw).forEach(([k, v]) => {
    src[ALIASES[k] || k] = v;
  });

  const str = (v) => (v == null ? "" : String(v).trim());
  const promo = {
    overline: str(src.overline),
    title: str(src.title),
    text: str(src.text),
    ctaLabel: str(src.ctaLabel) || "Know more",
    link: str(src.link) || "/",
    theme: str(src.theme).toLowerCase() || "navy",
    icon: str(src.icon).toLowerCase() || "sparkles",
    imageUrl: str(src.imageUrl),
    placements: (Array.isArray(src.placements) ? src.placements : str(src.placements).split(","))
      .map((p) => str(p).toLowerCase())
      .filter(Boolean),
    audience: str(src.audience).toLowerCase() || "all",
    weight: src.weight == null ? 1 : Number(src.weight),
    isActive: src.isActive == null ? true : src.isActive === true || src.isActive === "true",
    startsAt: str(src.startsAt) || null,
    endsAt: str(src.endsAt) || null,
  };
  if (!promo.placements.length) promo.placements = ["dashboard", "search"];

  if (!promo.title) errors.push("title is required");
  if (promo.title.length > 90) errors.push("title is over 90 characters");
  if (promo.overline.length > 40) errors.push("small heading is over 40 characters");
  if (promo.text.length > 200) errors.push("text is over 200 characters");
  if (promo.ctaLabel.length > 30) errors.push("button label is over 30 characters");
  if (!PROMO_THEMES[promo.theme]) errors.push(`theme must be one of: ${Object.keys(PROMO_THEMES).join(", ")}`);
  if (!PROMO_ICONS[promo.icon]) errors.push(`icon must be one of: ${Object.keys(PROMO_ICONS).join(", ")}`);
  const badPlacement = promo.placements.find((p) => !PLACEMENTS.includes(p));
  if (badPlacement) errors.push(`placements can only be: ${PLACEMENTS.join(", ")}`);
  if (!AUDIENCES.includes(promo.audience)) errors.push(`audience must be one of: ${AUDIENCES.join(", ")}`);
  if (!Number.isFinite(promo.weight) || promo.weight < 1 || promo.weight > 10) errors.push("weight must be 1–10");
  if (!(promo.link.startsWith("/") || /^https?:\/\//i.test(promo.link))) errors.push("link must start with / or https://");
  if (promo.imageUrl && !/^https:\/\//i.test(promo.imageUrl)) errors.push("imageUrl must start with https://");
  ["startsAt", "endsAt"].forEach((k) => {
    if (promo[k] && Number.isNaN(new Date(promo[k]).getTime())) errors.push(`${k} is not a valid date (use YYYY-MM-DD)`);
  });
  return { promo, errors };
}

function parse(text) {
  if (!text.trim()) return { items: [], parseError: "" };
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : [data];
    return { items: list.map(normalisePromo), parseError: "" };
  } catch (e) {
    return { items: [], parseError: `Not valid JSON: ${e.message}` };
  }
}

/**
 * Paste one promo object or an array of them, check the preview, add all.
 * Each promo goes through the same server validation as the normal form.
 */
export default function PromoJsonImport({ open, onClose, onImported, createPromo }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const { items, parseError } = useMemo(() => parse(text), [text]);
  const valid = items.filter((i) => !i.errors.length);
  const invalidCount = items.length - valid.length;

  const close = () => {
    setResult(null);
    onClose();
  };

  const importAll = async () => {
    setBusy(true);
    let ok = 0;
    const failed = [];
    for (const { promo } of valid) {
      try {
        await createPromo(promo);
        ok += 1;
      } catch (e) {
        failed.push(`${promo.title}: ${e.message}`);
      }
    }
    setBusy(false);
    setResult({ ok, failed });
    if (ok) onImported();
    if (!failed.length) setText("");
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="lg" fullWidth>
      <DialogTitle>Add promos from JSON</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Stack spacing={3}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Paste one promo <code>{"{ ... }"}</code> or a list <code>{"[ {...}, {...} ]"}</code>. Only{" "}
              <b>title</b> is required. Fields: overline, title, text, ctaLabel, link, theme (
              {Object.keys(PROMO_THEMES).join(" / ")}), icon ({Object.keys(PROMO_ICONS).join(" / ")}), imageUrl,
              placements (dashboard / search / banner), audience (all / rent / sale), weight (1–10), isActive,
              startsAt, endsAt (YYYY-MM-DD).
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button size="small" variant="outlined" onClick={() => setText(JSON.stringify(EXAMPLE_PROMOS, null, 2))}>
                Load example (6 promos)
              </Button>
              <Button size="small" onClick={() => setText("")} disabled={!text}>
                Clear
              </Button>
            </Stack>
            <TextField
              multiline
              minRows={16}
              maxRows={24}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              placeholder='[{ "title": "Your promo title", "theme": "gold", "link": "/rewards" }]'
              inputProps={{ spellCheck: false, style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 } }}
            />
            {parseError && <Alert severity="error">{parseError}</Alert>}
            {result && (
              <Alert severity={result.failed.length ? "warning" : "success"}>
                Added {result.ok} promo{result.ok === 1 ? "" : "s"}.
                {result.failed.map((f) => (
                  <div key={f}>Failed — {f}</div>
                ))}
              </Alert>
            )}
          </Stack>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
              Preview {items.length ? `(${valid.length} ready${invalidCount ? `, ${invalidCount} need fixing` : ""})` : ""}
            </Typography>
            <Stack spacing={4} sx={{ maxHeight: { md: 560 }, overflowY: "auto", pr: 1 }}>
              {items.map(({ promo, errors }, i) => (
                <Box key={i}>
                  {promo && <PromoCard promo={{ ...promo, title: promo.title || "(missing title)" }} minHeight={200} onClick={() => {}} />}
                  {promo && (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                      {promo.placements.map((p) => (
                        <Chip key={p} size="small" label={p} />
                      ))}
                      {promo.audience !== "all" && <Chip size="small" color="secondary" label={promo.audience} />}
                      <Chip size="small" variant="outlined" label={`weight ${promo.weight}`} />
                      {!promo.isActive && <Chip size="small" variant="outlined" label="paused" />}
                    </Stack>
                  )}
                  {errors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Promo {i + 1}: {errors.join("; ")}
                    </Alert>
                  )}
                </Box>
              ))}
              {!items.length && !parseError && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Your promos will preview here as you paste.
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 6, py: 4 }}>
        <Button onClick={close}>Close</Button>
        <Button variant="contained" onClick={importAll} disabled={busy || !valid.length || Boolean(parseError)}>
          {busy ? "Adding…" : `Add ${valid.length || ""} promo${valid.length === 1 ? "" : "s"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
