"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  IPOOpportunity,
  Member,
  MemberRole,
  ActivityItem,
  PortfolioSummary,
  ParticipationType,
  ApplicationType,
  Application,
  AllotmentStatus,
  IPOLifecycleStage,
  ActionItem,
  BroadcastNotification,
  RecommendationType,
  Transaction,
  ListedIPO,
  ListedIPOUserProfit,
} from "@/types/nexo";
import {
  MOCK_IPOS,
  MOCK_MEMBERS,
  MOCK_ACTIVITIES,
  MOCK_PORTFOLIO_SUMMARY,
  MOCK_ACTION_ITEMS,
  formatApplicantNames,
} from "@/lib/mockData";
import { getProfile, updateProfile } from "@/src/features/profile/api";
import { mapIPOToOpportunity } from "@/src/features/ipo/mappers";
import { logActivity } from "@/src/features/activity/activityService";
import { UserLogoutModal } from "@/components/auth/UserLogoutModal";
import { LoginSuccessModal } from "@/components/auth/LoginSuccessModal";
import { nexoDataCache, AdminDataCache } from "@/lib/nexoDataCache";
import { chatRealtime } from "@/src/features/chat/utils/chatRealtime";

type ViewTab = "dashboard" | "ipos" | "applications" | "portfolio" | "messages" | "members" | "profile";

export interface NexoContextType {
  isAuthenticated: boolean;
  isAuthLoaded: boolean;
  currentUser: Member | null;
  currentMember: Member;
  login: (userId: string, pass: string) => Promise<{ success: boolean; role?: MemberRole; message?: string; member?: Member }> | { success: boolean; role?: MemberRole; message?: string; member?: Member };
  logout: () => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  currentUserRole: MemberRole;
  setCurrentUserRole: (role: MemberRole) => void;
  ipos: IPOOpportunity[];
  setIpos: React.Dispatch<React.SetStateAction<IPOOpportunity[]>>;
  members: Member[];
  activities: ActivityItem[];
  actionItems: ActionItem[];
  dismissActionItem: (id: string) => void;
  notifications: BroadcastNotification[];
  sendBroadcastNotification: (notif: BroadcastNotification) => void;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (id: string, scope?: "me" | "everyone") => Promise<void>;
  markAllNotificationsRead: () => void;
  portfolioSummary: PortfolioSummary;
  individualSavings: number;
  updateIndividualSavings: (amount: number) => void;
  userContributions: Record<string, number>;
  updateUserContribution: (ipoId: string, amount: number) => void;
  transactions: Transaction[];
  clearTransactions: () => void;
  deleteTransaction: (txnId: string) => void;
  updateTransaction?: (txnId: string, data: any) => void;
  selectedIpo: IPOOpportunity | null;
  openIpoDetail: (ipo: IPOOpportunity) => void;
  closeIpoDetail: () => void;
  isApplicationModalOpen: boolean;
  activeApplicationIpo: IPOOpportunity | null;
  applicationModalIpo: IPOOpportunity | null;
  openApplicationModal: (ipo: IPOOpportunity) => void;
  closeApplicationModal: () => void;
  isAddIpoModalOpen: boolean;
  openAddIpoModal: () => void;
  closeAddIpoModal: () => void;
  addNewIpo: (ipoData: {
    name: string;
    company: string;
    priceMin: number;
    priceMax: number;
    lotSize: number;
    openDate?: string;
    closeDate: string;
    recommendation?: RecommendationType;
    thesis?: string;
  }) => void;
  createApplication: (
    ipoId: string,
    type: ParticipationType | ApplicationType,
    participantContributions: { memberId: string; contribution: number }[],
    proofUrl?: string,
    applicantMemberId?: string,
    applicantNameInput?: string,
    panNumbersInput?: string[]
  ) => void;
  addApplicationToIpo: (
    ipoId: string,
    appData: {
      type: ParticipationType | ApplicationType;
      applicantName?: string;
      memberId?: string;
      panMasked?: string;
      totalContribution: number;
      lotCount?: number;
      participants: {
        memberId: string;
        memberName: string;
        avatar?: string;
        contribution: number;
        percentage?: number;
        panMasked?: string;
        panFull?: string;
      }[];
    }
  ) => void;
  updateApplicationStatus: (ipoId: string, applicationId: string, status: AllotmentStatus) => void;
  updateRegistrarUrl: (ipoId: string, url: string) => void;
  updateApplication: (
    ipoId: string,
    applicationId: string,
    data: {
      applicantName?: string;
      lotCount?: number;
      panMasked?: string;
      totalContribution?: number;
      allotmentStatus?: AllotmentStatus;
      status?: AllotmentStatus;
      participants?: import("@/types/nexo").ApplicationParticipant[];
      panNumbers?: string[];
    }
  ) => void;
  deleteApplication: (ipoId: string, applicationId: string) => void;
  listedIpos: import("@/types/nexo").ListedIPO[];
  addListedIpo: (ipo: Omit<import("@/types/nexo").ListedIPO, "id">) => void;
  deleteListedIpo: (id: string, name?: string) => void;
  createIPO: (data: {
    name: string;
    minInvestment: number;
    issueSize: number;
    description: string;
    closeDate: string;
  }) => { success: boolean; message?: string };
  removeIPO: (ipoId: string) => { success: boolean; message?: string };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  revealedPans: Record<string, boolean>;
  togglePanReveal: (memberId: string) => void;
  updateIpoStatus: (ipoId: string, status: IPOLifecycleStage) => void;
  updateIpo: (ipoId: string, patch: Partial<IPOOpportunity>) => void;
  refreshIpos: () => Promise<void>;
  isLoading: boolean;
  isPremiumUser: boolean;
  activePlan: string;
  isPremiumModalOpen: boolean;
  openPremiumModal: (ipo?: IPOOpportunity | null) => void;
  closePremiumModal: () => void;
  activatePremiumPlan: (planName: string) => void;
  updateCurrentUser: (patch: Partial<Member>) => void;
  addMember: (memberData: Partial<Member> & { name: string; username: string; password: string }) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  unreadMessageCount: number;
  setUnreadMessageCount: React.Dispatch<React.SetStateAction<number>>;
  markConversationAsRead: (conversationId: string, unreadCount?: number) => Promise<void>;
  refreshUnreadMessageCount: (forceRefresh?: boolean) => Promise<void>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  openDirectChatWithUser: (targetMemberId: string) => Promise<void>;
  openIpoGroupChat: (ipoId: string, ipoTitle?: string) => Promise<void>;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isUserLogoutModalOpen: boolean;
  openUserLogoutModal: () => void;
  closeUserLogoutModal: () => void;
}

const NexoContext = createContext<NexoContextType | undefined>(undefined);

export function NexoProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nexo_cached_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return MOCK_MEMBERS;
  });
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isUserLogoutModalOpen, setIsUserLogoutModalOpen] = useState(false);
  const [isLoginSuccessOpen, setIsLoginSuccessOpen] = useState(false);

  const openUserLogoutModal = () => setIsUserLogoutModalOpen(true);
  const closeUserLogoutModal = () => setIsUserLogoutModalOpen(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTabState] = useState<ViewTab>(() => {
    if (typeof window !== "undefined") {
      try {
        const hashTab = window.location.hash.replace("#", "").toLowerCase() as ViewTab;
        if (hashTab) return hashTab;
        const storedTab = localStorage.getItem("nexo_active_tab") as ViewTab;
        if (storedTab) return storedTab;
      } catch {}
    }
    return "dashboard";
  });
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>("MEMBER");

  const setActiveTab = (tab: ViewTab | string) => {
    if (tab === "admin") {
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      }
      return;
    }
    setActiveTabState(tab as ViewTab);
    try {
      localStorage.setItem("nexo_active_tab", tab);
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        window.history.replaceState(null, "", `#${tab}`);
      }
    } catch {}
  };

  const updateCurrentUser = (patch: Partial<Member>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem("nexo_session_user", JSON.stringify(updated));
      } catch {}

      // Always persist profile updates to MongoDB
      updateProfile({
        name: updated.name,
        displayName: updated.name,
        email: updated.email,
        phone: updated.phone,
        avatar: updated.avatar,
      }).catch((err) => console.error("Failed to sync profile to MongoDB:", err));

      return updated;
    });
  };

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);

  const isRefreshingUnreadRef = React.useRef(false);
  const refreshUnreadMessageCount = useCallback(async (forceRefresh = false) => {
    if (isRefreshingUnreadRef.current) return;
    isRefreshingUnreadRef.current = true;
    try {
      const activeMemberId = currentUser?.id || "mem_1";
      const unreadCount = await nexoDataCache.fetchSWR<number>(
        `unread_${activeMemberId}`,
        async () => {
          const res = await fetch(`/api/conversations?memberId=${activeMemberId}`);
          if (!res.ok) return 0;
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.conversations)) {
            if (typeof data.totalUnreadCount === "number") {
              return data.totalUnreadCount;
            }
            return data.conversations.reduce(
              (sum: number, c: any) => sum + (typeof c.unreadCount === "number" ? c.unreadCount : 0),
              0
            );
          }
          return 0;
        },
        {
          ttlMs: 5000,
          forceRefresh,
          onUpdate: (freshCount) => setUnreadMessageCount(freshCount),
        }
      );
      if (typeof unreadCount === "number") {
        setUnreadMessageCount(unreadCount);
      }
    } catch {} finally {
      isRefreshingUnreadRef.current = false;
    }
  }, [currentUser]);

  const markConversationAsRead = useCallback(
    async (conversationId: string, currentUnread = 0) => {
      if (!conversationId) return;
      const activeMemberId = currentUser?.id || "mem_1";

      // 1. Optimistic global badge update immediately
      if (currentUnread > 0) {
        setUnreadMessageCount((prev) => Math.max(0, prev - currentUnread));
      }

      nexoDataCache.invalidate(`unread_${activeMemberId}`);

      try {
        const res = await fetch(`/api/conversations/${conversationId}/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: activeMemberId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.success) {
          if (typeof data.totalUnreadCount === "number") {
            setUnreadMessageCount(data.totalUnreadCount);
          }
          chatRealtime.emit("message:read", {
            conversationId,
            memberId: activeMemberId,
            unreadCount: 0,
            totalUnreadCount: data.totalUnreadCount,
          });
        } else {
          // Rollback on failure
          if (currentUnread > 0) {
            setUnreadMessageCount((prev) => prev + currentUnread);
          }
        }
      } catch (err) {
        console.error("Failed to mark conversation as read:", err);
        if (currentUnread > 0) {
          setUnreadMessageCount((prev) => prev + currentUnread);
        }
      }
    },
    [currentUser]
  );

  // Real-time synchronization listeners for global unread counter
  useEffect(() => {
    const activeMemberId = currentUser?.id || "mem_1";

    const unsubRead = chatRealtime.on("message:read", (data: any) => {
      if (data?.memberId === activeMemberId) {
        if (typeof data.totalUnreadCount === "number") {
          setUnreadMessageCount(data.totalUnreadCount);
        } else {
          refreshUnreadMessageCount(true);
        }
      }
    });

    const unsubNew = chatRealtime.on("message:new", (msg: any) => {
      if (msg && msg.senderId !== activeMemberId) {
        const isViewingThisConv =
          activeTab === "messages" &&
          activeConversationId === msg.conversationId &&
          typeof document !== "undefined" &&
          document.visibilityState === "visible";

        if (!isViewingThisConv) {
          setUnreadMessageCount((prev) => prev + 1);
        }
      }
    });

    return () => {
      unsubRead();
      unsubNew();
    };
  }, [currentUser, activeTab, activeConversationId, refreshUnreadMessageCount]);

  useEffect(() => {
    refreshUnreadMessageCount();
    const interval = setInterval(refreshUnreadMessageCount, 8000);
    return () => clearInterval(interval);
  }, [refreshUnreadMessageCount]);

  const isRefreshingIposRef = React.useRef(false);
  const refreshIpos = useCallback(async (forceRefresh = false) => {
    if (isRefreshingIposRef.current) return;
    isRefreshingIposRef.current = true;
    try {
      await nexoDataCache.fetchSWR(
        "ipos_apps",
        async () => {
          const [ipoRes, appRes] = await Promise.all([
            fetch("/api/ipos").then((r) => r.json()).catch(() => null),
            fetch("/api/applications").then((r) => r.json()).catch(() => null),
          ]);

          let apiIpos: IPOOpportunity[] = [];
          if (Array.isArray(ipoRes?.ipos)) {
            apiIpos = ipoRes.ipos.map((raw: any) => (raw.metrics ? raw : mapIPOToOpportunity(raw)));
          } else if (Array.isArray(ipoRes)) {
            apiIpos = ipoRes.map((raw: any) => (raw.metrics ? raw : mapIPOToOpportunity(raw)));
          }

          const dbApplications: any[] =
            appRes?.success && Array.isArray(appRes.applications) ? appRes.applications : [];

          const mergedMap = new Map<string, IPOOpportunity>();
          apiIpos.forEach((ipo: IPOOpportunity) => {
            if (ipo && ipo.id) mergedMap.set(ipo.id, ipo);
          });

          const combined = Array.from(mergedMap.values()).map((ipo) => {
            const dbAppsForIpo: Application[] = dbApplications
              .filter(
                (doc: any) =>
                  doc.ipoId === ipo.id || doc.ipoName?.toLowerCase() === ipo.name?.toLowerCase()
              )
              .map((doc: any) => ({
                id: doc.id,
                ipoId: ipo.id,
                type: doc.fundingStructure === "MULTI_FRIEND" ? "COMBINED" : "INDIVIDUAL",
                applicantName: doc.applicantName || "Member",
                memberId: doc.memberId || "mem_1",
                panMasked: doc.panNumbers?.[0] || doc.pan || doc.panMasked || "",
                panNumbers: doc.panNumbers || (doc.panMasked ? [doc.panMasked] : []),
                totalContribution: doc.totalContribution || 15000,
                lotCount: doc.numberOfPanCards || doc.lotCount || 1,
                verified: true,
                allotmentStatus: doc.allotmentStatus || "AWAITING",
                status: doc.status || "AWAITING",
                createdAt: typeof doc.createdAt === "string" ? doc.createdAt : new Date().toISOString(),
                participants: (doc.contributors || doc.participants || []).map((c: any) => ({
                  memberId: c.memberId || "mem_1",
                  memberName: c.memberName || "Member",
                  avatar: "/oggy.png",
                  contribution: c.amount || c.contribution || 15000,
                  percentage: c.percentage || 100,
                  panMasked: doc.panNumbers?.[0] || "",
                  panFull: doc.panNumbers?.[0] || "",
                  status: "SUBMITTED" as const,
                })),
              }));

            const existingAppIds = new Set(dbAppsForIpo.map((a) => a.id));
            const fileApps = (ipo.applications || []).filter((a) => !existingAppIds.has(a.id));
            const mergedApps = [...dbAppsForIpo, ...fileApps];

            return {
              ...ipo,
              applications: mergedApps,
              combinedCapital: mergedApps.reduce((sum, a) => sum + (a.totalContribution || 0), 0),
              participantsCount: new Set(
                mergedApps.flatMap((a) => (a.participants || []).map((p) => p.memberId))
              ).size,
              profitDistribution: ipo.profitDistribution,
            };
          });

          const publishedCards: ListedIPO[] = [];
          combined.forEach((ipo) => {
            if (ipo.profitDistribution) {
              const dist = ipo.profitDistribution as any;
              const minInv = ipo.metrics?.minInvestment || 15000;

              let userProfits: ListedIPOUserProfit[] = [];
              if (Array.isArray(dist.memberPayouts) && dist.memberPayouts.length > 0) {
                userProfits = dist.memberPayouts.map((p: any) => ({
                  memberId: p.memberId || p.id || `mem_${p.name}`,
                  memberName: p.name || p.memberName || "Member",
                  profit: Number(p.profit) || 0,
                  lotsApplied: Number(p.lots) || 1,
                  lots: Number(p.lots) || 1,
                }));
              }

              const userProfitsTotalLots = userProfits.reduce(
                (sum, u) => sum + (Number(u.lotsApplied) || Number(u.lots) || 0),
                0
              );

              const appsLots = (ipo.applications || []).reduce((sum, app) => {
                if (Array.isArray(app.participants) && app.participants.length > 0) {
                  return (
                    sum +
                    app.participants.reduce(
                      (pSum: number, p: any) =>
                        pSum + (p.contribution ? p.contribution / minInv : 1),
                      0
                    )
                  );
                }
                return sum + (app.lotCount || 1);
              }, 0);

              const totalAppliedLots =
                userProfitsTotalLots > 0
                  ? userProfitsTotalLots
                  : appsLots > 0
                  ? appsLots
                  : Number(dist.totalLots) || 1;

              const totalProfitNum = Number(dist.totalProfit) || 0;
              const oneLotProfit =
                totalProfitNum > 0 && totalAppliedLots > 0
                  ? Math.round(totalProfitNum / totalAppliedLots)
                  : dist.oneLotProfit || 0;

              publishedCards.push({
                id: `pub_${ipo.id}`,
                name: ipo.name,
                category: ipo.category || "Mainboard",
                logo: ipo.logo || ipo.name.substring(0, 2).toUpperCase(),
                lotsAllotted: dist.allottedLots || 1,
                lotsApplied: totalAppliedLots,
                totalProfit: totalProfitNum,
                applicantsCount: userProfits.length || (ipo.applications || []).length || 1,
                oneLotProfit: oneLotProfit,
                listingDate: dist.publishedAt
                  ? new Date(dist.publishedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Sep 2026",
                userProfits,
              });
            }
          });

          return { combined, publishedCards };
        },
        {
          ttlMs: 20000,
          forceRefresh,
          onUpdate: (fresh) => {
            if (fresh?.combined) {
              setIpos(fresh.combined);
              try {
                localStorage.setItem("nexo_cached_ipos", JSON.stringify(fresh.combined));
              } catch {}
            }
            if (fresh?.publishedCards && fresh.publishedCards.length > 0) {
              setListedIpos(fresh.publishedCards);
            }
          },
        }
      ).then((res) => {
        if (res?.combined) {
          setIpos(res.combined);
          try {
            localStorage.setItem("nexo_cached_ipos", JSON.stringify(res.combined));
          } catch {}
        }
        if (res?.publishedCards && res.publishedCards.length > 0) {
          setListedIpos(res.publishedCards);
        }
      });
    } catch (err) {
      console.warn("Failed to refresh IPOs from API in NexoContext:", err);
    } finally {
      isRefreshingIposRef.current = false;
    }
  }, []);

  const refreshMembers = useCallback(async (forceRefresh = false) => {
    try {
      const data = await nexoDataCache.fetchSWR<Member[]>(
        "members",
        async () => {
          const res = await fetch("/api/members");
          if (!res.ok) return [];
          const json = await res.json().catch(() => null);
          if (json?.success && Array.isArray(json.members)) {
            return json.members;
          }
          return [];
        },
        {
          ttlMs: 45000,
          forceRefresh,
          onUpdate: (freshMembers) => {
            if (Array.isArray(freshMembers) && freshMembers.length > 0) {
              setMembers(freshMembers);
              try {
                localStorage.setItem("nexo_cached_members", JSON.stringify(freshMembers));
              } catch {}
            }
          },
        }
      );
      if (Array.isArray(data) && data.length > 0) {
        setMembers(data);
        try {
          localStorage.setItem("nexo_cached_members", JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn("Failed to fetch members from API:", err);
    }
  }, []);

  // Restore session, active tab, & trigger parallel non-blocking SWR data hydration on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("nexo_session_user");
      let storedRole = "MEMBER";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.id) {
            setCurrentUser(parsed);
            storedRole = parsed.role || "MEMBER";
            setCurrentUserRole(storedRole as MemberRole);
            setIsAuthenticated(true);
          }
        } catch {}
      }

      if (typeof window !== "undefined" && window.location.pathname === "/") {
        const hashTab = window.location.hash.replace("#", "").toLowerCase() as ViewTab;
        const storedTab = localStorage.getItem("nexo_active_tab") as ViewTab;
        const validTabs: ViewTab[] = [
          "dashboard",
          "ipos",
          "applications",
          "portfolio",
          "messages",
          "members",
          "profile",
        ];

        let targetTab: ViewTab = "dashboard";
        if (validTabs.includes(hashTab)) {
          targetTab = hashTab;
        } else if (validTabs.includes(storedTab) && storedTab !== "dashboard" && validTabs.includes(storedTab)) {
          targetTab = storedTab;
        }

        setActiveTabState(targetTab);
        window.history.replaceState(null, "", `#${targetTab}`);
      }

      const storedSavings = localStorage.getItem("nexo_individualSavings");
      if (storedSavings !== null) setIndividualSavings(parseFloat(storedSavings));

      const storedContribs = localStorage.getItem("nexo_userContributions");
      if (storedContribs !== null) setUserContributions(JSON.parse(storedContribs));

      const storedTxns = localStorage.getItem("nexo_transactions");
      if (storedTxns !== null) setTransactions(JSON.parse(storedTxns));
    } catch {}

    // Parallel SWR non-blocking network fetches with deduplication
    nexoDataCache.fetchSWR(
      "auth_me",
      async () => {
        const res = await fetch("/api/auth/me");
        return res.json();
      },
      {
        ttlMs: 60000,
        onUpdate: (data) => {
          if (data?.authenticated && data?.member) {
            setCurrentUser(data.member);
            const userRole = data.member.role || "MEMBER";
            setCurrentUserRole(userRole);
            setIsAuthenticated(true);
          }
        },
      }
    ).then((data) => {
      if (data?.authenticated && data?.member) {
        setCurrentUser(data.member);
        const userRole = data.member.role || "MEMBER";
        setCurrentUserRole(userRole);
        setIsAuthenticated(true);

        try {
          if (sessionStorage.getItem("nexo_just_logged_in") === "true") {
            sessionStorage.removeItem("nexo_just_logged_in");
            setIsLoginSuccessOpen(true);
          }
        } catch {}
      } else if (data?.authenticated === false) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        try {
          localStorage.removeItem("nexo_session_user");
        } catch {}
      }
      setIsAuthLoaded(true);
    }).catch(() => {
      setIsAuthLoaded(true);
    });

    // Fire parallel cached initializers
    refreshMembers();
    refreshIpos();

    const handleHashChange = () => {
      if (typeof window === "undefined" || window.location.pathname !== "/") return;
      const hashTab = window.location.hash.replace("#", "").toLowerCase() as ViewTab;
      const validTabs: ViewTab[] = ["dashboard", "ipos", "applications", "portfolio", "messages", "members", "profile"];
      if (validTabs.includes(hashTab)) {
        setActiveTabState(hashTab);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("storage", () => refreshIpos(true));

    // Auto-fetch fresh data from MongoDB every 8 seconds
    const ipoInterval = setInterval(() => refreshIpos(false), 8000);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("storage", () => refreshIpos(true));
      clearInterval(ipoInterval);
    };
  }, [refreshIpos, refreshMembers]);

  const addMember = async (memberData: Partial<Member> & { name: string; username: string; password: string }) => {
    const id = `mem_${Date.now()}`;
    const newMember: Member = {
      id,
      name: memberData.name,
      username: memberData.username,
      password: memberData.password,
      email: memberData.email || `${memberData.username}@nexo.private`,
      avatar: memberData.avatar || "/oggy.png",
      role: memberData.role || "MEMBER",
      panMasked: memberData.panMasked || memberData.panFull || "ABCDE1234F",
      panFull: memberData.panFull || memberData.panMasked || "ABCDE1234F",
      defaultContribution: memberData.defaultContribution || 50000,
      joinedAt: "Just now",
      phone: memberData.phone,
      upiId: memberData.upiId,
    };

    setMembers((prev) => [...prev, newMember]);
    nexoDataCache.invalidate("members");

    try {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });

      // Automatically join new member to all group & IPO chats
      await fetch(`/api/conversations?memberId=${newMember.id}`).catch(() => {});
    } catch (err) {
      console.error("Failed to sync new member to MongoDB:", err);
    }
  };

  const updateMember = async (id: string, patch: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
    nexoDataCache.invalidate("members");

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (err) {
      console.error("Failed to update member in MongoDB:", err);
    }
  };

  const deleteMember = async (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    nexoDataCache.invalidate("members");

    try {
      await fetch(`/api/admin/members/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete member in MongoDB:", err);
    }
  };

  const refreshApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json().catch(() => null);

        if (data?.success && Array.isArray(data.applications) && data.applications.length > 0) {
          setIpos((prevIpos) =>
            prevIpos.map((ipo) => {
              const dbAppsForIpo = data.applications.filter(
                (doc: any) => doc.ipoId === ipo.id || doc.ipoName?.toLowerCase() === ipo.name?.toLowerCase()
              );

              if (dbAppsForIpo.length === 0) return ipo;

              const mappedApps: Application[] = dbAppsForIpo.map((doc: any) => ({
                id: doc.id,
                ipoId: ipo.id,
                type: doc.fundingStructure === "MULTI_FRIEND" ? "COMBINED" : "INDIVIDUAL",
                applicantName: doc.applicantName || "Member",
                memberId: doc.memberId || "mem_1",
                panMasked: doc.panNumbers?.[0] || "ABCDE2741D",
                panNumbers: doc.panNumbers || [doc.panMasked || "ABCDE2741D"],
                totalContribution: doc.totalContribution || 15000,
                lotCount: doc.numberOfPanCards || doc.lotCount || 1,
                verified: true,
                allotmentStatus: doc.allotmentStatus || "AWAITING",
                status: doc.status || "AWAITING",
                createdAt: typeof doc.createdAt === "string" ? doc.createdAt : new Date().toISOString(),
                participants: (doc.contributors || []).map((c: any) => ({
                  memberId: c.memberId || "mem_1",
                  memberName: c.memberName || "Member",
                  avatar: "/oggy.png",
                  contribution: c.amount || 15000,
                  percentage: c.percentage || 100,
                  panMasked: doc.panNumbers?.[0] || "ABCDE2741D",
                  panFull: doc.panNumbers?.[0] || "ABCDE2741D",
                  status: "SUBMITTED" as const,
                })),
              }));

              const existingIds = new Set(mappedApps.map((a) => a.id));
              const remainingApps = ipo.applications.filter((a) => !existingIds.has(a.id));
              const mergedApps = [...mappedApps, ...remainingApps];
              const totalCombined = mergedApps.reduce((sum, a) => sum + a.totalContribution, 0);

              return {
                ...ipo,
                applications: mergedApps,
                combinedCapital: totalCombined,
              };
            })
          );
        }
      }

      // Fetch transactions
      const txnRes = await fetch("/api/transactions");
      if (txnRes.ok) {
        const txnData = await txnRes.json().catch(() => null);
        if (txnData?.success && Array.isArray(txnData.transactions) && txnData.transactions.length > 0) {
          setTransactions((prev) => {
            const existing = new Set(prev.map((t) => t.id));
            const newTxns = txnData.transactions.filter((t: any) => !existing.has(t.id));
            return [...newTxns, ...prev];
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch applications and transactions from API:", err);
    }
  };

  const login = async (userIdInput: string, passInput: string): Promise<{ success: boolean; role?: MemberRole; message?: string; member?: Member }> => {
    setAuthError(null);
    const cleanUser = userIdInput.trim().toLowerCase();
    const cleanPass = passInput.trim();

    if (!cleanUser) {
      const msg = "Please enter your Email or Username";
      setAuthError(msg);
      return { success: false, message: msg };
    }

    if (!cleanPass) {
      const msg = "Please enter your password";
      setAuthError(msg);
      return { success: false, message: msg };
    }

    // 1. Try server-side authentication API against database (members provisioned by Admin)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: cleanUser, password: cleanPass, context: "USER" }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.member) {
        setCurrentUser(data.member);
        setCurrentUserRole(data.member.role || "MEMBER");
        setIsAuthenticated(true);
        const targetTab: ViewTab = "dashboard";
        setActiveTabState(targetTab);
        try {
          localStorage.setItem("nexo_session_user", JSON.stringify(data.member));
          localStorage.setItem("nexo_active_tab", targetTab);
          if (typeof window !== "undefined" && window.location.pathname === "/") {
            window.history.replaceState(null, "", `#${targetTab}`);
          }
        } catch {}
        return { success: true, role: data.member.role, member: data.member };
      } else if (data.error && res.status !== 404 && res.status !== 500) {
        setAuthError(data.error);
        return { success: false, message: data.error };
      }
    } catch (err) {
      console.warn("API login attempt failed, attempting local verification:", err);
    }

    const isSuperAdminAlias = ["ankitgod", "aniketgod", "anikitgod"].includes(cleanUser);
    let foundMember = members.find((m) => {
      const uName = (m.username || m.name).toLowerCase();
      const uEmail = m.email.toLowerCase();
      const uId = m.id.toLowerCase();
      return uName === cleanUser || uEmail === cleanUser || uId === cleanUser || (isSuperAdminAlias && m.role === "SUPER_ADMIN");
    });

    if (!foundMember) {
      const msg = "Invalid Username. Access restricted to registered members.";
      setAuthError(msg);
      return { success: false, message: msg };
    }

    // Verify assigned password
    const expectedPass = foundMember.password || "admin123";
    if (cleanPass !== expectedPass) {
      const msg = "Incorrect password. Please enter the password provisioned by your Admin.";
      setAuthError(msg);
      return { success: false, message: msg };
    }

    // Valid credentials verified!
    setCurrentUser(foundMember);
    setCurrentUserRole(foundMember.role);
    setIsAuthenticated(true);
    const targetTab: ViewTab = "dashboard";
    setActiveTabState(targetTab);
    try {
      localStorage.setItem("nexo_session_user", JSON.stringify(foundMember));
      localStorage.setItem("nexo_active_tab", targetTab);
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        window.history.replaceState(null, "", `#${targetTab}`);
      }
    } catch {}

    return { success: true, role: foundMember.role, member: foundMember };
  };


  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAuthError(null);
    try {
      localStorage.removeItem("nexo_session_user");
    } catch {}

    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      });
  };
  const [ipos, setIpos] = useState<IPOOpportunity[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nexo_cached_ipos");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return MOCK_IPOS;
  });
  const [activities, setActivities] = useState<ActivityItem[]>(MOCK_ACTIVITIES);
  const [actionItems, setActionItems] = useState<ActionItem[]>(MOCK_ACTION_ITEMS);
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [portfolioSummary] = useState<PortfolioSummary>(MOCK_PORTFOLIO_SUMMARY);

  const refreshNotifications = useCallback(async (forceRefresh = false) => {
    try {
      const data = await nexoDataCache.fetchSWR<BroadcastNotification[]>(
        "notifications",
        async () => {
          const res = await fetch("/api/notifications");
          const json = await res.json();
          if (json?.success && Array.isArray(json.notifications)) {
            return json.notifications;
          }
          return [];
        },
        {
          ttlMs: 30000,
          forceRefresh,
          onUpdate: (freshNotifs) => {
            if (Array.isArray(freshNotifs)) setNotifications(freshNotifs);
          },
        }
      );
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const deleteNotification = async (id: string, scope: "me" | "everyone" = "everyone") => {
    // 1. Optimistic removal from state
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}?scope=${scope}`, { method: "DELETE" });
    } catch {}
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const sendBroadcastNotification = (notif: BroadcastNotification) => {
    setNotifications((prev) => [notif, ...prev]);
  };
  const [individualSavings, setIndividualSavings] = useState<number>(0);
  const [userContributions, setUserContributions] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Persist to localStorage on change
  useEffect(() => {
    try { localStorage.setItem("nexo_individualSavings", String(individualSavings)); } catch {}
  }, [individualSavings]);
  useEffect(() => {
    try { localStorage.setItem("nexo_userContributions", JSON.stringify(userContributions)); } catch {}
  }, [userContributions]);
  useEffect(() => {
    try { localStorage.setItem("nexo_transactions", JSON.stringify(transactions)); } catch {}
  }, [transactions]);


  const updateIndividualSavings = (amount: number) => {
    setIndividualSavings(amount);
  };

  const updateUserContribution = (ipoId: string, amount: number) => {
    setUserContributions((prev) => ({
      ...prev,
      [ipoId]: amount,
    }));
  };

  const [selectedIpo, setSelectedIpo] = useState<IPOOpportunity | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [activeApplicationIpo, setActiveApplicationIpo] = useState<IPOOpportunity | null>(null);
  const [isAddIpoModalOpen, setIsAddIpoModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [revealedPans, setRevealedPans] = useState<Record<string, boolean>>({});
  const [isLoading] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [activePlan, setActivePlan] = useState("Free");
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Global Ctrl + B hotkey to toggle left sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openPremiumModal = (_ipo?: IPOOpportunity | null) => setIsPremiumModalOpen(true);
  const closePremiumModal = () => setIsPremiumModalOpen(false);
  const activatePremiumPlan = (planName: string) => {
    setIsPremiumUser(true);
    setActivePlan(planName);
  };

  const togglePanReveal = (memberId: string) => {
    setRevealedPans((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const dismissActionItem = (id: string) => {
    setActionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const openIpoDetail = (ipo: IPOOpportunity) => {
    setSelectedIpo(ipo);
    const slug = ipo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (typeof window !== "undefined") {
      window.location.href = `/ipos/${slug}`;
    }
  };

  const closeIpoDetail = () => {
    setSelectedIpo(null);
  };

  const openApplicationModal = (ipo: IPOOpportunity) => {
    setActiveApplicationIpo(ipo);
    setIsApplicationModalOpen(true);
  };

  const closeApplicationModal = () => {
    setIsApplicationModalOpen(false);
    setActiveApplicationIpo(null);
  };

  const openAddIpoModal = () => setIsAddIpoModalOpen(true);
  const closeAddIpoModal = () => setIsAddIpoModalOpen(false);

  const addNewIpo = (data: {
    name: string;
    company: string;
    priceMin: number;
    priceMax: number;
    lotSize: number;
    openDate?: string;
    closeDate: string;
    recommendation?: RecommendationType;
    thesis?: string;
  }) => {
    const minInv = data.priceMax * data.lotSize;
    const newIpo: IPOOpportunity = {
      id: `ipo_${Date.now()}`,
      name: data.name,
      company: data.company,
      logo: data.name.substring(0, 2).toUpperCase(),
      category: "Mainboard",
      status: "APPLYING",
      recommendation: data.recommendation || "APPLY",
      thesis: data.thesis || "Primary analysis for group participation.",
      metrics: {
        issueSize: "₹1,000 Cr",
        priceBand: { min: data.priceMin, max: data.priceMax },
        lotSize: data.lotSize,
        minInvestment: minInv,
        openDate: data.openDate || "Today",
        closeDate: data.closeDate || "3 days",
        allotmentDate: "T+3 Days",
        listingDate: "T+6 Days",
      },
      createdBy: "Shivam Prasad",
      participantsCount: 0,
      combinedCapital: 0,
      applications: [],
    };

    setIpos((prev) => [newIpo, ...prev]);

    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "IPO_ADDED",
      title: `Shivam added ${data.name}`,
      subtitle: `Priced ₹${data.priceMin}–₹${data.priceMax} per share • Lot size ${data.lotSize}`,
      timestamp: "Just now",
      memberName: "Shivam Prasad",
      memberAvatar: members[0].avatar,
      ipoId: newIpo.id,
      ipoName: data.name,
    };

    setActivities((prev) => [newActivity, ...prev]);
    closeAddIpoModal();
  };

  const updateIpoStatus = (ipoId: string, status: IPOLifecycleStage) => {
    setIpos((prev) =>
      prev.map((item) => (item.id === ipoId ? { ...item, status } : item))
    );
    if (selectedIpo && selectedIpo.id === ipoId) {
      setSelectedIpo((prev) => (prev ? { ...prev, status } : null));
    }
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_ipos");
  };

  const updateIpo = (ipoId: string, patch: Partial<IPOOpportunity>) => {
    setIpos((prev) =>
      prev.map((item) => (item.id === ipoId ? { ...item, ...patch } : item))
    );
    if (selectedIpo && selectedIpo.id === ipoId) {
      setSelectedIpo((prev) => (prev ? { ...prev, ...patch } : null));
    }
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_ipos");
  };

  const updateApplicationStatus = (
    ipoId: string,
    applicationId: string,
    allotmentStatus: AllotmentStatus
  ) => {
    let targetAppName = "Member";
    let targetIpoName = "IPO";

    setIpos((prev) =>
      prev.map((ipo) => {
        if (ipo.id === ipoId) {
          targetIpoName = ipo.name;
          const updatedApps = ipo.applications.map((app) => {
            if (app.id === applicationId) {
              targetAppName = app.applicantName || "Member";
              return { ...app, allotmentStatus, status: allotmentStatus };
            }
            return app;
          });
          return { ...ipo, applications: updatedApps };
        }
        return ipo;
      })
    );

    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_allotment");

    // 1. Sync Application Status Update to MongoDB
    fetch("/api/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: applicationId,
        allotmentStatus,
        status: allotmentStatus,
      }),
    }).catch((err) => console.error("Failed to sync application status update to MongoDB:", err));

    // 2. Sync / Update Transactions Ledger Status
    const txnStatus = allotmentStatus === "ALLOTTED" ? "ALLOTTED" : allotmentStatus === "NOT_ALLOTTED" ? "REFUNDED" : "SUBMITTED";
    setTransactions((prev) => {
      const matchIndex = prev.findIndex((t) => t.id === applicationId || (t as any).applicationNumber?.includes(applicationId));
      if (matchIndex >= 0) {
        const copy = [...prev];
        copy[matchIndex] = { ...copy[matchIndex], status: txnStatus };
        return copy;
      }
      return prev;
    });

    fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: applicationId, status: txnStatus }),
    }).catch(() => {});

    // 3. Record Activity Notification
    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "ALLOTMENT_DECLARED",
      title: `${targetAppName}'s application for ${targetIpoName} marked as ${allotmentStatus}`,
      subtitle: `Allotment Status updated by Admin`,
      timestamp: "Just now",
      memberName: targetAppName,
      memberAvatar: "/oggy.png",
      ipoId,
      ipoName: targetIpoName,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const createApplication = (
    ipoId: string,
    type: ParticipationType | ApplicationType,
    participantContributions: { memberId: string; contribution: number }[],
    proofUrl?: string,
    applicantMemberId?: string,
    applicantNameInput?: string,
    panNumbersInput?: string[]
  ) => {
    const isSuperAdminUser =
      (currentUser?.role === "SUPER_ADMIN" || currentUser?.username === "ankitgod") &&
      !applicantMemberId &&
      !applicantNameInput;
    if (isSuperAdminUser) {
      console.warn("Blocked IPO application attempt: Super Admin (ankitgod) cannot submit personal IPO applications without specifying member.");
      return "";
    }

    const canonicalType: ApplicationType =
      type === "SOLO" || type === "INDIVIDUAL" ? "INDIVIDUAL" : "COMBINED";

    const targetIpo = ipos.find((i) => i.id === ipoId);

    // Validate PAN card uniqueness against current IPO application list
    if (targetIpo && targetIpo.applications && panNumbersInput && panNumbersInput.length > 0) {
      const existingIpoPans = new Set<string>();
      targetIpo.applications.forEach((app) => {
        if (app.panMasked) existingIpoPans.add(app.panMasked.trim().toUpperCase());
        if (Array.isArray(app.panNumbers)) {
          app.panNumbers.forEach((p) => p && existingIpoPans.add(p.trim().toUpperCase()));
        }
        if (Array.isArray(app.participants)) {
          app.participants.forEach((p) => {
            if (p.panMasked) existingIpoPans.add(p.panMasked.trim().toUpperCase());
            if (p.panFull) existingIpoPans.add(p.panFull.trim().toUpperCase());
          });
        }
      });

      const duplicatePan = panNumbersInput.find((p) => p && existingIpoPans.has(p.trim().toUpperCase()));
      if (duplicatePan) {
        console.warn(`Blocked creation of duplicate application: PAN card "${duplicatePan}" has already been used for IPO "${targetIpo.name}".`);
        return "";
      }
    }

    const total = participantContributions.reduce((sum, p) => sum + p.contribution, 0);

    const applicantMember =
      (applicantMemberId ? members.find((m) => m.id === applicantMemberId) : null) ||
      (currentUser ? members.find((m) => m.id === currentUser.id || m.username?.toLowerCase() === currentUser.username?.toLowerCase()) : null) ||
      (currentUser ? { id: currentUser.id, name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar, panMasked: (currentUser as any).panMasked } : null) ||
      members[0];

    const rawApplicantName = applicantNameInput?.trim() || applicantMember?.username || applicantMember?.name || "user";
    const finalApplicantName = formatApplicantNames(rawApplicantName);
    const primaryPan = (panNumbersInput && panNumbersInput[0]?.trim())
      ? panNumbersInput[0].trim()
      : applicantMember?.panMasked || "ABCDE2741D";

    const formattedParticipants = participantContributions.map((p, idx) => {
      const member = members.find((m) => m.id === p.memberId);
      const percentage = total > 0 ? (p.contribution / total) * 100 : 0;
      const panForParticipant = (panNumbersInput && panNumbersInput[idx]?.trim())
        ? panNumbersInput[idx].trim()
        : member?.panMasked || primaryPan;
      const pName = (p as any).memberName || member?.name || member?.username || "Member";

      return {
        memberId: p.memberId,
        memberName: pName,
        avatar: member?.avatar || "/oggy.png",
        contribution: p.contribution,
        percentage: Number(percentage.toFixed(1)),
        panMasked: panForParticipant,
        panFull: panForParticipant,
        proofUrl: proofUrl,
        proofUploadedAt: proofUrl ? "Just now" : undefined,
        status: "SUBMITTED" as const,
      };
    });

    const newAppId = `app_${Date.now()}`;
    const appNumber = `NEXO-APP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newApplication: Application = {
      id: newAppId,
      ipoId,
      type: canonicalType,
      applicantName: finalApplicantName,
      memberId: applicantMember?.id || "mem_1",
      panMasked: primaryPan,
      panNumbers: panNumbersInput && panNumbersInput.length > 0 ? panNumbersInput : [primaryPan],
      totalContribution: total,
      lotCount: Math.max(1, panNumbersInput?.length || participantContributions.length),
      verified: true,
      allotmentStatus: "AWAITING",
      status: "AWAITING",
      createdAt: new Date().toISOString(),
      applicationNumber: appNumber,
      applicationProofUrl: proofUrl,
      participants: formattedParticipants,
    };

    setIpos((prev) =>
      prev.map((ipo) => {
        if (ipo.id === ipoId) {
          const updatedApps = [newApplication, ...ipo.applications];
          const totalCombined = updatedApps.reduce(
            (sum, a) => sum + a.totalContribution,
            0
          );
          const uniqueParticipants = new Set(
            updatedApps.flatMap((a) =>
              (a.participants || []).map((p: { memberId: string }) => p.memberId)
            )
          ).size;

          return {
            ...ipo,
            applications: updatedApps,
            combinedCapital: totalCombined,
            participantsCount: uniqueParticipants,
            status: ipo.status === "WATCHLIST" ? "APPLYING" : ipo.status,
          };
        }
        return ipo;
      })
    );

    // Persist new application to local storage & shared IPO store so 2-sec polling cycle keeps it
    try {
      const storedApps = JSON.parse(localStorage.getItem("nexo_local_applications") || "{}");
      const existing = storedApps[ipoId] || [];
      storedApps[ipoId] = [newApplication, ...existing.filter((a: any) => a.id !== newApplication.id)];
      localStorage.setItem("nexo_local_applications", JSON.stringify(storedApps));
    } catch (e) {}

    fetch("/api/ipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addApplication", ipoId, application: newApplication }),
    }).catch(() => {});

    // Sync application response to MongoDB
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_allotment");
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newApplication.id,
        ipoId: newApplication.ipoId,
        ipoName: targetIpo?.name || "IPO",
        fundingStructure: canonicalType === "COMBINED" ? "MULTI_FRIEND" : "SOLO",
        applicantName: newApplication.applicantName,
        memberId: newApplication.memberId,
        numberOfPanCards: newApplication.lotCount,
        panNumbers: newApplication.panNumbers,
        totalContribution: newApplication.totalContribution,
        contributors: (newApplication.participants || []).map((p) => ({
          memberId: p.memberId,
          memberName: p.memberName,
          amount: p.contribution,
          percentage: p.percentage,
        })),
        allotmentStatus: newApplication.allotmentStatus,
        status: newApplication.status,
      }),
    }).catch((err) => console.error("Failed to sync application to MongoDB:", err));

    // Dismiss missing proof action if proof was uploaded
    if (proofUrl) {
      setActionItems((prev) =>
        prev.filter((a) => a.ipoId !== ipoId || a.type !== "PROOF_MISSING")
      );
    }

    // Record transaction. Ledger keeps its own SOLO/COMBO vocabulary, so map
    // from the canonical INDIVIDUAL/COMBINED type used by applications.
    const newTransaction: Transaction = {
      id: `txn_${Date.now()}`,
      ipoId,
      ipoName: activeApplicationIpo?.name || "IPO",
      type: canonicalType === "INDIVIDUAL" ? "SOLO" : "COMBO",
      amount: total,
      applicationNumber: appNumber,
      participants:
        canonicalType === "INDIVIDUAL"
          ? [applicantMember?.name || members[0].name]
          : formattedParticipants.map((p) => p.memberName),
      memberId: applicantMember?.id || currentUser?.id,
      createdAt: new Date().toISOString(),
      status: "SUBMITTED",
    };
    setTransactions((prev) => [newTransaction, ...prev]);

    // Sync transaction to MongoDB
    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTransaction),
    }).catch((err) => console.error("Failed to sync transaction to MongoDB:", err));

    // Deduct applied amount from individual savings (only for solo applications)
    if (canonicalType === "INDIVIDUAL") {
      setIndividualSavings((prev) => Math.max(0, prev - total));
      // Also record as a userContribution for the IPO
      setUserContributions((prev) => ({
        ...prev,
        [ipoId]: (prev[ipoId] ?? 0) + total,
      }));
    }

    // Record activity
    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "APPLICATION_SUBMITTED",
      title: `${applicantMember?.name || "Member"} filed ${newApplication.lotCount} IPO Application(s)`,
      subtitle: `Combined ₹${total.toLocaleString("en-IN")} for ${
        targetIpo?.name || activeApplicationIpo?.name || "IPO"
      }`,
      timestamp: "Just now",
      memberName: applicantMember?.name || "Member",
      memberAvatar: applicantMember?.avatar || members[0].avatar,
      ipoId,
      ipoName: targetIpo?.name || activeApplicationIpo?.name,
    };

    setActivities((prev) => [newActivity, ...prev]);
    closeApplicationModal();
    setActiveTab("applications");
  };

  const [listedIpos, setListedIpos] = useState<import("@/types/nexo").ListedIPO[]>([]);

  const addListedIpo = (ipoData: Omit<import("@/types/nexo").ListedIPO, "id">) => {
    const newListedItem = {
      ...ipoData,
      id: `l_${Date.now()}`,
    };
    setListedIpos((prev) => {
      const updated = [newListedItem, ...prev];
      try {
        const customOnly = updated.filter((item) => item.id.startsWith("l_"));
        localStorage.setItem("nexo_custom_listed_ipos", JSON.stringify(customOnly));
      } catch {}
      return updated;
    });
  };

  const deleteListedIpo = (id: string, name?: string) => {
    const cleanId = id.replace(/^pub_/, "");
    const nameLower = name?.toLowerCase().trim();
    setListedIpos((prev) => {
      const updated = prev.filter((item) => {
        const itemCleanId = item.id.replace(/^pub_/, "");
        const matchId =
          item.id === id ||
          item.id === cleanId ||
          itemCleanId === cleanId ||
          `pub_${itemCleanId}` === id;
        const matchName = nameLower && item.name?.toLowerCase().trim() === nameLower;
        return !matchId && !matchName;
      });
      try {
        const customOnly = updated.filter((item) => item.id.startsWith("l_"));
        localStorage.setItem("nexo_custom_listed_ipos", JSON.stringify(customOnly));
        localStorage.setItem("nexo_listed_ipos_db", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteApplication = (ipoId: string, applicationId: string) => {
    setIpos((prev) =>
      prev.map((ipo) => {
        if (ipo.id === ipoId) {
          const updatedApps = ipo.applications.filter((a) => a.id !== applicationId);
          const totalCombined = updatedApps.reduce(
            (sum, a) => sum + a.totalContribution,
            0
          );
          return {
            ...ipo,
            applications: updatedApps,
            combinedCapital: totalCombined,
          };
        }
        return ipo;
      })
    );

    // Sync deletion to MongoDB
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_allotment");
    fetch(`/api/applications?id=${encodeURIComponent(applicationId)}`, {
      method: "DELETE",
    }).catch((err) => console.error("Failed to delete application from MongoDB:", err));
  };

  const updateApplication = (
    ipoId: string,
    applicationId: string,
    data: {
      applicantName?: string;
      lotCount?: number;
      panMasked?: string;
      panNumbers?: string[];
      totalContribution?: number;
      allotmentStatus?: import("@/types/nexo").AllotmentStatus;
      status?: import("@/types/nexo").AllotmentStatus;
      participants?: import("@/types/nexo").ApplicationParticipant[];
    }
  ) => {
    setIpos((prev) =>
      prev.map((ipo) => {
        if (ipo.id === ipoId) {
          const minInvest = ipo.metrics?.minInvestment || 14964;

          const updatedApps = ipo.applications.map((app) => {
            if (app.id === applicationId) {
              const newLotCount = data.lotCount !== undefined ? data.lotCount : (app.lotCount || 1);
              const newContribution =
                data.totalContribution !== undefined
                  ? data.totalContribution
                  : minInvest * newLotCount;

              let updatedParticipants = data.participants || app.participants;
              if (data.applicantName && updatedParticipants && updatedParticipants.length > 0) {
                updatedParticipants = updatedParticipants.map((p, idx) =>
                  idx === 0 ? { ...p, memberName: data.applicantName!, contribution: newContribution } : p
                );
              }

              return {
                ...app,
                ...data,
                applicantName: data.applicantName ?? app.applicantName,
                lotCount: newLotCount,
                totalContribution: newContribution,
                panMasked: data.panMasked ?? app.panMasked,
                panNumbers: data.panNumbers ?? app.panNumbers,
                participants: updatedParticipants,
              };
            }
            return app;
          });

          const totalCombined = updatedApps.reduce(
            (sum, a) => sum + a.totalContribution,
            0
          );
          return {
            ...ipo,
            applications: updatedApps,
            combinedCapital: totalCombined,
          };
        }
        return ipo;
      })
    );

    // Sync update to MongoDB
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("admin_allotment");
    fetch("/api/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: applicationId,
        ...data,
        numberOfPanCards: data.lotCount,
      }),
    }).catch((err) => console.error("Failed to sync application update to MongoDB:", err));
  };

  const updateRegistrarUrl = (ipoId: string, url: string) => {
    const cleanUrl = url.trim();
    setIpos((prev) => {
      const updated = prev.map((ipo) =>
        ipo.id === ipoId || ipo.name.toLowerCase() === ipoId.toLowerCase()
          ? { ...ipo, registrarUrl: cleanUrl }
          : ipo
      );
      try {
        localStorage.setItem("nexo_cached_ipos", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch("/api/ipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateRegistrarUrl",
        ipoId,
        registrarUrl: cleanUrl,
      }),
    }).catch((err) => console.error("Failed to sync registrar URL to API:", err));
  };

  const createIPO = (data: {
    name: string;
    minInvestment: number;
    issueSize: number;
    description: string;
    closeDate: string;
  }) => {
    const cleanName = (data.name || "").trim();
    if (!cleanName) {
      return { success: false, message: "Please provide a valid IPO name." };
    }

    const normName = cleanName.replace(/\s+/g, " ").toLowerCase();
    const isDuplicate = ipos.some(
      (item) =>
        !item.isHidden &&
        !item.isArchived &&
        item.name &&
        item.name.trim().replace(/\s+/g, " ").toLowerCase() === normName
    );

    if (isDuplicate) {
      return {
        success: false,
        message: `An active IPO named "${cleanName}" already exists. IPO names must be unique.`,
      };
    }

    const adminName = currentUser?.name || members[0]?.name || "Shivam Prasad";
    const formattedIssueSize = `₹${Number(data.issueSize).toLocaleString("en-IN")} Cr`;

    const newIpo: IPOOpportunity = {
      id: `ipo_${Date.now()}`,
      name: data.name,
      company: data.name, // Direct company name without invented legal suffixes
      logo: data.name.substring(0, 2).toUpperCase(),
      category: "Mainboard",
      status: "APPLICATION_OPEN",
      recommendation: "APPLY",
      thesis: data.description,
      isHidden: false,
      metrics: {
        issueSize: formattedIssueSize,
        priceBand: { min: 0, max: 0 },
        lotSize: 1,
        minInvestment: Number(data.minInvestment) || 15000,
        openDate: "Open",
        closeDate: data.closeDate || "28 Aug 2026",
        allotmentDate: "—",
        listingDate: "—",
      },
      createdBy: adminName,
      participantsCount: 0,
      combinedCapital: 0,
      applications: [],
    };

    setIpos((prev) => [newIpo, ...prev]);

    // Persist new IPO to shared_ipos.json on disk via API
    try {
      fetch("/api/ipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          minInvestment: data.minInvestment,
          issueSize: data.issueSize,
          description: data.description,
          closeDate: data.closeDate,
          createdBy: adminName,
        }),
      }).then(() => refreshIpos());
    } catch (e) {
      console.warn("Failed to POST /api/ipos in createIPO:", e);
    }

    try {
      const stored = localStorage.getItem("nexo_local_admin_ipos") || "[]";
      const parsed = JSON.parse(stored);
      localStorage.setItem("nexo_local_admin_ipos", JSON.stringify([newIpo, ...parsed]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "IPO_ADDED",
      title: `${adminName} added ${data.name}`,
      subtitle: `Closes on ${data.closeDate} • Min. Investment ₹${Number(data.minInvestment).toLocaleString("en-IN")}`,
      timestamp: "Today",
      memberName: adminName,
      memberAvatar: currentUser?.avatar || members[0]?.avatar,
      ipoId: newIpo.id,
      ipoName: data.name,
    };

    setActivities((prev) => [newActivity, ...prev]);

    return { success: true, message: `✓ IPO published successfully. ${data.name} is now visible on the user website.` };
  };

  const removeIPO = (ipoId: string) => {
    const targetIpo = ipos.find((i) => i.id === ipoId || i.id === ipoId.replace(/^pub_/, "") || `pub_${i.id}` === ipoId);
    const ipoName = targetIpo?.name || ipoId;
    const cleanId = ipoId.replace(/^pub_/, "");

    // 1. Remove permanently from IPO state
    setIpos((prev) =>
      prev.filter(
        (ipo) =>
          ipo.id !== ipoId &&
          ipo.id !== cleanId &&
          `pub_${ipo.id}` !== ipoId &&
          ipo.name?.toLowerCase() !== ipoName.toLowerCase()
      )
    );

    // 2. Remove from Listed IPOs / Published Cards in state
    setListedIpos((prev) =>
      prev.filter(
        (item) =>
          item.id !== ipoId &&
          item.id !== cleanId &&
          `pub_${item.id}` !== ipoId &&
          item.name?.toLowerCase() !== ipoName.toLowerCase()
      )
    );

    // 3. Remove associated transactions and activities
    setTransactions((prev) =>
      prev.filter(
        (t) =>
          t.ipoId !== ipoId &&
          t.ipoId !== cleanId &&
          t.ipoName?.toLowerCase() !== ipoName.toLowerCase()
      )
    );

    setActivities((prev) =>
      prev.filter(
        (a) =>
          a.ipoId !== ipoId &&
          a.ipoId !== cleanId &&
          !a.title?.toLowerCase().includes(ipoName.toLowerCase())
      )
    );

    // 4. Invalidate data caches
    nexoDataCache.invalidate("ipos_apps");
    AdminDataCache.invalidate("admin_ipos");
    AdminDataCache.invalidate("admin_dashboard_summary");

    // 5. Clean local storage for instant sync across tabs and reloads
    try {
      const filterOutDeleted = (items: any[]) =>
        items.filter(
          (item: any) =>
            item.id !== ipoId &&
            item.id !== cleanId &&
            `pub_${item.id}` !== ipoId &&
            item.name?.toLowerCase() !== ipoName.toLowerCase() &&
            item.ipoName?.toLowerCase() !== ipoName.toLowerCase()
        );

      [
        "nexo_cached_ipos",
        "nexo_local_admin_ipos",
        "nexo_listed_ipos_db",
        "nexo_custom_listed_ipos",
        "nexo_transactions",
        "nexo_distribute_drafts",
      ].forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localStorage.setItem(key, JSON.stringify(filterOutDeleted(parsed)));
            }
          }
        } catch {}
      });

      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    // 6. Call API endpoint to cascade delete permanently from MongoDB
    try {
      fetch(`/api/ipos?id=${encodeURIComponent(ipoId)}`, {
        method: "DELETE",
      }).then(() => refreshIpos(true));
    } catch (e) {
      console.warn("Failed to DELETE /api/ipos in removeIPO:", e);
    }

    const adminName = currentUser?.name || members[0]?.name || "Shivam Prasad";
    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "IPO_ADDED",
      title: `${adminName} deleted ${ipoName}`,
      subtitle: `IPO permanently deleted from database and user website`,
      timestamp: "Today",
      memberName: adminName,
      memberAvatar: currentUser?.avatar || members[0]?.avatar,
      ipoId: ipoId,
      ipoName: ipoName,
    };

    setActivities((prev) => [newActivity, ...prev]);

    return {
      success: true,
      message: `✓ IPO "${ipoName}" and all associated data permanently deleted from database and user website.`,
    };
  };

  const openDirectChatWithUser = useCallback(async (targetMemberId: string) => {
    try {
      const activeId = currentUser?.id || "mem_1";
      if (targetMemberId === activeId) {
        setActiveTab("messages");
        return;
      }

      setActiveConversationId(targetMemberId);
      setActiveTab("messages");

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMemberId: activeId, targetMemberId, type: "DIRECT" }),
      });
      const data = await res.json();
      if (data?.success && data.conversation) {
        setActiveConversationId(data.conversation.id);
      }
    } catch (err) {
      console.error("Failed to open direct chat:", err);
      setActiveTab("messages");
    }
  }, [currentUser, setActiveConversationId, setActiveTab]);

  const openIpoGroupChat = useCallback(async (ipoId: string, ipoTitle?: string) => {
    try {
      const activeId = currentUser?.id || "mem_1";
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMemberId: activeId, ipoId, title: ipoTitle || "IPO Chat", type: "IPO" }),
      });
      const data = await res.json();
      if (data?.success && data.conversation) {
        setActiveConversationId(data.conversation.id);
      } else {
        setActiveConversationId(`conv_ipo_${ipoId}`);
      }
      setActiveTab("messages");
    } catch (err) {
      console.error("Failed to open IPO group chat:", err);
      setActiveTab("messages");
    }
  }, [currentUser, setActiveConversationId, setActiveTab]);

  const deleteTransaction = useCallback((txnId: string) => {
    const txn = transactions.find((t) => t.id === txnId);
    if (!txn) return;
    // Reverse balance deduction for SOLO
    if (txn.type === "SOLO") {
      setIndividualSavings((prev) => prev + txn.amount);
      setUserContributions((prev) => {
        const updated = { ...prev };
        const existing = updated[txn.ipoId] ?? 0;
        updated[txn.ipoId] = Math.max(0, existing - txn.amount);
        return updated;
      });
    }
    setTransactions((prev) => prev.filter((t) => t.id !== txnId));
  }, [transactions]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const updateTransaction = useCallback((_txnId: string, _data: any) => {}, []);
  const addApplicationToIpo = useCallback((_ipoId: any, _appData: any) => {}, []);

  const contextValue = useMemo<NexoContextType>(() => ({
    isAuthenticated,
    isAuthLoaded,
    currentUser,
    currentMember: currentUser || members[0],
    login,
    logout,
    authError,
    setAuthError,
    activeTab,
    setActiveTab,
    currentUserRole,
    setCurrentUserRole,
    ipos,
    setIpos,
    members,
    activities,
    actionItems,
    dismissActionItem,
    notifications,
    sendBroadcastNotification,
    refreshNotifications,
    deleteNotification,
    markAllNotificationsRead,
    portfolioSummary,
    individualSavings,
    updateIndividualSavings,
    userContributions,
    updateUserContribution,
    transactions,
    clearTransactions,
    deleteTransaction,
    updateTransaction,
    selectedIpo,
    openIpoDetail,
    closeIpoDetail,
    isApplicationModalOpen,
    activeApplicationIpo,
    applicationModalIpo: activeApplicationIpo,
    openApplicationModal,
    closeApplicationModal,
    isAddIpoModalOpen,
    openAddIpoModal,
    closeAddIpoModal,
    addNewIpo,
    searchQuery,
    setSearchQuery,
    revealedPans,
    togglePanReveal,
    createApplication,
    addApplicationToIpo,
    updateIpoStatus,
    updateIpo,
    updateApplicationStatus,
    updateRegistrarUrl,
    updateApplication,
    deleteApplication,
    listedIpos,
    addListedIpo,
    deleteListedIpo,
    createIPO,
    removeIPO,
    refreshIpos,
    isLoading,
    isPremiumUser,
    activePlan,
    isPremiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    activatePremiumPlan,
    updateCurrentUser,
    addMember,
    updateMember,
    deleteMember,
    unreadMessageCount,
    setUnreadMessageCount,
    markConversationAsRead,
    refreshUnreadMessageCount,
    activeConversationId,
    setActiveConversationId,
    openDirectChatWithUser,
    openIpoGroupChat,
    isSidebarCollapsed,
    toggleSidebar,
    isUserLogoutModalOpen,
    openUserLogoutModal,
    closeUserLogoutModal,
  }), [
    isAuthenticated,
    isAuthLoaded,
    currentUser,
    members,
    login,
    logout,
    authError,
    activeTab,
    setActiveTab,
    currentUserRole,
    ipos,
    activities,
    actionItems,
    dismissActionItem,
    notifications,
    sendBroadcastNotification,
    refreshNotifications,
    deleteNotification,
    markAllNotificationsRead,
    portfolioSummary,
    individualSavings,
    updateIndividualSavings,
    userContributions,
    updateUserContribution,
    transactions,
    clearTransactions,
    deleteTransaction,
    updateTransaction,
    selectedIpo,
    openIpoDetail,
    closeIpoDetail,
    isApplicationModalOpen,
    activeApplicationIpo,
    openApplicationModal,
    closeApplicationModal,
    isAddIpoModalOpen,
    openAddIpoModal,
    closeAddIpoModal,
    addNewIpo,
    searchQuery,
    revealedPans,
    togglePanReveal,
    createApplication,
    addApplicationToIpo,
    updateIpoStatus,
    updateIpo,
    updateApplicationStatus,
    updateRegistrarUrl,
    updateApplication,
    deleteApplication,
    listedIpos,
    addListedIpo,
    deleteListedIpo,
    createIPO,
    removeIPO,
    refreshIpos,
    isLoading,
    isPremiumUser,
    activePlan,
    isPremiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    activatePremiumPlan,
    updateCurrentUser,
    addMember,
    updateMember,
    deleteMember,
    unreadMessageCount,
    markConversationAsRead,
    refreshUnreadMessageCount,
    activeConversationId,
    setActiveConversationId,
    openDirectChatWithUser,
    openIpoGroupChat,
    isSidebarCollapsed,
    toggleSidebar,
    isUserLogoutModalOpen,
  ]);

  return (
    <NexoContext.Provider value={contextValue}>
      {children}
      <UserLogoutModal isOpen={isUserLogoutModalOpen} onClose={closeUserLogoutModal} />
      <LoginSuccessModal isOpen={isLoginSuccessOpen} onClose={() => setIsLoginSuccessOpen(false)} user={currentUser} />
    </NexoContext.Provider>
  );
}

export function useNexo() {
  const context = useContext(NexoContext);
  if (!context) {
    throw new Error("useNexo must be used within a NexoProvider");
  }
  return context;
}
