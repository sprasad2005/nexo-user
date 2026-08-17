import { memberRepository } from "@/src/lib/db/repositories/memberRepository";
import { userRepository } from "@/src/lib/db/repositories/userRepository";
import { sessionRepository } from "@/src/lib/db/repositories/sessionRepository";
import { logActivity } from "@/src/features/activity/activityService";
import { hashPassword } from "@/src/lib/auth/password";
import { MemberDocument } from "@/src/models/Member";
import { UserDocument } from "@/src/models/User";
import { AuthContext } from "@/src/lib/auth/authorization";
import crypto from "crypto";

function generateTemporaryPassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+";
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = "";
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  for (let i = 4; i < 16; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  return password.split("").sort(() => crypto.randomInt(3) - 1).join("");
}

export const memberService = {
  async getMembers(params: {
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
  } = {}) {
    const filter: any = {};
    if (params.role && params.role !== "ALL") {
      filter.role = params.role.toUpperCase();
    }
    if (params.status && params.status !== "ALL") {
      filter.status = params.status.toUpperCase();
    }

    const members = await memberRepository.find(filter, {
      projection: { password: 0, passwordHash: 0 },
      sort: { createdAt: -1 },
    });

    let result = members;
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.phone?.includes(q)
      );
    }

    const getPriority = (m: any): number => {
      const u = (m.username || m.name || "").toLowerCase().trim();
      if (m.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") return 1;
      if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") return 2;
      if (u === "shivam_p" || u.startsWith("shivam")) return 3;
      return 4;
    };

    result.sort((a: any, b: any) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return (a.name || "").localeCompare(b.name || "");
    });

    return result;
  },

  async getMemberById(id: string) {
    return memberRepository.findById(id);
  },

  async createMember(data: any, auth: AuthContext) {
    if (!data.name || !data.email) {
      throw new Error("Validation Error: Name and email are required.");
    }

    const memberId = `mem_${Date.now()}`;
    const username = (data.username || data.name.toLowerCase().replace(/\s+/g, "")).toLowerCase();
    const rawPassword = data.password || "user123";
    const passwordHash = hashPassword(rawPassword);

    const memberDoc: MemberDocument = {
      id: memberId,
      name: data.name,
      username,
      password: rawPassword,
      email: data.email,
      phone: data.phone || "+91 98200 12345",
      avatar: data.avatar || "/oggy.png",
      role: data.role || "MEMBER",
      status: data.status || "ACTIVE",
      panMasked: data.panMasked || "ABCDE1234F",
      panFull: data.panFull || data.panMasked || "ABCDE1234F",
      defaultContribution: Number(data.defaultContribution) || 15000,
      joinedAt: new Date().toISOString().split("T")[0],
      isVerified: true,
      permissions: {
        canSubmitApplications: true,
        canDistributeProfit: data.role === "ADMIN" || data.role === "SUPER_ADMIN",
        canEditIpos: data.role === "ADMIN" || data.role === "SUPER_ADMIN",
        canAccessAdminConsole: data.role === "ADMIN" || data.role === "SUPER_ADMIN",
        canManageMembers: data.role === "ADMIN" || data.role === "SUPER_ADMIN",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userDoc: UserDocument = {
      id: `usr_${memberId}`,
      email: data.email,
      emailNormalized: data.email.toLowerCase().trim(),
      passwordHash,
      memberId,
      role: data.role || "MEMBER",
      status: data.status || "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await Promise.all([
      memberRepository.insertOne(memberDoc),
      userRepository.insertOne(userDoc),
    ]);

    await logActivity({
      eventType: "MEMBER_CREATED",
      category: "USER",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: memberId,
      targetName: data.name,
    });

    const { password, passwordHash: _, ...safeMember } = memberDoc as any;
    return safeMember;
  },

  async resetPassword(targetMemberId: string, auth: AuthContext) {
    const member = await memberRepository.findById(targetMemberId);
    if (!member) throw new Error("Member not found.");

    const user = await userRepository.findByMemberId(member.id);
    if (!user) throw new Error("User credentials not found.");

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = hashPassword(temporaryPassword);

    await Promise.all([
      userRepository.updateOne(user.id, {
        $set: {
          passwordHash,
          mustChangePassword: true,
          updatedAt: new Date(),
        },
      }),
      memberRepository.updateOne(targetMemberId, {
        $set: {
          password: temporaryPassword,
          updatedAt: new Date(),
        },
      }),
      sessionRepository.revokeAllUserSessions(user.id),
    ]);

    await logActivity({
      eventType: "PASSWORD_RESET",
      category: "SECURITY",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      metadata: { targetUserId: user.id },
    });

    return { temporaryPassword };
  },

  async changeRole(targetMemberId: string, newRole: "MEMBER" | "ADMIN" | "SUPER_ADMIN", auth: AuthContext) {
    const member = await memberRepository.findById(targetMemberId);
    if (!member) throw new Error("Member not found.");

    if (auth.memberId === targetMemberId) {
      throw new Error("FORBIDDEN: You cannot modify your own administrative role.");
    }

    if (newRole === "SUPER_ADMIN" && member.username !== "ankitgod") {
      throw new Error("Validation Error: Super Admin role is restricted to ankitgod only.");
    }

    const isAdminOrSuper = newRole === "ADMIN" || newRole === "SUPER_ADMIN";

    await Promise.all([
      userRepository.updateOne(targetMemberId, { $set: { role: newRole, updatedAt: new Date() } }),
      memberRepository.updateOne(targetMemberId, {
        $set: {
          role: newRole,
          updatedAt: new Date(),
          permissions: {
            canSubmitApplications: true,
            canDistributeProfit: isAdminOrSuper,
            canEditIpos: isAdminOrSuper,
            canAccessAdminConsole: isAdminOrSuper,
            canManageMembers: isAdminOrSuper,
          },
        },
      }),
    ]);

    await logActivity({
      eventType: "ROLE_CHANGED",
      category: "SECURITY",
      severity: "CRITICAL",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      newValue: { role: newRole },
    });
  },

  async toggleSuspension(targetMemberId: string, status: "ACTIVE" | "SUSPENDED", auth: AuthContext) {
    const member = await memberRepository.findById(targetMemberId);
    if (!member) throw new Error("Member not found.");

    if (auth.memberId === targetMemberId) {
      throw new Error("FORBIDDEN: You cannot suspend your own session account.");
    }

    const user = await userRepository.findByMemberId(targetMemberId);

    await Promise.all([
      userRepository.updateOne(targetMemberId, { $set: { status, updatedAt: new Date() } }),
      memberRepository.updateOne(targetMemberId, { $set: { status, updatedAt: new Date() } }),
    ]);

    if (status === "SUSPENDED" && user) {
      await sessionRepository.revokeAllUserSessions(user.id);
    }

    await logActivity({
      eventType: status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REACTIVATED",
      category: "SECURITY",
      severity: status === "SUSPENDED" ? "WARNING" : "SUCCESS",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      newValue: { status },
    });
  },

  async deleteMember(targetMemberId: string, auth: AuthContext) {
    const member = await memberRepository.findById(targetMemberId);
    if (!member) throw new Error("Member not found.");

    if (auth.memberId === targetMemberId) {
      throw new Error("FORBIDDEN: You cannot delete your own account.");
    }

    const user = await userRepository.findByMemberId(targetMemberId);

    await Promise.all([
      memberRepository.deleteOne(targetMemberId),
      userRepository.deleteOne(targetMemberId),
      sessionRepository.deleteByUserId(targetMemberId),
      user ? sessionRepository.deleteByUserId(user.id) : Promise.resolve(),
    ]);

    await logActivity({
      eventType: "MEMBER_DELETED",
      category: "USER",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
    });
  },
};
