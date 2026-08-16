"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserGear,
  Key,
  Prohibit,
  CheckCircle,
  Pulse,
  Eye,
  MagnifyingGlass,
  X,
  Shield,
  ClockCountdown,
  Check,
  Megaphone,
  Phone,
  ChatCircleDots,
  TrendUp,
  CalendarBlank,
} from "@phosphor-icons/react";
import { Member, MemberRole, MemberStatus, MemberPermissions } from "@/types/nexo";
import { MOCK_MEMBERS } from "@/lib/mockData";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import { SendNotificationModal } from "./SendNotificationModal";
import { AdminDataCache } from "@/lib/adminDataCache";

export function SuperAdminMemberManagement() {
  const router = useRouter();
  const { currentUser, ipos, openDirectChatWithUser } = useNexo();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const getAppliedIpoCount = useCallback((member: Member): number => {
    if (!ipos || ipos.length === 0) return 0;
    return ipos.filter((ipo) => {
      if (!ipo.applications || ipo.applications.length === 0) return false;
      return ipo.applications.some((app: any) => {
        const isDirectMatch =
          app.memberId === member.id ||
          (app.applicantName && app.applicantName.toLowerCase() === member.name.toLowerCase());
        const isParticipantMatch =
          Array.isArray(app.participants) &&
          app.participants.some(
            (p: any) =>
              p.memberId === member.id ||
              (p.memberName && p.memberName.toLowerCase() === member.name.toLowerCase())
          );
        return isDirectMatch || isParticipantMatch;
      });
    }).length;
  }, [ipos]);

  const getFeaturedMemberTheme = useCallback((member: Member) => {
    const u = (member.username || member.name || "").toLowerCase().trim();

    // Super Admin: Sky Blue
    if (member.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") {
      return {
        isFeatured: true,
        roleBadge: "SUPER ADMIN",
        cardContainer: "bg-white dark:bg-[#0c121c] border-sky-300 dark:border-sky-500/40 hover:border-sky-400 shadow-md dark:shadow-[0_0_20px_rgba(14,165,233,0.12)]",
        topAccent: "from-sky-400/0 via-sky-500 to-sky-400/0",
        avatarAura: "from-sky-500/20 via-blue-500/15 to-cyan-400/20 dark:from-sky-600/40 dark:via-blue-600/30 dark:to-cyan-400/40",
        avatarRim: "from-sky-500 via-blue-500 to-cyan-400 shadow-[0_0_12px_rgba(14,165,233,0.25)] dark:shadow-[0_0_18px_rgba(14,165,233,0.35)]",
        statusPing: "bg-sky-400",
        statusDot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]",
        badgePill: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 font-bold",
        badgeDot: "bg-sky-500 dark:bg-sky-400",
        nameHover: "text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400",
        usernameTag: "text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200 dark:text-sky-300 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:border-sky-500/30",
        phoneTag: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-[#13161C] dark:border-[#1E232B]",
        phoneIcon: "text-sky-600 dark:text-sky-400",
        statsCard: "bg-slate-50 border-slate-200 dark:bg-[#13161C] dark:border-[#1E232B]",
        statsIcon: "text-sky-600 dark:text-sky-400",
        statsVal: "text-slate-900 dark:text-white",
        statsMuted: "text-slate-600 dark:text-slate-300",
        footerBorder: "border-slate-100 dark:border-[#1E232B]",
        verifiedBadge: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-400",
        verifiedIcon: "text-sky-600 dark:text-sky-400",
        messageBtn: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm shadow-sky-500/25",
        youBadge: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-[#13161C] dark:border-[#1E232B] dark:text-sky-300",
      };
    }

    // aanikett: Emerald Jade Green
    if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") {
      return {
        isFeatured: true,
        roleBadge: "CORE MEMBER",
        cardContainer: "bg-white dark:bg-[#0c1713] border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-400 shadow-md dark:shadow-[0_0_20px_rgba(16,185,129,0.12)]",
        topAccent: "from-teal-400/0 via-emerald-500 to-teal-400/0",
        avatarAura: "from-emerald-500/20 via-teal-500/15 to-cyan-400/20 dark:from-emerald-600/40 dark:via-teal-600/30 dark:to-cyan-400/40",
        avatarRim: "from-emerald-500 via-teal-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] dark:shadow-[0_0_18px_rgba(16,185,129,0.35)]",
        statusPing: "bg-emerald-400",
        statusDot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
        badgePill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-bold",
        badgeDot: "bg-emerald-500 dark:bg-emerald-400",
        nameHover: "text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400",
        usernameTag: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/30",
        phoneTag: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-[#13161C] dark:border-[#1E232B]",
        phoneIcon: "text-emerald-600 dark:text-emerald-400",
        statsCard: "bg-slate-50 border-slate-200 dark:bg-[#13161C] dark:border-[#1E232B]",
        statsIcon: "text-emerald-600 dark:text-emerald-400",
        statsVal: "text-slate-900 dark:text-white",
        statsMuted: "text-slate-600 dark:text-slate-300",
        footerBorder: "border-slate-100 dark:border-[#1E232B]",
        verifiedBadge: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400",
        verifiedIcon: "text-emerald-600 dark:text-emerald-400",
        messageBtn: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/25",
        youBadge: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-[#13161C] dark:border-[#1E232B] dark:text-emerald-300",
      };
    }

    // shivam_p: Royal Violet Tier
    if (u === "shivam_p" || u.startsWith("shivam")) {
      return {
        isFeatured: true,
        roleBadge: member.role === "ADMIN" ? "CORE ADMIN" : "CORE MEMBER",
        cardContainer: "bg-white dark:bg-[#140c1e] border-purple-300 dark:border-purple-500/40 hover:border-purple-400 shadow-md dark:shadow-[0_0_20px_rgba(168,85,247,0.12)]",
        topAccent: "from-purple-400/0 via-purple-500 to-purple-400/0",
        avatarAura: "from-purple-500/20 via-indigo-500/15 to-pink-400/20 dark:from-purple-600/40 dark:via-indigo-600/30 dark:to-pink-500/40",
        avatarRim: "from-purple-500 via-indigo-500 to-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)] dark:shadow-[0_0_18px_rgba(168,85,247,0.35)]",
        statusPing: "bg-purple-400",
        statusDot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
        badgePill: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30 font-bold",
        badgeDot: "bg-purple-500 dark:bg-purple-400",
        nameHover: "text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400",
        usernameTag: "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200 dark:text-purple-300 dark:bg-purple-500/15 dark:hover:bg-purple-500/25 dark:border-purple-500/30",
        phoneTag: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-[#13161C] dark:border-[#1E232B]",
        phoneIcon: "text-purple-600 dark:text-purple-400",
        statsCard: "bg-slate-50 border-slate-200 dark:bg-[#13161C] dark:border-[#1E232B]",
        statsIcon: "text-purple-600 dark:text-purple-400",
        statsVal: "text-slate-900 dark:text-white",
        statsMuted: "text-slate-600 dark:text-slate-300",
        footerBorder: "border-slate-100 dark:border-[#1E232B]",
        verifiedBadge: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400",
        verifiedIcon: "text-purple-600 dark:text-purple-400",
        messageBtn: "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-sm shadow-purple-500/25",
        youBadge: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-[#13161C] dark:border-[#1E232B] dark:text-purple-300",
      };
    }

    // Default Member Theme
    return {
      isFeatured: false,
      roleBadge: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
      cardContainer: "bg-white dark:bg-[#0d0f14] border-slate-200 dark:border-[#1E232B] hover:border-slate-400 dark:hover:border-[#2E3542] shadow-md",
      topAccent: "from-blue-500/0 via-blue-500 to-blue-500/0",
      avatarAura: "",
      avatarRim: "",
      statusPing: "bg-emerald-400",
      statusDot: "bg-emerald-500",
      badgePill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold",
      badgeDot: "bg-blue-500 dark:bg-slate-400",
      nameHover: "text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400",
      usernameTag: "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:text-slate-300 dark:bg-[#13161C] dark:border-[#1E232B]",
      phoneTag: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-[#13161C] dark:border-[#1E232B]",
      phoneIcon: "text-slate-500 dark:text-slate-400",
      statsCard: "bg-slate-50 border-slate-200 dark:bg-[#13161C] dark:border-[#1E232B]",
      statsIcon: "text-blue-600 dark:text-slate-400",
      statsVal: "text-slate-900 dark:text-white",
      statsMuted: "text-slate-600 dark:text-slate-300",
      footerBorder: "border-slate-100 dark:border-[#1E232B]",
      verifiedBadge: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-300",
      verifiedIcon: "text-emerald-600 dark:text-emerald-400",
      messageBtn: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25",
      youBadge: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-[#13161C] dark:border-[#1E232B] dark:text-slate-300",
    };
  }, []);

  const [isSendNotifOpen, setIsSendNotifOpen] = useState(false);

  const [members, setMembers] = useState<Member[]>(() => {
    return AdminDataCache.get<Member[]>("admin_members_list") || (MOCK_MEMBERS as any);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !AdminDataCache.has("admin_members_list");
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SUPER_ADMIN" | "MEMBER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [permissionsMember, setPermissionsMember] = useState<Member | null>(null);
  const [activityMember, setActivityMember] = useState<Member | null>(null);
  const [resetPassMember, setResetPassMember] = useState<Member | null>(null);

  // Form states for Create User
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("+91 98200 12345");
  const [newMemberPan, setNewMemberPan] = useState("ABCDE1234F");
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>("MEMBER");
  const [newMemberStatus, setNewMemberStatus] = useState<MemberStatus>("ACTIVE");
  const [newMemberContribution, setNewMemberContribution] = useState(50000);

  // Form state for Reset Password
  const [customResetPass, setCustomResetPass] = useState("");

  // Form state for Permissions
  const [tempPermissions, setTempPermissions] = useState<MemberPermissions>({
    canSubmitApplications: true,
    canDistributeProfit: false,
    canEditIpos: false,
    canAccessAdminConsole: false,
    canManageMembers: false,
  });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const freshMembers = await AdminDataCache.fetchSWR(
        "admin_members_list",
        async () => {
          const res = await fetch("/api/admin/members");
          const data = await res.json();
          if (data?.success && Array.isArray(data.members) && data.members.length > 0) {
            return data.members;
          }
          const fallbackRes = await fetch("/api/members");
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.success && Array.isArray(fallbackData.members)) {
            return fallbackData.members;
          }
          return MOCK_MEMBERS as any;
        },
        {
          ttlMs: 30000,
          onUpdate: (data) => {
            if (Array.isArray(data) && data.length > 0) setMembers(data);
          },
        }
      );
      if (Array.isArray(freshMembers) && freshMembers.length > 0) {
        setMembers(freshMembers);
      }
    } catch {
      // Keep existing cached state on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCreateModalOpen(false);
        setEditingMember(null);
        setPermissionsMember(null);
        setActivityMember(null);
        setResetPassMember(null);
        setIsSendNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const isInternalEmail = m.email.endsWith("@nexo.private") || m.email.endsWith("@nexo.io");
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (!isInternalEmail && m.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole =
        roleFilter === "ALL"
          ? true
          : roleFilter === "SUPER_ADMIN"
          ? m.role === "SUPER_ADMIN"
          : m.role === "MEMBER";

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : (m.status || "ACTIVE") === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const totalMembersCount = members.length;
  const activeMembersCount = members.filter((m) => (m.status || "ACTIVE") === "ACTIVE").length;
  const adminMembersCount = members.filter((m) => m.role === "SUPER_ADMIN").length;
  const suspendedMembersCount = members.filter((m) => m.status === "SUSPENDED").length;

  // ── HANDLERS ──

  // 1. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberUsername.trim()) return;

    const payload = {
      name: newMemberName.trim(),
      username: newMemberUsername.trim().toLowerCase(),
      password: newMemberPassword.trim() || "user123",
      email: newMemberEmail.trim() || `${newMemberUsername.trim().toLowerCase()}@nexo.private`,
      phone: newMemberPhone,
      panFull: newMemberPan,
      panMasked: newMemberPan,
      role: newMemberRole,
      status: newMemberStatus,
      defaultContribution: newMemberContribution,
    };

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ User ${newMemberName} (${newMemberRole}) created successfully.`);
        fetchMembers();
      } else {
        showToast(`✓ User ${newMemberName} created locally.`);
        setMembers((prev) => [...prev, { id: `mem_${Date.now()}`, ...payload, avatar: "/oggy.png", joinedAt: "Just now" }]);
      }
    } catch {
      setMembers((prev) => [...prev, { id: `mem_${Date.now()}`, ...payload, avatar: "/oggy.png", joinedAt: "Just now" }]);
      showToast(`✓ User ${newMemberName} created.`);
    } finally {
      setIsCreateModalOpen(false);
      resetCreateForm();
    }
  };

  const resetCreateForm = () => {
    setNewMemberName("");
    setNewMemberUsername("");
    setNewMemberPassword("");
    setNewMemberEmail("");
    setNewMemberPhone("+91 98200 12345");
    setNewMemberPan("ABCDE1234F");
    setNewMemberRole("MEMBER");
    setNewMemberStatus("ACTIVE");
    setNewMemberContribution(50000);
  };

  // 2. Toggle Status (Activate / Suspend)
  const handleToggleStatus = async (member: Member) => {
    const nextStatus: MemberStatus = (member.status || "ACTIVE") === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const updatedMembers = members.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m));
    setMembers(updatedMembers);
    AdminDataCache.set("admin_members_list", updatedMembers);

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, status: nextStatus }),
      });
    } catch {}

    showToast(
      `✓ Member ${member.name} access set to ${nextStatus}.`
    );
  };

  // 3. Toggle Role (MEMBER <-> ADMIN)
  const handleAssignRole = async (member: Member, newRole: MemberRole) => {
    const updatedMembers = members.map((m) => (m.id === member.id ? { ...m, role: newRole } : m));
    setMembers(updatedMembers);
    AdminDataCache.set("admin_members_list", updatedMembers);

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, role: newRole }),
      });
    } catch {}

    showToast(`✓ Assigned role ${newRole} to ${member.name}.`);
  };

  // 4. Reset Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassMember || !customResetPass.trim()) return;

    const updatedMembers = members.map((m) =>
      m.id === resetPassMember.id ? { ...m, password: customResetPass.trim() } : m
    );
    setMembers(updatedMembers);
    AdminDataCache.set("admin_members_list", updatedMembers);

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetPassMember.id, password: customResetPass.trim() }),
      });
    } catch {}

    showToast(`✓ Password reset successfully for ${resetPassMember.name}.`);
    setResetPassMember(null);
    setCustomResetPass("");
  };

  // 5. Revoke Sessions
  const handleRevokeSessions = async (member: Member) => {
    const revokedTime = new Date().toISOString();
    const updatedMembers = members.map((m) =>
      m.id === member.id ? { ...m, sessionsRevokedAt: revokedTime } : m
    );
    setMembers(updatedMembers);
    AdminDataCache.set("admin_members_list", updatedMembers);

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, sessionsRevokedAt: revokedTime }),
      });
    } catch {}

    showToast(`✓ All active sessions revoked for ${member.name}.`);
  };

  // 6. Manage Permissions Save
  const handleOpenPermissions = (member: Member) => {
    setPermissionsMember(member);
    const defaultPerms: MemberPermissions = {
      canSubmitApplications: member.permissions?.canSubmitApplications ?? true,
      canDistributeProfit: member.permissions?.canDistributeProfit ?? (member.role !== "MEMBER"),
      canEditIpos: member.permissions?.canEditIpos ?? (member.role !== "MEMBER"),
      canAccessAdminConsole: member.permissions?.canAccessAdminConsole ?? (member.role !== "MEMBER"),
      canManageMembers: member.permissions?.canManageMembers ?? (member.role === "SUPER_ADMIN"),
    };
    setTempPermissions(defaultPerms);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsMember) return;

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: permissionsMember.id, permissions: tempPermissions }),
      });
    } catch {}

    setMembers((prev) =>
      prev.map((m) =>
        m.id === permissionsMember.id ? { ...m, permissions: tempPermissions } : m
      )
    );
    showToast(`✓ Updated system permissions for ${permissionsMember.name}.`);
    setPermissionsMember(null);
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-900 dark:text-[#F5F7FA] pb-12">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-[#102C22] border border-emerald-200 dark:border-[#32C98B]/20 text-emerald-800 dark:text-[#32C98B] text-xs font-bold rounded-2xl flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-emerald-600 dark:text-[#32C98B] shrink-0" weight="fill" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 dark:text-[#32C98B] hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-[#101114] border border-slate-200/90 dark:border-[#252931] rounded-3xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-[#6B93FF] bg-blue-50 dark:bg-[#17233D] border border-blue-200 dark:border-[#6B93FF]/30 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              SUPER ADMIN
            </span>
            <span className="text-slate-300 dark:text-[#626A75]">•</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#858D99]">User Security Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
            <UserGear size={26} className="text-blue-600 dark:text-[#6B93FF]" />
            MEMBER MANAGEMENT
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-[#858D99] mt-0.5">
            Provision accounts, assign roles, manage passwords, revoke sessions, and configure granular permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsSendNotifOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-[#6B93FF] font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Megaphone size={18} weight="bold" />
            <span>Send Notification</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 dark:hover:bg-[#7BA0FF] text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-md cursor-pointer active:scale-[0.98]"
          >
            <UserPlus size={18} weight="bold" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-[#858D99]">
            <Users size={16} weight="bold" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Members</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-[#F5F7FA]">
            {totalMembersCount}
            <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Users</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-[#32C98B]">
            <Pulse size={16} weight="bold" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Accounts</span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-[#32C98B]">
            {activeMembersCount}
            <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-[#6B93FF]">
            <ShieldCheck size={16} weight="bold" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Admins & Super</span>
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-[#6B93FF]">
            {adminMembersCount}
            <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Admins</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-[#FF6B6B]">
            <Prohibit size={16} weight="bold" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Suspended</span>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-[#FF6B6B]">
            {suspendedMembersCount}
            <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Blocked</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0D0F12] border border-slate-200 dark:border-[#1E232B] p-2.5 rounded-2xl shadow-sm font-sans select-none">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name, @username, or phone number..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-[#13161C] border border-slate-200 dark:border-[#252931] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-sans transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#13161C] p-1 rounded-xl border border-slate-200 dark:border-[#252931] shrink-0 font-sans">
          {(["ALL", "SUPER_ADMIN", "MEMBER"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                roleFilter === tab
                  ? "bg-blue-600 text-white font-extrabold shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold hover:bg-slate-200/50 dark:hover:bg-[#1E232B]"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "SUPER_ADMIN" ? "Super Admin" : "Members"}
            </button>
          ))}
        </div>
      </div>

      {/* ── MEMBER CARDS GRID ── */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0D0F12] border border-slate-200 dark:border-[#1E232B] rounded-2xl space-y-2">
          <Users size={36} className="mx-auto text-slate-400 dark:text-slate-600" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No members found</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500">Try searching with a different keyword</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const mUsername = member.username || member.name.toLowerCase();
            const mPhone = member.phone || "+91 98200 12345";
            const appliedCount = getAppliedIpoCount(member);
            const theme = getFeaturedMemberTheme(member);

            return (
              <div
                key={member.id}
                className={`group relative rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden font-sans border ${theme.cardContainer} hover:-translate-y-1`}
              >
                {/* Subtle Top Accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${theme.topAccent} ${theme.isFeatured ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity duration-300`} />

                <div className="space-y-4">
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar with Animated Status & Multi-Tone Frame */}
                      <div className="relative shrink-0">
                        {theme.isFeatured ? (
                          <div className="relative">
                            {/* Ambient Breathing Background Aura */}
                            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-tr ${theme.avatarAura} blur-md animate-pulse pointer-events-none opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-500`} />
                            
                            {/* Fluid Animated Gradient Border Frame */}
                            <div className={`relative p-[2.5px] rounded-2xl bg-gradient-to-tr ${theme.avatarRim} bg-[length:200%_200%] animate-[gradientShift_4s_ease_infinite] transition-all duration-300`}>
                              <div className="w-13 h-13 rounded-[13.5px] overflow-hidden bg-slate-900 relative group/img">
                                <img
                                  src={member.avatar || "/oggy.png"}
                                  alt={member.name}
                                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                                />
                              </div>

                              {/* Live Status Orb */}
                              <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                                <span className={`animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full ${theme.statusPing} opacity-75`} />
                                <span
                                  className={`relative inline-flex w-3.5 h-3.5 rounded-full ${theme.statusDot} ring-2 ring-white dark:ring-[#0D0F14]`}
                                  title={`${member.name} Online`}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative p-[1.5px] rounded-2xl bg-slate-900 border border-slate-700 dark:border-[#252931] shadow-sm transition-all duration-300">
                            <div className="w-13 h-13 rounded-[14px] overflow-hidden bg-slate-900">
                              <img
                                src={member.avatar || "/oggy.png"}
                                alt={member.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <span
                              className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0D0F14] absolute -bottom-0.5 -right-0.5 shadow-xs"
                              title="Active Member"
                            />
                          </div>
                        )}
                      </div>

                      {/* Name, Username & Phone */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => router.push(`/admin/members/${member.id}`)}
                            className={`text-base font-black transition-colors truncate tracking-tight cursor-pointer ${theme.nameHover} hover:underline`}
                            title="Click to view detailed member IPO history & PnL"
                          >
                            {member.name}
                          </h3>
                          {theme.isFeatured && (
                            <span className={`relative inline-flex items-center px-2.5 py-0.5 rounded-full ${theme.badgePill} text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 overflow-hidden shadow-2xs`}>
                              <span className="relative z-10 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot} animate-pulse`} />
                                <span>{theme.roleBadge}</span>
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Username Tag & Phone Badge */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/members/${member.id}`)}
                            className={`inline-flex items-center gap-1 text-xs font-sans font-semibold tracking-tight px-2.5 py-0.5 rounded-lg border transition-all shadow-2xs cursor-pointer active:scale-95 ${theme.usernameTag}`}
                            title={`Click to view member profile @${mUsername}`}
                          >
                            @{mUsername}
                          </button>

                          <div className={`inline-flex items-center gap-1 text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-lg border shadow-2xs ${theme.phoneTag}`}>
                            <Phone size={11} className={theme.phoneIcon} /> {mPhone}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {theme.roleBadge === "SUPER ADMIN" || member.role === "SUPER_ADMIN" ? (
                      <div className={`p-3 rounded-xl border transition-all space-y-1 ${theme.statsCard}`}>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                          <ShieldCheck size={13} className={theme.statsIcon} />
                          <span>Platform Role</span>
                        </div>
                        <p className={`text-xs font-extrabold font-sans truncate mt-0.5 ${theme.statsVal}`}>
                          Super Admin
                        </p>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-xl border transition-all space-y-1 ${theme.statsCard}`}>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                          <TrendUp size={13} className={theme.statsIcon} />
                          <span>IPOs Applied</span>
                        </div>
                        <p className={`text-base font-black font-sans ${theme.statsVal}`}>
                          {appliedCount}{" "}
                          <span className="text-xs text-slate-400 font-sans font-normal">
                            {appliedCount === 1 ? "IPO" : "IPOs"}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className={`p-3 rounded-xl border transition-all space-y-1 ${theme.statsCard}`}>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                        <CalendarBlank size={13} className={theme.statsIcon} />
                        <span>Member Since</span>
                      </div>
                      <p className={`text-xs font-bold truncate mt-0.5 ${theme.statsMuted}`}>
                        {member.joinedAt || "Jan 2025"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className={`pt-4 mt-4 border-t flex items-center justify-between text-xs ${theme.footerBorder}`}>
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-2xs ${theme.verifiedBadge}`}>
                    <ShieldCheck size={14} className={theme.verifiedIcon} /> Verified Member
                  </span>

                  <div className="flex items-center gap-1.5">
                    {member.id === currentUser?.id ? (
                      <span className={`px-3 py-1 rounded-xl font-bold text-xs border ${theme.youBadge}`}>
                        You
                      </span>
                    ) : (
                      <button
                        onClick={() => openDirectChatWithUser(member.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${theme.messageBtn}`}
                        title={`Message @${mUsername}`}
                      >
                        <ChatCircleDots size={14} weight="bold" />
                        <span>Message</span>
                        <span className="text-white/80 font-sans font-normal">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL 1: CREATE USER ═══ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#343943] rounded-3xl overflow-hidden shadow-2xl space-y-5 text-slate-900 dark:text-[#F5F7FA]">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-[#252931] bg-slate-50/80 dark:bg-[#101114] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Create New User</h3>
                  <p className="text-xs text-slate-500 dark:text-[#858D99]">
                    Assign login credentials & role for platform access.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 pt-0 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-[#AEB5C0] mb-1 font-extrabold">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ashay Verma"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#AEB5C0] mb-1 font-extrabold">Assign Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ashay"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#AEB5C0] mb-1 font-extrabold">Assign Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. user123"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                  />
                </div>



                <div>
                  <label className="block text-slate-700 dark:text-[#AEB5C0] mb-1 font-extrabold">Email Address</label>
                  <input
                    type="email"
                    placeholder="ashay@nexo.private"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#AEB5C0] mb-1 font-extrabold">PAN Card Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="ABCDE1234F"
                    value={newMemberPan}
                    onChange={(e) => setNewMemberPan(e.target.value.toUpperCase())}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-mono font-bold uppercase text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1B1E23]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#343943] text-slate-600 dark:text-[#AEB5C0] font-bold text-xs hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 text-white dark:text-[#101114] font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 2: RESET PASSWORD ═══ */}
      {resetPassMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#343943] rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-[#F5F7FA]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-[#302714] text-amber-600 dark:text-[#F3B85B] flex items-center justify-center font-bold">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-black">Reset Password</h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99]">
                  For member: <strong className="text-slate-800 dark:text-[#F5F7FA]">{resetPassMember.name}</strong> (@{resetPassMember.username})
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#AEB5C0] mb-1">
                  New Assigned Password
                </label>
                <input
                  type="text"
                  required
                  value={customResetPass}
                  onChange={(e) => setCustomResetPass(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomResetPass(`pass_${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-xs text-blue-600 dark:text-[#6B93FF] font-bold hover:underline cursor-pointer"
                >
                  ⚡ Auto-generate Password
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPassMember(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#343943] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 dark:bg-[#F3B85B] text-white dark:text-[#101114] font-extrabold text-xs cursor-pointer shadow-md"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 3: MANAGE PERMISSIONS ═══ */}
      {permissionsMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#343943] rounded-3xl overflow-hidden shadow-2xl space-y-5 text-slate-900 dark:text-[#F5F7FA]">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-[#252931] bg-slate-50/80 dark:bg-[#101114] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Granular System Permissions</h3>
                  <p className="text-xs text-slate-500 dark:text-[#858D99]">
                    Configure operational rights for <strong className="text-slate-800 dark:text-[#F5F7FA]">{permissionsMember.name}</strong>.
                  </p>
                </div>
              </div>
              <button onClick={() => setPermissionsMember(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Permission Toggles */}
            <form onSubmit={handleSavePermissions} className="p-6 pt-0 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">Submit IPO Bids & Applications</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#858D99]">Allow member to participate in group IPO applications.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermissions.canSubmitApplications}
                  onChange={(e) => setTempPermissions((p) => ({ ...p, canSubmitApplications: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 dark:accent-[#6B93FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">Distribute Profit & Allotment</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#858D99]">Publish allotment earnings to user workspace.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermissions.canDistributeProfit}
                  onChange={(e) => setTempPermissions((p) => ({ ...p, canDistributeProfit: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 dark:accent-[#6B93FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">Publish &amp; Edit IPO Catalog</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#858D99]">Add new IPOs and modify metrics.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermissions.canEditIpos}
                  onChange={(e) => setTempPermissions((p) => ({ ...p, canEditIpos: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 dark:accent-[#6B93FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">Admin Console Access</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#858D99]">Access /admin routes and management dashboards.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermissions.canAccessAdminConsole}
                  onChange={(e) => setTempPermissions((p) => ({ ...p, canAccessAdminConsole: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 dark:accent-[#6B93FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">Manage System Members (Super Admin)</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#858D99]">Provision users, reset passwords, and manage rights.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermissions.canManageMembers}
                  onChange={(e) => setTempPermissions((p) => ({ ...p, canManageMembers: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 dark:accent-[#6B93FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1B1E23]">
                <button
                  type="button"
                  onClick={() => setPermissionsMember(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#343943] text-slate-600 dark:text-[#AEB5C0] font-bold text-xs hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 text-white dark:text-[#101114] font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 4: VIEW USER ACTIVITY ═══ */}
      {activityMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#343943] rounded-3xl overflow-hidden shadow-2xl space-y-5 text-slate-900 dark:text-[#F5F7FA]">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-[#252931] bg-slate-50/80 dark:bg-[#101114] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activityMember.avatar || "/oggy.png"}
                  alt={activityMember.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40"
                />
                <div>
                  <h3 className="text-lg font-black tracking-tight">{activityMember.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#858D99]">
                    @{activityMember.username || "user"} · {activityMember.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setActivityMember(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Activity Summary Body */}
            <div className="p-6 pt-0 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-[#626A75]">ACCOUNT ROLE</p>
                  <p className="text-sm font-extrabold text-blue-600 dark:text-[#6B93FF] mt-0.5">{activityMember.role}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-[#626A75]">STATUS</p>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-[#32C98B] mt-0.5">{activityMember.status || "ACTIVE"}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-[#626A75]">PAN CARD</p>
                  <p className="text-xs font-mono font-extrabold text-slate-800 dark:text-[#F5F7FA] mt-0.5">{activityMember.panMasked}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-[#626A75]">DEFAULT CONTRIBUTION</p>
                  <p className="text-xs font-mono font-extrabold text-slate-800 dark:text-[#F5F7FA] mt-0.5">₹{(activityMember.defaultContribution || 50000).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 dark:bg-[#101114] border border-slate-800 dark:border-[#252931] space-y-2">
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">SECURITY & SESSION METRICS</p>
                <div className="flex justify-between py-1 border-b border-slate-800 dark:border-[#252931]">
                  <span className="text-slate-400">Join Date:</span>
                  <span className="font-bold text-white dark:text-[#F5F7FA]">{activityMember.joinedAt || "Jan 2025"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 dark:border-[#252931]">
                  <span className="text-slate-400">Last Active Login:</span>
                  <span className="font-mono text-emerald-400">{activityMember.lastLoginAt || "Today, 02:45 PM"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Sessions Revoked:</span>
                  <span className="font-mono text-slate-300">{activityMember.sessionsRevokedAt ? new Date(activityMember.sessionsRevokedAt).toLocaleString() : "None"}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActivityMember(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-[#6B93FF] text-white dark:text-[#101114] font-extrabold text-xs cursor-pointer"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Broadcast Notification Modal */}
      <SendNotificationModal
        isOpen={isSendNotifOpen}
        onClose={() => setIsSendNotifOpen(false)}
      />
    </div>
  );
}
