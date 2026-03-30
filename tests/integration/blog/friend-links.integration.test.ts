import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { friendLinks, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

describe("blog friend links", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("lists only published friend links and exposes a sitemap entry", async () => {
    const author = await createAuthor();
    const db = await getDb();

    await db.insert(friendLinks).values([
      {
        authorId: author.id,
        siteName: "integration-test-Published Link",
        url: "https://integration-test-published.example.com",
        description: "Visible",
        sortOrder: 2,
        status: "published",
        publishedAt: new Date("2026-03-30T12:00:00.000Z"),
        updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      },
      {
        authorId: author.id,
        siteName: "integration-test-Draft Link",
        url: "https://integration-test-draft.example.com",
        description: "Hidden",
        sortOrder: 1,
        status: "draft",
        publishedAt: null,
        updatedAt: new Date("2026-03-30T12:20:00.000Z"),
      },
    ]);

    const { listPublicFriendLinks, listFriendLinksSitemapEntries } = await import(
      "@/lib/blog/friend-links"
    );

    const publicLinks = await listPublicFriendLinks();
    const sitemapEntries = await listFriendLinksSitemapEntries();

    expect(publicLinks).toHaveLength(1);
    expect(publicLinks[0]).toMatchObject({
      siteName: "integration-test-Published Link",
      url: "https://integration-test-published.example.com",
    });
    expect(sitemapEntries).toEqual([
      {
        loc: "/friend-links",
        lastModifiedAt: new Date("2026-03-30T12:10:00.000Z"),
      },
    ]);
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function createAuthor() {
  const db = await getDb();
  const [author] = await db
    .insert(users)
    .values({
      email: "integration-test-friend-links-author@example.com",
      username: "integration-test-friend-links-author",
      displayName: "Friend Links Author",
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({ id: users.id });

  return author;
}
