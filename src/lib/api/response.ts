import { NextResponse } from "next/server";

export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

export function apiSuccess<T extends Record<string, any>>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status: options.status || 200,
      headers: options.headers,
    }
  );
}

export function apiError(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const payload: any = {
    success: false,
    error: message,
  };

  if (details) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

export function apiUnauthorized(message: string = "Unauthorized"): NextResponse {
  return apiError(message, 401);
}

export function apiForbidden(message: string = "Forbidden. Access Denied."): NextResponse {
  return apiError(message, 403);
}

export function apiNotFound(message: string = "Resource not found"): NextResponse {
  return apiError(message, 404);
}

export function apiBadRequest(message: string, details?: any): NextResponse {
  return apiError(message, 400, details);
}

export function apiConflict(message: string, details?: any): NextResponse {
  return apiError(message, 409, details);
}
