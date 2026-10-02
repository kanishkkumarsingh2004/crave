"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export function AdminHeader() {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }) +
          " · " +
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
      {/* Left — Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search platform orders, vendors, customers..."
            className="w-full pl-10 pr-4 h-9 rounded-xl border border-input/80 bg-background/60 text-xs font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Right — Actions & Live Indicators */}
      <div className="flex items-center gap-4">
        {/* Date Time Badge */}
        {currentTime && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 border border-border/60 text-xs font-semibold text-muted-foreground">
            <span>{currentTime}</span>
          </div>
        )}

        {/* Notifications Button */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border/80 bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-background animate-pulse" />
        </Link>

        {/* System Health Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
}
