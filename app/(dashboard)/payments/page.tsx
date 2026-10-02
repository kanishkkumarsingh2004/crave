import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentsTable } from "@/features/payments/components/payments-table";

export const metadata: Metadata = {
  title: "Payments | Delivery Admin",
  description: "View payment transactions, payment statuses, and platform financial ledger",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Financials"
        description="Monitor order payments, transaction provider logs, refunds, and financial ledger"
      />
      <PaymentsTable />
    </div>
  );
}
