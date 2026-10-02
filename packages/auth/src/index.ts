/**
 * @delivery/auth — Server-side authentication helpers
 *
 * Lightweight, dependency-free authentication utilities for the platform.
 */

import crypto from "node:crypto";
import { prisma } from "@delivery/database";
import { UserRole, UserStatus } from "@delivery/types";

/**
 * Hash a password using Node native crypto scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify a plain text password against a scrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!hash || !hash.includes(":")) return resolve(false);
    const [salt, key] = hash.split(":");
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Shared auth helper object for session resolution and API authentication
 */
export const auth = {
  api: {
    async getSession({ headers }: { headers: Headers | Record<string, string> }) {
      try {
        const headersObj = headers instanceof Headers
          ? Object.fromEntries((headers as any).entries())
          : headers || {};

        const authHeader = (headersObj["authorization"] || headersObj["Authorization"] || "") as string;
        const cookieHeader = (headersObj["cookie"] || headersObj["Cookie"] || "") as string;

        let token = "";
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7).trim();
        } else if (cookieHeader) {
          const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|auth_token)=([^;]+)/);
          if (match && match[1]) {
            token = match[1];
          }
        }

        if (token) {
          const sessionRecord = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
          });

          if (sessionRecord && sessionRecord.expiresAt > new Date()) {
            return {
              session: {
                id: sessionRecord.id,
                userId: sessionRecord.userId,
                token: sessionRecord.token,
                expiresAt: sessionRecord.expiresAt,
              },
              user: {
                id: sessionRecord.user.id,
                email: sessionRecord.user.email,
                name: sessionRecord.user.name,
                role: (sessionRecord.user.role as UserRole) || UserRole.CUSTOMER,
                status: (sessionRecord.user.status as UserStatus) || UserStatus.ACTIVE,
                phone: sessionRecord.user.phone,
              },
            };
          }
        }
      } catch (err) {
        console.warn("Session lookup warning:", err);
      }

      return null;
    },
  },
};

export type Session = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
};
