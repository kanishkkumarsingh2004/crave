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
    fetch("/api/auth/get-session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user && data.user.role === "ADMIN") {
          router.replace("/dashboard");
        }
      })
      .catch(() => undefined);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Login failed");
      }

      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    window.location.href = "/api/auth/sign-in/social?provider=google&callbackURL=/dashboard";
  }

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-xl border border-border/80 p-8 space-y-6 max-w-md w-full mx-auto backdrop-blur-sm">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-md shadow-primary/25 ring-4 ring-primary/10">
            <span className="font-extrabold text-xl tracking-wider">D</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Login</h1>
        <p className="text-xs font-medium text-muted-foreground">
          Delivery Platform Administration
        </p>
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
          className="w-full gap-2 text-sm font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground font-semibold">OR</span>
        </div>
      </div>

      {/* Google Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        className="w-full gap-2.5 text-sm font-semibold"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </Button>
    </div>
  );
}
