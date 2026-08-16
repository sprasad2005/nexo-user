import Pusher from "pusher";

// Global singleton instance for server-side Next.js route handlers
let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) return pusherServerInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "ap2";

  if (!appId || !key || !secret) {
    return null;
  }

  try {
    pusherServerInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    return pusherServerInstance;
  } catch (err) {
    console.warn("[Pusher Server] Initialization error:", err);
    return null;
  }
}

/**
 * Triggers a real-time event across all active WebSocket connections for a given channel.
 * Gracefully falls back if Pusher is unconfigured in development.
 */
export async function triggerPusherEvent(channel: string, event: string, data: any): Promise<boolean> {
  try {
    const pusher = getPusherServer();
    if (!pusher) return false;
    await pusher.trigger(channel, event, data);
    return true;
  } catch (err) {
    console.warn(`[Pusher] Failed to trigger event "${event}" on channel "${channel}":`, err);
    return false;
  }
}
