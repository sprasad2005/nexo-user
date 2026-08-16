import fs from "fs";
import path from "path";
import { Db } from "mongodb";

// Preset default avatars that should NEVER be deleted
const PRESET_AVATARS = new Set([
  "/oggy.png",
  "/jack.png",
  "/sinchan.png",
  "/doremon.png",
  "/japlu.png",
  "/avatar.png",
  "/next.svg",
  "/vercel.svg",
  "/globe.svg",
  "/window.svg",
  "/file.svg",
]);

/**
 * Extracts the file ID if the avatar URL was created via the /api/upload endpoint
 */
export function extractMediaId(avatarUrl: string | undefined | null): string | null {
  if (!avatarUrl || typeof avatarUrl !== "string") return null;

  const trimmed = avatarUrl.trim();

  // If it's a preset avatar, do not delete
  if (PRESET_AVATARS.has(trimmed.toLowerCase())) return null;

  // 1. Matches /api/upload?id=file_12345 or /api/upload?id=xyz
  const match = trimmed.match(/\/api\/upload\?id=([^&]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // 2. Direct ID starting with file_
  if (trimmed.startsWith("file_")) {
    return trimmed;
  }

  return null;
}

/**
 * Removes previous uploaded custom avatar from MongoDB media collection and local disk
 * when a user/admin updates their profile picture.
 */
export async function cleanOldAvatar(
  oldAvatar: string | undefined | null,
  newAvatar: string | undefined | null,
  db: Db
): Promise<boolean> {
  try {
    if (!oldAvatar || typeof oldAvatar !== "string") return false;
    if (newAvatar && oldAvatar.trim() === newAvatar.trim()) return false;

    const trimmedOld = oldAvatar.trim();

    // Never delete preset avatars
    if (PRESET_AVATARS.has(trimmedOld.toLowerCase())) return false;

    let deleted = false;

    // 1. Check MongoDB media collection
    const mediaId = extractMediaId(trimmedOld);
    if (mediaId) {
      const res = await db.collection("media").deleteMany({
        $or: [{ id: mediaId }, { _id: mediaId as any }, { filename: mediaId }],
      });
      if (res.deletedCount > 0) {
        deleted = true;
      }
    }

    // 2. Check local disk if stored in public/uploads/...
    if (trimmedOld.startsWith("/uploads/") || trimmedOld.startsWith("uploads/")) {
      const relativePath = trimmedOld.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), "public", relativePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          deleted = true;
        } catch (e) {
          console.warn("Could not delete local avatar file:", e);
        }
      }
    }

    return deleted;
  } catch (err) {
    console.warn("cleanOldAvatar error:", err);
    return false;
  }
}
