import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { VendorsTable } from "@/features/vendors/components/vendors-table";

export const metadata: Metadata = {
  title: "Vendors | Delivery Admin",
  description: "Manage vendor applications and store accounts",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Review applications, approve, reject, or suspend vendor accounts"
      />
      <VendorsTable />
    </div>
  );
}
