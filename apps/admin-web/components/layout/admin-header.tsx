"use client";

import { Bell } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0">
      {/* Left — breadcrumb or page title area */}
      <div />

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Avatar placeholder */}
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-semibold">A</span>
        </div>
      </div>
    </header>
  );
}
