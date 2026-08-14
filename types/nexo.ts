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
  | "CLOSED";

export type AllotmentStatus = "AWAITING" | "ALLOTTED" | "NOT_ALLOTTED";

export type ApplicationType = "INDIVIDUAL" | "COMBINED";
export type ParticipationType = "INDIVIDUAL" | "COMBINED" | "SOLO" | "COMBO";

export type RecommendationType = "APPLY" | "WATCH" | "SKIP";

export type MemberRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

export interface MemberPermissions {
  canSubmitApplications: boolean;
  canDistributeProfit: boolean;
  canEditIpos: boolean;
  canAccessAdminConsole: boolean;
  canManageMembers: boolean;
}

export type MemberStatus = "ACTIVE" | "SUSPENDED";

export interface Member {
  id: string;
  name: string;
  username?: string;
  password?: string;
  email: string;
  avatar: string;
  role: MemberRole;
  status?: MemberStatus;
  panMasked: string;
  panFull: string;
  defaultContribution: number;
  joinedAt: string;
  phone?: string;
  upiId?: string;
  permissions?: MemberPermissions;
  sessionsRevokedAt?: string;
  lastLoginAt?: string;
}

export interface ApplicationParticipant {
  memberId: string;
  memberName: string;
  avatar?: string;
  contribution: number;
  percentage?: number;
  panMasked?: string;
  panFull?: string;
  proofUrl?: string;
  proofUploadedAt?: string;
  status?: "PENDING" | "SUBMITTED" | "ALLOTTED" | "NOT_ALLOTTED" | "REFUNDED";
  allotmentShares?: number;
  refundAmount?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export interface Application {
  id: string;
  ipoId: string;
  type: ApplicationType | ParticipationType;
  applicantName?: string;
  memberId?: string;
  panMasked?: string;
  totalContribution: number; // Amount (e.g. ₹15,000)
  lotCount?: number;         // Always 1
  verified?: boolean;        // Checkmark ✓
  status?: "DRAFT" | "SUBMITTED" | "VERIFIED" | "ALLOTTED" | "REFUNDED" | AllotmentStatus;
  allotmentStatus: AllotmentStatus;
  applicationProofUrl?: string;
  applicationNumber?: string;
  panNumbers?: string[];
  participants?: ApplicationParticipant[];
  createdAt?: string;
}

export interface FinancialMetrics {
  issueSize: string; // e.g. "₹1,400 Cr"
  priceBand: { min: number; max: number };
  lotSize: number;
  minInvestment: number;
  faceValue?: number; // e.g. 2
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  fundUnblockDate?: string;
  rhpUrl?: string; // Link to RHP PDF document
  retailQuotaPercent?: number;
  gmp?: number; // Grey Market Premium in ₹
  gmpPercent?: number;
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
  decisionDate?: string; // e.g. "12 Aug 2026"
  decisionBy?: string;   // member name who authored the decision
  metrics: FinancialMetrics;
  createdBy: string;
  participantsCount: number;
  combinedCapital: number;
  applications: Application[];
  issuePrice?: number;
  currentPrice?: number;
  listingGainPercent?: number;
  realizedProfit?: number;
  registrarUrl?: string;
  tags?: string[];
  isHidden?: boolean;
  isFeatured?: boolean;
  closeCountdown?: string;
  profitDistribution?: {
    totalProfit: number;
    totalLots: number;
    allottedLots?: number;
    oneLotProfit: number;
    publishedAt?: string;
  };
}

export interface ListedIPOUserProfit {
  memberId: string;
  memberName: string;
  profit: number;
  lotsApplied?: number;
}

export interface ListedIPO {
  id: string;
  name: string;
  category?: string;
  logo?: string;
  lotsAllotted: number;
  lotsApplied?: number;
  totalProfit: number;
  applicantsCount: number;
  oneLotProfit: number;
  listingDate?: string;
  lotPrice?: number;
  userProfits?: ListedIPOUserProfit[];
}

export interface PortfolioSummary {
  totalCapital: number;
  capitalDeployed: number;
  currentlyBlocked: number;
  availableCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  activeOpportunitiesCount: number;
  allotmentSuccessRatePercent: number;
  allocation: {
    availablePercent: number;
    blockedPercent: number;
    investedPercent: number;
  };
}

export interface ActivityItem {
  id: string;
  type:
    | "IPO_ADDED"
    | "APPLICATION_SUBMITTED"
    | "PROOF_UPLOADED"
    | "ALLOTMENT_DECLARED"
    | "LISTING_RECORDED"
    | "RECOMMENDATION_UPDATED";
  title: string;
  subtitle: string;
  timestamp: string;
  memberName: string;
  memberAvatar: string;
  ipoId?: string;
  ipoName?: string;
}

export interface ActionItem {
  id: string;
  type: "PROOF_MISSING" | "ALLOTMENT_PENDING" | "CONTRIBUTION_INCOMPLETE";
  title: string;
  subtitle: string;
  ipoId: string;
  ipoName: string;
  ctaLabel: string;
  memberName?: string;
  memberAvatar?: string;
}

export interface BroadcastNotification {
  id: string;
  senderName: string;
  senderAvatar?: string;
  targetMemberId?: string;
  title: string;
  message: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  ipoId?: string;
  ipoName?: string;
  ctaLabel?: string;
  ctaLink?: string;
  createdAt: string;
  isRead?: boolean;
}

export interface Transaction {
  id: string;
  ipoId: string;
  ipoName: string;
  type: "SOLO" | "COMBO";
  amount: number;
  groupTotalPool?: number;
  panMasked?: string;
  applicationNumber: string;
  participants: string[]; // member names
  createdAt: string; // ISO string
  status: "SUBMITTED" | "ALLOTTED" | "REFUNDED" | "REJECTED";
}

/* ────────────────────────────────────────────────────────────────
   CHAT SYSTEM TYPES
──────────────────────────────────────────────────────────────── */
export type ConversationType = "DIRECT" | "GROUP" | "IPO";
export type ConversationMemberRole = "OWNER" | "MEMBER";
export type MessageType = "TEXT" | "SYSTEM" | "IMAGE" | "FILE";
export type UserPresenceStatus = "ONLINE" | "OFFLINE" | "AWAY";

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatar?: string;
  ipoId?: string;
  createdBy: string;
  directKey?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  unreadCount?: number;
  members?: ConversationMember[];
  otherMember?: Member;
  participants?: Member[];
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  memberId: string;
  role: ConversationMemberRole;
  joinedAt: string;
  lastReadAt?: string;
  isMuted?: boolean;
  isArchived?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderUsername?: string;
  senderAvatar?: string;
  text: string;
  type: MessageType;
  replyToMessageId?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  status?: "SENT" | "DELIVERED" | "READ";
}

export interface UserPresence {
  memberId: string;
  status: UserPresenceStatus;
  lastSeenAt: string;
  updatedAt: string;
}

export interface MemberSearchUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: MemberRole;
  verified: boolean;
}
