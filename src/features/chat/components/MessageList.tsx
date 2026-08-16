"use client";

import React, { useRef, useEffect, useState } from "react";
import { Message, TypingUser } from "@/types/nexo";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatCircleDots, CaretDown } from "@phosphor-icons/react";

interface MessageListProps {
  messages: Message[];
  currentMemberId: string;
  typingUsers?: (TypingUser | string)[];
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlder?: boolean;
}

function formatDateDivider(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return "Recent";

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
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
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, showScrollBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-surface/30 font-sans"
      >
        {/* Load Older Messages Button */}
        {hasMoreOlder && onLoadOlderMessages && (
          <div className="text-center py-2">
            <button
              onClick={onLoadOlderMessages}
              className="px-3 py-1 rounded-full bg-surface-alt hover:bg-surface-hover text-ink-tertiary hover:text-ink text-[11px] font-semibold border border-line transition-colors cursor-pointer shadow-2xs"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-tertiary space-y-2 select-none">
            <ChatCircleDots size={36} className="opacity-40 text-accent" />
            <p className="text-xs font-semibold text-ink">This is a private conversation</p>
            <p className="text-[11px] max-w-xs text-ink-secondary">
              Send a message to start discussing IPO allocation, lot sizes, and strategies.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSelf = msg.senderId === currentMemberId;
            const prevMsg = messages[index - 1];

            // Determine if we should show date divider
            const msgDateStr = formatDateDivider(msg.createdAt);
            const prevDateStr = prevMsg ? formatDateDivider(prevMsg.createdAt) : null;
            const showDateDivider = !prevMsg || msgDateStr !== prevDateStr;

            // Determine if we should show the sender header (name/avatar)
            const isDifferentSender = !prevMsg || prevMsg.senderId !== msg.senderId;
            const isTimeGap =
              prevMsg &&
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
                5 * 60 * 1000;

            const showSenderHeader = isDifferentSender || isTimeGap;

            return (
              <React.Fragment key={msg.id ? `${msg.id}_${index}` : `msg_idx_${index}`}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3 select-none">
                    <span className="px-3 py-0.5 rounded-full bg-surface-alt border border-line text-[10px] font-bold text-ink-tertiary uppercase tracking-wider shadow-2xs">
                      {msgDateStr}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isSelf={isSelf}
                  showSenderHeader={showSenderHeader}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2.5 rounded-full bg-surface border border-line text-accent shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer z-10 flex items-center justify-center"
          title="Scroll to latest messages"
        >
          <CaretDown size={18} weight="bold" />
        </button>
      )}
    </div>
  );
}
