import { isIP } from "node:net";

import { sql } from "drizzle-orm";

function normalizeIpCandidate(value: string) {
  const normalized = value.trim().replace(/^\[|\]$/g, "");

  if (!normalized) {
    return null;
  }

  const mappedIpv4Match = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const candidate = mappedIpv4Match ? mappedIpv4Match[1] : normalized;

  return isIP(candidate) > 0 ? candidate : null;
}

export function resolveRequestIp(forwardedFor: string | null, realIp: string | null) {
  const forwardedCandidate = forwardedFor
    ?.split(",")
    .map((value) => normalizeIpCandidate(value))
    .find((value): value is string => Boolean(value));

  if (forwardedCandidate) {
    return forwardedCandidate;
  }

  const realIpCandidate = normalizeIpCandidate(realIp ?? "");

  if (realIpCandidate) {
    return realIpCandidate;
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
}

export function normalizeBlacklistNetworkInput(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("network is required");
  }

  const [address, prefix] = normalized.split("/");
  const family = isIP(address);

  if (family === 0) {
    throw new Error("network must be a valid IPv4 or IPv6 address");
  }

  if (prefix === undefined) {
    return family === 4 ? `${address}/32` : `${address}/128`;
  }

  if (!/^\d+$/.test(prefix)) {
    throw new Error("network prefix must be an integer");
  }

  const parsedPrefix = Number.parseInt(prefix, 10);
  const maxPrefix = family === 4 ? 32 : 128;

  if (parsedPrefix < 0 || parsedPrefix > maxPrefix) {
    throw new Error("network prefix is out of range");
  }

  return `${address}/${parsedPrefix}`;
}

export async function isIpBlacklisted(ipAddress: string) {
  const normalizedIp = normalizeIpCandidate(ipAddress);

  if (!normalizedIp) {
    return false;
  }

  const [{ db }, { ipBlacklist }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/db/schema"),
  ]);

  const rows = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(
      sql`${normalizedIp}::inet <<= ${ipBlacklist.network} and (${ipBlacklist.expiresAt} is null or ${ipBlacklist.expiresAt} > now())`,
    )
    .limit(1);

  return rows.length > 0;
}
