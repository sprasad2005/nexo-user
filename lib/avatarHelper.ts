/**
 * NEXO Avatar Utility
 * Transforms raw base64 data URIs into cached, lightweight binary image URLs
 * to eliminate multi-megabyte JSON payloads over API responses.
 */

export function getSafeAvatarUrl(avatar?: string | null, identifier?: string | null): string {
  if (!avatar || typeof avatar !== "string") {
    return "/oggy.png";
  }

  const clean = avatar.trim();
  if (!clean) return "/oggy.png";

  // If it's already a clean static asset or API URL, return directly
  if (
    clean.startsWith("/oggy.png") ||
    clean.startsWith("/jack.png") ||
    clean.startsWith("/sinchan.png") ||
    clean.startsWith("/doremon.png") ||
    clean.startsWith("/japlu.png") ||
    clean.startsWith("/api/upload") ||
    clean.startsWith("/api/avatar") ||
    clean.startsWith("/uploads/")
  ) {
    return clean;
  }

  // If it starts with standard http(s) URL (e.g. CDN), return directly
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  // If it is a base64 data URI or raw base64 string, route through the cached binary avatar endpoint
  if (clean.startsWith("data:image") || clean.length > 256) {
    if (identifier) {
      return `/api/avatar?id=${encodeURIComponent(identifier)}`;
    }
  }

  return clean.startsWith("/") ? clean : "/oggy.png";
}
