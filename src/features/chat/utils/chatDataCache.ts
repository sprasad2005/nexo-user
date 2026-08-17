import { Conversation, Message } from "@/types/nexo";

interface CachedConversationData {
  conversations: Conversation[];
  timestamp: number;
}

interface CachedMessagesData {
  messages: Message[];
  timestamp: number;
  hasMoreOlder: boolean;
}

const MEMORY_CONVERSATIONS_CACHE = new Map<string, CachedConversationData>();
const MEMORY_MESSAGES_CACHE = new Map<string, CachedMessagesData>();

const MAX_CACHED_CONVERSATIONS = 100;
const MAX_CACHED_MESSAGES_PER_CONV = 150;

export const chatDataCache = {
  getConversations(memberId: string): Conversation[] | null {
    if (!memberId) return null;
    const mem = MEMORY_CONVERSATIONS_CACHE.get(memberId);
    if (mem && mem.conversations.length > 0) {
      return mem.conversations;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`nexo_chat_v2_convs_${memberId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            MEMORY_CONVERSATIONS_CACHE.set(memberId, { conversations: parsed, timestamp: Date.now() });
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  },

  setConversations(memberId: string, conversations: Conversation[]) {
    if (!memberId || !Array.isArray(conversations)) return;
    MEMORY_CONVERSATIONS_CACHE.set(memberId, {
      conversations: conversations.slice(0, MAX_CACHED_CONVERSATIONS),
      timestamp: Date.now(),
    });
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `nexo_chat_v2_convs_${memberId}`,
          JSON.stringify(conversations.slice(0, MAX_CACHED_CONVERSATIONS))
        );
      } catch {}
    }
  },

  getMessages(conversationId: string): { messages: Message[]; hasMoreOlder: boolean } | null {
    if (!conversationId) return null;
    const mem = MEMORY_MESSAGES_CACHE.get(conversationId);
    if (mem && mem.messages.length > 0) {
      return { messages: mem.messages, hasMoreOlder: mem.hasMoreOlder };
    }
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`nexo_chat_v2_msgs_${conversationId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            MEMORY_MESSAGES_CACHE.set(conversationId, {
              messages: parsed,
              timestamp: Date.now(),
              hasMoreOlder: parsed.length >= 50,
            });
            return { messages: parsed, hasMoreOlder: parsed.length >= 50 };
          }
        }
      } catch {}
    }
    return null;
  },

  setMessages(conversationId: string, messages: Message[], hasMoreOlder = false) {
    if (!conversationId || !Array.isArray(messages)) return;
    const trimmed = messages.slice(-MAX_CACHED_MESSAGES_PER_CONV);
    MEMORY_MESSAGES_CACHE.set(conversationId, {
      messages: trimmed,
      timestamp: Date.now(),
      hasMoreOlder,
    });
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`nexo_chat_v2_msgs_${conversationId}`, JSON.stringify(trimmed));
      } catch {}
    }
  },

  appendMessage(conversationId: string, msg: Message) {
    if (!conversationId || !msg || !msg.id) return;
    const existing = this.getMessages(conversationId);
    const msgs = existing ? [...existing.messages] : [];
    const index = msgs.findIndex((m) => m.id === msg.id);
    if (index !== -1) {
      msgs[index] = msg;
    } else {
      const tempIndex = msgs.findIndex(
        (m) => m.id.startsWith("msg_temp_") && m.senderId === msg.senderId && m.text === msg.text
      );
      if (tempIndex !== -1) {
        msgs[tempIndex] = msg;
      } else {
        msgs.push(msg);
      }
    }
    this.setMessages(conversationId, msgs, existing?.hasMoreOlder || false);
  },

  updateMessage(conversationId: string, messageId: string, patch: Partial<Message>) {
    if (!conversationId || !messageId) return;
    const existing = this.getMessages(conversationId);
    if (!existing) return;
    const msgs = existing.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m));
    this.setMessages(conversationId, msgs, existing.hasMoreOlder);
  },

  markConversationRead(conversationId: string) {
    if (!conversationId) return;
    // Update cached unread count in conversations
    MEMORY_CONVERSATIONS_CACHE.forEach((val, key) => {
      let changed = false;
      const updated = val.conversations.map((c) => {
        if (c.id === conversationId && (c.unreadCount || 0) > 0) {
          changed = true;
          return { ...c, unreadCount: 0 };
        }
        return c;
      });
      if (changed) {
        this.setConversations(key, updated);
      }
    });
  },

  clear() {
    MEMORY_CONVERSATIONS_CACHE.clear();
    MEMORY_MESSAGES_CACHE.clear();
  },
};
