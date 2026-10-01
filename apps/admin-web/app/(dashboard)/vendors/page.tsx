import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { VendorsTable } from "@/features/vendors/components/vendors-table";

export const metadata: Metadata = {
  title: "Vendors | Akshaya Ventures Admin",
  description: "Manage restaurant vendors, commission policies, and store accounts",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors & Restaurants"
        description="Review applications, register new restaurants, configure Google Maps locations, and manage commissions"
        actions={
          <Link
            href="/vendors/new"
            prefetch={true}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Vendor</span>
          </Link>
        }
      />
      <VendorsTable />
    </div>
  );
}

