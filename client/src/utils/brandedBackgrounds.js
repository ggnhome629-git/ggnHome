/**
 * Branded background images and gradients for property detail pages.
 * These replace the property image as the header background to maintain
 * consistent branding across the platform.
 */

export const BRANDED_BACKGROUNDS = [
  {
    id: 1,
    gradient: "linear-gradient(135deg, #003366 0%, #00A79D 50%, #22D3EE 100%)",
    label: "Teal gradient",
  },
  {
    id: 2,
    gradient: "linear-gradient(120deg, #002244 0%, #003366 40%, #0B5C7A 100%)",
    label: "Navy gradient",
  },
  {
    id: 3,
    gradient: "linear-gradient(145deg, #00A79D 0%, #003366 50%, #001F3F 100%)",
    label: "Ocean gradient",
  },
  {
    id: 4,
    gradient: "linear-gradient(110deg, #003366 0%, #22D3EE 60%, #00A79D 100%)",
    label: "Cyan blend",
  },
  {
    id: 5,
    gradient: "linear-gradient(160deg, #0B5C7A 0%, #003366 40%, #00A79D 100%)",
    label: "Slate blend",
  },
  {
    id: 6,
    gradient: "linear-gradient(130deg, #001F3F 0%, #003366 50%, #22D3EE 100%)",
    label: "Deep ocean",
  },
  {
    id: 7,
    gradient: "linear-gradient(125deg, #002244 0%, #00A79D 45%, #0B5C7A 100%)",
    label: "Teal slate",
  },
  {
    id: 8,
    gradient: "linear-gradient(140deg, #003366 0%, #001F3F 35%, #22D3EE 100%)",
    label: "Midnight cyan",
  },
];

/**
 * Get a branded background based on property ID (deterministic but varied).
 * This ensures the same property always gets the same background.
 */
export function getBrandedBackground(propertyId) {
  if (!propertyId) {
    return BRANDED_BACKGROUNDS[0];
  }
  // Use property ID to select a background consistently
  const index = propertyId.charCodeAt(propertyId.length - 1) % BRANDED_BACKGROUNDS.length;
  return BRANDED_BACKGROUNDS[index];
}

/**
 * Get a random branded background.
 */
export function getRandomBrandedBackground() {
  return BRANDED_BACKGROUNDS[Math.floor(Math.random() * BRANDED_BACKGROUNDS.length)];
}
