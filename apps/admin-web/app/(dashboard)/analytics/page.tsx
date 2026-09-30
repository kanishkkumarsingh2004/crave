import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform performance metrics and reports</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
        Analytics management — implemented in Phase 3
      </div>
    </div>
  );
}
