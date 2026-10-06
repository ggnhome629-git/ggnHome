import { Calculator, Car, Gift, Home, ListChecks, Megaphone, Percent, Sparkles } from "lucide-react";

export const PROMO_ICONS = {
  gift: Gift,
  home: Home,
  list: ListChecks,
  calculator: Calculator,
  car: Car,
  sparkles: Sparkles,
  percent: Percent,
  megaphone: Megaphone,
};

export const PROMO_THEMES = {
  gold: {
    label: "Gold",
    background: "linear-gradient(150deg, #3B2A00 0%, #7A5300 45%, #C68A0C 100%)",
    accent: "#FFE08A",
    buttonColor: "#3B2A00",
    buttonBg: "linear-gradient(90deg, #FFE08A 0%, #F0B429 100%)",
  },
  navy: {
    label: "Navy",
    background: "linear-gradient(150deg, #001F3F 0%, #003366 55%, #00857D 100%)",
    accent: "#3FC2B8",
    buttonColor: "#003366",
    buttonBg: "#FFFFFF",
  },
  teal: {
    label: "Teal",
    background: "linear-gradient(150deg, #0B4A6F 0%, #00857D 60%, #00A79D 100%)",
    accent: "#B8F2EC",
    buttonColor: "#00594F",
    buttonBg: "#FFFFFF",
  },
  indigo: {
    label: "Indigo",
    background: "linear-gradient(150deg, #1E1B4B 0%, #3730A3 55%, #4A6A8A 100%)",
    accent: "#C7D2FE",
    buttonColor: "#1E1B4B",
    buttonBg: "#FFFFFF",
  },
  cyan: {
    label: "Cyan",
    background: "linear-gradient(150deg, #0E7490 0%, #0891B2 55%, #22D3EE 100%)",
    accent: "#E0F7FF",
    buttonColor: "#0E4D63",
    buttonBg: "#FFFFFF",
  },
  rose: {
    label: "Rose",
    background: "linear-gradient(150deg, #4C0519 0%, #9F1239 55%, #E11D48 100%)",
    accent: "#FFE4E6",
    buttonColor: "#881337",
    buttonBg: "#FFFFFF",
  },
};

// The top strip keeps this line until the admin adds a "Top banner" promo.
export const DEFAULT_BANNER = {
  _id: "default-banner",
  title: "Register, deal with us & get rewarded — gifts worth up to ₹1,000",
  link: "/rewards",
};

/** Random order, where a higher `weight` makes a promo likelier to come first. */
export function weightedShuffle(list) {
  return list
    .map((p) => ({ p, key: Math.random() ** (1 / Math.max(1, Number(p.weight) || 1)) }))
    .sort((a, b) => b.key - a.key)
    .map(({ p }) => p);
}
