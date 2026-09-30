declare const process: any;

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const SESSION_KEY = "delivery_driver_session";

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

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  role: "DRIVER";
  status: string;
  image?: string | null;
  driverId?: string;
  driverStatus?: string;
  driverAvailability?: string;
}

interface DriverAuthState {
  user: DriverUser | null;
  status: AuthStatus;
  loading: boolean;

  restoreSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ driverStatus?: string }>;
  signOut: () => Promise<void>;
}

export const useDriverAuthStore = create<DriverAuthState>((set) => ({
  user: null,
  status: "unknown",
  loading: false,

  restoreSession: async () => {
    set({ status: "authenticating" });
    try {
      const res = await fetch(`${API_BASE}/api/auth/get-session`, { credentials: "include" });
      if (res.ok) {
        const body = (await res.json()) as { user?: DriverUser };
        if (body?.user && body.user.role === "DRIVER") {
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
        headers: {
          "Content-Type": "application/json",
          "Origin": API_BASE,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Login failed.");
      }
      const body = (await res.json()) as { user?: DriverUser; token?: string };
      if (!body.user) throw new Error("Login failed.");
      if (body.user.role !== "DRIVER") throw new Error("This app is for drivers only.");
      if (body.token) await SecureStore.setItemAsync(SESSION_KEY, body.token);
      set({ user: body.user, status: "authenticated" });
      return { driverStatus: body.user.driverStatus };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/sign-out`, {
        method: "POST",
        headers: { "Origin": API_BASE },
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    set({ user: null, status: "unauthenticated" });
  },
}));
