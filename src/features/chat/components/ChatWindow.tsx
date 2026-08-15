"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Conversation, Message, UserPresenceStatus, TypingUser, MessageAttachment } from "@/types/nexo";
import { useNexo } from "@/context/NexoContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { chatRealtime } from "../utils/chatRealtime";

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
  const { currentMember, currentUser, members } = useNexo();
  const activeMember = currentMember || currentUser;

  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<UserPresenceStatus>("ONLINE");
  const typingTimerRef = useRef<Record<string, any>>({});

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/messages?memberId=${currentMemberId}`
      );
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        // Track latest sequence for real-time recovery
        for (const m of data.messages) {
          if (m.seq) chatRealtime.updateLastSequence(m.seq);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [conversation.id, currentMemberId]);

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/conversations/${conversation.id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: currentMemberId }),
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, [conversation.id, currentMemberId]);

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [conversation.id, fetchMessages, markAsRead]);

  // Real-time event listeners
  useEffect(() => {
    const unsubNewMsg = chatRealtime.on("message:new", (msg: Message) => {
      if (msg.conversationId === conversation.id) {
        if (msg.seq) chatRealtime.updateLastSequence(msg.seq);

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

            // Auto-clear typing status after 3.5 seconds if stop-typing event missed
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
    };
  }, [conversation.id, conversation.otherMember, currentMemberId, markAsRead]);

  const handleSendMessage = async (text: string, attachment?: MessageAttachment) => {
    const tempId = `msg_temp_${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      senderId: currentMemberId,
      senderName: "Me",
      text,
      type: attachment ? (attachment.type as any) : "TEXT",
      attachment,
      createdAt: new Date().toISOString(),
      status: "SENT",
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentMemberId, text, attachment }),
      });
      const data = await res.json();
      if (data?.success && data.message) {
        if (data.message.seq) chatRealtime.updateLastSequence(data.message.seq);
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
  };

  const handleTypingStatusChange = (isTyping: boolean) => {
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
  };

  const handleEditMessage = async (messageId: string, text: string) => {
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
  };

  const handleDeleteMessage = async (messageId: string) => {
    const isAdminUser = activeMember?.role === "ADMIN" || activeMember?.role === "SUPER_ADMIN";
    
    // Optimistically update message state locally for instant UI response
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, isDeletedByAdmin: isAdminUser }
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
  };

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
        typingUsers={typingUsers}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
      />

      <MessageComposer
        onSendMessage={handleSendMessage}
        onTypingStatusChange={handleTypingStatusChange}
      />
    </div>
  );
}
