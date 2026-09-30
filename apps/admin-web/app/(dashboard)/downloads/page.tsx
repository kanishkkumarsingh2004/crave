"use client";

import React, { useState } from "react";
import {
  Download,
  Smartphone,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
} from "lucide-react";

interface AppDownloadCardProps {
  title: string;
  subtitle: string;
  role: string;
  version: string;
  size: string;
  icon: React.ElementType;
  downloadPath: string;
  badgeColor: string;
  features: string[];
}

function AppDownloadCard({
  title,
  subtitle,
  role,
  version,
  size,
  icon: Icon,
  downloadPath,
  badgeColor,
  features,
}: AppDownloadCardProps) {
  const [downloading, setDownloading] = useState(false);

  function handleDownload() {
    setDownloading(true);
    const link = document.createElement("a");
    link.href = downloadPath;
    link.click();

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl ${badgeColor} flex items-center justify-center text-white shadow-sm`}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            {role}
          </span>
        </div>

        {/* App Meta Info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 text-xs font-medium mb-5 border border-border/50">
          <div>
            <span className="text-muted-foreground">Version:</span>{" "}
            <span className="text-foreground font-semibold">{version}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Size:</span>{" "}
            <span className="text-foreground font-semibold">{size}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Format:</span>{" "}
            <span className="text-foreground font-semibold">Android APK</span>
          </div>
          <div>
            <span className="text-muted-foreground">Requires:</span>{" "}
            <span className="text-foreground font-semibold">Android 8.0+</span>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-6 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Key Features
          </span>
          <ul className="space-y-1.5">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Download Action */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {downloading ? "Preparing APK Download..." : "Download Android APK (.apk)"}
        </button>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Title & Hero */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-3xl border border-primary/20">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mobile Release Center v1.0</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Download Mobile Applications (.APK)
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Directly download compiled Android package files (.apk) for Customers, Vendor Partners,
            and Delivery Drivers. Install directly on mobile devices or Android emulators.
          </p>
        </div>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AppDownloadCard
          title="Customer Delivery App"
          subtitle="Hyperlocal Food & Grocery Ordering"
          role="CUSTOMER"
          version="v1.0.0"
          size="24.5 MB"
          icon={Smartphone}
          downloadPath="/api/v1/downloads/customer"
          badgeColor="bg-blue-600"
          features={[
            "Realtime Order Tracking & Cart",
            "Single-Vendor Cart Constraints",
            "Multi-Address Saved Book",
            "Razorpay & Stripe Gateway",
          ]}
        />

        <AppDownloadCard
          title="Vendor Partner Terminal"
          subtitle="Store Management & Order Acceptance"
          role="VENDOR"
          version="v1.0.0"
          size="22.1 MB"
          icon={Store}
          downloadPath="/api/v1/downloads/vendor"
          badgeColor="bg-purple-600"
          features={[
            "Store Open/Close Toggle Control",
            "Order Fulfillment State Machine",
            "Realtime Stock & Inventory Edits",
            "Net Earnings & Commission Ledger",
          ]}
        />

        <AppDownloadCard
          title="Driver Delivery Partner"
          subtitle="GPS Dispatch & OTP Verification"
          role="DRIVER"
          version="v1.0.0"
          size="21.8 MB"
          icon={Truck}
          downloadPath="/api/v1/downloads/driver"
          badgeColor="bg-amber-600"
          features={[
            "Availability Toggle (OFFLINE/ONLINE)",
            "Auto-Dispatch Assignment Engine",
            "6-Digit OTP Delivery Handover",
            "Throttled Live GPS Navigation",
          ]}
        />
      </div>

      {/* Installation Instructions Guide */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <div>
            <h2 className="text-lg font-bold text-card-foreground">
              Android APK Sideloading Instructions
            </h2>
            <p className="text-xs text-muted-foreground">
              Follow these simple steps to install the APK on any Android phone or tablet
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="font-bold text-primary text-xs uppercase tracking-wider">Step 1</span>
            <p className="font-semibold text-foreground">Click Download</p>
            <p className="text-xs text-muted-foreground">
              Click the download button above for your desired mobile app role.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="font-bold text-primary text-xs uppercase tracking-wider">Step 2</span>
            <p className="font-semibold text-foreground">Allow Unknown Sources</p>
            <p className="text-xs text-muted-foreground">
              Go to Settings → Security → Enable &quot;Install from Unknown Sources&quot;.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="font-bold text-primary text-xs uppercase tracking-wider">Step 3</span>
            <p className="font-semibold text-foreground">Open File Manager</p>
            <p className="text-xs text-muted-foreground">
              Locate the downloaded .apk file in your device Downloads folder.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="font-bold text-primary text-xs uppercase tracking-wider">Step 4</span>
            <p className="font-semibold text-foreground">Install & Launch</p>
            <p className="text-xs text-muted-foreground">
              Tap Install, open the application, and log in with your demo account credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
