import type { Metadata } from "next";
import { VendorDetail } from "@/features/vendors/components/vendor-detail";

export const metadata: Metadata = {
  title: "Vendor Details | Delivery Admin",
  description: "View vendor details, products, orders, and review submitted verification documents",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorDetail id={id} />;
}
