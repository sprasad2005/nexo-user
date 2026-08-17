"use client";

import React from "react";
import { AuditActivity } from "@/src/features/activity/types";
import { groupActivitiesByDate } from "@/src/features/activity/formatters";
import { ActivityRow } from "./ActivityRow";

interface ActivityTimelineProps {
  activities: AuditActivity[];
  onSelect: (a: AuditActivity) => void;
  onUndo?: (a: AuditActivity) => void;
}

export function ActivityTimeline({ activities, onSelect, onUndo }: ActivityTimelineProps) {
  const groups = groupActivitiesByDate(activities);

  return (
    <div className="space-y-6">
      {groups.map(({ label, items }) => (
        <div key={label}>
          {/* Date label */}
          <div className="flex items-center gap-3 mb-2 px-3">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-widest">
              {label}
            </span>
            <span className="flex-1 h-px bg-slate-100 dark:bg-[#1B1E23]" />
            <span className="text-[10px] text-slate-300 dark:text-[#343943] font-medium">{items.length} events</span>
          </div>

          {/* Events */}
          <div className="space-y-0.5">
            {items.map((activity) => (
              <ActivityRow
                key={activity.id || String((activity as any)._id)}
                activity={activity}
                onClick={onSelect}
                onUndo={onUndo}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
