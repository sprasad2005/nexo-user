"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider } from "@/admin/context/AdminContext";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/admin/components/AddIPODrawer";
import { 
  Users, UserPlus, ShieldCheck, Shield, MagnifyingGlass, 
  Funnel, CaretDown, Check, X, DotsThreeOutlineVertical, 
  Trash, Prohibit, CheckCircle, Key, PencilSimple, 
  Copy, Keyhole, Info, Eye, EyeSlash, ArrowClockwise,
  ClockCountdown, CalendarBlank, Phone
} from "@phosphor-icons/react";

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
}

function MembersPageContent() {
  const router = useRouter();
  
  // Shell states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("LOADING");
  const [currentUserRole, setCurrentUserRole] = useState<"SUPER_ADMIN" | "ADMIN" | "MEMBER">("ADMIN");
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  // Data states
  const [members, setMembers] = useState<MemberListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    router.push(`/admin?tab=${tab}`);
  };

  // Check auth
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated && (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN")) {
          setAdminStatus("AUTHORIZED");
        } else {
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (active) {
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      });
    return () => { active = false; };
  }, [router]);

  // Fetch members
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        verification: verifFilter,
        sortBy
      });
      const res = await fetch(`/api/admin/members?${q}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
      } else {
        showToast(data.error || "Failed to fetch members list", "error");
      }
    } catch {
      showToast("Unable to connect to administration server", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminStatus !== "AUTHORIZED") return;

    fetchMembers();
    const interval = setInterval(() => {
      const q = new URLSearchParams({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        verification: verifFilter,
        sortBy
      });
      fetch(`/api/admin/members?${q}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && Array.isArray(d.members)) {
            setMembers(d.members);
          }
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
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
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-surface/90 dark:bg-surface/90 border-b border-line px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0 select-none font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
              Workspace
            </span>
            <span className="text-xs font-bold text-ink-muted">/</span>
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Member Management
            </span>
          </div>

          <AdminNavbarProfileMenu
            activeTab="members"
            onSelectTab={handleTabChange}
            onSignOutClick={() => setIsLogoutModalOpen(true)}
          />
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
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto space-y-6 pb-20">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#252931] pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F5F7FA]">Members</h1>
              <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1">Manage authorized NEXO user accounts, status, and permissions.</p>
            </div>
            <button
              onClick={openCreateWizard}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#527DFF] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <UserPlus size={16} weight="bold" />
              <span>Add Member</span>
            </button>
          </div>

          {/* 1. TOP SUMMARY SURFACE */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-sm select-none">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">TOTAL MEMBERS</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-[#252931]/60 pl-4">
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">ACTIVE</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.active}</p>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-[#252931]/60 pl-4">
              <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">ADMINS</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.admins}</p>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-[#252931]/60 pl-4">
              <span className="text-[10px] font-extrabold text-indigo-500 dark:text-[#8B9CFF] uppercase tracking-wider">SUPER ADMINS</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.superAdmins}</p>
            </div>
            <div className="space-y-1 border-l border-slate-200 dark:border-[#252931]/60 pl-4 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">PENDING / SUSPENDED</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.pendingSuspended}</p>
            </div>
          </div>

          {/* 2. SEARCH & FILTERS BAR */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between select-none">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center relative">
              <input
                type="text"
                placeholder="Search members by name, username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500 dark:focus:border-[#6B93FF] transition-all"
              />
              <MagnifyingGlass className="absolute left-3.5 text-slate-400 dark:text-[#858D99] w-4.5 h-4.5" />
            </form>

            {/* Filter Controllers */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl px-3 py-2 text-xs">
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
                  className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer bg-white border-slate-200 dark:bg-[#101114] dark:border-[#252931] text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#14161A] ${showFilterPopover ? "border-blue-500 text-blue-600 dark:border-[#6B93FF] dark:text-white" : ""}`}
                >
                  <Funnel size={14} />
                  <span>Filters</span>
                  <CaretDown size={12} />
                </button>

                {/* Filter Popover */}
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

                    {/* Role Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">ROLE</label>
                      <select 
                        value={roleFilter}
                        onChange={(e: any) => setRoleFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-lg text-xs focus:outline-none"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    </div>

                    {/* Status Filter */}
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

                    {/* Verification Filter */}
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
                      className="w-full py-1.5 rounded-lg bg-blue-600 dark:bg-[#6B93FF] text-white text-[11px] font-bold"
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
            <div className="p-3 bg-blue-50/70 border border-blue-200 dark:bg-[#142340] dark:border-[#2C4880] rounded-xl flex items-center justify-between text-xs font-semibold select-none animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-[#6B93FF]">
                <Info size={16} />
                <span>{selectedIds.length} members selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatusChange("ACTIVE")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-[#32C98B] cursor-pointer"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkStatusChange("SUSPENDED")}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-[#FF6B6B] cursor-pointer"
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

          {/* 3. MEMBER TABLE */}
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 dark:text-[#858D99] space-y-4 animate-pulse">
                <Users size={32} className="mx-auto text-slate-500" />
                <p>Loading members directory from secure vault...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Users size={36} className="mx-auto text-slate-400 dark:text-slate-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No authorized members found</h3>
                  <p className="text-xs text-slate-400 mt-1">Try resetting filters or search query to find people.</p>
                </div>
                <button 
                  onClick={openCreateWizard}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Select All Checkbox bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/55 dark:bg-[#14161A]/50 border-b border-slate-200 dark:border-[#252931] text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider select-none">
                  <input
                    id="selectAllMembers"
                    type="checkbox"
                    checked={selectedIds.length === members.length && members.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="selectAllMembers" className="cursor-pointer">Select All ({members.length} total)</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {members.map((member) => {
                    const isRowSelected = selectedIds.includes(member.id);
                    const mUsername = member.username || member.name.toLowerCase();
                    const mPhone = member.phone || "+91 98200 12345";
                    const joinedDate = member.createdAt ? (
                      new Date(member.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      member.joinedAt || "Unknown"
                    );
                    const lastLogin = member.lastLoginAt ? (
                      new Date(member.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    ) : (
                      "Never signed in"
                    );

                    return (
                      <div
                        key={member.id}
                        className={`group relative border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[#6B93FF]/5 overflow-hidden font-sans ${
                          isRowSelected
                            ? "border-blue-500 bg-blue-500/[0.02] dark:border-[#6B93FF] dark:bg-[#6B93FF]/[0.02]"
                            : "bg-white dark:bg-[#101114] border-slate-200 dark:border-[#252931]/80 hover:border-blue-500/40 dark:hover:border-[#6B93FF]/40"
                        }`}
                      >
                        {/* Glowing Top Edge Accent on hover */}
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                          member.role === "SUPER_ADMIN"
                            ? "from-purple-500/0 via-purple-500 to-purple-500/0"
                            : member.role === "ADMIN"
                            ? "from-blue-500/0 via-blue-500 to-blue-500/0"
                            : "from-[#6B93FF]/0 via-[#6B93FF] to-[#6B93FF]/0"
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                        {/* Top Header Row with Select Checkbox, Profile & Actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Checkbox */}
                            <div className="pt-1.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={(e) => handleSelectRow(member.id, e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                              />
                            </div>

                            {/* Avatar & Info */}
                            <div
                              onClick={() => router.push(`/admin/members/${member.id}`)}
                              className="flex items-center gap-3 cursor-pointer group min-w-0"
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={member.avatar || "/oggy.png"}
                                  alt={member.name}
                                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#15171D] transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                                <span
                                  className={`w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#101114] absolute -bottom-0.5 -right-0.5 ${
                                    member.status === "ACTIVE"
                                      ? "bg-emerald-500"
                                      : member.status === "SUSPENDED"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-xs text-slate-800 dark:text-[#F5F7FA] group-hover:text-blue-500 dark:group-hover:text-[#6B93FF] transition-colors leading-tight truncate">
                                  {member.name}
                                </h4>
                                <span className="text-[10px] text-slate-400 dark:text-[#858D99] block truncate mt-0.5">
                                  @{mUsername}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions drop-down toggle */}
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setActiveDropdownRow(activeDropdownRow === member.id ? null : member.id)}
                              className="p-1.5 text-slate-400 dark:text-[#858D99] hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E222B] transition-colors cursor-pointer"
                              title="Member Options"
                            >
                              <DotsThreeOutlineVertical size={16} weight="bold" />
                            </button>

                            {/* Dropdown Menu & Backdrop */}
                            {activeDropdownRow === member.id && (
                              <>
                                {/* Click Outside Backdrop */}
                                <div
                                  className="fixed inset-0 z-30 cursor-default"
                                  onClick={() => setActiveDropdownRow(null)}
                                />

                                <div className="absolute right-0 mt-1.5 w-48 bg-white/95 dark:bg-[#15171D]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#272B35] rounded-2xl shadow-2xl p-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    onClick={() => {
                                      setActiveDropdownRow(null);
                                      router.push(`/admin/members/${member.id}`);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                  >
                                    <PencilSimple size={15} className="text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                                    <span>View & Manage</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveDropdownRow(null);
                                      handleResetPassword(member);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                  >
                                    <Key size={15} className="text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                                    <span>Reset Password</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100 dark:border-[#252931]" />

                                  {member.role === "MEMBER" ? (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownRow(null);
                                        handleRoleChangeSubmit(member, "ADMIN");
                                      }}
                                      className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                    >
                                      <ShieldCheck size={15} className="text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                                      <span>Promote to Admin</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownRow(null);
                                        handleRoleChangeSubmit(member, "MEMBER");
                                      }}
                                      className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                    >
                                      <ShieldCheck size={15} className="text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                                      <span>Demote to Member</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setActiveDropdownRow(null);
                                      handleRevokeSessions(member);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                  >
                                    <Keyhole size={15} className="text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                                    <span>Revoke Sessions</span>
                                  </button>

                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => {
                                        togglePasswordReveal(member.id);
                                        setActiveDropdownRow(null);
                                      }}
                                      className="w-full px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-[#20242F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                    >
                                      {revealedPasswords[member.id] ? <EyeSlash size={15} /> : <Eye size={15} />}
                                      <span>{revealedPasswords[member.id] ? "Hide Password" : "See Password"}</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-slate-100 dark:border-[#252931]" />

                                  <button
                                    onClick={() => {
                                      setActiveDropdownRow(null);
                                      handleToggleSuspend(member);
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-semibold flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group ${
                                      member.status === "SUSPENDED"
                                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300"
                                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300"
                                    }`}
                                  >
                                    <Prohibit size={15} className="shrink-0" />
                                    <span>{member.status === "SUSPENDED" ? "Reactivate Account" : "Suspend Account"}</span>
                                  </button>

                                  {member.role !== "SUPER_ADMIN" && member.username !== "ankitgod" && (
                                    <button
                                      onClick={() => handleDeleteMember(member)}
                                      className="w-full px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer group"
                                    >
                                      <Trash size={15} className="text-rose-500 shrink-0" />
                                      <span>Delete Profile</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges row */}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-[#252931]/40">
                          {/* Role Badge */}
                          {member.role === "SUPER_ADMIN" ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-purple-500/10 text-purple-650 dark:text-[#C59BFF] border border-purple-500/20">
                              SUPER ADMIN
                            </span>
                          ) : member.role === "ADMIN" ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-blue-500/10 text-blue-650 dark:text-[#6B93FF] border border-blue-500/20">
                              ADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-[#AEB5C0] border border-slate-200 dark:border-slate-700">
                              MEMBER
                            </span>
                          )}

                          {/* Status Badge */}
                          {member.status === "ACTIVE" ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-650 dark:text-[#32C98B] border border-emerald-500/20">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-650 dark:text-[#F3B85B] border border-amber-500/20">
                              Suspended
                            </span>
                          )}

                          {/* Verification Badge */}
                          {member.isVerified ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
                              Unverified
                            </span>
                          )}
                        </div>

                        {/* Info details */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#252931]/40 flex flex-col gap-2 text-[10px] text-slate-400 dark:text-[#858D99]">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ClockCountdown size={13} className="text-slate-400 dark:text-slate-500" />
                              <span>Last login:</span>
                            </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lastLogin}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CalendarBlank size={13} className="text-slate-400 dark:text-slate-500" />
                              <span>Joined:</span>
                            </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{joinedDate}</span>
                          </div>

                          {isSuperAdmin && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Key size={13} className="text-slate-400 dark:text-slate-500" />
                                <span>Password:</span>
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {revealedPasswords[member.id] ? (member.password || "user123") : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(member.id)}
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-[#6B93FF] transition-colors cursor-pointer"
                                  title={revealedPasswords[member.id] ? "Hide Password" : "See Password"}
                                >
                                  {revealedPasswords[member.id] ? <EyeSlash size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400 dark:text-slate-500" />
                                <span>Phone:</span>
                              </span>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{mPhone}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer action button */}
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/members/${member.id}`)}
                            className="w-full text-center py-2.5 rounded-xl bg-slate-50 hover:bg-slate-105 dark:bg-[#15171C] dark:hover:bg-[#1C2026] border border-slate-200 dark:border-[#252931] hover:border-slate-300 dark:hover:border-slate-750 text-[10px] font-bold text-slate-700 dark:text-[#AEB5C0] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            View & Manage Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
                  {isSuperAdmin ? (
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">USERNAME * (Lowercase, no spaces)</label>
                      <input
                        type="text"
                        placeholder="e.g. niranjan"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (wizardStep === 1 && !isLoading) handleCreateMemberSubmit();
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">USERNAME</label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={formUsername || (formName ? formName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "auto-generated")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] text-xs text-slate-500 cursor-not-allowed select-none opacity-80"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Username is automatically generated for new accounts.</span>
                    </div>
                  )}

                  <div className="relative">
                    <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">ASSIGN USER ROLE</label>
                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none font-semibold text-slate-705 dark:text-slate-200 cursor-pointer flex items-center justify-between transition-colors hover:bg-slate-100/50 dark:hover:bg-[#15171D]"
                    >
                      <span>
                        {formRole === "MEMBER" && "Member (Standard member access)"}
                        {formRole === "ADMIN" && "Admin (Manage IPOs and transactions)"}
                      </span>
                      <CaretDown size={14} className={`text-slate-400 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isRoleDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsRoleDropdownOpen(false)} />
                        
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl shadow-lg z-30 divide-y divide-slate-100 dark:divide-[#252931]/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          {[
                            { value: "MEMBER", title: "Member", desc: "Standard member access" },
                            { value: "ADMIN", title: "Admin", desc: "Manage IPOs and transactions" },
                          ].map((roleOpt) => (
                            <button
                              key={roleOpt.value}
                              type="button"
                              onClick={() => {
                                setFormRole(roleOpt.value as any);
                                if (roleOpt.value !== "SUPER_ADMIN") setIsSuperAdminConfirmed(false);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1C2026] flex flex-col transition-colors cursor-pointer ${
                                formRole === roleOpt.value ? "bg-blue-500/5 dark:bg-blue-500/10" : ""
                              }`}
                            >
                              <span className={`text-xs font-bold ${formRole === roleOpt.value ? "text-blue-600 dark:text-[#6B93FF]" : "text-slate-850 dark:text-slate-200"}`}>
                                {roleOpt.title}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-[#858D99] mt-0.5">
                                {roleOpt.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}


                  </div>

                  {isSuperAdmin && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-805">
                      <div className="flex items-center justify-between pb-1.5">
                        <label className="text-[10px] font-extrabold text-slate-450 dark:text-[#858D99] uppercase tracking-wider block mb-1.5 font-bold">PASSWORD *</label>
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
                          placeholder="At least 6 characters"
                          value={formPassword}
                          onChange={(e) => {
                            setFormPassword(e.target.value);
                            setFormConfirmPassword(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (wizardStep === 1 && !isLoading) handleCreateMemberSubmit();
                            }
                          }}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs focus:outline-none"
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
                  )}
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
