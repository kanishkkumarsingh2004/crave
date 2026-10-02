import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Manage and broadcast platform notifications</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
        Notifications management — implemented in Phase 3
      </div>
    </div>
  );
}
