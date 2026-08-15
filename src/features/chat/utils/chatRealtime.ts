/* ────────────────────────────────────────────────────────────────
   REAL-TIME CHAT SERVICE ABSTRACTION (SSE + Delta Sync Recovery)
   Provides resilient event-driven SSE transport for NEXO Chat.
   Monitors sequence numbers (seq) and executes delta-sync on reconnect.
──────────────────────────────────────────────────────────────── */

type ChatEventCallback = (data: any) => void;

class ChatRealtimeService {
  private listeners: Map<string, Set<ChatEventCallback>> = new Map();
  private eventSource: EventSource | null = null;
  private currentMemberId: string | null = null;
  private isConnected: boolean = false;
  private lastMessageSequence: number = 0;
  private processedIds: Set<string> = new Set();
  private reconnectTimer: any = null;

  public connect(memberId: string) {
    if (typeof window === "undefined") return;
    this.currentMemberId = memberId;

    if (this.eventSource) return;

    try {
      const sseUrl = `/api/realtime`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        const wasDisconnected = !this.isConnected;
        this.isConnected = true;
        this.emit("presence:update", { memberId, status: "ONLINE" });

        // If reconnecting after a drop, perform delta recovery to fetch missed messages
        if (wasDisconnected && this.lastMessageSequence > 0) {
          this.recoverMissedMessages();
        }
      };

      // Custom event listener for message:new
      this.eventSource.addEventListener("message:new", (e: MessageEvent) => {
        this.handleIncomingMessageEvent(e.data);
      });

      // Custom event listener for message:typing
      this.eventSource.addEventListener("message:typing", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit("message:typing", payload.data || payload);
        } catch {}
      });

      // Custom event listener for message:read
      this.eventSource.addEventListener("message:read", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit("message:read", payload.data || payload);
        } catch {}
      });

      // Custom event listener for presence:update
      this.eventSource.addEventListener("presence:update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit("presence:update", payload.data || payload);
        } catch {}
      });

      // Custom event listener for message:update
      this.eventSource.addEventListener("message:update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit("message:update", payload.data || payload);
        } catch {}
      });

      // Fallback generic onmessage
      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event && payload?.data) {
            if (payload.event === "message:new") {
              this.handleIncomingMessageObject(payload.data);
            } else {
              this.emit(payload.event, payload.data);
            }
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        // Schedule delta recovery attempt when EventSource retries
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.lastMessageSequence > 0) {
              this.recoverMissedMessages();
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.warn("Realtime EventSource setup error:", err);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public on(event: string, callback: ChatEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: ChatEventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  public emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((cb) => cb(data));
    }
  }

  public updateLastSequence(seq: number) {
    if (seq && seq > this.lastMessageSequence) {
      this.lastMessageSequence = seq;
    }
  }

  private handleIncomingMessageEvent(rawData: string) {
    try {
      const parsed = JSON.parse(rawData);
      const msg = parsed.data || parsed;
      this.handleIncomingMessageObject(msg);
    } catch {}
  }

  private handleIncomingMessageObject(msg: any) {
    if (!msg || !msg.id) return;
    if (this.processedIds.has(msg.id)) return;

    this.processedIds.add(msg.id);
    if (msg.seq && typeof msg.seq === "number") {
      this.updateLastSequence(msg.seq);
    }

    this.emit("message:new", msg);
  }

  /* Executes delta recovery against /api/conversations/poll?after=lastSeq */
  public async recoverMissedMessages() {
    try {
      const res = await fetch(`/api/conversations/poll?after=${this.lastMessageSequence}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          this.handleIncomingMessageObject(msg);
        }
        if (data.unreadCounts) {
          this.emit("conversation:update", data.unreadCounts);
        }
      }
    } catch (err) {
      console.error("Failed to recover missed messages:", err);
    }
  }

  public notifyNewMessage(message: any) {
    this.handleIncomingMessageObject(message);
  }

  public notifyTyping(conversationId: string, memberId: string, isTyping: boolean) {
    this.emit("message:typing", { conversationId, memberId, isTyping });
  }

  public notifyRead(conversationId: string, memberId: string) {
    this.emit("message:read", { conversationId, memberId });
  }
}

export const chatRealtime = new ChatRealtimeService();
