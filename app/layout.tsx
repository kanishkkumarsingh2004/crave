import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "BlinkBite — Operations & Admin Console",
    template: "%s | BlinkBite Admin",
  },
  description: "BlinkBite Multi-Role Operations & Admin Console",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
