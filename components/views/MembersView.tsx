"use client";

import React, { useState, useMemo } from "react";
import { useNexo } from "@/context/NexoContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  UserPlus,
  ShieldCheck,
  Key,
  Pencil,
  X,
  CheckCircle,
  Users,
  TrendUp,
  CalendarBlank,
  MagnifyingGlass,
  Crown,
  Sparkle,
  Phone,
  ChatCircleDots,
  Trash,
  Eye,
  EyeSlash,
  Megaphone,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Member, MemberRole } from "@/types/nexo";
import { SendNotificationModal } from "../admin/SendNotificationModal";

export function MembersView() {
  const router = useRouter();
  const { members, ipos, addMember, updateMember, deleteMember, currentUser, openDirectChatWithUser } = useNexo();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSendNotifOpen, setIsSendNotifOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SUPER_ADMIN" | "MEMBER">("ALL");

  // Add form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [pan, setPan] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("/oggy.png");

  // Edit form state
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPan, setEditPan] = useState("");
  const [editRole, setEditRole] = useState<MemberRole>("MEMBER");

  // Calculate applied IPO count for a member
  const getAppliedIpoCount = (member: Member): number => {
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
  };

  // Group Stats
  const totalApplications = useMemo(() => {
    return members.reduce((sum, member) => sum + getAppliedIpoCount(member), 0);
  }, [members, ipos]);

  const adminCount = useMemo(() => {
    return members.filter((m) => m.role === "SUPER_ADMIN").length;
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const mUsername = member.username || member.name.toLowerCase();
      const mPhone = member.phone || "";
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mPhone.includes(searchQuery);

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "SUPER_ADMIN" && member.role === "SUPER_ADMIN") ||
        (roleFilter === "MEMBER" && member.role === "MEMBER");

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;

    await addMember({
      name,
      username: username.trim().toLowerCase(),
      password: password.trim(),
      phone: phone.trim() || "+91 98200 12345",
      role,
      panMasked: pan.trim().toUpperCase() || "ABCDE1234F",
      panFull: pan.trim().toUpperCase() || "ABCDE1234F",
      email: email || `${username.trim().toLowerCase()}@nexo.private`,
      avatar,
    });

    setIsAddModalOpen(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setPhone("");
    setRole("MEMBER");
    setPan("");
    setEmail("");
    setAvatar("/oggy.png");
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditUsername(member.username || member.name.toLowerCase());
    setEditPassword(member.password || (member.role === "ADMIN" ? "admin123" : "user123"));
    setEditPhone(member.phone || "+91 98200 12345");
    setEditPan(member.panFull || member.panMasked);
    setEditRole(member.role);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editUsername || !editPassword) return;

    await updateMember(editingMember.id, {
      name: editName,
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim(),
      phone: editPhone.trim(),
      panMasked: editPan.trim().toUpperCase(),
      panFull: editPan.trim().toUpperCase(),
      role: editRole,
    });

    setEditingMember(null);
  };

  const canAddMembers = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const handleDeleteMember = async (memberToDelete: Member) => {
    if (memberToDelete.role === "SUPER_ADMIN" || memberToDelete.username === "ankitgod") return;
    if (!confirm(`Are you sure you want to delete profile for @${memberToDelete.username || memberToDelete.name}? This cannot be undone.`)) return;

    await deleteMember(memberToDelete.id);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="nexo-h2 text-ink">Group Members</h2>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 flex items-center gap-1">
              <Sparkle size={12} className="text-accent" /> {members.length} Total
            </span>
          </div>
          <p className="text-xs text-ink-tertiary font-medium mt-1">
            Manage your syndicate members, phone contacts, identity handles &amp; IPO participation
          </p>
        </div>

        {canAddMembers && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSendNotifOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone size={16} weight="bold" />
              <span>Send Notification</span>
            </button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="shadow-sm shadow-accent/20 hover:shadow-accent/40"
            >
              <UserPlus size={16} /> Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface/80 border border-line rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-ink-tertiary">Group Roster</p>
              <p className="text-lg font-black text-ink font-mono">{members.length} Members</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary bg-surface-alt px-2 py-0.5 rounded-md border border-line">
            {adminCount} Admin{adminCount > 1 ? "s" : ""}
          </span>
        </div>

        <div className="bg-surface/80 border border-line rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendUp size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-ink-tertiary">Total Applications</p>
              <p className="text-lg font-black text-ink font-mono">{totalApplications} Submitted</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded-md border border-accent/20 font-mono">
            Active
          </span>
        </div>

        <div className="bg-surface/80 border border-line rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-ink-tertiary">Verification Status</p>
              <p className="text-lg font-black text-emerald-400 font-sans">100% Verified</p>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/90 dark:bg-[#11131A]/90 backdrop-blur-md border border-line/80 p-2.5 rounded-2xl shadow-lg focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15 transition-all font-sans select-none">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name, @username, or phone number..."
            className="w-full pl-10 pr-9 py-2 bg-surface-alt/80 dark:bg-[#151821] border border-line/70 rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-tertiary focus:outline-none font-sans transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface-alt/80 dark:bg-[#151821] p-1 rounded-xl border border-line/70 shrink-0 font-sans">
          {(["ALL", "SUPER_ADMIN", "MEMBER"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                roleFilter === tab
                  ? "bg-accent text-white font-extrabold shadow-xs shadow-accent/25"
                  : "text-ink-tertiary hover:text-ink font-semibold hover:bg-surface-hover/50"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "SUPER_ADMIN" ? "Super Admin" : "Members"}
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-surface/40 border border-line rounded-2xl">
          <Users size={32} className="mx-auto text-ink-tertiary mb-2 opacity-60" />
          <p className="text-sm font-semibold text-ink">No members found</p>
          <p className="text-xs text-ink-tertiary mt-0.5">Try searching with a different keyword</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const mUsername = member.username || member.name.toLowerCase();
            const mPhone = member.phone || "+91 98200 12345";
            const appliedCount = getAppliedIpoCount(member);
            const isSuperAdminCard = member.role === "SUPER_ADMIN" || member.username === "ankitgod";

            return (
              <div
                key={member.id}
                className={`group relative rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden font-sans bg-gradient-to-b from-surface via-surface-alt/60 to-surface-alt/90 dark:from-[#11131A] dark:to-[#0D0E14] border ${
                  isSuperAdminCard
                    ? "border-accent/40 hover:border-accent shadow-md shadow-accent/5 hover:shadow-xl hover:shadow-accent/10"
                    : "border-line/80 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                } hover:-translate-y-1`}
              >
                {/* Subtle Top Accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent/60 to-accent/0 ${isSuperAdminCard ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity duration-300`} />

                <div className="space-y-4">
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar with Status Ring */}
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className={`w-13 h-13 rounded-2xl object-cover ring-2 ${
                            isSuperAdminCard ? "ring-accent/50 group-hover:ring-accent" : "ring-accent/30 group-hover:ring-accent/60"
                          } bg-surface-alt transition-all duration-300 shadow-md`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-surface absolute -bottom-0.5 -right-0.5 shadow-xs"
                          title="Active Member"
                        />
                      </div>

                      {/* Name, Username & Phone */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => {
                              if (currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN") {
                                router.push(`/admin/members/${member.id}`);
                              } else {
                                openDirectChatWithUser(member.id);
                              }
                            }}
                            className="text-base font-black text-ink group-hover:text-accent hover:underline transition-colors truncate tracking-tight cursor-pointer"
                            title={currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN" ? "Click to view detailed member IPO history & PnL" : `Click to message @${mUsername}`}
                          >
                            {member.name}
                          </h3>
                          {isSuperAdminCard && (
                            <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/30 text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 flex items-center gap-1 shadow-2xs">
                              <Crown size={11} weight="fill" className="text-accent" />
                              <span>Super Admin</span>
                            </span>
                          )}
                        </div>

                        {/* Username Tag & Phone Badge */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDirectChatWithUser(member.id)}
                            className="inline-flex items-center gap-1 text-xs font-sans font-semibold tracking-tight text-accent bg-accent-soft/40 hover:bg-accent-soft px-2.5 py-0.5 rounded-lg border border-accent/25 transition-all shadow-2xs cursor-pointer active:scale-95"
                            title={`Click to chat with @${mUsername}`}
                          >
                            @{mUsername}
                          </button>

                          <div className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-ink-secondary bg-surface-alt/90 px-2.5 py-0.5 rounded-lg border border-line/80 shadow-2xs">
                            <Phone size={11} className="text-ink-tertiary" /> {mPhone}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-surface-alt/80 dark:bg-[#141721] border border-line/70 group-hover:border-line transition-all space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                        <TrendUp size={13} className="text-accent" />
                        <span>IPOs Applied</span>
                      </div>
                      <p className="text-base font-black font-sans text-ink">
                        {appliedCount}{" "}
                        <span className="text-xs text-ink-tertiary font-sans font-normal">
                          {appliedCount === 1 ? "IPO" : "IPOs"}
                        </span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-alt/80 dark:bg-[#141721] border border-line/70 group-hover:border-line transition-all space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                        <CalendarBlank size={13} className="text-ink-secondary" />
                        <span>Member Since</span>
                      </div>
                      <p className="text-xs font-bold text-ink truncate mt-0.5">
                        {member.joinedAt || "Jan 2025"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-line/80 flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck size={14} className="text-emerald-400" /> Verified Member
                  </span>

                  <div className="flex items-center gap-1.5">
                    {member.id === currentUser?.id ? (
                      <span className="px-3 py-1 rounded-xl bg-surface-alt/90 border border-line/80 text-ink-tertiary font-bold text-xs">
                        You
                      </span>
                    ) : (
                      <button
                        onClick={() => openDirectChatWithUser(member.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover font-bold text-xs shadow-xs shadow-accent/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
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

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-body-md font-bold text-ink flex items-center gap-2">
                  <UserPlus size={18} className="text-accent" />
                  Add Member
                </h3>
                <p className="text-caption text-ink-tertiary">
                  Create member account with username & phone details
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-caption font-semibold text-ink mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!username) setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
                  }}
                  placeholder="e.g. Ashay Kumar"
                  required
                  className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink focus:border-accent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ashay"
                    required
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink font-sans focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Password *</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. user123"
                    required
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink font-mono focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98200 12345"
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink font-sans focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink focus:border-accent outline-none"
                  >
                    <option value="MEMBER">Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink mb-1">Avatar Preset</label>
                <div className="flex items-center gap-3 pt-1">
                  {["/oggy.png", "/jack.png", "/sinchan.png", "/doremon.png", "/japlu.png"].map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setAvatar(img)}
                      className={`relative rounded-full p-0.5 border-2 transition-all cursor-pointer ${
                        avatar === img ? "border-accent scale-110" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <CheckCircle size={16} /> Save Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CREDENTIALS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-body-md font-bold text-ink flex items-center gap-2">
                  <Key size={18} className="text-accent" />
                  Edit Member details: {editingMember.name}
                </h3>
                <p className="text-caption text-ink-tertiary">
                  Update username, password, phone, or member role
                </p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-caption font-semibold text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink focus:border-accent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1 flex items-center justify-between">
                    <span>Username *</span>
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-ink-tertiary font-mono">🔒 Super Admin Only</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                    className={`w-full px-3.5 py-2 border rounded-xl text-small font-sans transition-colors ${
                      isSuperAdmin
                        ? "bg-surface-alt border-line text-ink focus:border-accent outline-none"
                        : "bg-surface-alt/70 border-line-subtle text-ink-secondary opacity-65 cursor-not-allowed select-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Password *</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink font-mono focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 98200 12345"
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink font-sans focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-surface-alt border border-line rounded-xl text-small text-ink focus:border-accent outline-none"
                  >
                    <option value="MEMBER">Member</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <CheckCircle size={16} /> Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendNotifOpen}
        onClose={() => setIsSendNotifOpen(false)}
      />
    </div>
  );
}
