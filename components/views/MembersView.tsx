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

  // Featured Member Style Themes
  const getFeaturedMemberTheme = (member: Member) => {
    const u = (member.username || member.name || "").toLowerCase().trim();
    
    // Super Admin: Sky Blue (Polished Light Mode + Midnight Sky Dark Mode)
    if (member.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") {
      return {
        isFeatured: true,
        roleBadge: "SUPER ADMIN",
        cardContainer: "bg-gradient-to-b from-sky-500/[0.03] via-white to-white dark:bg-gradient-to-b dark:from-[#0B1A28] dark:via-[#08131F] dark:to-[#050C14] border-sky-200/90 dark:border-sky-500/35 hover:border-sky-400/80 dark:hover:border-sky-400/60 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_14px_30px_-6px_rgba(14,165,233,0.18),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-sky-950/30",
        topAccent: "from-sky-400/0 via-sky-500 to-sky-400/0",
        avatarAura: "from-sky-500/20 via-blue-500/15 to-cyan-400/20 dark:from-sky-600/40 dark:via-blue-600/30 dark:to-cyan-400/40",
        avatarRim: "from-sky-500 via-blue-500 to-cyan-400 shadow-[0_0_12px_rgba(14,165,233,0.25)] dark:shadow-[0_0_18px_rgba(14,165,233,0.35)] group-hover:shadow-[0_0_20px_rgba(56,189,248,0.45)]",
        statusPing: "bg-sky-400",
        statusDot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]",
        badgePill: "bg-sky-50 text-sky-700 border-sky-200/90 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 font-bold",
        badgeDot: "bg-sky-500 dark:bg-sky-400",
        nameHover: "text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400",
        usernameTag: "text-sky-700 bg-sky-50/90 hover:bg-sky-100/90 border-sky-200/90 dark:text-sky-300 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:border-sky-500/30",
        phoneTag: "text-slate-600 bg-slate-100/90 border-slate-200/80 dark:text-slate-300 dark:bg-sky-950/35 dark:border-sky-500/20",
        phoneIcon: "text-sky-600 dark:text-sky-400/80",
        statsCard: "bg-slate-50/90 hover:bg-slate-100/70 border-slate-200/70 dark:bg-[#0A1726]/80 dark:border-sky-500/20 dark:group-hover:border-sky-500/35 shadow-2xs dark:shadow-none",
        statsIcon: "text-sky-600 dark:text-sky-400",
        statsVal: "text-slate-900 dark:text-slate-100",
        statsMuted: "text-slate-600 dark:text-slate-200",
        footerBorder: "border-slate-100 dark:border-sky-500/20",
        verifiedBadge: "bg-sky-50/90 border-sky-200/90 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/25 dark:text-sky-400",
        verifiedIcon: "text-sky-600 dark:text-sky-400",
        messageBtn: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm shadow-sky-500/25 dark:shadow-sky-950/40",
        youBadge: "bg-sky-50 border-sky-200/90 text-sky-700 dark:bg-sky-950/50 dark:border-sky-500/30 dark:text-sky-300",
      };
    }

    // aanikett: Emerald Jade Green (Polished Light Mode + Deep Jade Dark Mode)
    if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") {
      return {
        isFeatured: true,
        roleBadge: "CORE MEMBER",
        cardContainer: "bg-gradient-to-b from-emerald-500/[0.03] via-white to-white dark:bg-gradient-to-b dark:from-[#061A14] dark:via-[#051410] dark:to-[#040E0B] border-emerald-200/90 dark:border-emerald-500/35 hover:border-emerald-400/80 dark:hover:border-emerald-400/60 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_14_30px_-6px_rgba(168,185,129,0.18),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-emerald-950/30",
        topAccent: "from-teal-400/0 via-emerald-500 to-teal-400/0",
        avatarAura: "from-emerald-500/20 via-teal-500/15 to-cyan-400/20 dark:from-emerald-600/40 dark:via-teal-600/30 dark:to-cyan-400/40",
        avatarRim: "from-emerald-500 via-teal-500 to-cyan-400 shadow-[0_0_12px_rgba(168,185,129,0.25)] dark:shadow-[0_0_18px_rgba(168,185,129,0.35)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.45)]",
        statusPing: "bg-emerald-400",
        statusDot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
        badgePill: "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-bold",
        badgeDot: "bg-emerald-500 dark:bg-emerald-400",
        nameHover: "text-slate-900 group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400",
        usernameTag: "text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-200/90 dark:text-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/30",
        phoneTag: "text-slate-600 bg-slate-100/90 border-slate-200/80 dark:text-slate-300 dark:bg-emerald-950/35 dark:border-emerald-500/20",
        phoneIcon: "text-emerald-600 dark:text-emerald-400/80",
        statsCard: "bg-slate-50/90 hover:bg-slate-100/70 border-slate-200/70 dark:bg-[#07241B]/80 dark:border-emerald-500/20 dark:group-hover:border-emerald-500/35 shadow-2xs dark:shadow-none",
        statsIcon: "text-emerald-600 dark:text-emerald-400",
        statsVal: "text-slate-900 dark:text-slate-100",
        statsMuted: "text-slate-600 dark:text-slate-200",
        footerBorder: "border-slate-100 dark:border-emerald-500/20",
        verifiedBadge: "bg-emerald-50/90 border-emerald-200/90 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-400",
        verifiedIcon: "text-emerald-600 dark:text-emerald-400",
        messageBtn: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/25 dark:shadow-emerald-950/40",
        youBadge: "bg-emerald-50 border-emerald-200/90 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-500/30 dark:text-emerald-300",
      };
    }

    // shivam_p: Royal Violet Tier (Matching dark mode gradient + Light mode subtle tint)
    if (u === "shivam_p" || u.startsWith("shivam")) {
      return {
        isFeatured: true,
        roleBadge: member.role === "ADMIN" ? "CORE ADMIN" : "CORE MEMBER",
        cardContainer: "bg-gradient-to-b from-purple-500/[0.03] via-white to-white dark:bg-gradient-to-b dark:from-[#130B1E] dark:via-[#0E0717] dark:to-[#09040F] border-purple-200/90 dark:border-purple-500/35 hover:border-purple-400/80 dark:hover:border-purple-400/60 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_14px_30px_-6px_rgba(168,85,247,0.18),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-purple-950/30",
        topAccent: "from-purple-400/0 via-purple-500 to-purple-400/0",
        avatarAura: "from-purple-500/20 via-indigo-500/15 to-pink-400/20 dark:from-purple-600/40 dark:via-indigo-600/30 dark:to-pink-500/40",
        avatarRim: "from-purple-500 via-indigo-500 to-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)] dark:shadow-[0_0_18px_rgba(168,85,247,0.35)] group-hover:shadow-[0_0_20px_rgba(192,132,252,0.45)]",
        statusPing: "bg-purple-400",
        statusDot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
        badgePill: "bg-purple-50 text-purple-700 border-purple-200/90 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30 font-bold",
        badgeDot: "bg-purple-500 dark:bg-purple-400",
        nameHover: "text-slate-900 group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-400",
        usernameTag: "text-purple-700 bg-purple-50/90 hover:bg-purple-100/90 border-purple-200/90 dark:text-purple-300 dark:bg-purple-500/15 dark:hover:bg-purple-500/25 dark:border-purple-500/30",
        phoneTag: "text-slate-600 bg-slate-100/90 border-slate-200/80 dark:text-slate-300 dark:bg-purple-950/35 dark:border-purple-500/20",
        phoneIcon: "text-purple-600 dark:text-purple-400/80",
        statsCard: "bg-slate-50/90 hover:bg-slate-100/70 border-slate-200/70 dark:bg-[#12081C]/80 dark:border-purple-500/20 dark:group-hover:border-purple-500/35 shadow-2xs dark:shadow-none",
        statsIcon: "text-purple-600 dark:text-purple-400",
        statsVal: "text-slate-900 dark:text-slate-100",
        statsMuted: "text-slate-600 dark:text-slate-200",
        footerBorder: "border-slate-100 dark:border-purple-500/20",
        verifiedBadge: "bg-purple-50/90 border-purple-200/90 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/25 dark:text-purple-400",
        verifiedIcon: "text-purple-600 dark:text-purple-400",
        messageBtn: "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-sm shadow-purple-500/25 dark:shadow-purple-950/40",
        youBadge: "bg-purple-50 border-purple-200/90 text-purple-700 dark:bg-purple-950/50 dark:border-purple-500/30 dark:text-purple-300",
      };
    }

    // Default Member Theme
    return {
      isFeatured: false,
      roleBadge: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
      cardContainer: "bg-white dark:bg-[#101217] border-slate-200/90 dark:border-line/80 hover:border-blue-400/80 dark:hover:border-accent/40 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.08)] dark:hover:shadow-accent/5",
      topAccent: "from-blue-500/0 via-blue-500 to-blue-500/0 dark:from-accent/0 dark:via-accent dark:to-accent/0",
      avatarAura: "",
      avatarRim: "",
      statusPing: "bg-emerald-400",
      statusDot: "bg-emerald-500",
      badgePill: "bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-accent-soft dark:text-accent dark:border-accent/20 font-bold",
      badgeDot: "bg-blue-500 dark:bg-accent",
      nameHover: "text-slate-900 group-hover:text-blue-600 dark:text-ink dark:group-hover:text-accent",
      usernameTag: "text-blue-700 bg-blue-50/90 hover:bg-blue-100/90 border-blue-200/90 dark:text-accent dark:bg-accent-soft/40 dark:hover:bg-accent-soft dark:border-accent/25",
      phoneTag: "text-slate-600 bg-slate-100/90 border-slate-200/80 dark:text-ink-secondary dark:bg-surface-alt/90 dark:border-line/80",
      phoneIcon: "text-slate-500 dark:text-ink-tertiary",
      statsCard: "bg-slate-50/90 hover:bg-slate-100/70 border-slate-200/70 dark:bg-[#141721] dark:border-line/70 dark:group-hover:border-line shadow-2xs dark:shadow-none",
      statsIcon: "text-blue-600 dark:text-accent",
      statsVal: "text-slate-900 dark:text-ink",
      statsMuted: "text-slate-600 dark:text-ink-tertiary",
      footerBorder: "border-slate-100 dark:border-line/80",
      verifiedBadge: "bg-emerald-50/90 border-emerald-200/90 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-400",
      verifiedIcon: "text-emerald-600 dark:text-emerald-400",
      messageBtn: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25 dark:bg-accent dark:hover:bg-accent-hover dark:shadow-accent/25",
      youBadge: "bg-slate-100 border-slate-200/90 text-slate-700 dark:bg-surface-alt/90 dark:border-line/80 dark:text-ink-tertiary",
    };
  };

  // Filtered and sorted members list
  const filteredMembers = useMemo(() => {
    const list = members.filter((member) => {
      const mUsername = member.username || member.name.toLowerCase();
      const mPhone = member.phone || "";
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mPhone.includes(searchQuery);

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "SUPER_ADMIN" && (member.role === "SUPER_ADMIN" || member.username === "ankitgod")) ||
        (roleFilter === "MEMBER" && member.role !== "SUPER_ADMIN" && member.username !== "ankitgod");

      return matchesSearch && matchesRole;
    });

    // Custom deterministic sort:
    // 1. Super Admin (Ankit / ankitgod / role === 'SUPER_ADMIN') always top priority
    // 2. Profile with username 'aanikett' (or starts with 'aaniket' / name 'Aniket') 2nd
    // 3. Profile with username 'shivam_p' (or starts with 'shivam' / name 'Shivam') 3rd
    // 4. Followed by all other members in alphabetical order
    return [...list].sort((a, b) => {
      const getPriority = (m: Member): number => {
        const u = (m.username || m.name || "").toLowerCase().trim();
        if (m.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") return 1;
        if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") return 2;
        if (u === "shivam_p" || u.startsWith("shivam")) return 3;
        return 4;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);

      if (pA !== pB) {
        return pA - pB;
      }
      return (a.name || "").localeCompare(b.name || "");
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
        <div className="bg-white/95 dark:bg-surface/80 border border-slate-200/80 dark:border-line rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-accent-soft dark:text-accent flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-slate-500 dark:text-ink-tertiary">Group Roster</p>
              <p className="text-lg font-black text-slate-900 dark:text-ink font-mono">{members.length} Members</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-ink-secondary bg-slate-100/90 dark:bg-surface-alt px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-line">
            {adminCount} Admin{adminCount > 1 ? "s" : ""}
          </span>
        </div>

        <div className="bg-white/95 dark:bg-surface/80 border border-slate-200/80 dark:border-line rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center font-bold">
              <TrendUp size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-slate-500 dark:text-ink-tertiary">Total Applications</p>
              <p className="text-lg font-black text-slate-900 dark:text-ink font-mono">{totalApplications} Submitted</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 dark:text-accent dark:bg-accent-soft px-2.5 py-0.5 rounded-md border border-sky-200/80 dark:border-accent/20 font-mono">
            Active
          </span>
        </div>

        <div className="bg-white/95 dark:bg-surface/80 border border-slate-200/80 dark:border-line rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-caption font-semibold text-slate-500 dark:text-ink-tertiary">Verification Status</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-sans">100% Verified</p>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/95 dark:bg-[#11131A]/90 backdrop-blur-md border border-slate-200/90 dark:border-line/80 p-2.5 rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.04)] focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all font-sans select-none">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 dark:text-accent"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name, @username, or phone number..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50/90 dark:bg-[#151821] border border-slate-200/80 dark:border-line/70 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-ink placeholder:text-slate-400 dark:placeholder:text-ink-tertiary focus:outline-none font-sans transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-ink-tertiary dark:hover:text-ink dark:hover:bg-surface-hover cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-[#151821] p-1 rounded-xl border border-slate-200/80 dark:border-line/70 shrink-0 font-sans">
          {(["ALL", "SUPER_ADMIN", "MEMBER"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                roleFilter === tab
                  ? "bg-blue-600 dark:bg-accent text-white font-extrabold shadow-sm shadow-blue-500/25"
                  : "text-slate-500 hover:text-slate-900 dark:text-ink-tertiary dark:hover:text-ink font-semibold hover:bg-slate-200/50 dark:hover:bg-surface-hover/50"
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
                              <div className="w-13 h-13 rounded-[13.5px] overflow-hidden bg-surface-alt relative group/img">
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                                />
                                {/* Reflection Light Streak Sweep */}
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                              </div>

                              {/* Live Status Orb with Radar Ping */}
                              <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                                <span className={`animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full ${theme.statusPing} opacity-75`} />
                                <span
                                  className={`relative inline-flex w-3.5 h-3.5 rounded-full ${theme.statusDot} ring-2 ring-surface dark:ring-[#0F1117]`}
                                  title={`${member.name} Online`}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative p-[1.5px] rounded-2xl bg-surface-alt border border-line ring-1 ring-accent/20 group-hover:ring-accent/50 shadow-sm transition-all duration-300">
                            <div className="w-13 h-13 rounded-[14px] overflow-hidden bg-surface-alt">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <span
                              className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface absolute -bottom-0.5 -right-0.5 shadow-xs"
                              title="Active Member"
                            />
                          </div>
                        )}
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
                            className={`text-base font-black transition-colors truncate tracking-tight cursor-pointer ${theme.nameHover} hover:underline`}
                            title={currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN" ? "Click to view detailed member IPO history & PnL" : `Click to message @${mUsername}`}
                          >
                            {member.name}
                          </h3>
                          {theme.isFeatured && (
                            <span className={`relative inline-flex items-center px-2.5 py-0.5 rounded-full ${theme.badgePill} text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 overflow-hidden shadow-2xs`}>
                              {/* Glass shimmer beam */}
                              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2.8s_infinite]" />
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
                            onClick={() => openDirectChatWithUser(member.id)}
                            className={`inline-flex items-center gap-1 text-xs font-sans font-semibold tracking-tight px-2.5 py-0.5 rounded-lg border transition-all shadow-2xs cursor-pointer active:scale-95 ${theme.usernameTag}`}
                            title={`Click to chat with @${mUsername}`}
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
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                          <ShieldCheck size={13} className={theme.statsIcon} />
                          <span>Platform Role</span>
                        </div>
                        <p className={`text-xs font-extrabold font-sans truncate mt-0.5 ${theme.statsVal}`}>
                          Super Admin
                        </p>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-xl border transition-all space-y-1 ${theme.statsCard}`}>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                          <TrendUp size={13} className={theme.statsIcon} />
                          <span>IPOs Applied</span>
                        </div>
                        <p className={`text-base font-black font-sans ${theme.statsVal}`}>
                          {appliedCount}{" "}
                          <span className="text-xs text-ink-tertiary font-sans font-normal">
                            {appliedCount === 1 ? "IPO" : "IPOs"}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className={`p-3 rounded-xl border transition-all space-y-1 ${theme.statsCard}`}>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
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
