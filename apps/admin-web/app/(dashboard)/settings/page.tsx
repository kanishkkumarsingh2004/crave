import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const metadata: Metadata = {
  title: "Settings | Delivery Admin",
  description:
    "Configure platform commission rates, delivery fee parameters, and global system settings",
};

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Manage global business rules, commission structures, delivery fees, and order rules"
      />
      <SettingsForm />
    </div>
  );
}
