import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { SessionDocument } from "@/src/models/Session";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";

const DB_NAME = "nexo";
export const SESSION_COOKIE_NAME = "nexo_session";
export const ABSOLUTE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days Absolute Limit
export const IDLE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;      // 7 Days Idle Refresh Limit

/**
 * Hashes a raw session token using SHA-256 for MongoDB storage.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure 32-byte random session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Normalizes raw User-Agent headers into human-readable labels (e.g. "Chrome · Windows").
 */
export function parseUserAgent(uaString?: string): {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
} {
  if (!uaString) {
    return { deviceName: "Chrome · Desktop", browser: "Chrome", os: "Desktop", deviceType: "desktop" };
  }

  let os = "Desktop";
  if (/windows/i.test(uaString)) os = "Windows";
  else if (/macintosh|mac os x/i.test(uaString)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(uaString)) os = "iOS";
  else if (/android/i.test(uaString)) os = "Android";
  else if (/linux/i.test(uaString)) os = "Linux";

  let browser = "Chrome";
  if (/edg/i.test(uaString)) browser = "Edge";
  else if (/firefox/i.test(uaString)) browser = "Firefox";
  else if (/safari/i.test(uaString) && !/chrome/i.test(uaString)) browser = "Safari";
  else if (/chrome|crios/i.test(uaString)) browser = "Chrome";

  let deviceType = "desktop";
  if (/mobile|iphone|android/i.test(uaString)) deviceType = "mobile";
  if (/ipad|tablet/i.test(uaString)) deviceType = "tablet";

  return {
    deviceName: `${browser} · ${os}`,
    browser,
    os,
    deviceType,
  };
}

/**
 * Creates a new server-managed session in MongoDB nexo.sessions.
 * Returns raw sessionToken (sent only in HTTP-only cookie).
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ sessionToken: string; session: SessionDocument }> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_EXPIRATION_MS);

  const uaParsed = parseUserAgent(userAgent);

  const sessionDoc: SessionDocument = {
    id: `sess_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    userId,
    sessionTokenHash: tokenHash,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    lastActiveAt: now,
    revokedAt: null,
    userAgent,
    deviceType: uaParsed.deviceType,
    browser: uaParsed.browser,
    os: uaParsed.os,
    deviceName: uaParsed.deviceName,
    ipAddress: ipAddress || "127.0.0.1",
  };

  await db.collection<SessionDocument>("sessions").insertOne(sessionDoc as any);

  // Also update user's lastLoginAt
  await db.collection<UserDocument>("users").updateOne(
    { id: userId },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return { sessionToken: rawToken, session: sessionDoc };
}

// In-memory cache for high-frequency validated sessions to eliminate duplicate database lookups
const sessionAuthCache = new Map<
  string,
  {
    data: { session: SessionDocument; user: UserDocument; member: MemberDocument };
    expiresAt: number;
  }
>();

export function clearSessionAuthCache(tokenHashOrUserId?: string) {
  if (!tokenHashOrUserId) {
    sessionAuthCache.clear();
    return;
  }
  for (const [hash, entry] of sessionAuthCache.entries()) {
    if (hash === tokenHashOrUserId || entry.data.user.id === tokenHashOrUserId) {
      sessionAuthCache.delete(hash);
    }
  }
}

/**
 * Validates a raw session token against MongoDB nexo.sessions.
 * Verifies: non-null, token hash match, not revoked, not expired, user ACTIVE.
 * Uses a 30-second hot cache to eliminate redundant sequential DB roundtrips.
 */
export async function validateSessionToken(rawToken: string): Promise<{
  session: SessionDocument;
  user: UserDocument;
  member: MemberDocument;
} | null> {
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const nowTime = Date.now();

  // 1. Check in-memory session cache
  const cached = sessionAuthCache.get(tokenHash);
  if (cached && nowTime < cached.expiresAt) {
    return cached.data;
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const session = await db.collection<SessionDocument>("sessions").findOne({
      sessionTokenHash: tokenHash,
    });

    if (!session) return null;
    if (session.revokedAt !== null) {
      sessionAuthCache.delete(tokenHash);
      return null;
    }

    const now = new Date();
    if (new Date(session.expiresAt) < now) {
      sessionAuthCache.delete(tokenHash);
      return null;
    }

    // Verify User exists and is ACTIVE, fetch Member in parallel with lean projection
    const [user, member] = await Promise.all([
      db.collection<UserDocument>("users").findOne({ id: session.userId }, { projection: { passwordHash: 0 } }),
      db.collection<MemberDocument>("members").findOne({ id: session.userId }),
    ]);

    if (!user || user.status !== "ACTIVE") {
      sessionAuthCache.delete(tokenHash);
      return null;
    }

    // If member not found by session.userId, look up by user.memberId
    let finalMember = member;
    if (!finalMember && user.memberId) {
      finalMember = await db.collection<MemberDocument>("members").findOne({ id: user.memberId });
    }
    if (!finalMember) return null;

    // Update lastActiveAt periodically (sliding activity window)
    if (now.getTime() - new Date(session.lastActiveAt).getTime() > 5 * 60 * 1000) {
      db.collection<SessionDocument>("sessions").updateOne(
        { id: session.id },
        { $set: { lastActiveAt: now, updatedAt: now } }
      ).catch(() => {});
    }

    const result = { session, user, member: finalMember };
    // Cache for 30 seconds
    sessionAuthCache.set(tokenHash, { data: result, expiresAt: nowTime + 30000 });

    return result;
  } catch (err) {
    console.error("Session validation error:", err);
    return null;
  }
}

/**
 * Revokes a specific session by ID.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    clearSessionAuthCache();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection<SessionDocument>("sessions").updateOne(
      { id: sessionId },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  } catch (err) {
    console.error("Revoke session error:", err);
    return false;
  }
}

/**
 * Revokes all sessions for a user EXCEPT the current active session.
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  try {
    clearSessionAuthCache(userId);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection<SessionDocument>("sessions").updateMany(
      { userId, id: { $ne: currentSessionId }, revokedAt: null },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } }
    );
    return res.modifiedCount;
  } catch (err) {
    console.error("Revoke other sessions error:", err);
    return 0;
  }
}

/**
 * Revokes ALL active sessions for a user (e.g. on password change or account suspension).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  try {
    clearSessionAuthCache(userId);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const res = await db.collection<SessionDocument>("sessions").updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } }
    );
    return res.modifiedCount;
  } catch (err) {
    console.error("Revoke all user sessions error:", err);
    return 0;
  }
}

/**
 * Retrieves all active/recent sessions for a user for Security Settings UI.
 */
export async function getUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<Array<SessionDocument & { isCurrent: boolean }>> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const sessions = await db
      .collection<SessionDocument>("sessions")
      .find({ userId, revokedAt: null })
      .sort({ lastActiveAt: -1 })
      .toArray();

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  } catch (err) {
    console.error("Fetch user sessions error:", err);
    return [];
  }
}
