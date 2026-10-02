import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewsTable } from "@/features/reviews/components/reviews-table";

export const metadata: Metadata = {
  title: "Reviews | Delivery Admin",
  description: "Monitor customer ratings and feedback for vendors, products, and drivers",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ratings & Reviews"
        description="Monitor customer ratings and qualitative feedback submitted for vendors, products, and drivers"
      />
      <ReviewsTable />
    </div>
  );
}
