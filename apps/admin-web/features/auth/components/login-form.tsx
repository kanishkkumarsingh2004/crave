"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user && data.user.role === "ADMIN") {
          window.location.href = "/dashboard";
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as { message?: string }).message ?? "Invalid email or password");
      }

      if (body?.user && body.user.role !== "ADMIN") {
        throw new Error("Access denied: Only administrator accounts can access this console.");
      }

      toast.success("Login successful! Redirecting to dashboard...");
      // Hard redirect ensures session cookies are reliably committed and sent to Next.js middleware & dashboard layout
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function fillDemoAdmin() {
    setEmail("admin@delivery.com");
    setPassword("Password123");
    toast.info("Demo admin credentials filled!");
  }

  return (
    <div className="bg-card text-card-foreground rounded-3xl shadow-2xl border border-blue-100 p-8 space-y-6 max-w-md w-full mx-auto backdrop-blur-md">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <img
            src="/logo.png"
            alt="CRAVE"
            className="w-14 h-14 object-contain rounded-2xl shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10 bg-white p-1"
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">CRAVE Admin Console</h1>
        <p className="text-xs font-semibold text-slate-500">Enterprise Operations & Logistics Management</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            Email Address
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all shadow-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="flex-1 bg-transparent border-0 outline-none p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot Password?
            </a>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="flex-1 bg-transparent border-0 outline-none p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground focus:outline-none shrink-0 p-0.5"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          isLoading={loading}
          className="w-full gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In to Dashboard</span>
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={fillDemoAdmin}
          className="w-full py-2.5 px-3 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200/80 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>⚡ Use Admin Demo Credentials (admin@delivery.com)</span>
        </button>
      </form>
    </div>
  );
}
