"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  ADMIN_ALLOWED_ROLES,
  createAdminSessionCookie,
  deleteAdminSessionCookie,
  hasAdminSessionSecret,
  type AdminRole,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { getAdminPath } from "@/lib/settings";

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

type LoginInput = {
  adminPath: string;
  email: string;
  password: string;
  redirectTo: string;
};

function sanitizeRedirect(adminPath: string, redirectTo: string) {
  if (redirectTo.startsWith(`/${adminPath}`) && !redirectTo.startsWith("//")) {
    return redirectTo;
  }

  return `/${adminPath}`;
}

function loginErrorRedirect(adminPath: string, code: string, redirectTo: string) {
  const safeRedirect = sanitizeRedirect(adminPath, redirectTo);
  redirect(
    `/${adminPath}/login?error=${encodeURIComponent(code)}&redirect=${encodeURIComponent(safeRedirect)}`,
  );
}

export async function loginAdmin({
  adminPath,
  email,
  password,
  redirectTo,
}: LoginInput): Promise<never> {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath = adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const normalizedEmail = email.trim().toLowerCase();
  const safeRedirect = sanitizeRedirect(effectiveAdminPath, redirectTo);

  if (!hasAdminSessionSecret()) {
    loginErrorRedirect(effectiveAdminPath, "auth_config", safeRedirect);
  }

  if (!normalizedEmail || !password) {
    loginErrorRedirect(effectiveAdminPath, "missing_credentials", safeRedirect);
  }

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.email, normalizedEmail),
        inArray(users.role, [...ADMIN_ALLOWED_ROLES] as AdminRole[]),
      ),
    )
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    loginErrorRedirect(effectiveAdminPath, "invalid_credentials", safeRedirect);
  }

  await createAdminSessionCookie({
    userId: user.id,
    role: user.role as AdminRole,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
  });

  redirect(safeRedirect);
}

export async function logoutAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath = adminPath === configuredAdminPath ? adminPath : configuredAdminPath;

  await deleteAdminSessionCookie();
  redirect(`/${effectiveAdminPath}/login`);
}
