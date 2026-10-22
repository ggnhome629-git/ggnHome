/**
 * Lays Gurgaon out as a game world: every zone is a district and each of its
 * sectors / localities is a pin placed in a sunflower spiral around the
 * district's centre. The positions are schematic (we don't hold per-sector
 * coordinates), but they are deterministic, so a sector always sits in the same
 * spot, and districts keep the rough north/south/east/west order of the city.
 */
export const WORLD = { w: 1440, h: 1060 };
const SCALE = 4.2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SPACING = 21;

export function buildLayout(zones) {
  const districts = zones.map((z) => ({
    id: z.id,
    label: z.label,
    short: z.short,
    emoji: z.emoji,
    x: z.map.x * SCALE + 30,
    y: z.map.y * SCALE + 40,
    radius: SPACING * Math.sqrt(z.options.length + 1) + 22,
  }));
  const pins = [];
  const byValue = new Map();
  zones.forEach((z, zi) => {
    const d = districts[zi];
    z.options.forEach((o, i) => {
      const r = SPACING * Math.sqrt(i + 0.6);
      const a = i * GOLDEN + zi;
      const pin = { value: o.value, label: o.label, zone: z.id, x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r * 0.82 };
      pins.push(pin);
      if (!byValue.has(o.value.toLowerCase())) byValue.set(o.value.toLowerCase(), pin);
    });
  });
  return { districts, pins, byValue };
}
