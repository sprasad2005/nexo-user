import { NextResponse } from "next/server";
import { getIposCollection } from "@/src/features/ipo/data";
import { requireSuperAdmin } from "@/src/lib/auth/authorization";

const SEED_DATA = [
  {
    name: "Tata Technologies",
    company: "Tata Technologies Limited",
    type: "MAINBOARD",
    priceMin: 475,
    priceMax: 500,
    lotSize: 30,
    minimumInvestment: 15000,
    issueSize: 3042,
    openDate: "2026-08-12",
    closeDate: "2026-08-14",
    allotmentDate: "2026-08-19",
    listingDate: "2026-08-22",
    status: "APPLICATION_OPEN",
    decision: "APPLY",
    stage: "APPLICATION",
    thesis: "Global ER&D services leader in automotive, aerospace, and heavy machinery with strong Tata Group synergy.",
    createdBy: "admin",
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "Swiggy Limited",
    company: "Swiggy India Pvt Ltd",
    type: "MAINBOARD",
    priceMin: 371,
    priceMax: 390,
    lotSize: 38,
    minimumInvestment: 14820,
    issueSize: 11327,
    openDate: "2026-08-14",
    closeDate: "2026-08-16",
    allotmentDate: "2026-08-21",
    listingDate: "2026-08-24",
    status: "APPLYING",
    decision: "APPLY",
    stage: "APPLICATION",
    thesis: "Market leader in quick commerce (Instamart expansion) showing path to adjusted EBITDA breakeven with strong institutional demand.",
    createdBy: "admin",
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "Hexaware Tech",
    company: "Hexaware Technologies Ltd",
    type: "MAINBOARD",
    priceMin: 670,
    priceMax: 708,
    lotSize: 21,
    minimumInvestment: 14868,
    issueSize: 9950,
    openDate: "2026-08-05",
    closeDate: "2026-08-08",
    allotmentDate: "2026-08-13",
    listingDate: "2026-08-16",
    status: "ALLOTMENT_PENDING",
    decision: "APPLY",
    stage: "ALLOTMENT",
    thesis: "High-margin IT services business backed by Carlyle with stable revenue visibility and multi-year digital transformation contracts.",
    createdBy: "admin",
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "Bajaj Housing",
    company: "Bajaj Housing Finance Limited",
    type: "MAINBOARD",
    priceMin: 66,
    priceMax: 70,
    lotSize: 214,
    minimumInvestment: 14980,
    issueSize: 6560,
    openDate: "2026-07-20",
    closeDate: "2026-07-23",
    allotmentDate: "2026-07-28",
    listingDate: "2026-07-31",
    status: "HOLDING",
    decision: "APPLY",
    stage: "HOLDING",
    thesis: "Premier non-bank housing finance player with lowest GNPA in the sector (0.28%) and strong parentage.",
    createdBy: "admin",
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "Premier Energies",
    company: "Premier Energies Limited",
    type: "MAINBOARD",
    priceMin: 420,
    priceMax: 450,
    lotSize: 33,
    minimumInvestment: 14850,
    issueSize: 2830,
    openDate: "2026-07-10",
    closeDate: "2026-07-13",
    allotmentDate: "2026-07-18",
    listingDate: "2026-07-21",
    status: "LISTED",
    decision: "APPLY",
    stage: "LISTING",
    thesis: "Integrated solar cell and module manufacturer benefiting from PLI schemes and domestic content mandates.",
    createdBy: "admin",
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function POST() {
  try {
    await requireSuperAdmin();
    const collection = await getIposCollection();
    await collection.deleteMany({});
    const result = await collection.insertMany(SEED_DATA);
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.insertedCount} IPO records into MongoDB nexo.ipos.`,
    });
  } catch (error: any) {
    console.error("POST /api/seed-ipos error:", error);
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied. Super Admin access required." }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: "Failed to seed IPO records into MongoDB" },
      { status: 500 }
    );
  }
}
