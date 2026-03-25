import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "./db";
import { users } from "./db/schema";

export const ADMIN_SESSION_COOKIE = "inkwell_admin_session";
export const ADMIN_ALLOWED_ROLES = ["super_admin", "editor"] as const;

export type AdminRole = (typeof ADMIN_ALLOWED_ROLES)[number];

export type AdminSession = {
  isAuthenticated: boolean;
  userId?: number;
  role?: AdminRole;
};

type AdminSessionPayload = {
  userId: number;
  role: AdminRole;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  return secret || null;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSessionValue(payload: AdminSessionPayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function decodeSessionValue(value: string, secret: string): AdminSessionPayload | null {
  const [encodedPayload, providedSignature] = value.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as {
      userId?: number;
      role?: string;
      exp?: number;
    };

    if (
      typeof parsed.userId !== "number" ||
      !ADMIN_ALLOWED_ROLES.includes(parsed.role as AdminRole) ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role as AdminRole,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function hasAdminSessionSecret() {
  return Boolean(getSessionSecret());
}

export async function createAdminSessionCookie(payload: {
  userId: number;
  role: AdminRole;
  expiresAt: Date;
}) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured.");
  }

  const cookieStore = await cookies();
  const sessionValue = encodeSessionValue(
    {
      userId: payload.userId,
      role: payload.role,
      exp: payload.expiresAt.getTime(),
    },
    secret,
  );

  cookieStore.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: payload.expiresAt,
  });
}

export async function deleteAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession> {
  const secret = getSessionSecret();

  if (!secret) {
    return {
      isAuthenticated: false,
    };
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return {
      isAuthenticated: false,
    };
  }

  const payload = decodeSessionValue(sessionCookie.value, secret);

  if (!payload) {
    return {
      isAuthenticated: false,
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.id, payload.userId),
        inArray(users.role, [...ADMIN_ALLOWED_ROLES] as AdminRole[]),
      ),
    )
    .limit(1);

  if (!user) {
    return {
      isAuthenticated: false,
    };
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    role: user.role as AdminRole,
  };
}

export async function isAdminAuthenticated() {
  const session = await getAdminSession();
  return session.isAuthenticated;
}
