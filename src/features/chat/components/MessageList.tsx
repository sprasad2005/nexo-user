"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Message, TypingUser } from "@/types/nexo";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatCircleDots, CaretDown } from "@phosphor-icons/react";

interface MessageListProps {
  messages: Message[];
  currentMemberId: string;
  isAdmin?: boolean;
  streamingMessage?: Message | null;
  typingUsers?: (TypingUser | string)[];
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadOlderMessages?: () => void;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
}

function formatDateDivider(dateStr: string | Date): string {
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

interface ProcessedMessageItem {
  message: Message;
  isSelf: boolean;
  showSenderHeader: boolean;
  showDateDivider: boolean;
  dateDividerText: string;
}

export const MessageList = React.memo(function MessageList({
  messages,
  currentMemberId,
  isAdmin = false,
  streamingMessage = null,
  typingUsers = [],
  onEditMessage,
  onDeleteMessage,
  onLoadOlderMessages,
  hasMoreOlder = false,
  isLoadingOlder = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const prevScrollHeightRef = useRef<number>(0);
  const lastMsgCountRef = useRef<number>(messages.length);
  const scrollRafRef = useRef<number | null>(null);

  // Precompute message rendering metadata in a memoized structure
  const processedItems = useMemo<ProcessedMessageItem[]>(() => {
    const items: ProcessedMessageItem[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prevMsg = i > 0 ? messages[i - 1] : null;

      const isSelf = msg.senderId === currentMemberId;
      const msgDateStr = formatDateDivider(msg.createdAt);
      const prevDateStr = prevMsg ? formatDateDivider(prevMsg.createdAt) : null;
      const showDateDivider = !prevMsg || msgDateStr !== prevDateStr;

      const isDifferentSender = !prevMsg || prevMsg.senderId !== msg.senderId;
      const isTimeGap = Boolean(
        prevMsg &&
          new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
            5 * 60 * 1000
      );

      const showSenderHeader = isDifferentSender || isTimeGap;

      items.push({
        message: msg,
        isSelf,
        showSenderHeader,
        showDateDivider,
        dateDividerText: msgDateStr,
      });
    }

    return items;
  }, [messages, currentMemberId]);

  // Handle scroll measurement with requestAnimationFrame
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isUp = scrollHeight - scrollTop - clientHeight > 150;

      isUserScrolledUpRef.current = isUp;
      setShowScrollBottom(isUp);
    });
  }, []);

  // Preserve scroll position when older messages are loaded at the top
  useEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        containerRef.current.scrollTop += diff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  // Auto-scroll to bottom on new message or streaming response if user is near bottom
  useEffect(() => {
    const isNewMsg = messages.length > lastMsgCountRef.current;
    lastMsgCountRef.current = messages.length;

    if (!isUserScrolledUpRef.current && (isNewMsg || streamingMessage)) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length, streamingMessage]);

  const handleLoadOlder = useCallback(() => {
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    if (onLoadOlderMessages) {
      onLoadOlderMessages();
    }
  }, [onLoadOlderMessages]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      isUserScrolledUpRef.current = false;
      setShowScrollBottom(false);
    });
  }, []);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-surface/30 font-sans"
      >
        {/* Load Older Messages Button */}
        {hasMoreOlder && (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
              className="px-3 py-1 rounded-full bg-surface-alt hover:bg-surface-hover text-ink-tertiary hover:text-ink text-[11px] font-semibold border border-line transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isLoadingOlder ? "Loading older messages..." : "Load older messages"}
            </button>
          </div>
        )}

        {processedItems.length === 0 && !streamingMessage ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-tertiary space-y-2 select-none">
            <ChatCircleDots size={36} className="opacity-40 text-accent" />
            <p className="text-xs font-semibold text-ink">This is a private conversation</p>
            <p className="text-[11px] max-w-xs text-ink-secondary">
              Send a message to start discussing IPO allocation, lot sizes, and strategies.
            </p>
          </div>
        ) : (
          processedItems.map((item) => (
            <React.Fragment key={item.message.id}>
              {item.showDateDivider && (
                <div className="flex items-center justify-center my-3 select-none">
                  <span className="px-3 py-0.5 rounded-full bg-surface-alt border border-line text-[10px] font-bold text-ink-tertiary uppercase tracking-wider shadow-2xs">
                    {item.dateDividerText}
                  </span>
                </div>
              )}
              <MessageBubble
                message={item.message}
                isSelf={item.isSelf}
                showSenderHeader={item.showSenderHeader}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
              />
            </React.Fragment>
          ))
        )}

        {/* Isolated Active Streaming Message */}
        {streamingMessage && (
          <MessageBubble
            key={`stream_${streamingMessage.id}`}
            message={streamingMessage}
            isSelf={streamingMessage.senderId === currentMemberId}
            showSenderHeader={true}
            currentMemberId={currentMemberId}
            isAdmin={isAdmin}
          />
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
});
