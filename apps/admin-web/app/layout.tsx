import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Blinkbite — Hyperlocal Delivery Platform",
    template: "%s | Blinkbite",
  },
  description: "Blinkbite Multi-Role Delivery Platform — Admin Web + Customer/Vendor/Driver Apps",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-950 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
