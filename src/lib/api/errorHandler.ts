import { NextResponse } from "next/server";
import { apiError, apiUnauthorized, apiForbidden, apiConflict } from "./response";

export function handleApiError(err: any, contextName: string = "API"): NextResponse {
  console.error(`[${contextName}] Error:`, err);

  const message = err?.message || String(err) || "An unexpected error occurred.";

  if (message === "UNAUTHORIZED" || message === "Unauthorized") {
    return apiUnauthorized("Authentication required.");
  }

  if (message === "FORBIDDEN" || message === "Forbidden") {
    return apiForbidden("You do not have permission to perform this action.");
  }

  // MongoDB duplicate key error code 11000
  if (err?.code === 11000) {
    const keyPattern = Object.keys(err.keyPattern || {})[0] || "field";
    return apiConflict(`A record with this ${keyPattern} already exists.`);
  }

  if (message.includes("not found") || message.includes("Not found")) {
    return apiError(message, 404);
  }

  if (message.includes("Invalid") || message.includes("required") || message.includes("Validation")) {
    return apiError(message, 400);
  }

  return apiError(message, 500);
}
