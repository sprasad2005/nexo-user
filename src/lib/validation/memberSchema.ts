export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidPan(pan: string): boolean {
  if (!pan || typeof pan !== "string") return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

export function validateMemberInput(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Request payload must be a JSON object." };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { valid: false, error: "Member name must be at least 2 characters." };
  }

  if (!data.email || !isValidEmail(data.email)) {
    return { valid: false, error: "A valid email address is required." };
  }

  if (data.phone && !isValidPhone(data.phone)) {
    return { valid: false, error: "Phone number must contain between 10 and 15 digits." };
  }

  if (data.pan && !isValidPan(data.pan)) {
    return { valid: false, error: "Invalid PAN card format (expected e.g. ABCDE1234F)." };
  }

  if (data.role && !["MEMBER", "ADMIN", "SUPER_ADMIN"].includes(data.role)) {
    return { valid: false, error: "Role must be MEMBER, ADMIN, or SUPER_ADMIN." };
  }

  return { valid: true };
}
