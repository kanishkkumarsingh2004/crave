import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogsTable } from "@/features/audit-logs/components/audit-logs-table";

export const metadata: Metadata = {
  title: "Audit Logs | Delivery Admin",
  description: "Track all sensitive administrative actions across the platform",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Audit trail of security-sensitive administrative operations and system modifications"
      />
      <AuditLogsTable />
    </div>
  );
}
