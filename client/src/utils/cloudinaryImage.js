/**
 * Cloudinary delivery helpers.
 *
 * Property images are stored as raw Cloudinary secure_urls, which serve the
 * original upload — frequently a 3–5 MB phone photo — into a card that renders
 * it at ~400px wide. Cloudinary applies transformations from the URL path, so
 * asking for a correctly sized, auto-formatted image costs nothing but a
 * string edit and is the single largest saving available on listing pages.
 *
 *   f_auto  — WebP/AVIF where the browser supports it, original format if not
 *   q_auto  — per-image quality chosen by content, typically 30-60% smaller
 *   c_limit — never upscale past the original
 *
 * Anything that isn't a Cloudinary URL (local placeholders, scraped portal
 * images) passes through untouched.
 */

// https://res.cloudinary.com/<cloud>/image/upload/<transforms?>/<version>/<path>
const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/(.+)$/i;

// Transformation segments Cloudinary already understands, used to detect URLs
// that were uploaded with transforms baked in so we don't stack a second set.
const EXISTING_TRANSFORM = /^[a-z]{1,3}_[^/]+(,[a-z]{1,3}_[^/]+)*$/i;

export const FALLBACK_PROPERTY_IMAGE = "/default-property.jpg";

/**
 * Returns `src` rewritten to deliver at roughly `width` device pixels.
 *
 * @param {string} src    Original image URL.
 * @param {object} opts
 * @param {number} opts.width   Target width in CSS pixels.
 * @param {string} opts.crop    Cloudinary crop mode (default "limit").
 * @param {string} opts.quality Cloudinary quality (default "auto").
 */
export function cloudinaryUrl(src, { width, crop = "limit", quality = "auto" } = {}) {
  if (!src || typeof src !== "string") return FALLBACK_PROPERTY_IMAGE;

  const match = src.match(CLOUDINARY_UPLOAD);
  if (!match) return src;

  const [, base, rest] = match;

  // If the URL already carries a transformation segment, leave it alone rather
  // than producing conflicting directives.
  const firstSegment = rest.split("/")[0];
  if (EXISTING_TRANSFORM.test(firstSegment) && !firstSegment.startsWith("v")) {
    return src;
  }

  const transforms = ["f_auto", `q_${quality}`, `c_${crop}`];
  if (width) transforms.push(`w_${Math.round(width)}`);

  return `${base}/${transforms.join(",")}/${rest}`;
}

/**
 * Builds a `srcSet` so the browser picks a width appropriate to the viewport
 * and DPR instead of every device downloading the same file.
 */
export function cloudinarySrcSet(src, widths = [400, 800, 1200]) {
  if (!src || typeof src !== "string" || !CLOUDINARY_UPLOAD.test(src)) return undefined;

  return widths
    .map((width) => `${cloudinaryUrl(src, { width })} ${width}w`)
    .join(", ");
}

/**
 * Convenience for the property cards: first image, sized for a card, with a
 * placeholder when a listing has no photos yet.
 */
export function propertyCardImage(property, width = 600) {
  const src = property?.images?.[0];
  return src ? cloudinaryUrl(src, { width }) : FALLBACK_PROPERTY_IMAGE;
}
