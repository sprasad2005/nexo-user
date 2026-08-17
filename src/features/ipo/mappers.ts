import { IPO } from "./types";
import { IPOOpportunity } from "@/types/nexo";

export function mapIPOToOpportunity(ipo: IPO, existingApps: any[] = []): IPOOpportunity {
  const isSME = ipo.type === "SME";
  const formattedIssueSize = ipo.issueSize ? `₹${ipo.issueSize} Cr` : "—";

  const rec =
    ipo.decision === "WATCH" ? "WATCH" : ipo.decision === "SKIP" ? "AVOID" : "APPLY";

  let formattedDate = "12 Aug 2026";
  try {
    if (ipo.createdAt) {
      formattedDate = new Date(ipo.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch (_e) {}

  return {
    id: ipo.id,
    name: ipo.name,
    company: ipo.company,
    logo: ipo.name ? ipo.name.substring(0, 2).toUpperCase() : "IPO",
    category: isSME ? "SME" : "Mainboard",
    status: (ipo.status as any) || "APPLYING",
    recommendation: rec as any,
    thesis: ipo.thesis || "Strong operating profile and growth prospects.",
    decisionDate: formattedDate,
    decisionBy: ipo.createdBy || "admin",
    createdBy: ipo.createdBy || "admin",
    participantsCount: existingApps.length,
    combinedCapital: 0,
    metrics: {
      issueSize: formattedIssueSize,
      priceBand: { min: ipo.priceMin, max: ipo.priceMax },
      lotSize: ipo.lotSize,
      minInvestment: ipo.minimumInvestment || ipo.priceMax * ipo.lotSize,
      openDate: ipo.openDate || "12 Aug 2026",
      closeDate: ipo.closeDate || "14 Aug 2026",
      allotmentDate: ipo.allotmentDate || "19 Aug 2026",
      listingDate: ipo.listingDate || "21 Aug 2026",
      gmpPercent: ipo.gmpPercent !== undefined ? ipo.gmpPercent : 18.5,
    },
    applications: existingApps,
    isFeatured: true,
    hideFromHome: (ipo as any).hideFromHome,
    isHidden: (ipo as any).isHidden,
    isArchived: (ipo as any).isArchived,
    isCompleted: (ipo as any).isCompleted,
    profitDistribution: (ipo as any).profitDistribution,
    allotmentFinalized: (ipo as any).allotmentFinalized,
  };
}
