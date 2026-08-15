"use client";

import React from "react";
import { MessagesView } from "@/components/views/MessagesView";

export function MessagesTab() {
  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-hidden flex flex-col select-none">
      <MessagesView />
    </div>
  );
}
