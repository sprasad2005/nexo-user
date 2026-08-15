import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

export const dynamic = "force-dynamic";

interface SSEClient {
  memberId: string;
  userId: string;
  send: (formattedData: string) => void;
}

/* Global in-memory broadcast manager for real-time SSE stream */
const globalClients = new Set<SSEClient>();

export function broadcastRealtimeEvent(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  const eventId = data?.seq ? `id: ${data.seq}\n` : "";
  const formatted = `${eventId}event: ${event}\ndata: ${payload}\n\n`;

  globalClients.forEach((client) => {
    try {
      client.send(formatted);
    } catch {}
  });
}

export async function GET(req: Request) {
  // Authenticate session from HTTP-only cookie
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { memberId, userId } = auth;
  const lastEventId = req.headers.get("last-event-id") || new URL(req.url).searchParams.get("lastEventId");

  const stream = new ReadableStream({
    start(controller) {
      const send = (formattedData: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(formattedData));
        } catch {}
      };

      const clientObj: SSEClient = { memberId, userId, send };
      globalClients.add(clientObj);

      // Initial connection handshake
      const initPayload = JSON.stringify({
        event: "connected",
        data: {
          memberId,
          userId,
          time: new Date().toISOString(),
          lastEventIdReceived: lastEventId || null,
        },
      });
      send(`event: connected\ndata: ${initPayload}\n\n`);

      // Heartbeat keep-alive every 15 seconds
      const timer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          clearInterval(timer);
          globalClients.delete(clientObj);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        globalClients.delete(clientObj);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
