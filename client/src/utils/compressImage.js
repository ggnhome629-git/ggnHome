/**
 * Shrinks a photo in the browser until it fits under maxBytes (phone photos
 * are often 3–6 MB). Non-images are returned unchanged.
 */
export default async function compressImage(file, maxBytes = 1024 * 1024, maxSide = 1600) {
  if (!file || !/^image\//.test(file.type) || file.size <= maxBytes) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.5, 0.85 - attempt * 0.08);
      // eslint-disable-next-line no-await-in-loop
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) {
        return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
      }
      side = Math.round(side * 0.8);
    }
    return file;
  } catch (e) {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
