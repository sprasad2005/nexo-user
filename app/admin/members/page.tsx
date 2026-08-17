"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider } from "@/context/AdminContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/components/admin/AddIPODrawer";
import { AdminDataCache } from "@/lib/nexoDataCache";
import { 
  Users, UserPlus, ShieldCheck, Shield, MagnifyingGlass, 
  Funnel, CaretDown, Check, X, DotsThreeOutlineVertical, 
  Trash, Prohibit, CheckCircle, Key, PencilSimple, 
  Copy, Keyhole, Info, Eye, EyeSlash, ArrowClockwise,
  ClockCountdown, CalendarBlank, Phone
} from "@phosphor-icons/react";
import { MOCK_MEMBERS } from "@/lib/mockData";

interface MemberListEntry {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  avatar: string;
  phone?: string;
  role: string;
  status: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  joinedAt?: string;
  ipoCount?: number;
}

function MembersPageContent() {
  const router = useRouter();
  
  // Shell states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("AUTHORIZED");

  const [currentUserRole, setCurrentUserRole] = useState<"SUPER_ADMIN" | "ADMIN" | "MEMBER">("ADMIN");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  // Data states - Initialize with instant cache or default members so directory is never empty
  const [members, setMembers] = useState<MemberListEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nexo_cached_admin_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return MOCK_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      username: (m as any).username || m.name.toLowerCase(),
      email: m.email,
      avatar: m.avatar,
      phone: m.phone || "+91 98200 12345",
      role: m.role,
      status: "ACTIVE",
      isVerified: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      joinedAt: m.joinedAt,
      ipoCount: 0,
    }));
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Toast notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters state
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SUPER_ADMIN" | "ADMIN" | "MEMBER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "DISABLED">("ALL");
  const [verifFilter, setVerifFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  const [sortBy, setSortBy] = useState("recently_added"); // recently_added, last_login, name, role

  // Actions dropdown active row
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = "NEXO- Member Management";
  }, []);

  const togglePasswordReveal = (memberId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // Multi-step Create wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Account, 2: Access, 3: Security, 4: Review, 5: Created
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; tempPass: string } | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<"MEMBER" | "ADMIN" | "SUPER_ADMIN">("MEMBER");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [isSuperAdminConfirmed, setIsSuperAdminConfirmed] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [formAvatar, setFormAvatar] = useState<string>("");

  const AVATAR_OPTIONS = [
    { id: "oggy", name: "Oggy", url: "/oggy.png" },
    { id: "jack", name: "Jack", url: "/jack.png" },
    { id: "sinchan", name: "Shinchan", url: "/sinchan.png" },
    { id: "doremon", name: "Doraemon", url: "/doremon.png" },
    { id: "japlu", name: "Japlu", url: "/japlu.png" },
  ];

  const getRandomAvatar = () => {
    const list = ["/oggy.png", "/jack.png", "/sinchan.png", "/doremon.png", "/japlu.png"];
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  };

  // Confirmations dialog
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTabChange = (tab: string) => {
    if (tab === "members") return;
    if (tab === "messages") {
      router.push("/admin/messages");
    } else if (tab === "applications") {
      router.push("/admin/applications");
    } else if (tab === "allotment" || tab === "allotments") {
      router.push("/admin/allotment");
    } else if (tab === "activity") {
      router.push("/admin/activity");
    } else if (tab === "security") {
      router.push("/admin/security");
    } else {
      router.push(`/admin?tab=${tab}`);
    }
  };

  // Check auth
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN" || data.member?.role === "SUPER_ADMIN" || data.member?.role === "ADMIN")) {
          try {
            sessionStorage.setItem("nexo_admin_authenticated", "true");
          } catch {}
          setAdminStatus("AUTHORIZED");
          setCurrentUserRole(data.user?.role || data.member?.role || "ADMIN");
          setCurrentUserId(data.user?.id || data.member?.id || "");
          setCurrentUsername(data.user?.username || data.member?.username || "");
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
          setAdminStatus("AUTHORIZED");
        }
      });
    return () => { active = false; };
  }, [router]);

  // Fetch members
  const fetchMembers = async (forceFresh = false) => {
    const q = new URLSearchParams({
      search: searchQuery,
      role: roleFilter,
      status: statusFilter,
      verification: verifFilter,
      sortBy
    });
    const cacheKey = `admin_members_query_${q.toString()}`;

    if (!forceFresh) {
      const cached = AdminDataCache.get<any>(cacheKey);
      if (cached?.success && Array.isArray(cached.members) && cached.members.length > 0) {
        setMembers(cached.members);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      const data = await AdminDataCache.fetchSWR(
        cacheKey,
        async () => {
          const res = await fetch(`/api/admin/members?${q}`);
          const json = await res.json();
          if (json?.success && Array.isArray(json.members)) return json;
          const fallbackRes = await fetch("/api/members");
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.success && Array.isArray(fallbackData.members)) return fallbackData;
          throw new Error(json?.error || "Failed to fetch members");
        },
        {
          ttlMs: 30000,
          onUpdate: (freshData: any) => {
            if (freshData?.success && Array.isArray(freshData.members)) {
              setMembers(freshData.members);
            }
          },
        }
      );

      if (data?.success && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    } catch {
      // Retain existing state if fetch fails
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminStatus !== "AUTHORIZED") return;
    fetchMembers();
  }, [adminStatus, searchQuery, roleFilter, statusFilter, verifFilter, sortBy]);

  // Real-time search debouncing or execution on enter/click
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  // Top summary metrics
  const metrics = useMemo(() => {
    return {
      total: members.length,
      active: members.filter((m) => m.status === "ACTIVE").length,
      admins: members.filter((m) => m.role === "ADMIN").length,
      superAdmins: members.filter((m) => m.role === "SUPER_ADMIN").length,
      pendingSuspended: members.filter((m) => m.status === "SUSPENDED" || m.status === "DISABLED").length,
    };
  }, [members]);

  // Table selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(members.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (nextStatus: "ACTIVE" | "SUSPENDED") => {
    if (selectedIds.length === 0) return;
    const actionStr = nextStatus === "ACTIVE" ? "Reactivate" : "Suspend";
    
    setConfirmModal({
      isOpen: true,
      title: `${actionStr} selected accounts?`,
      message: `You are about to bulk ${actionStr.toLowerCase()} ${selectedIds.length} NEXO members. This will restrict or restore their platform access.`,
      actionLabel: `Confirm Bulk ${actionStr}`,
      isDangerous: nextStatus === "SUSPENDED",
      onConfirm: async () => {
        let succeeded = 0;
        let failed = 0;
        for (const id of selectedIds) {
          try {
            const apiPath = nextStatus === "ACTIVE" ? "activate" : "suspend";
            const res = await fetch(`/api/admin/members/${id}/${apiPath}`, { method: "POST" });
            const d = await res.json();
            if (d.success) succeeded++;
            else failed++;
          } catch {
            failed++;
          }
        }
        showToast(`Bulk updates completed: ${succeeded} succeeded, ${failed} failed.`);
        setSelectedIds([]);
        setConfirmModal(null);
        fetchMembers();
      }
    });
  };

  // Individual Actions
  const handleResetPassword = (member: MemberListEntry) => {
    setActiveDropdownRow(null);
    setConfirmModal({
      isOpen: true,
      title: "Reset Password?",
      message: `Are you sure you want to reset password for ${member.name} (@${member.username})? Their current sessions will be immediately terminated and a temporary credential generated.`,
      actionLabel: "Reset Password",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${member.id}/reset-password`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            setConfirmModal(null);
            setCreatedCredentials({ username: member.username, tempPass: data.temporaryPassword });
            setWizardStep(5); // reuse the creation wizard's one-time credential view
            setIsWizardOpen(true);
            showToast("Temporary password generated!");
            fetchMembers();
          } else {
            showToast(data.error || "Failed to reset password", "error");
          }
        } catch {
          showToast("Network error occurred resetting password", "error");
        }
      }
    });
  };

  const handleToggleSuspend = (member: MemberListEntry) => {
    setActiveDropdownRow(null);
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
          const res = await fetch(`/api/admin/members/${member.id}/${apiPath}`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`✓ Account ${isSuspended ? "reactivated" : "suspended"} successfully.`);
            setConfirmModal(null);
            fetchMembers();
          } else {
            showToast(data.error || `Failed to ${apiPath} account`, "error");
          }
        } catch {
          showToast("Network error occurred updating status", "error");
        }
      }
    });
  };

  const handleRoleChangeSubmit = async (member: MemberListEntry, nextRole: "MEMBER" | "ADMIN" | "SUPER_ADMIN") => {
    setActiveDropdownRow(null);
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
          const res = await fetch(`/api/admin/members/${member.id}/role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: nextRole }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`✓ Role updated successfully to ${nextRole}.`);
            setConfirmModal(null);
            fetchMembers();
          } else {
            showToast(data.error || "Failed to update role", "error");
          }
        } catch {
          showToast("Network error updating role", "error");
        }
      }
    });
  };

  const handleRevokeSessions = (member: MemberListEntry) => {
    setActiveDropdownRow(null);
    setConfirmModal({
      isOpen: true,
      title: "Revoke Active Sessions?",
      message: `This will sign ${member.name} out of all active devices immediately. They must authenticate again.`,
      actionLabel: "Revoke Sessions",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/members/${member.id}/revoke-sessions`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("✓ All sessions revoked successfully.");
            setConfirmModal(null);
            fetchMembers();
          } else {
            showToast(data.error || "Failed to revoke sessions", "error");
          }
        } catch {
          showToast("Network error revoking sessions", "error");
        }
      }
    });
  };

  const handleDeleteMember = (member: MemberListEntry) => {
    setActiveDropdownRow(null);
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
            showToast(`✓ Member @${member.username} deleted successfully.`);
            setConfirmModal(null);
            fetchMembers();
          } else {
            showToast(data.error || "Failed to delete member profile", "error");
          }
        } catch {
          showToast("Network error deleting member", "error");
        }
      }
    });
  };

  // Generate secure password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}";
    let pwd = "";
    // ensure character diversity
    pwd += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    pwd += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    pwd += "0123456789"[Math.floor(Math.random() * 10)];
    pwd += "!@#$%^&*()-_=+"[Math.floor(Math.random() * 14)];
    for (let i = 4; i < 16; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    pwd = pwd.split("").sort(() => 0.5 - Math.random()).join("");
    setFormPassword(pwd);
    setFormConfirmPassword(pwd);
  };

  // Wizard handlers
  const openCreateWizard = () => {
    setWizardStep(1);
    setWizardError(null);
    setFormName("");
    setFormUsername("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("MEMBER");
    setFormPassword("");
    setFormConfirmPassword("");
    setIsSuperAdminConfirmed(false);
    setIsRoleDropdownOpen(false);
    setIsWizardOpen(true);
  };

  const handleCreateMemberSubmit = async () => {
    setWizardError(null);
    if (!formUsername.trim()) {
      setWizardError("Username is required.");
      return;
    }
    const cleanUname = formUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUname)) {
      setWizardError("Username must be 3–24 characters, lowercase, containing only letters, numbers, and underscores.");
      return;
    }

    if (!formPassword) {
      setWizardError("Password is required.");
      return;
    }
    if (formPassword.length < 6) {
      setWizardError("Password must be at least 6 characters.");
      return;
    }

    if (formRole === "SUPER_ADMIN" && !isSuperAdminConfirmed) {
      setWizardError("Please acknowledge the warning to assign the Super Admin privilege.");
      return;
    }

    const payload = {
      name: cleanUname, // Name defaults to username
      username: cleanUname,
      role: formRole,
      password: formPassword,
      superAdminConfirmed: isSuperAdminConfirmed,
    };

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedCredentials({
          username: data.createdMember.username,
          tempPass: data.temporaryPassword,
        });
        showToast("✓ Member provisioned successfully.");
        setWizardStep(2);
        fetchMembers();
      } else {
        setWizardError(data.error || "Failed to create member");
      }
    } catch {
      setWizardError("A connection error occurred while creating the member.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
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
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-surface/90 dark:bg-surface/90 border-b border-line px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0 select-none font-sans">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Open Navigation Menu"
            >
              <span className="text-base font-bold">☰</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 hidden sm:inline-block" />
            <span className="text-[11px] sm:text-xs font-semibold text-ink-tertiary uppercase tracking-wider hidden sm:inline">
              Workspace
            </span>
            <span className="text-xs font-bold text-ink-muted hidden sm:inline">/</span>
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider truncate">
              Member Management
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
        <main className="p-3 sm:p-5 md:p-8 flex-1 max-w-full lg:max-w-7xl w-full mx-auto space-y-6 pb-20 min-w-0">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#252931]/80 pb-6 select-none">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Members
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#858D99] mt-1 font-medium">
                Manage platform members and their permissions
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Total Members Badge */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#252931] shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Members</span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-[#6B93FF] text-xs font-black">
                  {metrics.total}
                </span>
              </div>

              {/* Add Member Button */}
              <button
                onClick={openCreateWizard}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <UserPlus size={16} weight="bold" />
                <span>+ Add Member</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full select-none">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="Search member by name, @username, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-[#0D111A] border border-slate-200 dark:border-[#252931] text-xs sm:text-sm text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-[#6B93FF] shadow-xs transition-all"
              />
              <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between select-none">
            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "ALL", label: "All" },
                { id: "SUPER_ADMIN", label: "Super Admin" },
                { id: "ADMIN", label: "Admin" },
                { id: "MEMBER", label: "Core Members" },
                { id: "SUSPENDED", label: "Suspended" },
              ].map((pill) => {
                const isActive =
                  pill.id === "SUSPENDED"
                    ? statusFilter === "SUSPENDED"
                    : statusFilter !== "SUSPENDED" && roleFilter === pill.id;

                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      if (pill.id === "SUSPENDED") {
                        setStatusFilter("SUSPENDED");
                        setRoleFilter("ALL");
                      } else {
                        setStatusFilter("ALL");
                        setRoleFilter(pill.id as any);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs dark:bg-[#2563EB] dark:border-[#3B82F6]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-[#0D111A] dark:text-[#AEB5C0] dark:border-[#252931] dark:hover:bg-[#141824]"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Dropdown & Sort */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#0D111A] border border-slate-200 dark:border-[#252931] rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-400 dark:text-[#858D99] font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="last_login">Last Login</option>
                  <option value="name">Name</option>
                  <option value="role">Role</option>
                </select>
              </div>

              {/* Filters Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer bg-white border-slate-200 dark:bg-[#0D111A] dark:border-[#252931] text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#141824] ${
                    showFilterPopover ? "border-blue-500 text-blue-600 dark:border-[#6B93FF] dark:text-white" : ""
                  }`}
                >
                  <Funnel size={13} />
                  <span>Filters</span>
                  <CaretDown size={11} />
                </button>

                {showFilterPopover && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-xl z-30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#252931]/60 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA]">Filter Directory</span>
                      <button 
                        onClick={() => {
                          setRoleFilter("ALL");
                          setStatusFilter("ALL");
                          setVerifFilter("ALL");
                        }}
                        className="text-[10px] text-blue-600 dark:text-[#6B93FF] font-bold hover:underline"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">ROLE</label>
                      <select 
                        value={roleFilter}
                        onChange={(e: any) => setRoleFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-lg text-xs focus:outline-none"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">STATUS</label>
                      <select 
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-lg text-xs focus:outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">VERIFICATION</label>
                      <select 
                        value={verifFilter}
                        onChange={(e: any) => setVerifFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-lg text-xs focus:outline-none"
                      >
                        <option value="ALL">All States</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="UNVERIFIED">Unverified</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setShowFilterPopover(false)}
                      className="w-full py-1.5 rounded-lg bg-blue-600 dark:bg-[#6B93FF] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 dark:bg-[#142340] dark:border-[#2C4880] rounded-2xl flex items-center justify-between text-xs font-semibold select-none animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-[#6B93FF]">
                <Info size={16} />
                <span>{selectedIds.length} members selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatusChange("ACTIVE")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-[#32C98B] cursor-pointer font-bold"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkStatusChange("SUSPENDED")}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-[#FF6B6B] cursor-pointer font-bold"
                >
                  Suspend
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* 3-COLUMN MEMBER CARD GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-[#0D111A] border border-white/5 animate-pulse flex flex-col justify-between h-[360px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-20 h-20 rounded-2xl bg-white/5" />
                    <div className="w-8 h-8 rounded-xl bg-white/5" />
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="w-32 h-5 rounded-lg bg-white/10" />
                    <div className="w-24 h-4 rounded-md bg-white/5" />
                    <div className="w-36 h-3 rounded-md bg-white/5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-5">
                    <div className="h-14 rounded-2xl bg-white/5" />
                    <div className="h-14 rounded-2xl bg-white/5" />
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="w-24 h-4 rounded-md bg-white/5" />
                    <div className="w-20 h-7 rounded-xl bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-3xl p-12 text-center bg-white dark:bg-[#0D111A] border border-slate-200 dark:border-[#252931] space-y-4 shadow-xs">
              <Users size={40} className="mx-auto text-slate-400 dark:text-slate-600" />
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">No members found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try adjusting your search terms or clearing your filters.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("ALL");
                  setStatusFilter("ALL");
                  setVerifFilter("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => {
                const isRowSelected = selectedIds.includes(member.id);
                const mUsername = member.username || member.name.toLowerCase();
                const mPhone = member.phone || "+91 98200 12345";
                
                // Deterministic UTC date rendering to eliminate hydration mismatch
                let memberSinceDate = "Jan 2025";
                if (member.createdAt) {
                  try {
                    const d = new Date(member.createdAt);
                    if (!isNaN(d.getTime())) {
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      memberSinceDate = `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
                    }
                  } catch {
                    memberSinceDate = member.joinedAt || "Jan 2025";
                  }
                } else if (member.joinedAt) {
                  memberSinceDate = member.joinedAt;
                }

                // Check if this card represents the currently logged-in user
                const isCurrentUser =
                  (currentUserId && (member.id === currentUserId || member.username === currentUsername)) ||
                  (currentUsername && member.username?.toLowerCase() === currentUsername.toLowerCase());

                // Role-based theme accents
                const rUpper = (member.role || "MEMBER").toUpperCase();
                const isSuperAdminRole = rUpper === "SUPER_ADMIN";
                const isAdminRole = rUpper === "ADMIN";

                let roleLabel = "CORE MEMBER";
                let badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
                let dotStyle = "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
                let borderStyle = "border-emerald-500/20 hover:border-emerald-400/40";
                let glowStyle = "shadow-[0_0_30px_-10px_rgba(16,185,129,0.12)]";
                let avatarRingStyle = "ring-2 ring-emerald-500/40 border-emerald-500/40";

                if (isSuperAdminRole) {
                  roleLabel = "SUPER ADMIN";
                  badgeStyle = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
                  dotStyle = "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]";
                  borderStyle = "border-cyan-500/30 hover:border-cyan-400/60";
                  glowStyle = "shadow-[0_0_35px_-10px_rgba(6,182,212,0.18)]";
                  avatarRingStyle = "ring-2 ring-cyan-500/50 border-cyan-500/50";
                } else if (isAdminRole) {
                  roleLabel = "ADMIN";
                  badgeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
                  dotStyle = "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]";
                  borderStyle = "border-indigo-500/25 hover:border-indigo-400/50";
                  glowStyle = "shadow-[0_0_35px_-10px_rgba(99,102,241,0.16)]";
                  avatarRingStyle = "ring-2 ring-indigo-500/40 border-indigo-500/40";
                }

                return (
                  <div
                    key={member.id}
                    className={`group relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 bg-[#0D111A] border ${borderStyle} ${glowStyle} overflow-hidden font-sans select-none`}
                  >
                    {/* Top Row: Avatar & Actions Menu */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <img
                          src={member.avatar || "/oggy.png"}
                          alt={member.name}
                          className={`w-20 h-20 rounded-2xl object-cover bg-[#141824] border ${avatarRingStyle} transition-transform duration-300 group-hover:scale-[1.03]`}
                          loading="lazy"
                        />
                        <span
                          className={`w-4 h-4 rounded-full ring-3 ring-[#0D111A] absolute -bottom-1 -right-1 ${
                            member.status === "ACTIVE"
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                              : member.status === "SUSPENDED"
                              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                              : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          }`}
                          title={`Status: ${member.status}`}
                        />
                      </div>

                      {/* Dropdown Options */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdownRow(activeDropdownRow === member.id ? null : member.id)}
                          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Member Options"
                        >
                          <DotsThreeOutlineVertical size={16} weight="bold" />
                        </button>

                        {/* Dropdown Popover */}
                        {activeDropdownRow === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30 cursor-default"
                              onClick={() => setActiveDropdownRow(null)}
                            />
                            <div className="absolute right-0 mt-2 w-52 bg-[#151822]/95 backdrop-blur-md border border-[#272B35] rounded-2xl shadow-2xl p-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-150">
                              <button
                                onClick={() => {
                                  setActiveDropdownRow(null);
                                  router.push(`/admin/members/${member.id}`);
                                }}
                                className="w-full px-3 py-2 hover:bg-[#20242F] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 rounded-xl transition-all cursor-pointer"
                              >
                                <PencilSimple size={15} className="text-slate-400" />
                                <span>View & Manage</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveDropdownRow(null);
                                  handleResetPassword(member);
                                }}
                                className="w-full px-3 py-2 hover:bg-[#20242F] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 rounded-xl transition-all cursor-pointer"
                              >
                                <Key size={15} className="text-slate-400" />
                                <span>Reset Password</span>
                              </button>

                              <div className="my-1 border-t border-[#252931]" />

                              <button
                                onClick={() => {
                                  setActiveDropdownRow(null);
                                  handleRevokeSessions(member);
                                }}
                                className="w-full px-3 py-2 hover:bg-[#20242F] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 rounded-xl transition-all cursor-pointer"
                              >
                                <Keyhole size={15} className="text-slate-400" />
                                <span>Revoke Sessions</span>
                              </button>

                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    togglePasswordReveal(member.id);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-[#20242F] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 rounded-xl transition-all cursor-pointer"
                                >
                                  {revealedPasswords[member.id] ? <EyeSlash size={15} /> : <Eye size={15} />}
                                  <span>{revealedPasswords[member.id] ? "Hide Password" : "See Password"}</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-[#252931]" />

                              <button
                                onClick={() => {
                                  setActiveDropdownRow(null);
                                  handleToggleSuspend(member);
                                }}
                                className={`w-full px-3 py-2 text-xs font-semibold flex items-center gap-2.5 rounded-xl transition-all cursor-pointer ${
                                  member.status === "SUSPENDED"
                                    ? "text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                                    : "text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                                }`}
                              >
                                <Prohibit size={15} className="shrink-0" />
                                <span>{member.status === "SUSPENDED" ? "Reactivate Account" : "Suspend Account"}</span>
                              </button>

                              {member.role !== "SUPER_ADMIN" && member.username !== "ankitgod" && (
                                <button
                                  onClick={() => handleDeleteMember(member)}
                                  className="w-full px-3 py-2 hover:bg-rose-950/40 text-xs font-semibold text-rose-400 flex items-center gap-2.5 rounded-xl transition-all cursor-pointer"
                                >
                                  <Trash size={15} className="text-rose-400 shrink-0" />
                                  <span>Delete Profile</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Member Identity Details */}
                    <div className="mt-4 space-y-2">
                      <div>
                        <h3 className="text-lg font-black text-white tracking-tight leading-snug group-hover:text-blue-400 transition-colors truncate">
                          {member.name}
                        </h3>
                        
                        {/* Role Badge + Username */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${badgeStyle}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                            {roleLabel}
                          </span>
                          <span className="inline-flex items-center text-xs font-semibold text-slate-400 bg-white/[0.04] border border-white/5 px-2.5 py-0.5 rounded-full truncate">
                            @{mUsername}
                          </span>
                        </div>
                      </div>

                      {/* Phone Contact */}
                      {mPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                          <Phone size={13} className="text-slate-500 shrink-0" />
                          <span className="font-mono text-slate-300 truncate">{mPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Two Compact Information Boxes */}
                    <div className="grid grid-cols-2 gap-2.5 mt-5">
                      {/* Box 1 */}
                      <div className="bg-[#121622] border border-white/[0.06] rounded-2xl p-3 space-y-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {isSuperAdminRole ? "PLATFORM ROLE" : "IPOs APPLIED"}
                        </span>
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          {isSuperAdminRole ? "Super Admin" : `${member.ipoCount ?? 0} IPOs`}
                        </p>
                      </div>

                      {/* Box 2 */}
                      <div className="bg-[#121622] border border-white/[0.06] rounded-2xl p-3 space-y-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          MEMBER SINCE
                        </span>
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          {memberSinceDate}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      {/* Left: Verified Member Status */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" />
                        <span>Verified Member</span>
                      </div>

                      {/* Right: Message or You */}
                      {isCurrentUser ? (
                        <span className="px-3.5 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">
                          You
                        </span>
                      ) : (
                        <button
                          onClick={() => router.push(`/admin/messages?memberId=${member.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:shadow-blue-500/25"
                        >
                          <span>Message</span>
                          <span className="text-sm leading-none">&rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── CREATE MEMBER MODAL / DRAWER WIZARD ── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-[#090A0C]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#252931] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Member</h3>
                <p className="text-[11px] text-slate-400 dark:text-[#858D99]">Create a new authorized NEXO platform account.</p>
              </div>
              {wizardStep !== 2 && (
                <button
                  onClick={() => setIsWizardOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F7FA] cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Error message */}
            {wizardError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-[#32191B] border border-rose-200 dark:border-[#FF6B6B]/20 rounded-xl text-rose-700 dark:text-[#FF6B6B] text-[11px] font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{wizardError}</span>
              </div>
            )}

            {/* Wizard Form */}
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                if (wizardStep === 1 && !isLoading) handleCreateMemberSubmit();
              }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Wizard Body */}
              <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-4">
              
              {/* STEP 1: INPUT CREDENTIALS */}
              {wizardStep === 1 && (
                <div className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">
                      USERNAME * (Lowercase, no spaces)
                    </label>
                    <input
                      type="text"
                      name="create_nexo_member_username_field"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder="e.g. niranjan"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>


                  <div className="pt-3 border-t border-slate-100 dark:border-slate-805">
                    <div className="flex items-center justify-between pb-1.5">
                      <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">
                        PASSWORD *
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-[10px] font-bold text-blue-600 dark:text-[#6B93FF] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <ArrowClockwise size={12} />
                        <span>Generate secure password</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? "text" : "password"}
                        name="create_nexo_member_password_field"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder="At least 6 characters"
                        value={formPassword}
                        onChange={(e) => {
                          setFormPassword(e.target.value);
                          setFormConfirmPassword(e.target.value);
                        }}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showFormPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ONE-TIME CREDENTIALS HANDOFF */}
              {wizardStep === 2 && createdCredentials && (
                <div className="space-y-4 font-sans text-xs">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="text-center space-y-1">
                      <span className="text-[18px]">✨</span>
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-[#32C98B]">ACCOUNT PROVISIONED</h4>
                      <p className="text-[10px] text-slate-400">Credentials created. Click below to copy in 1-click.</p>
                    </div>

                    {/* Single-Click Copy Both Credentials Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const formattedStr = `Username : ${createdCredentials.username}\nPassword : ${createdCredentials.tempPass}`;
                        handleCopyText(formattedStr, "Username & Password");
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Copy size={16} weight="bold" />
                      <span>Copy Both Credentials (1-Click)</span>
                    </button>

                    {/* Credential Cards */}
                    <div className="space-y-2.5 pt-1">
                      <div
                        onClick={() => {
                          const formattedStr = `Username : ${createdCredentials.username}\nPassword : ${createdCredentials.tempPass}`;
                          handleCopyText(formattedStr, "Username & Password");
                        }}
                        className="p-3 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] hover:border-emerald-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div>
                          <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-mono mb-0.5">USERNAME</span>
                          <span className="font-bold font-mono text-[12px] text-slate-800 dark:text-slate-200">
                            Username : {createdCredentials.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(`Username : ${createdCredentials.username}`, "Username");
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-emerald-500/10 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                      </div>

                      <div
                        onClick={() => {
                          const formattedStr = `Username : ${createdCredentials.username}\nPassword : ${createdCredentials.tempPass}`;
                          handleCopyText(formattedStr, "Username & Password");
                        }}
                        className="p-3 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] hover:border-emerald-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div>
                          <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-mono mb-0.5">PASSWORD</span>
                          <span className="font-bold font-mono text-[12px] text-slate-800 dark:text-slate-200 select-all">
                            Password : {createdCredentials.tempPass}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(`Password : ${createdCredentials.tempPass}`, "Password");
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-emerald-500/10 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-[#F3B85B] rounded-xl text-[10px] leading-relaxed">
                      ⚠️ Warning: Save these credentials now. The password will not be shown again. Plaintext keys are deleted instantly from the server and browser memory.
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-[#252931] bg-slate-55/30 dark:bg-[#101114]/50 flex items-center justify-between shrink-0 select-none">
              {wizardStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsWizardOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? "Creating…" : "Create Member"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1D2026] dark:hover:bg-[#252931] text-white text-xs font-bold text-center cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </form>

          </div>
        </div>
      )}

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

      {/* GLOBAL ADD IPO DRAWER */}
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

export default function MembersPage() {
  return (
    <AdminProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-slate-400 text-xs">
          Loading workspace...
        </div>
      }>
        <MembersPageContent />
      </Suspense>
    </AdminProvider>
  );
}
