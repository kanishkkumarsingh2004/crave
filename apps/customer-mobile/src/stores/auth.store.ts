import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const SESSION_KEY = "delivery_customer_session";

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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER";
  status: string;
  image?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  loading: boolean;

  restoreSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  loading: false,

  restoreSession: async () => {
    set({ status: "authenticating" });
    try {
      const storedToken = await SecureStore.getItemAsync(SESSION_KEY);
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${API_BASE}/api/auth/get-session`, {
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const body = (await res.json()) as { user?: AuthUser };
        if (body?.user && body.user.role === "CUSTOMER") {
          set({ user: body.user, status: "authenticated" });
          return;
        }
      }

      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
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
          Origin: API_BASE,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Invalid email or password.");
      }

      const body = (await res.json()) as { user?: AuthUser; token?: string };

      if (!body.user) throw new Error("Login failed. Please try again.");
      if (body.user.role !== "CUSTOMER") throw new Error("This app is for customers only.");

      // Persist token for mobile if Better Auth returns one
      if (body.token) {
        await SecureStore.setItemAsync(SESSION_KEY, body.token);
      }

      set({ user: body.user, status: "authenticated" });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async ({ name, email, password }) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: API_BASE,
        },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Registration failed.");
      }

      const body = (await res.json()) as { user?: AuthUser; token?: string };

      if (!body.user) throw new Error("Registration failed.");

      if (body.token) {
        await SecureStore.setItemAsync(SESSION_KEY, body.token);
      }

      set({ user: body.user, status: "authenticated" });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/sign-out`, {
        method: "POST",
        headers: { Origin: API_BASE },
        credentials: "include",
      });
    } catch {
      // ignore — clear locally regardless
    }
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    set({ user: null, status: "unauthenticated" });
  },

  setUser: (user) => set({ user, status: user ? "authenticated" : "unauthenticated" }),
}));
