import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Admin Sign In — Akshaya Ventures",
  description: "Secure administrator authentication portal for Akshaya Ventures platform",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-blue-50/30 to-white px-4 py-12 selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-200/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Back to Home link */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}

