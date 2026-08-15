import { NextResponse } from "next/server";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await req.json();
    const memberId = body.memberId || "mem_1";
    const memberName = body.memberName;
    const memberAvatar = body.memberAvatar;
    const username = body.username;
    const isTyping = Boolean(body.isTyping);

    broadcastRealtimeEvent("message:typing", {
      conversationId,
      memberId,
      memberName,
      memberAvatar,
      username,
      isTyping,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Failed to broadcast typing event" }, { status: 500 });
  }
}
