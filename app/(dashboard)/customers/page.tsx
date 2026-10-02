import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CustomersTable } from "@/features/customers/components/customers-table";

export const metadata: Metadata = {
  title: "Customers | Delivery Admin",
  description: "Manage and monitor customer accounts",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="View and manage all customer accounts on the platform"
      />
      <CustomersTable />
    </div>
  );
}
