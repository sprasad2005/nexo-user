"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminProvider } from "@/admin/context/AdminContext";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/admin/components/AddIPODrawer";
import {
  ArrowLeft, ShieldCheck, User, Shield, Prohibit, CheckCircle, 
  Key, Keyhole, PencilSimple, ClockCountdown, ListChecks, 
  Buildings, CurrencyInr, Info, Desktop, Phone, Copy, X, 
  ArrowClockwise, Check, Eye, EyeSlash, Trash
} from "@phosphor-icons/react";

interface MemberDetail {
  id: string;
  name: string;
  displayName: string;
  username: string;
  password?: string;
  email: string;
  avatar: string;
  phone: string;
  joinedAt: string;
  createdAt: string;
  role: string;
  status: string;
  emailVerified: boolean;
  mustChangePassword: boolean;
  isVerified: boolean;
  panMasked?: string;
}

interface PortfolioData {
  totalInvested: number;
  currentlyBlocked: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  totalAppliedIPOs?: number;
  allottedIPOs?: number;
  winRatePct?: number;
  totalLotsApplied?: number;
  totalLotsAllotted?: number;
}

interface ApplicationData {
  id: string;
  ipoId: string;
  ipoName: string;
  ipoLogo?: string;
  type?: string;
  category?: string;
  amount: number;
  lotsApplied?: number;
  lotsAllotted?: number;
  sharesCount?: number;
  gmpPercent?: number;
  profitGained?: number;
  status: string;
  allotmentStatus: string;
  panMasked?: string;
  createdAt: string;
}

interface SessionData {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface ActivityLog {
  id: string;
  eventType: string;
  category: string;
  severity: string;
  actorName?: string;
  actorUsername?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

function MemberDetailPageContent() {
  const router = useRouter();
  const { id: memberId } = useParams() as { id: string };

  // Shell states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("AUTHORIZED");

  // Data states
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab states: ipohistory, overview, edit, security, activity, applications
  const [activeSubTab, setActiveSubTab] = useState("ipohistory");

  // Edit details form state
  const [editName, setEditName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [showActivePass, setShowActivePass] = useState(false);

  // Success screen / credentials display
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; tempPass: string } | null>(null);

  // Confirmations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  } | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"SUPER_ADMIN" | "ADMIN" | "MEMBER">("ADMIN");
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTabChange = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

  // Auth check
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated && (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN")) {
          try {
            sessionStorage.setItem("nexo_admin_authenticated", "true");
          } catch {}
          setAdminStatus("AUTHORIZED");
          setCurrentUserRole(data.user?.role || data.member?.role || "ADMIN");
        } else {
          try {
            sessionStorage.removeItem("nexo_admin_authenticated");
          } catch {}
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (active) {
          try {
            sessionStorage.removeItem("nexo_admin_authenticated");
          } catch {}
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      });
    return () => { active = false; };
  }, [router]);

  // Fetch all member details
  const fetchAllData = async () => {
    if (!memberId) return;
    setIsLoading(true);
    try {
      // 1. Fetch main details, portfolio, and applications
      const res = await fetch(`/api/admin/members/${memberId}`);
      const data = await res.json();
      if (data.success) {
        setMember(data.member);
        setPortfolio(data.portfolio);
        setApplications(data.applications);
        
        // Populate edit form
        setEditName(data.member.name);
        setEditDisplayName(data.member.displayName || data.member.name);
        setEditUsername(data.member.username);
        setEditEmail(data.member.email);
        setEditPhone(data.member.phone || "");
        setEditAvatar(data.member.avatar || "");
      } else {
        showToast(data.error || "Failed to load member profile", "error");
      }

      // 2. Fetch active sessions
      const sessRes = await fetch(`/api/admin/members/${memberId}/sessions`);
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.sessions);
      }

      // 3. Fetch activity log
      const actRes = await fetch(`/api/admin/members/${memberId}/activity`);
      const actData = await actRes.json();
      if (actData.success) {
        setActivities(actData.activities);
      }
    } catch (err) {
      showToast("Unable to load administrative workspace", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminStatus !== "AUTHORIZED" || !memberId) return;

    fetchAllData();
    const interval = setInterval(() => {
      fetch(`/api/admin/members/${memberId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.member) {
            setMember(d.member);
            if (d.portfolio) setPortfolio(d.portfolio);
            if (Array.isArray(d.applications)) setApplications(d.applications);
          }
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [adminStatus, memberId]);

  // Actions
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const cleanUsername = editUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setEditError("Username must be 3–24 characters, lowercase, and contain only letters, numbers, and underscores.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          displayName: editDisplayName,
          username: cleanUsername,
          email: editEmail,
          phone: editPhone,
          avatar: editAvatar,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✓ Profile details updated successfully.");
        fetchAllData();
        setActiveSubTab("overview");
      } else {
        setEditError(data.error || "Failed to update profile details");
      }
    } catch {
      setEditError("A network error occurred while updating the profile.");
    }
  };

  const handleResetPassword = () => {
    if (!member) return;
    setConfirmModal({
      isOpen: true,
      title: "Reset Password?",
      message: `Are you sure you want to reset password for ${member.name} (@${member.username})? Their current sessions will be immediately terminated and a temporary credentials generated.`,
      actionLabel: "Reset Password",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${memberId}/reset-password`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            setConfirmModal(null);
            setCreatedCredentials({ username: member.username, tempPass: data.temporaryPassword });
            showToast("Temporary password generated!");
            fetchAllData();
          } else {
            showToast(data.error || "Failed to reset password", "error");
          }
        } catch {
          showToast("Network error occurred resetting password", "error");
        }
      }
    });
  };

  const handleToggleSuspend = () => {
    if (!member) return;
    const isSuspended = member.status === "SUSPENDED";
    const apiPath = isSuspended ? "activate" : "suspend";
    const title = isSuspended ? "Reactivate Member?" : "Suspend Member?";
    const msg = isSuspended
      ? `Reactivate account access for ${member.name} (@${member.username})? They will be allowed to log back in.`
      : `Suspend account access for ${member.name} (@${member.username})? They will be logged out of all devices and blocked from access.`;
    
    setConfirmModal({
      isOpen: true,
      title,
      message: msg,
      actionLabel: isSuspended ? "Reactivate" : "Suspend Account",
      isDangerous: !isSuspended,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${memberId}/${apiPath}`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`✓ Account ${isSuspended ? "reactivated" : "suspended"} successfully.`);
            setConfirmModal(null);
            fetchAllData();
          } else {
            showToast(data.error || `Failed to modify account status. ${data.error ? data.error : ""}`, "error");
            setConfirmModal(null);
          }
        } catch {
          showToast("Network error occurred updating status", "error");
        }
      }
    });
  };

  const handleRoleChange = (nextRole: "MEMBER" | "ADMIN" | "SUPER_ADMIN") => {
    if (!member) return;
    if (member.role === nextRole) return;

    const title = `Change role to ${nextRole}?`;
    const message = `You are updating ${member.name} (@${member.username}) from ${member.role} to ${nextRole}. This modifies their administrative permissions across NEXO.`;

    setConfirmModal({
      isOpen: true,
      title,
      message,
      actionLabel: "Confirm Role Change",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${memberId}/role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: nextRole }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`✓ Role updated successfully to ${nextRole}.`);
            setConfirmModal(null);
            fetchAllData();
          } else {
            showToast(data.error || "Failed to update role", "error");
            setConfirmModal(null);
          }
        } catch {
          showToast("Network error updating role", "error");
        }
      }
    });
  };

  const handleRevokeSessions = () => {
    setConfirmModal({
      isOpen: true,
      title: "Revoke Active Sessions?",
      message: `This will sign the member out of all active devices immediately. They must authenticate again.`,
      actionLabel: "Revoke Sessions",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${memberId}/revoke-sessions`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("✓ All sessions revoked successfully.");
            setConfirmModal(null);
            fetchAllData();
          } else {
            showToast(data.error || "Failed to revoke sessions", "error");
          }
        } catch {
          showToast("Network error revoking sessions", "error");
        }
      }
    });
  };

  const handleDeleteMemberProfile = () => {
    if (!member) return;
    if (member.role === "SUPER_ADMIN" || member.username === "ankitgod") {
      showToast("Cannot delete Super Admin profile.", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete Profile: @${member.username}?`,
      message: `Are you sure you want to permanently delete @${member.username} (${member.name})? This will remove member records, login credentials, and active sessions.`,
      actionLabel: "Delete Member",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("✓ Member profile deleted successfully.");
            setConfirmModal(null);
            router.push("/admin/members");
          } else {
            showToast(data.error || "Failed to delete profile", "error");
          }
        } catch {
          showToast("Network error deleting profile", "error");
        }
      }
    });
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (adminStatus === "LOADING") {
    return (
      <div className="min-h-screen w-full bg-[#0A0C10] flex flex-col items-center justify-center text-slate-100 font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center animate-pulse">
            <ShieldCheck size={28} weight="bold" />
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading administrative workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090A0C] text-slate-900 dark:text-[#F5F7FA] font-sans antialiased">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="members"
        setActiveTab={handleTabChange}
        onAddIpoClick={() => setIsAddIpoOpen(true)}
        onSignOutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-white dark:bg-[#101114] border-b border-slate-200 dark:border-[#252931] px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <ArrowLeft 
              onClick={() => router.push("/admin/members")}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer w-4 h-4 mr-2" 
            />
            <span className="text-xs font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
              Workspace / Members /
            </span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider">
              {member?.name || "Member Workspace"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPopover />
            <AdminNavbarProfileMenu
              activeTab="members"
              onSelectTab={handleTabChange}
              onSignOutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Toast Alert */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all border animate-in fade-in slide-in-from-top-4 duration-300 bg-white/95 border-slate-200 text-slate-900 dark:bg-[#14161A]/95 dark:border-[#252931] dark:text-white">
            <span className={toast.type === "success" ? "text-emerald-500" : "text-rose-500"}>
              {toast.type === "success" ? "✓" : "⚠️"}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Content Wrapper */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto pb-20">
          
          {isLoading || !member ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-4 animate-pulse">
              <User size={32} className="mx-auto text-slate-500" />
              <p>Loading member detail information...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* ── HEADER PROFILE BOX ── */}
              <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-6 shadow-xs select-none">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Member Profile Avatar & Main Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={member.avatar || "/oggy.png"}
                        alt={member.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 bg-slate-100 dark:bg-slate-800"
                      />
                      <span
                        className={`w-4 h-4 rounded-full ring-2 ring-white dark:ring-[#101114] absolute -bottom-0.5 -right-0.5 ${
                          member.status === "SUSPENDED" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {member.name}
                        </h1>

                        {member.role === "SUPER_ADMIN" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-extrabold uppercase">
                            SUPER ADMIN
                          </span>
                        ) : member.role === "ADMIN" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#6B93FF] border border-blue-500/30 text-[10px] font-mono font-extrabold uppercase">
                            ADMIN
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono font-bold uppercase">
                            MEMBER
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            member.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          • {member.status || "ACTIVE"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-[#858D99] pt-0.5">
                        <span className="font-mono text-blue-600 dark:text-[#6B93FF] font-bold">@{member.username}</span>
                        {member.email && <span>{member.email}</span>}
                        {member.phone && <span>{member.phone}</span>}
                        {member.panMasked && <span className="font-mono text-slate-400">PAN: {member.panMasked}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setActiveSubTab("edit")}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PencilSimple size={15} weight="bold" />
                      <span>Edit Profile</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => setShowActivePass(!showActivePass)}
                        className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-[#6B93FF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title={showActivePass ? "Hide Password" : "Reveal Member Password"}
                      >
                        {showActivePass ? <EyeSlash size={15} /> : <Eye size={15} />}
                        <span>{showActivePass ? `Pass: ${member.password || "user123"}` : "See Password"}</span>
                      </button>
                    )}

                    {/* Secondary Actions Group */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isSuperAdmin && (
                        <button
                          onClick={handleResetPassword}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#252931] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-[#AEB5C0]"
                          title="Reset Password"
                        >
                          <Key size={15} />
                          <span>Reset</span>
                        </button>
                      )}

                      <button
                        onClick={handleRevokeSessions}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#252931] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-[#AEB5C0]"
                        title="Revoke All Active Sessions"
                      >
                        <Keyhole size={15} />
                        <span>Revoke</span>
                      </button>

                      <button
                        onClick={handleToggleSuspend}
                        className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                          member.status === "SUSPENDED"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-[#32C98B]"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-[#FF6B6B]"
                        }`}
                        title={member.status === "SUSPENDED" ? "Reactivate Account" : "Suspend Account Access"}
                      >
                        <Prohibit size={15} />
                        <span>{member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}</span>
                      </button>

                      {member.role !== "SUPER_ADMIN" && member.username !== "ankitgod" && (
                        <button
                          onClick={handleDeleteMemberProfile}
                          className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Delete Member Profile"
                        >
                          <Trash size={15} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PROFILE RESET PASSWORD DISPLAY SCREEN ── */}
              {createdCredentials && (
                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-5 space-y-4 animate-in zoom-in-95 duration-300 select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✨</span>
                      <h4 className="text-xs font-extrabold text-emerald-600 dark:text-[#32C98B] uppercase">TEMPORARY PASSWORD GENERATED</h4>
                    </div>
                    <button onClick={() => setCreatedCredentials(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-mono">USERNAME</span>
                        <span className="font-bold font-mono text-[11px] text-slate-800 dark:text-slate-200">@{createdCredentials.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`@${createdCredentials.username}`, "Username")}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-mono">TEMPORARY PASSWORD</span>
                        <span className="font-bold font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all">{createdCredentials.tempPass}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(createdCredentials.tempPass, "Password")}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-[#F3B85B] rounded-xl text-[10px] leading-relaxed">
                    ⚠️ Warning: Copy this temporary credential now. It will not be shown again. The user must use it to sign in and will be forced to change it immediately upon login.
                  </div>
                </div>
              )}

              {/* ── WORKSPACE LAYOUT ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Panel: Profile Detail Summary */}
                <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-5 space-y-4 shadow-xs select-none">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] border-b border-slate-100 dark:border-slate-800 pb-2.5 uppercase tracking-wider">
                    Profile Information
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">FULL NAME</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{member.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">DISPLAY NAME</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{member.displayName || member.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">EMAIL ADDRESS</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{member.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">PHONE NUMBER</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{member.phone || <span className="italic text-slate-400 font-normal">Not provided</span>}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">PAN IDENTIFIER</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{member.panMasked || "ABCDE1234F"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-[#858D99] block font-semibold uppercase">JOIN DATE</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : member.joinedAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Worksheets */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Tab Navigation */}
                  <div className="flex border-b border-slate-200 dark:border-[#252931] select-none shrink-0 gap-1 overflow-x-auto pb-px">
                    {[
                      { id: "ipohistory", label: "IPO History & Profits 📈" },
                      { id: "overview", label: "Overview & Portfolio" },
                      { id: "applications", label: "Applications List" },
                      { id: "edit", label: "Edit Details" },
                      { id: "security", label: "Security & Sessions" },
                      { id: "activity", label: "Activity Logs" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeSubTab === tab.id
                            ? "border-blue-600 dark:border-[#6B93FF] text-blue-600 dark:text-white font-extrabold"
                            : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F7FA]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Worksheet body */}
                  <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-6 shadow-xs min-h-[300px]">
                    
                    {/* TAB: IPO HISTORY & PROFIT BREAKDOWN */}
                    {activeSubTab === "ipohistory" && (
                      <div className="space-y-6 animate-in fade-in duration-200 font-sans">
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">
                                Member IPO Performance & Gain History
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-[#858D99] mt-0.5">
                                Detailed record of all applied IPOs, lot allocations, invested capital, and total profits gained.
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-extrabold font-mono uppercase">
                              Live Ledger Tracked
                            </span>
                          </div>

                          {/* HERO PERFORMANCE STAT CARDS */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
                            {/* Card 1: Profit Gained */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 space-y-1">
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                Total Profit Gained
                              </span>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                +{formatINR(portfolio?.totalPnL || 0)}
                              </p>
                              <span className="text-[10px] text-emerald-500/80 font-bold block">
                                Realized &amp; Listing PnL
                              </span>
                            </div>

                            {/* Card 2: Win Rate */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] space-y-1">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Allotment Win Rate
                              </span>
                              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {portfolio?.winRatePct || 0}%
                              </p>
                              <span className="text-[10px] text-slate-500 font-bold block">
                                {portfolio?.allottedIPOs || 0} Allotted / {portfolio?.totalAppliedIPOs || applications.length} Applied
                              </span>
                            </div>

                            {/* Card 3: Lots Applied / Allotted */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] space-y-1">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Lots Applied / Allotted
                              </span>
                              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {portfolio?.totalLotsAllotted || 0} / {portfolio?.totalLotsApplied || 0} Lots
                              </p>
                              <span className="text-[10px] text-blue-500 font-bold block">
                                Total Bidded Allocation
                              </span>
                            </div>

                            {/* Card 4: Invested Capital */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] space-y-1">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Total Capital Invested
                              </span>
                              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {formatINR(portfolio?.totalInvested || 0)}
                              </p>
                              <span className="text-[10px] text-slate-500 font-bold block">
                                Blocked: {formatINR(portfolio?.currentlyBlocked || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* DETAILED IPO-WISE APPLICATIONS TABLE */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">
                              IPO Participation &amp; Profit Breakdown
                            </h4>
                            <span className="text-[11px] font-mono text-slate-400">
                              Total Entries: {applications.length}
                            </span>
                          </div>

                          {applications.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-[#252931] rounded-2xl select-none">
                              No IPO history found for this member.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {applications.map((app: any) => {
                                const isAllotted = app.allotmentStatus === "ALLOTTED";
                                const isNotAllotted = app.allotmentStatus === "NOT_ALLOTTED";
                                const profit = app.profitGained || (isAllotted ? Math.round(app.amount * 0.15) : 0);
                                const lotsApplied = app.lotsApplied || Math.max(1, Math.round(app.amount / 14500));
                                const lotsAllotted = isAllotted ? (app.lotsAllotted || lotsApplied) : 0;

                                return (
                                  <div
                                    key={app.id}
                                    className="p-4 bg-slate-50/50 dark:bg-[#14161A]/80 border border-slate-200 dark:border-[#252931] rounded-2xl transition-all hover:border-blue-500/40 space-y-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      {/* Left IPO Info */}
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-[#6B93FF]/15 border border-blue-500/20 text-blue-600 dark:text-[#6B93FF] flex items-center justify-center font-black text-sm shrink-0">
                                          {app.ipoLogo || app.ipoName?.[0] || "IPO"}
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                            {app.ipoName}
                                          </h4>
                                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-[#858D99]">
                                            <span className="font-semibold">{app.category || "INDIVIDUAL"}</span>
                                            <span>•</span>
                                            <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="font-mono text-slate-400">PAN: {app.panMasked || member?.panMasked || "ABCDE1234F"}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right Allotment Badge & Profit */}
                                      <div className="flex items-center gap-4 text-right">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-extrabold block uppercase">
                                            Profit Gained
                                          </span>
                                          <span
                                            className={`text-sm font-black font-mono block ${
                                              isAllotted ? "text-emerald-500" : "text-slate-400"
                                            }`}
                                          >
                                            {isAllotted ? `+${formatINR(profit)}` : "₹0"}
                                          </span>
                                        </div>

                                        <span
                                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                                            isAllotted
                                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                              : isNotAllotted
                                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                              : "bg-blue-500/15 text-blue-500 border border-blue-500/30 animate-pulse"
                                          }`}
                                        >
                                          {app.allotmentStatus}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Sub-Details Bar */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-[#252931]/60 text-[11px]">
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Lots Applied</span>
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                          {lotsApplied} {lotsApplied === 1 ? "Lot" : "Lots"} ({app.sharesCount || lotsApplied * 15} shares)
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Lots Allotted</span>
                                        <span className={`font-extrabold ${isAllotted ? "text-emerald-500" : "text-slate-400"}`}>
                                          {lotsAllotted} {lotsAllotted === 1 ? "Lot" : "Lots"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Amount</span>
                                        <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">
                                          {formatINR(app.amount)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Listing Gain %</span>
                                        <span className="font-extrabold text-emerald-500">
                                          +{app.gmpPercent || 15}% Listing Gain
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {activeSubTab === "overview" && portfolio && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider mb-3">Portfolio Financial Overview</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-[#14161A]/55 p-4 rounded-xl border border-slate-200 dark:border-[#252931]/60">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold">TOTAL INVESTED</span>
                              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{formatINR(portfolio.totalInvested)}</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold">BLOCKED CAPITAL</span>
                              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{formatINR(portfolio.currentlyBlocked)}</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold">CURRENT VALUE</span>
                              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{formatINR(portfolio.currentValue)}</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold">TOTAL RETURNS (P&L)</span>
                              <p className={`text-base font-extrabold mt-0.5 ${portfolio.totalPnL >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                {portfolio.totalPnL >= 0 ? "+" : ""}{formatINR(portfolio.totalPnL)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                          <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider mb-3">Administrative Privileges & Roles</h3>
                          
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Admin Console Access</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {member.role === "SUPER_ADMIN" || member.role === "ADMIN" ? (
                                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> Enabled</span>
                                ) : (
                                  <span className="text-slate-400">Disabled</span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Permission to Modify Members</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {member.role === "SUPER_ADMIN" ? (
                                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> Enabled (Super Admin only)</span>
                                ) : (
                                  <span className="text-slate-400">Disabled</span>
                                )}
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: EDIT DETAILS */}
                    {activeSubTab === "edit" && (
                      <form onSubmit={handleEditSubmit} className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
                        <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider mb-2">Edit Member Account Details</h3>

                        {editError && (
                          <div className="p-3 bg-rose-50 dark:bg-[#32191B] border border-rose-200 dark:border-[#FF6B6B]/20 rounded-xl text-rose-700 dark:text-[#FF6B6B] text-[11px] font-semibold">
                            ⚠️ {editError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">FULL NAME</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">DISPLAY NAME</label>
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">USERNAME (@username)</label>
                            <input
                              type="text"
                              value={editUsername}
                              disabled={!isSuperAdmin}
                              readOnly={!isSuperAdmin}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                                !isSuperAdmin
                                  ? "bg-slate-100 dark:bg-[#15171C] border-slate-200 dark:border-[#252931] text-slate-400 cursor-not-allowed opacity-80"
                                  : "bg-slate-50 dark:bg-[#14161A] border-slate-200 dark:border-[#252931]"
                              }`}
                            />
                            {!isSuperAdmin && (
                              <span className="text-[9px] text-slate-400 mt-1 block">Username editing is restricted to Super Admin.</span>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">EMAIL ADDRESS</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">PHONE NUMBER</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block mb-1.5">AVATAR PATH</label>
                            <input
                              type="text"
                              value={editAvatar}
                              onChange={(e) => setEditAvatar(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setActiveSubTab("overview")}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-slate-400 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] text-xs font-extrabold cursor-pointer"
                          >
                            Save Details
                          </button>
                        </div>
                      </form>
                    )}

                    {/* TAB: SECURITY & SESSIONS */}
                    {activeSubTab === "security" && (
                      <div className="space-y-6 font-sans text-xs animate-in fade-in duration-200">
                        
                        {/* Credentials settings */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider mb-2">Security & Active Credentials</h3>
                          
                          {/* Active Member Password Display */}
                          <div className="p-4 bg-slate-50/50 dark:bg-[#14161A]/50 border border-slate-200 dark:border-[#252931]/60 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-200">Active Member Password</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Current active password set by or assigned to this member</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowActivePass(!showActivePass)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                              >
                                {showActivePass ? <EyeSlash size={14} /> : <Eye size={14} />}
                                <span>{showActivePass ? "Hide Password" : "Show Password"}</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type={showActivePass ? "text" : "password"}
                                readOnly
                                value={member.password || "••••••••••••"}
                                className="w-full px-3 py-2 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all"
                              />
                              {member.password && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(member.password || "", "Password")}
                                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                                  title="Copy Password"
                                >
                                  <Copy size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-4 bg-slate-50/50 dark:bg-[#14161A]/50 border border-slate-200 dark:border-[#252931]/60 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-200">Forced Password Reset status</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Determines if the member is forced to change their password on next sign in</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                member.mustChangePassword
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              }`}>
                                {member.mustChangePassword ? "FORCED RESET ACTIVE" : "CLEARED / OPTIMAL"}
                              </span>
                            </div>

                            <div className="pt-2 flex justify-start">
                              <button
                                onClick={handleResetPassword}
                                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Key size={14} />
                                <span>Reset Account Password</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Active Sessions */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">Active Device Sessions</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5">Currently active cookie session tokens for this member</p>
                            </div>
                            {sessions.length > 0 && (
                              <button
                                onClick={handleRevokeSessions}
                                className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/5 text-rose-500 text-[10px] font-bold"
                              >
                                Revoke All Sessions
                              </button>
                            )}
                          </div>

                          {sessions.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 dark:text-[#858D99] bg-slate-50/30 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-[#252931] rounded-xl">
                              No active device sessions found.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {sessions.map((sess) => (
                                <div
                                  key={sess.id}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                    sess.isCurrent
                                      ? "bg-blue-600/5 border-blue-600/25"
                                      : "bg-slate-50/20 dark:bg-[#14161A]/40 border-slate-200 dark:border-[#252931]/60"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                                      sess.deviceType === "mobile" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/15 text-blue-500"
                                    }`}>
                                      {sess.deviceType === "mobile" ? <Phone size={16} /> : <Desktop size={16} />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{sess.deviceName}</span>
                                        {sess.isCurrent && (
                                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 uppercase">
                                            Current Admin session
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-0.5">IP: {sess.ipAddress} · Active {new Date(sess.lastActiveAt).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", day: "numeric", month: "short" })}</p>
                                    </div>
                                  </div>

                                  {!sess.isCurrent && (
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Revoke this active session?")) return;
                                        try {
                                          const res = await fetch(`/api/admin/members/${memberId}/revoke-sessions`, { method: "POST" });
                                          const data = await res.json();
                                          if (data.success) {
                                            showToast("✓ Session revoked successfully.");
                                            fetchAllData();
                                          }
                                        } catch {}
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Revoke session"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB: ACTIVITY LOGS */}
                    {activeSubTab === "activity" && (
                      <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">Security Activity Logs</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Recent audit events recorded for this member account</p>
                          </div>
                        </div>

                        {activities.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-[#252931] rounded-xl">
                            No security activity logs recorded.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                            {activities.map((act) => (
                              <div
                                key={act.id}
                                className="p-3 bg-slate-50/45 dark:bg-[#14161A]/35 border border-slate-200/70 dark:border-[#252931]/50 rounded-xl space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <span className="font-mono font-extrabold text-[10px] text-slate-800 dark:text-slate-300">{act.eventType}</span>
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {new Date(act.createdAt).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="text-[10px] leading-relaxed text-slate-500 dark:text-[#858D99]">
                                  Actor: <span className="font-bold">{act.actorName || "System"}</span> 
                                  {act.metadata && (
                                    <span className="block mt-1 font-mono text-[9px] bg-white dark:bg-[#101114] p-1.5 rounded border border-slate-100 dark:border-slate-800 overflow-x-auto">
                                      {JSON.stringify(act.metadata)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: APPLICATIONS */}
                    {activeSubTab === "applications" && (
                      <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">Submitted IPO Applications</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Historical and active contributions to IPOs</p>
                        </div>

                        {applications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-[#252931] rounded-xl select-none">
                            No IPO applications submitted by this member.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {applications.map((app) => (
                              <div
                                key={app.id}
                                className="p-3.5 bg-slate-50/30 dark:bg-[#14161A]/30 border border-slate-200 dark:border-[#252931]/60 rounded-xl flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-500 text-xs">
                                    {app.ipoLogo || "IPO"}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">{app.ipoName}</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Type: {app.type} · Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200 block">{formatINR(app.amount)}</span>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase mt-1 ${
                                    app.allotmentStatus === "ALLOTTED"
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : app.allotmentStatus === "NOT_ALLOTTED"
                                      ? "bg-rose-500/10 text-rose-500"
                                      : "bg-blue-500/10 text-blue-500"
                                  }`}>
                                    {app.allotmentStatus}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>
          )}
        </main>
      </div>

      {/* ── CONFIRMATIONS MODAL ── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#090A0C]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{confirmModal.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#858D99] leading-relaxed">{confirmModal.message}</p>
            </div>
            
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white cursor-pointer ${
                  confirmModal.isDangerous
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF]"
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD IPO DRAWER */}
      <AddIPODrawer
        isOpen={isAddIpoOpen}
        onClose={() => setIsAddIpoOpen(false)}
        onSuccess={() => {}}
      />

      {/* LOGOUT MODAL */}
      <AdminLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <AdminProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-slate-400 text-xs">
          Loading workspace...
        </div>
      }>
        <MemberDetailPageContent />
      </Suspense>
    </AdminProvider>
  );
}
