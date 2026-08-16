import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "nexo";
const COL_MEDIA = "media";

/* ────────────────────────────────────────────────────────────────
   POST /api/upload
   Accepts multipart form data or base64 JSON payload and stores
   the file / image securely in MongoDB `media` collection.
──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileDoc: {
      id: string;
      filename: string;
      contentType: string;
      size: number;
      data: string; // base64 or data URL
      uploadedAt: Date;
    };

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      fileDoc = {
        id: fileId,
        filename: file.name || "upload.png",
        contentType: file.type || "image/png",
        size: file.size,
        data: base64Data,
        uploadedAt: new Date(),
      };
    } else {
      const body = await req.json();
      if (!body.data) {
        return NextResponse.json({ success: false, error: "Missing data payload." }, { status: 400 });
      }

      const fileId = body.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      fileDoc = {
        id: fileId,
        filename: body.filename || "upload.png",
        contentType: body.contentType || "image/png",
        size: body.size || body.data.length,
        data: body.data,
        uploadedAt: new Date(),
      };
    }

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COL_MEDIA).updateOne(
      { id: fileDoc.id },
      { $set: fileDoc },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      file: {
        id: fileDoc.id,
        filename: fileDoc.filename,
        url: `/api/upload?id=${fileDoc.id}`,
        dataUrl: fileDoc.data,
        contentType: fileDoc.contentType,
        size: fileDoc.size,
      },
    });
  } catch (err: any) {
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to upload file." }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   GET /api/upload?id=...
   Retrieves stored image/file from MongoDB by ID.
──────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing file ID." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const doc = await db.collection(COL_MEDIA).findOne({ id });

    if (!doc || !doc.data) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // If it's a data URL, parse and return binary
    if (doc.data.startsWith("data:")) {
      const match = doc.data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ success: true, file: doc });
  } catch (err: any) {
    console.error("GET /api/upload error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch file." }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   DELETE /api/upload?id=... or body { id: string }
   Deletes stored image/file from MongoDB by ID.
──────────────────────────────────────────────────────────────── */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id || body.url;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing file ID or URL." }, { status: 400 });
    }

    // Extract ID if a full URL was passed
    const match = id.match(/\/api\/upload\?id=([^&]+)/);
    const mediaId = match ? decodeURIComponent(match[1]) : id;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const result = await db.collection(COL_MEDIA).deleteMany({
      $or: [{ id: mediaId }, { _id: mediaId as any }]
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    console.error("DELETE /api/upload error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete file." }, { status: 500 });
  }
}
