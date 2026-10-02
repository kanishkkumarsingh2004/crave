import type { Metadata } from "next";
import { DriverDetail } from "@/features/drivers/components/driver-detail";

export const metadata: Metadata = {
  title: "Driver Details | Delivery Admin",
  description:
    "View driver details, vehicle information, delivery history, and verification documents",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverDetail id={id} />;
}
