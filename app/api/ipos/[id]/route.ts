import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getIposCollection, mapDocumentToIPO } from "@/src/features/ipo/data";

const VALID_DECISIONS = ["WATCH", "APPLY", "SKIP"];
const VALID_TYPES = ["MAINBOARD", "SME"];
const VALID_STATUSES = [
  "RESEARCHING",
  "WATCHLIST",
  "APPLYING",
  "APPLIED",
  "ALLOTMENT_PENDING",
  "ALLOTTED",
  "NOT_ALLOTTED",
  "LISTED",
  "HOLDING",
  "SOLD",
  "CLOSED",
];
const VALID_STAGES = [
  "RESEARCH",
  "DECISION",
  "APPLICATION",
  "ALLOTMENT",
  "LISTING",
  "HOLDING",
  "SOLD",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid IPO ID parameter" },
        { status: 400 }
      );
    }

    const collection = await getIposCollection();
    const doc = await collection.findOne({
      _id: new ObjectId(id),
      isArchived: { $ne: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "IPO opportunity not found" },
        { status: 404 }
      );
    }

    const ipo = mapDocumentToIPO(doc);
    return NextResponse.json({ ipo });
  } catch (error: any) {
    console.error("GET /api/ipos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch IPO opportunity details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid IPO ID parameter" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const collection = await getIposCollection();
    const existingDoc = await collection.findOne({
      _id: new ObjectId(id),
      isArchived: { $ne: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: "IPO opportunity not found" },
        { status: 404 }
      );
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof body.name === "string" && body.name.trim()) {
      const { normalizeIpoName, formatIpoName } = await import("@/src/lib/validation/uniqueness");
      const cleanName = formatIpoName(body.name);
      const nameNorm = normalizeIpoName(body.name);
      
      // Check duplicate name excluding current record
      const dupDoc = await collection.findOne({
        _id: { $ne: new ObjectId(id) },
        nameNormalized: nameNorm,
        isHidden: { $ne: true },
        isArchived: { $ne: true },
      });

      if (dupDoc) {
        return NextResponse.json({
          error: `An active IPO named "${cleanName}" already exists. IPO names must be unique.`,
          code: "DUPLICATE_IPO_NAME",
        }, { status: 409 });
      }

      updateFields.name = cleanName;
      updateFields.nameNormalized = nameNorm;
    }
    if (typeof body.company === "string" && body.company.trim()) {
      updateFields.company = body.company.trim();
    }
    if (body.type && VALID_TYPES.includes(body.type)) {
      updateFields.type = body.type;
    }
    if (typeof body.priceMin === "number" && body.priceMin > 0) {
      updateFields.priceMin = body.priceMin;
    }
    if (typeof body.priceMax === "number" && body.priceMax > 0) {
      updateFields.priceMax = body.priceMax;
    }
    if (typeof body.lotSize === "number" && body.lotSize > 0) {
      updateFields.lotSize = body.lotSize;
    }

    // Validate min <= max if both or either updated
    const finalPriceMin = updateFields.priceMin ?? existingDoc.priceMin;
    const finalPriceMax = updateFields.priceMax ?? existingDoc.priceMax;
    if (finalPriceMax < finalPriceMin) {
      return NextResponse.json(
        { error: "Price maximum must be greater than or equal to price minimum." },
        { status: 400 }
      );
    }

    if (typeof body.minimumInvestment === "number" && body.minimumInvestment > 0) {
      updateFields.minimumInvestment = body.minimumInvestment;
    } else if (updateFields.priceMax || updateFields.lotSize) {
      const finalLotSize = updateFields.lotSize ?? existingDoc.lotSize;
      updateFields.minimumInvestment = finalPriceMax * finalLotSize;
    }

    if (body.issueSize !== undefined) {
      updateFields.issueSize =
        typeof body.issueSize === "number" ? body.issueSize : undefined;
    }
    if (body.openDate !== undefined) {
      updateFields.openDate = body.openDate || undefined;
    }
    if (typeof body.closeDate === "string" && body.closeDate.trim()) {
      updateFields.closeDate = body.closeDate.trim();
    }
    if (body.allotmentDate !== undefined) {
      updateFields.allotmentDate = body.allotmentDate || undefined;
    }
    if (body.listingDate !== undefined) {
      updateFields.listingDate = body.listingDate || undefined;
    }
    if (body.decision && VALID_DECISIONS.includes(body.decision)) {
      updateFields.decision = body.decision;
    }
    if (body.status && VALID_STATUSES.includes(body.status)) {
      updateFields.status = body.status;
    }
    if (body.stage && VALID_STAGES.includes(body.stage)) {
      updateFields.stage = body.stage;
    }
    if (typeof body.thesis === "string") {
      updateFields.thesis = body.thesis.trim();
    }
    if (typeof body.gmpPercent === "number") {
      updateFields.gmpPercent = body.gmpPercent;
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    const updatedDoc = await collection.findOne({ _id: new ObjectId(id) });
    const ipo = mapDocumentToIPO(updatedDoc);

    return NextResponse.json({ success: true, ipo });
  } catch (error: any) {
    console.error("PUT /api/ipos/[id] error:", error);
    const { handleDuplicateKeyError } = await import("@/src/lib/validation/uniqueness");
    const dupErr = handleDuplicateKeyError(error);
    if (dupErr) {
      return NextResponse.json({ error: dupErr.message, code: dupErr.code }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update IPO opportunity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid IPO ID parameter" },
        { status: 400 }
      );
    }

    const trimmedId = id.trim();
    const cleanId = trimmedId.replace(/^pub_/, "");

    const { default: clientPromise } = await import("@/lib/mongodb");
    const { logActivity } = await import("@/src/features/activity/activityService");
    const client = await clientPromise;
    const db = client.db("nexo");

    const orIdConditions: any[] = [
      { id: trimmedId },
      { id: cleanId },
      { id: `pub_${cleanId}` },
      { ipoId: trimmedId },
      { ipoId: cleanId },
      { ipoId: `pub_${cleanId}` },
    ];

    if (ObjectId.isValid(trimmedId)) {
      orIdConditions.push({ _id: new ObjectId(trimmedId) });
    }
    if (ObjectId.isValid(cleanId)) {
      orIdConditions.push({ _id: new ObjectId(cleanId) });
    }

    const dbIpo = await db.collection("ipos").findOne({ $or: orIdConditions });
    const targetName = dbIpo?.name || trimmedId;

    if (targetName && targetName !== trimmedId) {
      const escapedName = targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      orIdConditions.push({ name: { $regex: new RegExp(`^${escapedName}$`, "i") } });
      orIdConditions.push({ ipoName: { $regex: new RegExp(`^${escapedName}$`, "i") } });
    }

    const result = await db.collection("ipos").deleteMany({ $or: orIdConditions });
    await db.collection("applications").deleteMany({ $or: orIdConditions }).catch(() => {});
    await db.collection("profit_distributions").deleteMany({ $or: orIdConditions }).catch(() => {});
    await db.collection("transactions").deleteMany({ $or: orIdConditions }).catch(() => {});

    try {
      await logActivity({
        eventType: "IPO_DELETED",
        category: "PRODUCT",
        severity: "CRITICAL",
        actorRole: "ADMIN",
        targetType: "IPO",
        targetId: trimmedId,
        targetName,
        ipoId: trimmedId,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `✓ IPO "${targetName}" deleted successfully.`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("DELETE /api/ipos/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete IPO opportunity" },
      { status: 500 }
    );
  }
}
