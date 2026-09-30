import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProductsTable } from "@/features/products/components/products-table";

export const metadata: Metadata = {
  title: "Products | Delivery Admin",
  description: "Browse and manage vendor products across the platform",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Monitor and review product catalog and inventory across all vendors"
      />
      <ProductsTable />
    </div>
  );
}
