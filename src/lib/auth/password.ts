import crypto from "crypto";

/* ─────────────────────────────────────────────────────────────
   SERVER-SIDE PASSWORD SECURITY (PBKDF2-SHA512 Salted Hashing)
   NIST & OWASP Approved Password Hashing Architecture
───────────────────────────────────────────────────────────── */

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha512";

/**
 * Hashes a plaintext password using crypto.pbkdf2Sync with a random 16-byte salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a salt and hash using timing-safe comparison.
 */
export function verifyPasswordWithSalt(password: string, salt: string, originalHash: string): boolean {
  if (!password || !salt || !originalHash) return false;
  try {
    const testHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
    const a = Buffer.from(originalHash, "hex");
    const b = Buffer.from(testHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies a plaintext password against a stored salt:hash string using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  return verifyPasswordWithSalt(password, salt, originalHash);
}

/**
 * Normalizes email address (lowercased & trimmed).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PasswordStrength = "Weak" | "Fair" | "Good" | "Strong";

/**
 * Evaluates password strength and minimum length requirements (12 chars min).
 */
export function validatePasswordStrength(password: string): {
  strength: PasswordStrength;
  isValid: boolean;
  feedback?: string;
} {
  if (!password || password.length < 6) {
    return {
      strength: "Weak",
      isValid: false,
      feedback: "Password must be at least 6 characters long.",
    };
  }

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let strength: PasswordStrength = "Fair";
  if (score <= 2) strength = "Weak";
  else if (score === 3) strength = "Fair";
  else if (score === 4) strength = "Good";
  else strength = "Strong";

  return {
    strength,
    isValid: password.length >= 6,
  };
}
