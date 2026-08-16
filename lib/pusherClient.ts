import PusherClient from "pusher-js";

// Global singleton client for browser-side WebSocket connections
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (pusherClientInstance) return pusherClientInstance;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

  if (!key) {
    return null;
  }

  try {
    pusherClientInstance = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });
    return pusherClientInstance;
  } catch (err) {
    console.warn("[Pusher Client] Connection error:", err);
    return null;
  }
}
