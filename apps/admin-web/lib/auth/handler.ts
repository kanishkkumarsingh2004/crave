import { NextResponse } from "next/server";
import { prisma } from "@delivery/database";
import { verifyPassword, hashPassword } from "@delivery/auth";
import crypto from "node:crypto";

export async function handleAuthRequest(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.includes("/get-session")) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|auth_token)=([^;]+)/);
    const token = match ? match[1] : "";

    if (token) {
      const sessionRecord = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (sessionRecord && sessionRecord.expiresAt > new Date()) {
        return NextResponse.json({
          session: sessionRecord,
          user: sessionRecord.user,
        });
      }
    }
    return NextResponse.json(null);
  }

  if (pathname.includes("/sign-in/email") && request.method === "POST") {
    try {
      const body = await request.json();
      const { email, password } = body;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const credentialAccount = user.accounts.find((acc) => acc.providerId === "credential");
      if (!credentialAccount || !credentialAccount.password) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await verifyPassword(password, credentialAccount.password);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const response = NextResponse.json({ user, session: { token, expiresAt }, token });
      response.cookies.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
      return response;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Sign in failed" }, { status: 400 });
    }
  }

  if (pathname.includes("/sign-up/email") && request.method === "POST") {
    try {
      const body = await request.json();
      const { name, email, password } = body;

      if (!email || !password || !name) {
        return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: "CUSTOMER",
          status: "ACTIVE",
          accounts: {
            create: {
              accountId: email,
              providerId: "credential",
              password: hashedPassword,
            },
          },
          customerProfile: {
            create: {},
          },
        },
      });

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const response = NextResponse.json({ user, session: { token, expiresAt }, token });
      response.cookies.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
      return response;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Registration failed" }, { status: 400 });
    }
  }

  if (pathname.includes("/sign-out") && request.method === "POST") {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("session_token");
    response.cookies.delete("better-auth.session_token");
    return response;
  }

  return NextResponse.json({ message: "Auth API active" });
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
