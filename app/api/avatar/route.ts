import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "nexo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.redirect(new URL("/oggy.png", req.url));
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Try members collection
    let avatarStr: string | null = null;
    const member = await db.collection("members").findOne({
      $or: [{ id }, { _id: id as any }, { username: id }, { name: id }],
    });

    if (member && member.avatar && typeof member.avatar === "string") {
      avatarStr = member.avatar;
    }

    // 2. Try profiles collection if not found or avatar was in profile
    if (!avatarStr) {
      const profile = await db.collection("profiles").findOne({
        $or: [{ userId: id }, { id }],
      });
      if (profile && profile.avatar && typeof profile.avatar === "string") {
        avatarStr = profile.avatar;
      }
    }

    // 3. Try users collection if not found
    if (!avatarStr) {
      const user = await db.collection("users").findOne({
        $or: [{ id }, { memberId: id }],
      });
      if (user && (user as any).avatar && typeof (user as any).avatar === "string") {
        avatarStr = (user as any).avatar;
      }
    }

    // 4. Try media collection if it's a file ID
    if (!avatarStr && id.startsWith("file_")) {
      const media = await db.collection("media").findOne({ id });
      if (media && media.data && typeof media.data === "string") {
        avatarStr = media.data;
      }
    }

    if (!avatarStr) {
      return NextResponse.redirect(new URL("/oggy.png", req.url));
    }

    const trimmed = avatarStr.trim();

    // If it is a static preset path, redirect to static asset
    if (trimmed.startsWith("/") && !trimmed.startsWith("/api/")) {
      return NextResponse.redirect(new URL(trimmed, req.url));
    }

    // If it is a base64 data URI
    if (trimmed.startsWith("data:image")) {
      const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] || "image/jpeg";
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // If it's a raw base64 string without data prefix
    if (trimmed.length > 100 && !trimmed.includes(" ") && !trimmed.startsWith("http")) {
      try {
        const buffer = Buffer.from(trimmed, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      } catch {}
    }

    // Fallback redirect
    return NextResponse.redirect(new URL("/oggy.png", req.url));
  } catch (err: any) {
    console.error("GET /api/avatar error:", err);
    return NextResponse.redirect(new URL("/oggy.png", req.url));
  }
}
