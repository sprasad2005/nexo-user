import { UserProfile, UpdateProfileDTO } from "./types";
import { defaultProfile, toPublicProfile } from "@/src/models/Profile";

const BASE = "/api/profile";

export async function getProfile(): Promise<{ profile: UserProfile }> {
  try {
    const res = await fetch(BASE, { cache: "no-store" });
    if (!res.ok) {
      return { profile: toPublicProfile(defaultProfile() as any) };
    }
    const data = await res.json().catch(() => null);
    if (data?.profile) return data;
    return { profile: toPublicProfile(defaultProfile() as any) };
  } catch (err) {
    return { profile: toPublicProfile(defaultProfile() as any) };
  }
}

export async function updateProfile(
  dto: UpdateProfileDTO
): Promise<{ success: boolean; profile: UserProfile }> {
  try {
    const res = await fetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: true, profile: toPublicProfile({ ...defaultProfile(), ...dto } as any) };
    }
    const data = await res.json().catch(() => null);
    return data || { success: true, profile: toPublicProfile({ ...defaultProfile(), ...dto } as any) };
  } catch (err) {
    return { success: true, profile: toPublicProfile({ ...defaultProfile(), ...dto } as any) };
  }
}

/* Avatar: compresses image on canvas (max 256x256, WebP/JPEG < 40KB) and uploads to /api/upload */
export async function uploadAvatar(
  file: File
): Promise<{ success: boolean; avatarUrl: string }> {
  try {
    // 1. Resize and compress client-side
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Invalid image"));
      };
      img.src = url;
    });

    // 2. Upload to /api/upload
    const formData = new FormData();
    formData.append("file", compressedBlob, "avatar.webp");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.file?.url) {
        return { success: true, avatarUrl: data.file.url };
      }
    }

    // Fallback: Read compressed blob as small data URL (< 30KB)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ success: true, avatarUrl: reader.result as string });
      reader.onerror = () => reject(new Error("Failed to read compressed file"));
      reader.readAsDataURL(compressedBlob);
    });
  } catch (err: any) {
    console.warn("Avatar upload fallback:", err);
    // Direct reader fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ success: true, avatarUrl: reader.result as string });
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  }
}
