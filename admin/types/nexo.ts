export type IPOLifecycleStage =
  | "RESEARCHING"
  | "WATCHLIST"
  | "APPLYING"
  | "APPLICATION_OPEN"
  | "APPLIED"
  | "ALLOTMENT_PENDING"
  | "ALLOTTED"
  | "NOT_ALLOTTED"
  | "LISTED"
  | "HOLDING"
  | "SOLD"
  | "CLOSED"
  | "COMPLETED";

export type AllotmentStatus = "AWAITING" | "ALLOTTED" | "NOT_ALLOTTED";

export type RecommendationType = "APPLY" | "WATCH" | "SKIP";

export type MemberRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

export interface Member {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  role: MemberRole;
  panMasked: string;
  panFull: string;
}

export interface FinancialMetrics {
  issueSize: string; // e.g. "₹2,400 Cr"
  priceBand: { min: number; max: number };
  lotSize: number;
  minInvestment: number;
  gmpPercent?: number;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  fundUnblockDate?: string;
}

export interface ProfitDistribution {
  totalProfit: number;
  totalLots: number;
  allottedLots?: number;
  oneLotProfit: number;
  publishedAt?: string;
}

export interface IPOOpportunity {
  id: string;
  name: string;
  company: string;
  logo: string;
  category?: "Mainboard" | "SME";
  status: IPOLifecycleStage;
  recommendation: RecommendationType;
  thesis: string;
  decisionDate?: string;
  decisionBy?: string;
  metrics: FinancialMetrics;
  createdBy: string;
  participantsCount: number;
  combinedCapital: number;
  applications: any[];
  isHidden?: boolean;
  hideFromHome?: boolean;
  isCompleted?: boolean;
  isArchived?: boolean;
  allotmentFinalized?: boolean;
  profitDistribution?: ProfitDistribution;
}
