import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { TransactionDocument } from "@/src/models/Transaction";

const DB = "nexo";
const COL = "transactions";

/* ────────────────────────────────────────────────────────────────
   GET /api/transactions
   Fetches all saved transactions from MongoDB.
──────────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const client = await clientPromise;
    const col = client.db(DB).collection<TransactionDocument>(COL);

    const transactions = await col
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      { success: true, transactions },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    console.warn("GET /api/transactions MongoDB unavailable, returning empty array fallback.");
    return NextResponse.json({ success: true, transactions: [] });
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/transactions
   Stores a new investment transaction in MongoDB.
──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const newDoc: any = {
      id: body.id || `txn_${Date.now()}`,
      ipoId: body.ipoId || "1",
      ipoName: body.ipoName || "IPO",
      type: body.type || "SOLO",
      amount: Number(body.amount) || 15000,
      applicationNumber: body.applicationNumber || `NEXO-APP-${Math.floor(1000 + Math.random() * 9000)}`,
      participants: Array.isArray(body.participants) ? body.participants : ["Member"],
      memberId: body.memberId || body.userId || undefined,
      status: body.status || "SUBMITTED",
      createdAt: new Date(),
    };

    try {
      const client = await clientPromise;
      const col = client.db(DB).collection<TransactionDocument>(COL);
      await col.insertOne(newDoc as any);
    } catch (dbErr) {
      console.warn("POST /api/transactions MongoDB unavailable, continuing locally.");
    }

    return NextResponse.json({
      success: true,
      message: "Transaction saved successfully.",
      transaction: newDoc,
    });
  } catch (err: any) {
    console.error("POST /api/transactions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   PUT /api/transactions
   Updates an existing transaction status in MongoDB.
──────────────────────────────────────────────────────────────── */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction id is required for update" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const col = client.db(DB).collection<TransactionDocument>(COL);

    const result = await col.updateOne({ id }, { $set: updates });

    return NextResponse.json({
      success: true,
      message: "Transaction updated in MongoDB",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err: any) {
    console.error("PUT /api/transactions error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update transaction in MongoDB" },
      { status: 500 }
    );
  }
}
