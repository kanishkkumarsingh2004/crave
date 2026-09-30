import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OrdersTable } from "@/features/orders/components/orders-table";

export const metadata: Metadata = {
  title: "Orders | Delivery Admin",
  description: "Monitor and manage all platform orders",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="View and monitor all orders across the platform" />
      <OrdersTable />
    </div>
  );
}
