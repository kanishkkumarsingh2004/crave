declare const process: any;

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const SESSION_KEY = "delivery_vendor_session";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

const API_BASE = getApiBaseUrl();

export type AuthStatus = "unknown" | "authenticating" | "authenticated" | "unauthenticated";

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  role: "VENDOR";
  status: string;
  image?: string | null;
  vendorId?: string;
  vendorStatus?: string;
}

interface VendorAuthState {
  user: VendorUser | null;
  status: AuthStatus;
  loading: boolean;

  restoreSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ vendorStatus?: string }>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    businessPhone: string;
    businessAddress: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useVendorAuthStore = create<VendorAuthState>((set) => ({
  user: null,
  status: "unknown",
  loading: false,

  restoreSession: async () => {
    set({ status: "authenticating" });
    try {
      const res = await fetch(`${API_BASE}/api/auth/get-session`, { credentials: "include" });
      if (res.ok) {
        const body = (await res.json()) as { user?: VendorUser };
        if (body?.user && body.user.role === "VENDOR") {
          set({ user: body.user, status: "authenticated" });
          return;
        }
      }
      await SecureStore.deleteItemAsync(SESSION_KEY);
      set({ user: null, status: "unauthenticated" });
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Login failed.");
      }
      const body = (await res.json()) as { user?: VendorUser; token?: string };
      if (!body.user) throw new Error("Login failed.");
      if (body.user.role !== "VENDOR") throw new Error("This app is for vendors only.");
      if (body.token) await SecureStore.setItemAsync(SESSION_KEY, body.token);
      set({ user: body.user, status: "authenticated" });
      return { vendorStatus: body.user.vendorStatus };
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (data) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/v1/vendor/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Registration failed.");
      }
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/sign-out`, { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    set({ user: null, status: "unauthenticated" });
  },
}));
