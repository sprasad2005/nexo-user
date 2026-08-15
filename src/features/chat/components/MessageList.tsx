"use client";

import React, { useRef, useEffect } from "react";
import { Message, TypingUser } from "@/types/nexo";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatCircleDots } from "@phosphor-icons/react";

interface MessageListProps {
  messages: Message[];
  currentMemberId: string;
  typingUsers?: (TypingUser | string)[];
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlder?: boolean;
}

export function MessageList({
  messages,
  currentMemberId,
  typingUsers = [],
  onEditMessage,
  onDeleteMessage,
  onLoadOlderMessages,
  hasMoreOlder = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-1 bg-surface/30 font-sans"
    >
      {/* Load Older Messages Button */}
      {hasMoreOlder && onLoadOlderMessages && (
        <div className="text-center py-2">
          <button
            onClick={onLoadOlderMessages}
            className="px-3 py-1 rounded-full bg-surface-alt hover:bg-surface-hover text-ink-tertiary hover:text-ink text-[11px] font-semibold border border-line transition-colors cursor-pointer"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-tertiary space-y-2 select-none">
          <ChatCircleDots size={36} className="opacity-40" />
          <p className="text-xs font-semibold text-ink">This is a private conversation</p>
          <p className="text-[11px] max-w-xs">
            Send a message to start discussing IPO allocation, lot sizes, and strategies.
          </p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isSelf = msg.senderId === currentMemberId;
          const prevMsg = messages[index - 1];

          // Determine if we should show the sender header (name/avatar)
          const isDifferentSender = !prevMsg || prevMsg.senderId !== msg.senderId;
          const isTimeGap =
            prevMsg &&
            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
              5 * 60 * 1000;

          const showSenderHeader = isDifferentSender || isTimeGap;

          return (
            <MessageBubble
              key={msg.id ? `${msg.id}_${index}` : `msg_idx_${index}`}
              message={msg}
              isSelf={isSelf}
              showSenderHeader={showSenderHeader}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
            />
          );
        })
      )}

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      <div ref={bottomRef} />
    </div>
  );
}
