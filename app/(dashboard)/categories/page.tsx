import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CategoriesTable } from "@/features/categories/components/categories-table";

export const metadata: Metadata = {
  title: "Categories | Delivery Admin",
  description: "Manage product categories",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Create, edit, and manage product categories" />
      <CategoriesTable />
    </div>
  );
}
