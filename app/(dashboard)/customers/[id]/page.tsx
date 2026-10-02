import type { Metadata } from "next";
import { CustomerDetail } from "@/features/customers/components/customer-detail";

export const metadata: Metadata = {
  title: "Customer Details | Delivery Admin",
  description: "View customer details, orders, and addresses",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
