import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { buildSiteUrl } from "@/lib/blog/post-seo";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPasswordValue } from "@/lib/password-utils";
import { getSiteOrigin } from "@/lib/settings";

import type { SubscriptionFormErrors, SubscriptionFormValues } from "./subscription-form";

const SUBSCRIBE_PATH = "/subscribe";
const UNSUBSCRIBE_PATH = "/unsubscribe";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubscriberUnsubscribeTokenPayload = {
  subscriberId: number;
  email: string;
};

type SuccessfulSubscriptionResult = {
  success: true;
  status: "created" | "existing";
  subscriber: {
    id: number;
    email: string;
    displayName: string;
  };
};

export type SubscribeToBlogResult =
  | SuccessfulSubscriptionResult
  | {
      success: false;
      values: SubscriptionFormValues;
      errors: SubscriptionFormErrors;
    };

export type SubscriberUnsubscribePreview = {
  isValid: boolean;
  email?: string;
  displayName?: string;
  token?: string;
};

export type UnsubscribeSubscriberResult =
  | {
      success: true;
      status: "removed" | "missing";
      email: string;
    }
  | {
      success: false;
      error: string;
    };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDisplayName(value: string) {
  return value.trim();
}

function buildGeneratedSubscriberUsername() {
  return `subscriber-${randomUUID().replaceAll("-", "")}`;
}

function getSubscriberActionSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  return secret || null;
}

function signTokenPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSubscriberUnsubscribeToken(
  payload: SubscriberUnsubscribeTokenPayload,
  secret: string,
) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signTokenPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function decodeSubscriberUnsubscribeToken(value: string, secret: string) {
  const [encodedPayload, providedSignature] = value.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signTokenPayload(encodedPayload, secret);
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
      subscriberId?: number;
      email?: string;
    };

    if (typeof parsed.subscriberId !== "number" || typeof parsed.email !== "string") {
      return null;
    }

    const normalizedEmail = normalizeEmail(parsed.email);

    if (!normalizedEmail) {
      return null;
    }

    return {
      subscriberId: parsed.subscriberId,
      email: normalizedEmail,
    } satisfies SubscriberUnsubscribeTokenPayload;
  } catch {
    return null;
  }
}

function getInitialValues(input: Partial<SubscriptionFormValues>): SubscriptionFormValues {
  return {
    displayName: normalizeDisplayName(input.displayName ?? ""),
    email: normalizeEmail(input.email ?? ""),
  };
}

function resolveFallbackDisplayName(email: string) {
  const localPart = email.split("@")[0]?.trim();

  if (!localPart) {
    return "订阅读者";
  }

  return localPart.slice(0, 120);
}

function getUniqueConstraintName(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const databaseError = error as { constraint?: string; constraint_name?: string };
  return databaseError.constraint_name ?? databaseError.constraint ?? null;
}

async function findSubscriberByEmail(email: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ?? null;
}

async function createSubscriberRecord(email: string, displayName: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [row] = await db
        .insert(users)
        .values({
          email,
          username: buildGeneratedSubscriberUsername(),
          displayName,
          passwordHash: hashPasswordValue(randomUUID()),
          role: "subscriber",
        })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        });

      return row;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        const constraintName = getUniqueConstraintName(error);

        if (constraintName === "users_username_unique") {
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique subscriber username.");
}

export async function subscribeToBlog(
  input: Partial<SubscriptionFormValues>,
): Promise<SubscribeToBlogResult> {
  const values = getInitialValues(input);
  const errors: SubscriptionFormErrors = {};

  if (!values.email) {
    errors.email = "请输入邮箱地址。";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "请输入有效的邮箱地址。";
  } else if (values.email.length > 255) {
    errors.email = "邮箱长度不能超过 255 个字符。";
  }

  if (values.displayName.length > 120) {
    errors.displayName = "昵称长度不能超过 120 个字符。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      values,
      errors,
    };
  }

  const existingSubscriber = await findSubscriberByEmail(values.email);

  if (existingSubscriber) {
    if (existingSubscriber.role !== "subscriber") {
      return {
        success: false,
        values,
        errors: {
          form: "该邮箱已被站点账户占用，暂时无法直接用于公开订阅。",
        },
      };
    }

    return {
      success: true,
      status: "existing",
      subscriber: {
        id: existingSubscriber.id,
        email: existingSubscriber.email,
        displayName: existingSubscriber.displayName,
      },
    };
  }

  const displayName = values.displayName || resolveFallbackDisplayName(values.email);

  try {
    const subscriber = await createSubscriberRecord(values.email, displayName);

    return {
      success: true,
      status: "created",
      subscriber,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const constraintName = getUniqueConstraintName(error);

      if (constraintName === "users_email_unique") {
        const concurrentSubscriber = await findSubscriberByEmail(values.email);

        if (concurrentSubscriber?.role === "subscriber") {
          return {
            success: true,
            status: "existing",
            subscriber: {
              id: concurrentSubscriber.id,
              email: concurrentSubscriber.email,
              displayName: concurrentSubscriber.displayName,
            },
          };
        }
      }
    }

    return {
      success: false,
      values,
      errors: {
        form: "保存订阅失败，请稍后重试。",
      },
    };
  }
}

export function createSubscriberUnsubscribeToken(input: SubscriberUnsubscribeTokenPayload) {
  const secret = getSubscriberActionSecret();

  if (!secret) {
    return null;
  }

  return encodeSubscriberUnsubscribeToken(
    {
      subscriberId: input.subscriberId,
      email: normalizeEmail(input.email),
    },
    secret,
  );
}

export function buildSubscriberUnsubscribePath(input: SubscriberUnsubscribeTokenPayload) {
  const token = createSubscriberUnsubscribeToken(input);

  if (!token) {
    return null;
  }

  return buildSiteUrl(`${UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`, getSiteOrigin());
}

export function buildSubscribePath() {
  return buildSiteUrl(SUBSCRIBE_PATH, getSiteOrigin());
}

export async function getSubscriberUnsubscribePreview(
  token: string,
): Promise<SubscriberUnsubscribePreview> {
  const secret = getSubscriberActionSecret();

  if (!secret || !token.trim()) {
    return { isValid: false };
  }

  const payload = decodeSubscriberUnsubscribeToken(token.trim(), secret);

  if (!payload) {
    return { isValid: false };
  }

  const [subscriber] = await db
    .select({
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(
      and(
        eq(users.id, payload.subscriberId),
        eq(users.email, payload.email),
        eq(users.role, "subscriber"),
      ),
    )
    .limit(1);

  if (!subscriber) {
    return { isValid: false };
  }

  return {
    isValid: true,
    email: subscriber.email,
    displayName: subscriber.displayName,
    token: token.trim(),
  };
}

export async function unsubscribeSubscriberByToken(
  token: string,
): Promise<UnsubscribeSubscriberResult> {
  const secret = getSubscriberActionSecret();

  if (!secret || !token.trim()) {
    return {
      success: false,
      error: "退订链接无效或已失效。",
    };
  }

  const payload = decodeSubscriberUnsubscribeToken(token.trim(), secret);

  if (!payload) {
    return {
      success: false,
      error: "退订链接无效或已失效。",
    };
  }

  const rows = await db
    .delete(users)
    .where(
      and(
        eq(users.id, payload.subscriberId),
        eq(users.email, payload.email),
        eq(users.role, "subscriber"),
      ),
    )
    .returning({ email: users.email });

  if (rows.length === 0) {
    return {
      success: true,
      status: "missing",
      email: payload.email,
    };
  }

  return {
    success: true,
    status: "removed",
    email: rows[0].email,
  };
}
