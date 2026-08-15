"use client";

import React from "react";
import { TypingUser } from "@/types/nexo";

interface TypingIndicatorProps {
  typingUsers: (TypingUser | string)[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  // Normalize typing users array to TypingUser objects
  const users: TypingUser[] = typingUsers.map((item, idx) => {
    if (typeof item === "string") {
      return {
        id: `user_${idx}_${item}`,
        name: item,
        avatar: "/oggy.png",
      };
    }
    return item;
  });

  return (
    <div className="px-4 py-2 flex items-center gap-2.5 text-xs animate-fade-in select-none my-1">
      {/* Avatars Stack */}
      <div className="flex items-center -space-x-1.5 shrink-0">
        {users.map((user) => (
          <img
            key={user.id || user.name}
            src={user.avatar || "/oggy.png"}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover border-2 border-surface ring-1 ring-accent/30 shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/oggy.png";
            }}
          />
        ))}
      </div>

      {/* Typing User Info & Text */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-sans truncate">
          <span className="font-extrabold text-ink truncate">
            {users.map((u) => u.name).join(", ")}
          </span>

          {users.length === 1 && users[0].username && (
            <span className="text-[10px] font-mono text-ink-tertiary">
              @{users[0].username.replace(/^@/, "")}
            </span>
          )}

          <span className="text-ink-secondary font-medium">
            {users.length === 1 ? "is typing" : "are typing"}
          </span>
        </div>

        {/* Live Bouncing Dots Indicator */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-accent/10 border border-accent/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
