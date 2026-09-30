import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DeliveriesTable } from "@/features/deliveries/components/deliveries-table";

export const metadata: Metadata = {
  title: "Deliveries | Delivery Admin",
  description: "Monitor live delivery assignments, driver tracking, and delivery fulfillment",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Monitor delivery assignments, driver dispatch, transit status, and delivery completion"
      />
      <DeliveriesTable />
    </div>
  );
}
