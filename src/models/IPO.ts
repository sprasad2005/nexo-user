import { ObjectId } from "mongodb";
import { IPOLifecycleStage, RecommendationType } from "@/types/nexo";

/* ─────────────────────────────────────────────────────────────
   IPO OPPORTUNITY SCHEMA (native MongoDB driver)
   Collection: "ipos"
   Stores Mainboard and SME IPO opportunities published by Admin.
───────────────────────────────────────────────────────────── */

export interface IPODocument {
  _id?: ObjectId;
  id: string;                     // Unique IPO ID (e.g. "ipo_tata_tech")
  name: string;                   // IPO Display Name (e.g. "Tata Technologies")
  nameNormalized?: string;        // Canonical normalized lowercase name for unique index
  company: string;                // Company Name (e.g. "Tata Technologies Limited")
  logo?: string;                  // Logo text or image URL
  category: "Mainboard" | "SME";  // IPO Market Category
  status: IPOLifecycleStage;      // "APPLICATION_OPEN" | "APPLYING" | "ALLOTMENT_PENDING" | "CLOSED" | "ALLOTTED" | "HOLDING" | "LISTED" | "SOLD" | "WATCHLIST"
  recommendation: RecommendationType; // "APPLY" | "WATCH" | "AVOID"
  thesis: string;                 // Syndicate Investment Thesis
  decisionDate?: string;          // Decision Date string
  decisionBy?: string;            // Admin who made recommendation
  isFeatured?: boolean;           // Featured Hero Opportunity flag
  closeCountdown?: string;        // E.g. "1d 08h"
  metrics: {
    issueSize: string;            // E.g. "₹3,042 Cr"
    priceBand: { min: number; max: number };
    lotSize: number;
    minInvestment: number;
    faceValue?: number;
    rhpUrl?: string;
    openDate: string;
    closeDate: string;
    allotmentDate: string;
    listingDate: string;
    gmp?: number;
    gmpPercent?: number;
    retailQuotaPercent?: number;
  };
  issuePrice?: number;
  currentPrice?: number;
  realizedProfit?: number;
  listingGainPercent?: number;
  createdBy: string;
  registrarUrl?: string;
  kfintechClientId?: string;
  participantsCount: number;
  combinedCapital: number;
  tags?: string[];
  isHidden?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
