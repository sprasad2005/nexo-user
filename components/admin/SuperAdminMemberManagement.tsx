"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ArrowClockwise,
  PencilSimple,
  Trash,
  X,
  LockKey,
  Shield,
  ClockCountdown,
  Coin,
  Buildings,
  Check,
  Warning,
  Megaphone,
} from "@phosphor-icons/react";
import { Member, MemberRole, MemberStatus, MemberPermissions } from "@/types/nexo";
import { MOCK_MEMBERS } from "@/lib/mockData";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import { SendNotificationModal } from "./SendNotificationModal";

export function SuperAdminMemberManagement() {
  const router = useRouter();
  const { currentUser } = useNexo();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [isSendNotifOpen, setIsSendNotifOpen] = useState(false);

  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nexo_cached_admin_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return MOCK_MEMBERS as any;
  });
  const [isLoading, setIsLoading] = useState(false);
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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      const data = await res.json();
      if (data?.success && Array.isArray(data.members) && data.members.length > 0) {
        setMembers(data.members);
        try {
          localStorage.setItem("nexo_cached_admin_members", JSON.stringify(data.members));
        } catch {}
      } else {
        const fallbackRes = await fetch("/api/members");
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.success && Array.isArray(fallbackData.members) && fallbackData.members.length > 0) {
          setMembers(fallbackData.members);
          try {
            localStorage.setItem("nexo_cached_admin_members", JSON.stringify(fallbackData.members));
          } catch {}
        }
      }
    } catch {
      try {
        const fallbackRes = await fetch("/api/members");
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.success && Array.isArray(fallbackData.members) && fallbackData.members.length > 0) {
          setMembers(fallbackData.members);
          try {
            localStorage.setItem("nexo_cached_admin_members", JSON.stringify(fallbackData.members));
          } catch {}
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
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
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, status: nextStatus }),
      });
    } catch {}

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m))
    );
    showToast(
      `✓ Member ${member.name} access set to ${nextStatus}.`
    );
  };

  // 3. Toggle Role (MEMBER <-> ADMIN)
  const handleAssignRole = async (member: Member, newRole: MemberRole) => {
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, role: newRole }),
      });
    } catch {}

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
    );
    showToast(`✓ Assigned role ${newRole} to ${member.name}.`);
  };

  // 4. Reset Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassMember || !customResetPass.trim()) return;

    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetPassMember.id, password: customResetPass.trim() }),
      });
    } catch {}

    setMembers((prev) =>
      prev.map((m) =>
        m.id === resetPassMember.id ? { ...m, password: customResetPass.trim() } : m
      )
    );
    showToast(`✓ Password reset successfully for ${resetPassMember.name}.`);
    setResetPassMember(null);
    setCustomResetPass("");
  };

  // 5. Revoke Sessions
  const handleRevokeSessions = async (member: Member) => {
    const revokedTime = new Date().toISOString();
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, sessionsRevokedAt: revokedTime }),
      });
    } catch {}

    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id ? { ...m, sessionsRevokedAt: revokedTime } : m
      )
    );
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
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#626A75]" />
          <input
            type="text"
            placeholder="Search name, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#626A75] focus:outline-none focus:border-blue-600 dark:focus:border-[#6B93FF]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin Only</option>
            <option value="MEMBER">Members Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* ── MEMBERS DIRECTORY TABLE ── */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#1B1E23] bg-slate-50/50 dark:bg-[#14161A] flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-[#F5F7FA] uppercase tracking-wider">
            System Accounts Directory ({filteredMembers.length})
          </h3>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users size={36} className="text-slate-300 dark:text-[#626A75] mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No Members Found</h4>
            <p className="text-xs text-slate-500 dark:text-[#858D99]">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#252931] bg-slate-50 dark:bg-[#14161A] text-slate-500 dark:text-[#626A75] uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Username & Password</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1B1E23] font-medium">
                {filteredMembers.map((m) => {
                  const isSuspended = m.status === "SUSPENDED";
                  const isAdminRole = m.role === "ADMIN" || m.role === "SUPER_ADMIN";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-[#14161A] transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div
                          onClick={() => router.push(`/admin/members/${m.id}`)}
                          className="flex items-center gap-3 cursor-pointer group/user"
                          title="Click to view detailed IPO history, lots & profit gains"
                        >
                          <img
                            src={m.avatar || "/oggy.png"}
                            alt={m.name}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-[#252931] shrink-0 group-hover/user:ring-2 group-hover/user:ring-blue-500/50 transition-all"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 dark:text-[#F5F7FA] group-hover/user:text-blue-600 dark:group-hover/user:text-[#6B93FF] transition-colors truncate">
                              {m.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-[#858D99] truncate">
                              {m.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Username & Password */}
                      <td className="p-4 font-mono">
                        <div className="text-xs font-bold text-slate-800 dark:text-[#F5F7FA]">
                          @{m.username || m.name.toLowerCase()}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-[#626A75]">
                          Pass: <span className="text-slate-600 dark:text-[#AEB5C0] font-semibold">{m.password || "••••••••"}</span>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                              m.role === "SUPER_ADMIN"
                                ? "bg-amber-50 dark:bg-[#302714] text-amber-600 dark:text-[#F3B85B] border border-amber-200 dark:border-[#F3B85B]/30"
                                : "bg-slate-100 dark:bg-[#1D2026] text-slate-600 dark:text-[#AEB5C0] border border-slate-200 dark:border-[#343943]"
                            }`}
                          >
                            {m.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "MEMBER"}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            isSuspended
                              ? "bg-rose-50 dark:bg-[#32191B] text-rose-600 dark:text-[#FF6B6B] border border-rose-200 dark:border-[#FF6B6B]/30 hover:bg-rose-100"
                              : "bg-emerald-50 dark:bg-[#102C22] text-emerald-700 dark:text-[#32C98B] border border-emerald-200 dark:border-[#32C98B]/20 hover:bg-emerald-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                            }`}
                          />
                          <span>{isSuspended ? "SUSPENDED" : "ACTIVE"}</span>
                        </button>
                      </td>

                      {/* Action Dropdown / Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Full History & Profits */}
                          <button
                            onClick={() => router.push(`/admin/members/${m.id}`)}
                            title="View Detailed IPO History, Lots & Profits"
                            className="p-2 rounded-xl text-slate-500 dark:text-[#AEB5C0] hover:text-blue-600 dark:hover:text-[#6B93FF] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>
                          {/* Manage Permissions */}
                          <button
                            onClick={() => handleOpenPermissions(m)}
                            title="Manage Permissions"
                            className="p-2 rounded-xl text-slate-500 dark:text-[#AEB5C0] hover:text-blue-600 dark:hover:text-[#6B93FF] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
                          >
                            <Shield size={16} />
                          </button>

                          {/* View Activity */}
                          <button
                            onClick={() => setActivityMember(m)}
                            title="View User Activity"
                            className="p-2 rounded-xl text-slate-500 dark:text-[#AEB5C0] hover:text-emerald-600 dark:hover:text-[#32C98B] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
                          >
                            <ClockCountdown size={16} />
                          </button>

                          {/* Reset Password */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setResetPassMember(m);
                                setCustomResetPass(m.password || "");
                              }}
                              title="Reset Password"
                              className="p-2 rounded-xl text-slate-500 dark:text-[#AEB5C0] hover:text-amber-600 dark:hover:text-[#F3B85B] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
                            >
                              <Key size={16} />
                            </button>
                          )}

                          {/* Revoke Sessions */}
                          <button
                            onClick={() => handleRevokeSessions(m)}
                            title="Revoke Sessions"
                            className="p-2 rounded-xl text-slate-500 dark:text-[#AEB5C0] hover:text-rose-600 dark:hover:text-[#FF6B6B] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
                          >
                            <LockKey size={16} />
                          </button>

                          {/* Assign Role Toggle Quick Button */}
                          <button
                            onClick={() => handleAssignRole(m, m.role === "ADMIN" ? "MEMBER" : "ADMIN")}
                            title={m.role === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-[#343943] bg-slate-50 dark:bg-[#14161A] text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer"
                          >
                            {m.role === "ADMIN" ? "Demote" : "Promote"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
