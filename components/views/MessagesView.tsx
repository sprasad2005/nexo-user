"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNexo } from "@/context/NexoContext";
import { Conversation } from "@/types/nexo";
import { ConversationList } from "@/src/features/chat/components/ConversationList";
import { ChatWindow } from "@/src/features/chat/components/ChatWindow";
import { NewConversationModal } from "@/src/features/chat/components/NewConversationModal";
import { chatRealtime } from "@/src/features/chat/utils/chatRealtime";
import { chatDataCache } from "@/src/features/chat/utils/chatDataCache";
import { ChatCircleDots } from "@phosphor-icons/react";

const STATIC_FALLBACK_CONVERSATIONS: Conversation[] = [];

export function MessagesView() {
  const {
    currentMember,
    currentUser,
    members,
    openIpoDetail,
    ipos,
    activeConversationId,
    setActiveConversationId,
    markConversationAsRead,
  } = useNexo();
  const activeUser = currentUser || currentMember || members[0];
  const currentMemberId = activeUser?.id || "mem_1";

  const [conversations, setConversations] = useState<Conversation[]>(
    () => chatDataCache.getConversations(currentMemberId) || STATIC_FALLBACK_CONVERSATIONS
  );
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

  // Connect to real-time service
  useEffect(() => {
    chatRealtime.connect(currentMemberId);
    return () => {
      chatRealtime.disconnect();
    };
  }, [currentMemberId]);

  const lastConvSigRef = useRef<string>("");
  const activeConvIdRef = useRef<string | null>(activeConversationId);
  const lastMarkedReadMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Fetch conversations list from API with fast deduplication and signature check
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/conversations?memberId=${currentMemberId}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.conversations) && data.conversations.length > 0) {
        const uniqueConversations = data.conversations.filter(
          (c: Conversation, index: number, self: Conversation[]) =>
            index === self.findIndex((item) => item.id === c.id)
        );

        const sig = uniqueConversations
          .map((c: Conversation) => `${c.id}_${c.lastMessageAt}_${c.unreadCount || 0}_${c.lastMessage}`)
          .join("|");

        if (!isInitial && sig === lastConvSigRef.current) {
          return;
        }
        lastConvSigRef.current = sig;
        chatDataCache.setConversations(currentMemberId, uniqueConversations);
        setConversations(uniqueConversations);
        return;
      }

      // Build dynamic initial conversations for registered members
      const registeredOtherMembers = members.filter((m) => m.id !== currentMemberId);
      const generated: Conversation[] = registeredOtherMembers.map((m) => ({
        id: `conv_dir_${currentMemberId}_${m.id}`,
        type: "DIRECT" as const,
        title: `@${(m.username || m.name).toLowerCase()}`,
        avatar: m.avatar || "/oggy.png",
        createdBy: currentMemberId,
        directKey: `${[currentMemberId, m.id].sort().join("_")}`,
        lastMessage: `Tap to chat with @${(m.username || m.name).toLowerCase()}`,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        otherMember: m,
        participants: [activeUser, m],
      }));

      chatDataCache.setConversations(currentMemberId, generated);
      setConversations(generated);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentMemberId, members, activeUser]);

  useEffect(() => {
    fetchConversations(true);

    // Relaxed background sync every 10 seconds
    const interval = setInterval(() => fetchConversations(false), 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchConversations(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  // Read state handler for active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const targetConv = conversations.find((c) => c.id === activeConversationId);
    const unread = targetConv?.unreadCount || 0;
    const now = Date.now();
    const lastMarkedTime = lastMarkedReadMapRef.current.get(activeConversationId) || 0;

    if (unread > 0 || now - lastMarkedTime > 20000) {
      lastMarkedReadMapRef.current.set(activeConversationId, now);

      // Optimistically clear unread count for this conversation in list
      if (unread > 0) {
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
          );
          chatDataCache.setConversations(currentMemberId, updated);
          return updated;
        });
      }

      markConversationAsRead(activeConversationId, unread);
    }
  }, [activeConversationId, conversations, currentMemberId, markConversationAsRead]);

  // Listen to real-time conversation updates & new messages
  useEffect(() => {
    const unsubNewMsg = chatRealtime.on("message:new", (msg: any) => {
      if (msg?.conversationId) {
        const isCurrentActive =
          activeConvIdRef.current === msg.conversationId &&
          typeof document !== "undefined" &&
          document.visibilityState === "visible";
        const isOwn = msg.senderId === currentMemberId;

        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id === msg.conversationId) {
              const addedUnread = !isCurrentActive && !isOwn ? 1 : 0;
              return {
                ...c,
                lastMessage: msg.text || (msg.attachment ? `[${msg.attachment.type}]` : "New message"),
                lastMessageAt: msg.createdAt || new Date().toISOString(),
                unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + addedUnread,
              };
            }
            return c;
          });

          // Reorder: move the conversation with newest message to the top
          const target = updated.find((c) => c.id === msg.conversationId);
          const others = updated.filter((c) => c.id !== msg.conversationId);
          const reordered = target ? [target, ...others] : updated;

          chatDataCache.setConversations(currentMemberId, reordered);
          return reordered;
        });
      }
    });

    const unsubRead = chatRealtime.on("message:read", (data: any) => {
      if (data?.conversationId) {
        chatDataCache.markConversationRead(data.conversationId);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    });

    const unsubConvUpdate = chatRealtime.on("conversation:update", () => {
      fetchConversations(false);
    });

    const unsubConvDelete = chatRealtime.on("conversation:delete", (data: any) => {
      if (data?.conversationId) {
        setConversations((prev) => {
          const remaining = prev.filter((c) => c.id !== data.conversationId);
          chatDataCache.setConversations(currentMemberId, remaining);
          return remaining;
        });
        if (activeConvIdRef.current === data.conversationId) {
          setActiveConversationId(null);
        }
      }
    });

    return () => {
      unsubNewMsg();
      unsubRead();
      unsubConvUpdate();
      unsubConvDelete();
    };
  }, [currentMemberId, fetchConversations, setActiveConversationId]);

  const handleSelectTargetMember = useCallback(async (targetMemberId: string) => {
    if (!targetMemberId || targetMemberId === currentMemberId) return;

    setActiveConversationId(targetMemberId);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMemberId, targetMemberId, type: "DIRECT" }),
      });
      const data = await res.json();
      if (data?.success && data.conversation) {
        await fetchConversations();
        setActiveConversationId(data.conversation.id);
      }
    } catch (err) {
      console.error("Failed to initiate direct conversation:", err);
    }
  }, [currentMemberId, setActiveConversationId, fetchConversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return conversations[0] || null;

    // 1. Direct match by conversation ID
    const directMatch = conversations.find((c) => c.id === activeConversationId);
    if (directMatch) return directMatch;

    // 2. Match by other member ID, username, or participants
    const memberMatch = conversations.find(
      (c) =>
        c.otherMember?.id === activeConversationId ||
        c.otherMember?.username?.toLowerCase() === activeConversationId.toLowerCase() ||
        c.directKey?.includes(activeConversationId) ||
        (Array.isArray(c.participants) &&
          c.participants.some(
            (p: any) =>
              p.id === activeConversationId ||
              p.username?.toLowerCase() === activeConversationId.toLowerCase()
          ))
    );
    if (memberMatch) return memberMatch;

    // 3. Construct instant optimistic conversation if target member is found
    const targetMemberObj = members.find(
      (m) =>
        m.id === activeConversationId ||
        m.username?.toLowerCase() === activeConversationId.toLowerCase() ||
        m.name?.toLowerCase() === activeConversationId.toLowerCase()
    );

    if (targetMemberObj) {
      return {
        id: `conv_dir_${currentMemberId}_${targetMemberObj.id}`,
        type: "DIRECT" as const,
        title: targetMemberObj.name,
        avatar: targetMemberObj.avatar || "/oggy.png",
        createdBy: currentMemberId,
        directKey: `${[currentMemberId, targetMemberObj.id].sort().join("_")}`,
        lastMessage: "Start a conversation",
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        otherMember: targetMemberObj,
        participants: [activeUser, targetMemberObj],
      };
    }

    return conversations[0] || null;
  }, [conversations, activeConversationId, members, currentMemberId, activeUser]);

  const handleOpenIpoPage = useCallback((ipoId: string) => {
    const foundIpo = ipos.find((i) => i.id === ipoId);
    if (foundIpo) {
      openIpoDetail(foundIpo);
    }
  }, [ipos, openIpoDetail]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, [setActiveConversationId]);

  const handleOpenNewMessageModal = useCallback(() => {
    setIsNewMessageModalOpen(true);
  }, []);

  const handleCloseNewMessageModal = useCallback(() => {
    setIsNewMessageModalOpen(false);
  }, []);

  const handleBackMobile = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  return (
    <div className="h-full flex-1 max-h-full flex flex-col md:flex-row overflow-hidden bg-[#0C0E12] border border-line/70 rounded-2xl shadow-2xl font-sans relative select-none">
      {/* LEFT: Conversation List (Fixed 320px width on desktop) */}
      <div
        className={`w-full md:w-[320px] lg:w-[340px] shrink-0 h-full bg-[#111319] border-r border-line/70 ${
          activeConversationId ? "hidden md:block" : "block"
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentMemberId={currentMemberId}
          onSelectConversation={handleSelectConversation}
          onOpenNewMessageModal={handleOpenNewMessageModal}
        />
      </div>

      {/* RIGHT: Active Conversation Chat Window */}
      <div
        className={`w-full md:w-[calc(100%-320px)] lg:w-[calc(100%-340px)] flex-1 h-full bg-[#0C0E12] ${
          activeConversationId ? "block" : "hidden md:block"
        }`}
      >
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            currentMemberId={currentMemberId}
            onBackMobile={handleBackMobile}
            onOpenIpoPage={handleOpenIpoPage}
            onConversationUpdated={fetchConversations}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0C0E12] text-ink-tertiary space-y-3 select-none">
            <ChatCircleDots size={48} className="opacity-40 text-accent" />
            <h3 className="text-sm font-bold text-ink">Messages</h3>
            <p className="text-xs max-w-xs leading-relaxed">
              Select a conversation from the left or start a new private message with a group member.
            </p>
            <button
              onClick={handleOpenNewMessageModal}
              className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
            >
              + New Message
            </button>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewMessageModalOpen}
        onClose={handleCloseNewMessageModal}
        onSelectMember={handleSelectTargetMember}
      />
    </div>
  );
}
