/**
 * Uniqueness and Normalization Engine for NEXO
 * Handles PAN, Phone, and IPO Name validation, canonical normalization,
 * pre-flight uniqueness checks, and MongoDB duplicate key (E11000) translation.
 */

// ── 1. PAN Normalization & Validation ──
export function normalizePan(pan: string | undefined | null): string {
  if (!pan || typeof pan !== "string") return "";
  return pan.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidPan(pan: string | undefined | null): boolean {
  const norm = normalizePan(pan);
  if (!norm) return false;
  // Standard Indian PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(norm);
}

// ── 2. Phone Number Normalization & Validation ──
export function normalizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) return "";

  // 10-digit Indian mobile number (e.g. "9820012345")
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 11-digit with leading 0 (e.g. "09820012345")
  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // 12-digit starting with 91 (e.g. "919820012345")
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Already has '+' prefix (e.g. "+919820012345" or "+14155552671")
  if (/^\+\d{7,15}$/.test(cleaned)) {
    return cleaned;
  }

  // Default fallback: trim whitespace
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function isValidPhone(phone: string | undefined | null): boolean {
  const norm = normalizePhone(phone);
  if (!norm) return false;
  // E.164 standard international phone format: + followed by 7 to 15 digits
  return /^\+[1-9]\d{6,14}$/.test(norm);
}

// ── 3. IPO Name Normalization & Validation ──
export function normalizeIpoName(name: string | undefined | null): string {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatIpoName(name: string | undefined | null): string {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
}

export function isValidIpoName(name: string | undefined | null): boolean {
  const formatted = formatIpoName(name);
  return formatted.length >= 2 && formatted.length <= 100;
}

// ── 4. MongoDB Duplicate Key (E11000) Error Resolver ──
export interface DuplicateErrorResponse {
  status: 409;
  code: "DUPLICATE_PAN" | "DUPLICATE_PHONE" | "DUPLICATE_IPO_NAME" | "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL" | "DUPLICATE_KEY";
  message: string;
}

export function handleDuplicateKeyError(err: any): DuplicateErrorResponse | null {
  if (!err) return null;
  const isMongoDuplicate = err.code === 11000 || (err.message && err.message.includes("E11000"));
  if (!isMongoDuplicate) return null;

  const keyPattern = err.keyPattern || {};
  const keyValue = err.keyValue || {};
  const errMsg = err.message || "";

  if (keyPattern.username || errMsg.includes("username")) {
    const val = keyValue.username || "";
    return {
      status: 409,
      code: "DUPLICATE_USERNAME",
      message: val ? `Username '${val}' is already taken.` : "This username is already taken.",
    };
  }

  if (keyPattern.nameNormalized || errMsg.includes("nameNormalized") || errMsg.includes("name_1")) {
    const val = keyValue.nameNormalized || "";
    return {
      status: 409,
      code: "DUPLICATE_IPO_NAME",
      message: val ? `An active IPO named '${val}' already exists. IPO names must be unique.` : "An active IPO with this name already exists.",
    };
  }

  return {
    status: 409,
    code: "DUPLICATE_USERNAME",
    message: "This username is already taken.",
  };
}
