"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import { CalendarBlank } from "@phosphor-icons/react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader() {
  const { currentUser: loggedInUser, members } = useNexo();
  const currentUser = loggedInUser || members[0] || { name: "Member", role: "MEMBER" };

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-line font-sans">
      {/* Left: Greeting */}
      <div className="space-y-2">

        {/* Headline */}
        <h1 className="text-[28px] sm:text-[32px] leading-[1.2] font-bold text-ink tracking-tight">
          {getGreeting()},{" "}
          <span className="text-accent">{currentUser.name}</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-ink-secondary font-normal leading-relaxed">
          Your private IPO investment workspace &amp; decision center.
        </p>
      </div>

      {/* Right: Date + Quick Stat */}
      <div className="flex flex-col sm:items-end gap-2 self-start sm:self-auto">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink bg-surface border border-line px-3.5 py-2 rounded-xl shadow-2xs">
          <CalendarBlank size={14} className="text-accent" />
          <span className="num-tabular">{formattedDate}</span>
        </div>

      </div>
    </div>
  );
}
