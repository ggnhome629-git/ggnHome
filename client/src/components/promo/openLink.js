/** Opens an admin-provided link: site paths in-app, full URLs in a new tab. */
export function openLink(navigate, link) {
  const target = String(link || "/");
  if (target.startsWith("/") && !target.startsWith("//")) {
    navigate(target);
    return;
  }
  if (/^https?:\/\//i.test(target)) window.open(target, "_blank", "noopener,noreferrer");
}
