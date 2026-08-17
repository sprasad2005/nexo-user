import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { validateSessionToken } from "@/src/lib/auth/session";
import { getUndoHandler, isActivityReversible } from "@/src/features/activity/undoRegistry";
import { AuditActivity } from "@/src/features/activity/types";

const DB_NAME = "nexo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData) {
      return NextResponse.json({ success: false, error: "Invalid or expired session." }, { status: 401 });
    }

    const { user, member } = sessionData;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const isAdmin = user.role === "ADMIN" || isSuperAdmin;

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Load original activity
    const activity = await db.collection<AuditActivity>("activities").findOne({ id: activityId });
    if (!activity) {
      return NextResponse.json({ success: false, error: "Activity record not found." }, { status: 404 });
    }

    // 2. Prevent Double Undo
    if (activity.isReversed) {
      return NextResponse.json(
        {
          success: false,
          error: "This action has already been reversed.",
          reversedAt: activity.reversedAt,
          reversedBy: activity.reversedBy,
        },
        { status: 409 }
      );
    }

    // 3. Authorization check: Admin can only undo their own actions; Super Admin can undo any admin's actions
    if (!isSuperAdmin) {
      const isActor =
        (activity.actorUserId && activity.actorUserId === user.id) ||
        (activity.actorMemberId && activity.actorMemberId === member.id) ||
        (activity.actorUsername && activity.actorUsername === member.username);

      if (!isActor) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden. Administrators can only reverse their own logged actions. Contact a Super Admin.",
          },
          { status: 403 }
        );
      }
    }

    // 4. Check if activity type is reversible
    const eventType = activity.eventType || (activity as any).type;
    const handler = getUndoHandler(eventType);
    if (!handler || !isActivityReversible(activity)) {
      return NextResponse.json(
        {
          success: false,
          error: `The action "${eventType}" does not support automatic reversal or lacks required recovery state.`,
        },
        { status: 409 }
      );
    }

    const authContext = {
      userId: user.id,
      memberId: member.id,
      username: member.username,
      displayName: member.name,
      role: user.role,
    };

    // 5. Concurrency & Dependency Validation
    const validation = await handler.validateUndo(activity, db, authContext);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.reason || "Reversal validation failed." },
        { status: validation.code || 409 }
      );
    }

    // 6. Execute Reversal
    const execution = await handler.executeUndo(activity, db, authContext);
    if (!execution.success) {
      return NextResponse.json({ success: false, error: execution.message }, { status: 500 });
    }

    const now = new Date();
    const reversalActivityId = `act_rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 7. Mark original activity as reversed (NEVER delete)
    await db.collection("activities").updateOne(
      { id: activityId },
      {
        $set: {
          isReversed: true,
          reversedAt: now,
          reversedBy: {
            userId: user.id,
            memberId: member.id,
            name: member.name,
            username: member.username,
            role: user.role,
          },
          reversalActivityId,
        },
      }
    );

    // 8. Create NEW reversal audit log
    const reversalActivityDoc: AuditActivity = {
      id: reversalActivityId,
      eventType: "ACTION_REVERSED",
      category: activity.category || "SYSTEM",
      severity: "WARNING",
      actorUserId: user.id,
      actorMemberId: member.id,
      actorName: member.name,
      actorUsername: member.username,
      actorRole: user.role,
      targetType: activity.targetType,
      targetId: activity.targetId,
      targetName: activity.targetName,
      ipoId: activity.ipoId,
      memberId: activity.memberId,
      applicationId: activity.applicationId,
      conversationId: activity.conversationId,
      previousValue: execution.previousState,
      newValue: execution.newState,
      metadata: {
        originalActivityId: activity.id,
        originalEventType: eventType,
        originalActorName: activity.actorName,
        originalActorUsername: activity.actorUsername,
        originalCreatedAt: activity.createdAt,
        reversalReason: execution.message,
      },
      createdAt: now,
    };

    await db.collection("activities").insertOne(reversalActivityDoc as any);

    return NextResponse.json({
      success: true,
      message: execution.message,
      reversedActivityId: activityId,
      reversalActivity: reversalActivityDoc,
    });
  } catch (err: any) {
    console.error("POST /api/admin/activity/[id]/undo error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred during reversal." },
      { status: 500 }
    );
  }
}
