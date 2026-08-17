"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Conversation, Message, UserPresenceStatus, TypingUser, MessageAttachment } from "@/types/nexo";
import { useNexo } from "@/context/NexoContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { chatRealtime } from "../utils/chatRealtime";
import { soundEffects } from "../utils/soundEffects";
import { chatDataCache } from "../utils/chatDataCache";

interface ChatWindowProps {
  conversation: Conversation;
  currentMemberId: string;
  onBackMobile?: () => void;
  onOpenIpoPage?: (ipoId: string) => void;
  onConversationUpdated?: () => void;
}

export function ChatWindow({
  conversation,
  currentMemberId,
  onBackMobile,
  onOpenIpoPage,
  onConversationUpdated,
}: ChatWindowProps) {
  const { currentMember, currentUser, members, markConversationAsRead } = useNexo();
  const activeMember = currentMember || currentUser;
  const activeRole = currentMember?.role || currentUser?.role;
  const isAdmin = activeRole === "ADMIN" || activeRole === "SUPER_ADMIN";

  const cachedData = useMemo(() => chatDataCache.getMessages(conversation.id), [conversation.id]);

  const [messages, setMessages] = useState<Message[]>(() => cachedData?.messages || []);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(() => cachedData?.hasMoreOlder || false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<UserPresenceStatus>("ONLINE");

  const typingTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastFetchedSignatureRef = useRef<string>("");
  const activeConversationIdRef = useRef<string>(conversation.id);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep active conversation ID ref in sync
  useEffect(() => {
    activeConversationIdRef.current = conversation.id;
  }, [conversation.id]);

  // Fetch messages from API with AbortController and signature check
  const fetchMessages = useCallback(
    async (isInitial = false) => {
      // Abort any prior in-flight request if this is an initial switch
      if (isInitial && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      if (isInitial) {
        abortControllerRef.current = controller;
      }

      try {
        const res = await fetch(
          `/api/conversations/${conversation.id}/messages?memberId=${currentMemberId}&limit=50`,
          { signal: controller.signal }
        );
        const data = await res.json();

        // Stale response check: discard if user already switched conversations
        if (activeConversationIdRef.current !== conversation.id) {
          return;
        }

        if (data?.success && Array.isArray(data.messages)) {
          const hasMore = data.messages.length >= 50;
          if (isInitial) {
            setHasMoreOlder(hasMore);
          }

          // Fast signature check to avoid React state replacement if messages unchanged
          const sig = data.messages
            .map((m: any) => `${m.id}_${m.isEdited}_${m.isDeleted}_${m.status}_${m.reactions?.length || 0}`)
            .join(",");

          if (!isInitial && sig === lastFetchedSignatureRef.current) {
            return;
          }
          lastFetchedSignatureRef.current = sig;

          setMessages((prev) => {
            const existingIds = new Set(data.messages.map((m: any) => m.id));
            const pending = prev.filter((m) => m.id.startsWith("msg_temp_") && !existingIds.has(m.id));
            const merged = [...data.messages, ...pending];
            chatDataCache.setMessages(conversation.id, merged, hasMore);
            return merged;
          });

          // Track latest sequence for real-time recovery
          for (const m of data.messages) {
            if (m.seq) chatRealtime.updateLastSequence(m.seq);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch messages:", err);
        }
      }
    },
    [conversation.id, currentMemberId]
  );

  // Load older messages for pagination
  const handleLoadOlderMessages = useCallback(async () => {
    if (messages.length === 0 || isLoadingOlder) return;
    const oldestMsg = messages[0];
    if (!oldestMsg || !oldestMsg.createdAt) return;

    setIsLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/messages?memberId=${currentMemberId}&before=${encodeURIComponent(
          oldestMsg.createdAt
        )}&limit=50`
      );
      const data = await res.json();

      if (activeConversationIdRef.current !== conversation.id) return;

      if (data?.success && Array.isArray(data.messages)) {
        if (data.messages.length < 50) {
          setHasMoreOlder(false);
        }
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOlder = data.messages.filter((m: any) => !existingIds.has(m.id));
            const updated = [...newOlder, ...prev];
            chatDataCache.setMessages(conversation.id, updated, data.messages.length >= 50);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversation.id, currentMemberId, messages, isLoadingOlder]);

  // Mark conversation as read with global synchronization
  const markAsRead = useCallback(async () => {
    try {
      chatDataCache.markConversationRead(conversation.id);
      if (markConversationAsRead) {
        await markConversationAsRead(conversation.id, conversation.unreadCount || 0);
      } else {
        await fetch(`/api/conversations/${conversation.id}/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: currentMemberId }),
        });
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, [conversation.id, conversation.unreadCount, currentMemberId, markConversationAsRead]);

  // Handle conversation initial load & background sync
  useEffect(() => {
    lastFetchedSignatureRef.current = "";
    setStreamingMessage(null);
    setTypingUsers([]);

    // Restore cached messages immediately if available for 0ms transition
    const cached = chatDataCache.getMessages(conversation.id);
    if (cached && cached.messages.length > 0) {
      setMessages(cached.messages);
      setHasMoreOlder(cached.hasMoreOlder);
    }

    fetchMessages(true);
    markAsRead();

    // Relaxed background sync every 10 seconds
    const interval = setInterval(() => fetchMessages(false), 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMessages(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [conversation.id, fetchMessages, markAsRead]);

  // Real-time event listeners
  useEffect(() => {
    const unsubNewMsg = chatRealtime.on("message:new", (msg: Message) => {
      if (msg.conversationId === conversation.id) {
        if (msg.seq) chatRealtime.updateLastSequence(msg.seq);

        // If streaming message finalized, clear streaming state
        setStreamingMessage((curr) => {
          if (curr && curr.id === msg.id) return null;
          return curr;
        });

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const tempIndex = prev.findIndex(
            (m) => m.id.startsWith("msg_temp_") && m.senderId === msg.senderId && m.text === msg.text
          );
          if (tempIndex !== -1) {
            const copy = [...prev];
            copy[tempIndex] = msg;
            return copy;
          }
          return [...prev, msg];
        });

        if (msg.senderId !== currentMemberId) {
          soundEffects.playReceive();
        }
        markAsRead();
      }
    });

    const unsubTyping = chatRealtime.on(
      "message:typing",
      ({ conversationId: cId, memberId: mId, memberName, memberAvatar, username, isTyping }: any) => {
        if (cId === conversation.id && mId !== currentMemberId) {
          const found = members.find((m) => m.id === mId);
          const name = memberName || found?.name || conversation.otherMember?.name || "Someone";
          const avatar = memberAvatar || found?.avatar || conversation.otherMember?.avatar || "/oggy.png";
          const handle = username || found?.username || conversation.otherMember?.username;

          const typingUserObj: TypingUser = {
            id: mId,
            name,
            username: handle,
            avatar,
          };

          if (isTyping) {
            setTypingUsers((prev) => {
              const filtered = prev.filter((u) => u.id !== mId);
              return [...filtered, typingUserObj];
            });

            if (typingTimerRef.current[mId]) {
              clearTimeout(typingTimerRef.current[mId]);
            }
            typingTimerRef.current[mId] = setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u.id !== mId));
            }, 3500);
          } else {
            if (typingTimerRef.current[mId]) {
              clearTimeout(typingTimerRef.current[mId]);
            }
            setTypingUsers((prev) => prev.filter((u) => u.id !== mId));
          }
        }
      }
    );

    const unsubRead = chatRealtime.on("message:read", ({ conversationId: cId, memberId: mId }: any) => {
      if (cId === conversation.id && mId !== currentMemberId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentMemberId ? { ...m, status: "READ" } : m))
        );
      }
    });

    const unsubUpdate = chatRealtime.on("message:update", (updatedMsg: any) => {
      if (updatedMsg?.conversationId === conversation.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
        );
      }
    });

    const unsubPresence = chatRealtime.on("presence:update", ({ memberId, status }: any) => {
      if (conversation.otherMember && memberId === conversation.otherMember.id) {
        setPresenceStatus(status);
      }
    });

    return () => {
      unsubNewMsg();
      unsubTyping();
      unsubRead();
      unsubUpdate();
      unsubPresence();
      Object.values(typingTimerRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, [conversation.id, conversation.otherMember, currentMemberId, markAsRead, members]);

  const handleSendMessage = useCallback(
    async (text: string, attachment?: MessageAttachment) => {
      const tempId = `msg_temp_${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversationId: conversation.id,
        senderId: currentMemberId,
        senderName: activeMember?.name || "Me",
        senderUsername: activeMember?.username || activeMember?.name?.toLowerCase(),
        senderAvatar: activeMember?.avatar || "/oggy.png",
        text,
        type: attachment ? (attachment.type as any) : "TEXT",
        attachment,
        createdAt: new Date().toISOString(),
        status: "SENT",
      };

      chatDataCache.appendMessage(conversation.id, tempMsg);
      setMessages((prev) => [...prev, tempMsg]);
      soundEffects.playSend();

      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: currentMemberId, text, attachment }),
        });
        const data = await res.json();
        if (data?.success && data.message) {
          if (data.message.seq) chatRealtime.updateLastSequence(data.message.seq);
          chatDataCache.appendMessage(conversation.id, data.message);
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) {
              return prev.filter((m) => m.id !== tempId);
            }
            return prev.map((m) => (m.id === tempId ? data.message : m));
          });
          chatRealtime.notifyNewMessage(data.message);
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
    [conversation.id, currentMemberId, activeMember, onConversationUpdated]
  );

  const handleTypingStatusChange = useCallback(
    (isTyping: boolean) => {
      fetch(`/api/conversations/${conversation.id}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: currentMemberId,
          memberName: activeMember?.name,
          memberAvatar: activeMember?.avatar,
          username: activeMember?.username,
          isTyping,
        }),
      }).catch(() => {});
    },
    [conversation.id, currentMemberId, activeMember]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, text: string) => {
      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, senderId: currentMemberId, action: "edit", text }),
        });
        const data = await res.json();
        if (data?.success) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, text, isEdited: true } : m))
          );
        }
      } catch (err) {
        console.error("Failed to edit message:", err);
      }
    },
    [conversation.id, currentMemberId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Optimistically update message state locally
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, isDeletedByAdmin: isAdmin }
            : m
        )
      );

      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, senderId: currentMemberId, action: "delete" }),
        });
        const data = await res.json();
        if (data?.success && data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, ...data.message } : m))
          );
          if (onConversationUpdated) onConversationUpdated();
        }
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    },
    [conversation.id, currentMemberId, isAdmin, onConversationUpdated]
  );

  return (
    <div className="flex flex-col h-full bg-surface select-none font-sans overflow-hidden">
      <ChatHeader
        conversation={conversation}
        currentMemberId={currentMemberId}
        presenceStatus={presenceStatus}
        onBackMobile={onBackMobile}
        onOpenIpoPage={onOpenIpoPage}
      />

      <MessageList
        messages={messages}
        currentMemberId={currentMemberId}
        isAdmin={isAdmin}
        streamingMessage={streamingMessage}
        typingUsers={typingUsers}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onLoadOlderMessages={handleLoadOlderMessages}
        hasMoreOlder={hasMoreOlder}
        isLoadingOlder={isLoadingOlder}
      />

      <MessageComposer
        onSendMessage={handleSendMessage}
        onTypingStatusChange={handleTypingStatusChange}
      />
    </div>
  );
}
