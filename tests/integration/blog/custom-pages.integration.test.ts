import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { customPageMeta, customPages, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

describe("blog custom pages", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("resolves only published custom pages by slug", async () => {
    const author = await createAuthor();
    const db = await getDb();

    const [publishedPage] = await db
      .insert(customPages)
      .values({
        authorId: author.id,
        title: "About",
        slug: "about",
        content: "About body",
        status: "published",
        publishedAt: new Date("2026-03-30T12:00:00.000Z"),
        updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      })
      .returning({ id: customPages.id });

    await db.insert(customPageMeta).values({
      pageId: publishedPage.id,
      metaTitle: "About title",
      metaDescription: "About description",
      noindex: false,
      nofollow: false,
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
    });

    await db.insert(customPages).values({
      authorId: author.id,
      title: "Draft page",
      slug: "draft-page",
      content: "Draft body",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
    });

    const { listStandalonePageSitemapEntries, resolveStandalonePageBySlug } = await import(
      "@/lib/blog/pages"
    );

    const resolved = await resolveStandalonePageBySlug("about");
    const missing = await resolveStandalonePageBySlug("draft-page");
    const sitemapEntries = await listStandalonePageSitemapEntries();

    expect(resolved).toMatchObject({
      slug: "about",
      title: "About",
      seo: {
        metaTitle: "About title",
        metaDescription: "About description",
      },
    });
    expect(missing).toBeNull();
    expect(sitemapEntries).toEqual([
      {
        loc: "/about",
        lastModifiedAt: new Date("2026-03-30T12:10:00.000Z"),
      },
    ]);
  });

  it("lists recommended standalone pages by selected ids in slot order", async () => {
    const author = await createAuthor();
    const db = await getDb();

    const [aboutPage] = await db
      .insert(customPages)
      .values({
        authorId: author.id,
        title: "About",
        slug: "about",
        content: "About body",
        status: "published",
        publishedAt: new Date("2026-03-30T12:00:00.000Z"),
        updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      })
      .returning({ id: customPages.id });

    const [guidePage] = await db
      .insert(customPages)
      .values({
        authorId: author.id,
        title: "Guide",
        slug: "guide",
        content: "Guide body",
        status: "published",
        publishedAt: new Date("2026-03-31T12:00:00.000Z"),
        updatedAt: new Date("2026-03-31T12:10:00.000Z"),
      })
      .returning({ id: customPages.id });

    await db.insert(customPageMeta).values({
      pageId: guidePage.id,
      metaDescription: "Guide description",
      noindex: false,
      nofollow: false,
      updatedAt: new Date("2026-03-31T12:10:00.000Z"),
    });

    await db.insert(customPages).values({
      authorId: author.id,
      title: "Draft page",
      slug: "draft-page",
      content: "Draft body",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-31T12:10:00.000Z"),
    });

    const { listRecommendedStandalonePages } = await import("@/lib/blog/pages");
    const recommendedPages = await listRecommendedStandalonePages([guidePage.id, aboutPage.id, null]);

    expect(recommendedPages).toEqual([
      {
        id: guidePage.id,
        title: "Guide",
        slug: "guide",
        description: "Guide description",
      },
      {
        id: aboutPage.id,
        title: "About",
        slug: "about",
        description: "About body",
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
      email: "integration-test-pages-author@example.com",
      username: "integration-test-pages-author",
      displayName: "Pages Author",
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({ id: users.id });

  return author;
}
