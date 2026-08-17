import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/authorization";
import { distributionService } from "@/src/lib/services/distributionService";
import { handleApiError } from "@/src/lib/api/errorHandler";
import { apiSuccess } from "@/src/lib/api/response";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const ipoId = searchParams.get("ipoId") || undefined;

    const distributions = await distributionService.getDistributionHistory(ipoId);
    return apiSuccess({ distributions });
  } catch (err: any) {
    return handleApiError(err, "GET /api/admin/distribution");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json().catch(() => ({}));

    const result = await distributionService.executeDistribution(body, auth);
    return apiSuccess(result);
  } catch (err: any) {
    return handleApiError(err, "POST /api/admin/distribution");
  }
}
