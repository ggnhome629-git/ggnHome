/**
 * The three CTA treatments defined in the property-detail upgrade guide.
 * They live here so the price card, affiliate card, contact card and sticky
 * bar all ship the exact same teal→cyan primary instead of drifting apart.
 */

export const primaryCtaSx = {
  backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
  backgroundRepeat: "no-repeat",
  color: "#FFFFFF",
  fontWeight: 600,
  padding: "12px 16px",
  borderRadius: "8px",
  boxShadow: "0 4px 14px rgba(0,167,157,0.28)",
  transition: "transform .2s ease, box-shadow .2s ease",
  "&:hover": {
    backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
    boxShadow: "0 8px 22px rgba(0,167,157,0.38)",
    transform: "scale(1.02)",
  },
};

export const secondaryCtaSx = {
  border: "2px solid #00A79D",
  backgroundColor: "transparent",
  color: "#00A79D",
  fontWeight: 600,
  padding: "10px 14px",
  borderRadius: "8px",
  "&:hover": { backgroundColor: "rgba(0,167,157,0.08)", borderColor: "#00A79D" },
};

export const ghostCtaSx = {
  border: "none",
  backgroundColor: "transparent",
  color: "#00A79D",
  fontWeight: 600,
  padding: "10px 14px",
  borderRadius: "8px",
  "&:hover": { backgroundColor: "rgba(0,167,157,0.04)" },
};
