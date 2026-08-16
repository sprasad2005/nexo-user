"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNexo } from "@/context/NexoContext";
import { Conversation } from "@/types/nexo";
import { ConversationList } from "@/src/features/chat/components/ConversationList";
import { ChatWindow } from "@/src/features/chat/components/ChatWindow";
import { NewConversationModal } from "@/src/features/chat/components/NewConversationModal";
import { chatRealtime } from "@/src/features/chat/utils/chatRealtime";
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
  } = useNexo();
  const activeUser = currentUser || currentMember || members[0];
  const currentMemberId = activeUser?.id || "mem_1";

  const [conversations, setConversations] = useState<Conversation[]>(STATIC_FALLBACK_CONVERSATIONS);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

  // Connect to real-time service
  useEffect(() => {
    chatRealtime.connect(currentMemberId);
    return () => {
      chatRealtime.disconnect();
    };
  }, [currentMemberId]);

  // Fetch conversations list from API, filtering for active workspace members
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?memberId=${currentMemberId}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.conversations) && data.conversations.length > 0) {
        const uniqueConversations = data.conversations.filter(
          (c: Conversation, index: number, self: Conversation[]) =>
            index === self.findIndex((item) => item.id === c.id)
        );
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

      setConversations(generated);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentMemberId, members, activeUser]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 2500);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  // Listen to real-time conversation updates & new messages
  useEffect(() => {
    const unsubNewMsg = chatRealtime.on("message:new", () => {
      fetchConversations();
    });

    const unsubConvUpdate = chatRealtime.on("conversation:update", () => {
      fetchConversations();
    });

    return () => {
      unsubNewMsg();
      unsubConvUpdate();
    };
  }, [fetchConversations]);

  const handleSelectTargetMember = async (targetMemberId: string) => {
    if (!targetMemberId || targetMemberId === currentMemberId) return;

    // Immediately switch active conversation view
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
  };

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

  const handleOpenIpoPage = (ipoId: string) => {
    const foundIpo = ipos.find((i) => i.id === ipoId);
    if (foundIpo) {
      openIpoDetail(foundIpo);
    }
  };

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
          onSelectConversation={(id) => setActiveConversationId(id)}
          onOpenNewMessageModal={() => setIsNewMessageModalOpen(true)}
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
            onBackMobile={() => setActiveConversationId(null)}
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
              onClick={() => setIsNewMessageModalOpen(true)}
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
        onClose={() => setIsNewMessageModalOpen(false)}
        onSelectMember={handleSelectTargetMember}
      />
    </div>
  );
}
