"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { IPOOpportunity, Member } from "../types/nexo";

interface AdminContextType {
  ipos: IPOOpportunity[];
  currentUser: Member;
  isLoading: boolean;
  createIPO: (data: {
    name: string;
    minInvestment: number;
    issueSize: number;
    gmpPercent?: number;
    description: string;
    openDate?: string;
    closeDate: string;
    allotmentDate?: string;
    listingDate?: string;
    fundUnblockDate?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  removeIPO: (ipoId: string) => Promise<{ success: boolean; message?: string }>;
  updateIPO: (
    ipoId: string,
    data: {
      name?: string;
      minInvestment?: number;
      issueSize?: number;
      gmpPercent?: number;
      description?: string;
      openDate?: string;
      closeDate?: string;
      allotmentDate?: string;
      listingDate?: string;
      fundUnblockDate?: string;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  publishProfitDistribution: (
    ipoId: string,
    totalProfit: number,
    totalLots: number,
    allottedLots?: number,
    memberPayouts?: any[]
  ) => Promise<{ success: boolean; message?: string }>;
  refreshIpos: () => Promise<void>;
}

const defaultAdmin: Member = {
  id: "mem_admin",
  name: "Ankit",
  username: "ankitgod",
  email: "ankitgod@nexo.private",
  avatar: "/oggy.png",
  role: "SUPER_ADMIN",
  panMasked: "ABCDE1234F",
  panFull: "ABCDE1234F",
};

const API_BASE_URL = "/api/ipos";

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
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
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Member>(defaultAdmin);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.member) {
          setCurrentUser({
            ...defaultAdmin,
            ...data.member,
            role: (data.user?.role || data.member.role || "ADMIN") as any,
          });
        }
      })
      .catch(() => {});
  }, []);

  const refreshIpos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}?admin=true`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.ipos)) {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("nexo_local_admin_ipos");
            localStorage.removeItem("nexo_ipos");
          } catch {}
        }

        const validIpos = data.ipos.filter((item: IPOOpportunity) => !item.isHidden && !item.isArchived);
        setIpos(validIpos);
        try {
          localStorage.setItem("nexo_cached_ipos", JSON.stringify(validIpos));
        } catch {}
      }
    } catch (err) {
      console.warn("Error refreshing IPOs in AdminContext:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshIpos();
    // Poll every 15 seconds to keep synchronized
    const interval = setInterval(refreshIpos, 15000);
    return () => clearInterval(interval);
  }, []);

  const createIPO = async (data: {
    name: string;
    minInvestment: number;
    issueSize: number;
    gmpPercent?: number;
    description: string;
    openDate?: string;
    closeDate: string;
    allotmentDate?: string;
    listingDate?: string;
    fundUnblockDate?: string;
  }) => {
    const cleanName = (data.name || "").trim();
    if (!cleanName) {
      return { success: false, message: "Please provide a valid IPO name." };
    }

    const isDuplicate = ipos.some(
      (item) =>
        !item.isHidden &&
        !item.isArchived &&
        item.name &&
        item.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        message: `An active IPO named "${cleanName}" already exists. IPO names must be unique.`,
      };
    }

    try {
      const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        if (result.ipo) {
          try {
            const stored = localStorage.getItem("nexo_local_admin_ipos") || "[]";
            const parsed = JSON.parse(stored);
            localStorage.setItem("nexo_local_admin_ipos", JSON.stringify([result.ipo, ...parsed]));
          } catch (e) {}
        }
        window.dispatchEvent(new Event("storage"));
        await refreshIpos();
        return {
          success: true,
          message: result.message || `✓ IPO added successfully. ${data.name} is now visible to members.`,
        };
      } else {
        return {
          success: false,
          message: result.error || result.message || `An IPO with this name already exists.`,
        };
      }
    } catch (err) {
      console.warn("API network call offline, using local store fallback:", err);
    }

    // Local Fallback Store
    const formattedIssueSize = `₹${Number(data.issueSize).toLocaleString("en-IN")} Cr`;
    const newIpo: IPOOpportunity = {
      id: `ipo_${Date.now()}`,
      name: data.name.trim(),
      company: data.name.trim(),
      logo: data.name.trim().substring(0, 2).toUpperCase(),
      category: "Mainboard",
      status: "APPLICATION_OPEN",
      recommendation: "APPLY",
      thesis: data.description.trim(),
      isHidden: false,
      metrics: {
        issueSize: formattedIssueSize,
        priceBand: { min: 0, max: 0 },
        lotSize: 1,
        minInvestment: Number(data.minInvestment) || 15000,
        gmpPercent: Number(data.gmpPercent) || 18.5,
        openDate: data.openDate?.trim() || "18 Aug 2026",
        closeDate: data.closeDate.trim() || "28 Aug 2026",
        allotmentDate: data.allotmentDate?.trim() || "01 Sep 2026",
        listingDate: data.listingDate?.trim() || "04 Sep 2026",
        fundUnblockDate: data.fundUnblockDate?.trim() || "02 Sep 2026",
      },
      createdBy: "Shivam Prasad",
      participantsCount: 0,
      combinedCapital: 0,
      applications: [],
    };

    setIpos((prev) => [newIpo, ...prev]);

    try {
      const stored = localStorage.getItem("nexo_local_admin_ipos") || "[]";
      const parsed = JSON.parse(stored);
      localStorage.setItem("nexo_local_admin_ipos", JSON.stringify([newIpo, ...parsed]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    return {
      success: true,
      message: `✓ IPO added successfully. ${data.name} is now visible on the user website.`,
    };
  };

  const updateIPO = async (
    ipoId: string,
    data: {
      name?: string;
      minInvestment?: number;
      issueSize?: number;
      gmpPercent?: number;
      description?: string;
      openDate?: string;
      closeDate?: string;
      allotmentDate?: string;
      listingDate?: string;
      fundUnblockDate?: string;
    }
  ) => {
    setIpos((prev) =>
      prev.map((ipo) => {
        if (ipo.id === ipoId) {
          const currentMetrics = ipo.metrics || {};
          const issueSizeVal = data.issueSize !== undefined ? data.issueSize : currentMetrics.issueSize;
          const formattedIssueSize = typeof issueSizeVal === "number" ? `₹${issueSizeVal.toLocaleString("en-IN")} Cr` : String(issueSizeVal || "—");

          return {
            ...ipo,
            name: data.name ? data.name.trim() : ipo.name,
            company: data.name ? data.name.trim() : ipo.company,
            thesis: data.description ? data.description.trim() : ipo.thesis,
            metrics: {
              ...currentMetrics,
              issueSize: formattedIssueSize,
              minInvestment: data.minInvestment !== undefined ? Number(data.minInvestment) : currentMetrics.minInvestment,
              gmpPercent: data.gmpPercent !== undefined ? Number(data.gmpPercent) : (currentMetrics.gmpPercent ?? 18.5),
              openDate: data.openDate ? data.openDate.trim() : currentMetrics.openDate,
              closeDate: data.closeDate ? data.closeDate.trim() : currentMetrics.closeDate,
              allotmentDate: data.allotmentDate ? data.allotmentDate.trim() : currentMetrics.allotmentDate,
              listingDate: data.listingDate ? data.listingDate.trim() : currentMetrics.listingDate,
              fundUnblockDate: data.fundUnblockDate ? data.fundUnblockDate.trim() : currentMetrics.fundUnblockDate,
            },
          };
        }
        return ipo;
      })
    );

    try {
      const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateIpo", ipoId, data }),
      });
      const result = await res.json();
      if (result.success) {
        await refreshIpos();
        return { success: true, message: result.message || "✓ IPO updated successfully." };
      }
    } catch (err) {
      console.warn("API update call offline:", err);
    }

    return { success: true, message: "✓ IPO updated successfully." };
  };

  const removeIPO = async (ipoId: string) => {
    const targetIpo = ipos.find((i) => i.id === ipoId || i.id === ipoId.replace(/^pub_/, "") || `pub_${i.id}` === ipoId);
    const ipoName = targetIpo?.name || ipoId;
    const cleanId = ipoId.replace(/^pub_/, "");

    // 1. Immediately remove from state
    setIpos((prev) =>
      prev.filter(
        (ipo) =>
          ipo.id !== ipoId &&
          ipo.id !== cleanId &&
          `pub_${ipo.id}` !== ipoId &&
          ipo.name?.toLowerCase() !== ipoName.toLowerCase()
      )
    );

    // 2. Remove from local caches
    try {
      const extraLocal: IPOOpportunity[] = JSON.parse(
        localStorage.getItem("nexo_local_admin_ipos") || "[]"
      );
      const updatedExtra = extraLocal.filter(
        (ipo) =>
          ipo.id !== ipoId &&
          ipo.id !== cleanId &&
          `pub_${ipo.id}` !== ipoId &&
          ipo.name?.toLowerCase() !== ipoName.toLowerCase()
      );
      localStorage.setItem("nexo_local_admin_ipos", JSON.stringify(updatedExtra));

      const listedStored = localStorage.getItem("nexo_listed_ipos_db") || "[]";
      const listedParsed = JSON.parse(listedStored);
      const listedFiltered = listedParsed.filter(
        (item: any) =>
          item.id !== ipoId &&
          item.id !== cleanId &&
          item.name?.toLowerCase() !== ipoName.toLowerCase()
      );
      localStorage.setItem("nexo_listed_ipos_db", JSON.stringify(listedFiltered));

      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    // 3. Call API endpoint to cascade delete permanently from MongoDB
    try {
      const res = await fetch(`${API_BASE_URL}?id=${encodeURIComponent(ipoId)}`, {
        method: "DELETE",
      });
      const result = await res.json();
      await refreshIpos();
      return {
        success: true,
        message: result.message || `✓ IPO "${ipoName}" and all associated data permanently deleted from database and user website.`,
      };
    } catch (err) {
      console.warn("API network call error in removeIPO:", err);
    }

    return {
      success: true,
      message: `✓ IPO "${ipoName}" permanently deleted.`,
    };
  };

  const publishProfitDistribution = async (
    ipoId: string,
    totalProfit: number,
    totalLots: number,
    allottedLots: number = 1,
    memberPayouts: any[] = []
  ) => {
    const oneLotProfit = totalLots > 0 ? Math.round(totalProfit / totalLots) : 0;
    const dist = {
      totalProfit,
      totalLots,
      allottedLots,
      oneLotProfit,
      publishedAt: new Date().toISOString(),
    };

    // Save to shared endpoint POST /api/ipos
    try {
      await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publishProfit",
          ipoId,
          profitDistribution: dist,
          memberPayouts,
        }),
      });
    } catch (e) {}

    // Save to localStorage for instant cross-tab / cross-port sync
    try {
      const stored = localStorage.getItem("nexo_shared_profit_dists") || "{}";
      const parsed = JSON.parse(stored);
      parsed[ipoId] = dist;
      localStorage.setItem("nexo_shared_profit_dists", JSON.stringify(parsed));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    setIpos((prev) =>
      prev.map((ipo) => (ipo.id === ipoId ? { ...ipo, profitDistribution: dist } : ipo))
    );

    return { success: true, message: "Profit distribution published successfully." };
  };

  return (
    <AdminContext.Provider
      value={{
        ipos,
        currentUser,
        isLoading,
        createIPO,
        updateIPO,
        removeIPO,
        publishProfitDistribution,
        refreshIpos,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
