"use client";

import React from "react";
import {
  SignIn, SignOut, Warning, ShieldCheck, ShieldStar,
  Monitor, Key, Prohibit, CheckCircle, User, UserCircle,
  ChartLineUp, ClipboardText, UsersThree, TrendUp, ChartBar,
  ArrowsLeftRight, ChatCircle, Gear, ClockCountdown, ArrowUUpLeft,
} from "@phosphor-icons/react";
import { AuditEventType, AuditSeverity } from "@/src/features/activity/types";
import { getSeverityClasses, getActivityIconName } from "@/src/features/activity/formatters";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  SignIn, SignOut, Warning, ShieldCheck, ShieldStar,
  Monitor, Key, Prohibit, CheckCircle, User, UserCircle,
  ChartLineUp, ClipboardText, UsersThree, TrendUp, ChartBar,
  ArrowsLeftRight, ChatCircle, Gear, ClockCountdown, ArrowUUpLeft,
};

interface ActivityIconProps {
  eventType?: AuditEventType | string;
  severity?: AuditSeverity;
  size?: number;
}

export function ActivityIcon({ eventType, severity = "INFO", size = 16 }: ActivityIconProps) {
  const iconName = getActivityIconName(eventType as AuditEventType);
  const IconComponent = ICON_MAP[iconName] || ClockCountdown;
  const classes = getSeverityClasses(severity);

  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${classes.icon}`}>
      <IconComponent size={size} weight="bold" />
    </div>
  );
}
