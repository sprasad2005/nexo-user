import { cookies } from "next/headers";
import { validateSessionToken, SESSION_COOKIE_NAME } from "./session";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { SessionDocument } from "@/src/models/Session";
import { MemberRole } from "@/types/nexo";

export interface AuthContext {
  user: UserDocument;
  member: MemberDocument;
  session: SessionDocument;
  userId: string;
  memberId: string;
  role: MemberRole;
  email: string;
  username: string;
  displayName: string;
}

/**
 * Server-side helper that extracts HTTP-only nexo_session cookie, validates the session,
 * and returns the trusted authenticated user & member identity context.
 */
export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const validated = await validateSessionToken(sessionCookie.value);
    if (!validated) return null;

    const { user, member, session } = validated;

    return {
      user,
      member,
      session,
      userId: user.id,
      memberId: member.id,
      role: user.role,
      email: user.email,
      username: member.username,
      displayName: member.name,
    };
  } catch (_err) {
    return null;
  }
}

/**
 * Requires an authenticated user session. Throws error or returns 401 if missing.
 */
export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error("UNAUTHORIZED");
  }
  return auth;
}

/**
 * Requires an authenticated user session WITH explicit ADMIN or SUPER_ADMIN role privileges.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error("UNAUTHORIZED");
  }
  if (auth.role !== "SUPER_ADMIN" && auth.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return auth;
}

/**
 * Requires an authenticated user session WITH explicit SUPER_ADMIN role privileges.
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error("UNAUTHORIZED");
  }
  if (auth.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return auth;
}


