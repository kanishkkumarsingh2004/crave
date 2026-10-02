/**
 * @delivery/auth — Client-side Auth helper
 */

export const authClient = {
  async getSession() {
    try {
      const res = await fetch("/api/auth/get-session");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
  async signOut() {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {}
  },
};

export const getSession = authClient.getSession;
export const signOut = authClient.signOut;
