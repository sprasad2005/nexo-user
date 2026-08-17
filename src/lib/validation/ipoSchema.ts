export function validateIpoInput(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Request payload must be a JSON object." };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    return { valid: false, error: "IPO name is required." };
  }

  if (data.priceMin !== undefined && (typeof data.priceMin !== "number" || data.priceMin <= 0)) {
    return { valid: false, error: "Minimum price must be a positive number." };
  }

  if (data.priceMax !== undefined && (typeof data.priceMax !== "number" || data.priceMax <= 0)) {
    return { valid: false, error: "Maximum price must be a positive number." };
  }

  if (data.priceMin && data.priceMax && data.priceMax < data.priceMin) {
    return { valid: false, error: "Maximum price cannot be less than minimum price." };
  }

  if (data.lotSize !== undefined && (typeof data.lotSize !== "number" || data.lotSize <= 0)) {
    return { valid: false, error: "Lot size must be a positive integer." };
  }

  return { valid: true };
}
