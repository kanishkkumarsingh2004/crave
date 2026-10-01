import type { Metadata } from "next";
import { CreateVendorForm } from "@/features/vendors/components/create-vendor-form";

export const metadata: Metadata = {
  title: "Add New Vendor | Akshaya Ventures Admin",
  description: "Register a new restaurant vendor, configure Google Maps location, commission policy, and branding",
};

export default function NewVendorPage() {
  return (
    <div className="py-2">
      <CreateVendorForm />
    </div>
  );
}
