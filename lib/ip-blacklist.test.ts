import { describe, expect, it } from "vitest";

import { normalizeBlacklistNetworkInput, resolveRequestIp } from "@/lib/ip-blacklist";

describe("ip blacklist helpers", () => {
  describe("normalizeBlacklistNetworkInput", () => {
    it("normalizes plain IPv4 addresses to /32", () => {
      expect(normalizeBlacklistNetworkInput("203.0.113.10")).toBe("203.0.113.10/32");
    });

    it("normalizes plain IPv6 addresses to /128", () => {
      expect(normalizeBlacklistNetworkInput("2001:db8::1")).toBe("2001:db8::1/128");
    });

    it("accepts explicit CIDR values", () => {
      expect(normalizeBlacklistNetworkInput("203.0.113.0/24")).toBe("203.0.113.0/24");
    });

    it("rejects invalid addresses", () => {
      expect(() => normalizeBlacklistNetworkInput("not-an-ip")).toThrow();
    });
  });

  describe("resolveRequestIp", () => {
    it("uses the first forwarded IP when available", () => {
      expect(resolveRequestIp("203.0.113.10, 198.51.100.20", null)).toBe("203.0.113.10");
    });

    it("falls back to x-real-ip and normalizes mapped IPv4 values", () => {
      expect(resolveRequestIp(null, "::ffff:127.0.0.1")).toBe("127.0.0.1");
    });

    it("falls back to localhost in non-production when headers are missing", () => {
      expect(resolveRequestIp(null, null)).toBe("127.0.0.1");
    });
  });
});
