import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/authorization";
import { activityRepository } from "@/src/lib/db/repositories/activityRepository";
import { handleApiError } from "@/src/lib/api/errorHandler";
import { apiSuccess } from "@/src/lib/api/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    const query: any = {};
    if (auth.role !== "SUPER_ADMIN") {
      query.category = { $ne: "SECURITY" };
    }

    const activities = await activityRepository.find(query, {
      sort: { createdAt: -1 },
      limit,
    });

    return apiSuccess({ activities });
  } catch (err: any) {
    return handleApiError(err, "GET /api/admin/audit");
  }
}
