import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DriversTable } from "@/features/drivers/components/drivers-table";

export const metadata: Metadata = {
  title: "Drivers | Delivery Admin",
  description: "Manage driver applications and accounts",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Review applications, approve, suspend, or deactivate driver accounts"
      />
      <DriversTable />
    </div>
  );
}
