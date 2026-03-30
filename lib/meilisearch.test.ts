import { beforeEach, describe, expect, it, vi } from "vitest";

const clientState = vi.hoisted(() => {
  const waitTask = vi.fn().mockResolvedValue(undefined);
  const indexApi = {
    updateSearchableAttributes: vi.fn(() => ({ waitTask })),
    updateSortableAttributes: vi.fn(() => ({ waitTask })),
    addDocuments: vi.fn(() => ({ waitTask })),
    deleteAllDocuments: vi.fn(() => ({ waitTask })),
    deleteDocument: vi.fn(() => ({ waitTask })),
    search: vi.fn(),
  };

  const client = {
    getIndexes: vi.fn(),
    createIndex: vi.fn(() => ({ waitTask })),
    index: vi.fn(() => indexApi),
  };

  return { waitTask, indexApi, client };
});

vi.mock("meilisearch", () => ({
  Meilisearch: class Meilisearch {
    constructor(_options: unknown) {
      return clientState.client;
    }
  },
}));

describe("meilisearch helpers", () => {
  beforeEach(() => {
    process.env.MEILISEARCH_HOST = "http://localhost:7700";
    process.env.MEILISEARCH_API_KEY = "test-key";
    clientState.waitTask.mockClear();
    clientState.client.getIndexes.mockReset();
    clientState.client.createIndex.mockClear();
    clientState.client.index.mockClear();
    clientState.indexApi.updateSearchableAttributes.mockClear();
    clientState.indexApi.updateSortableAttributes.mockClear();
    clientState.indexApi.addDocuments.mockClear();
    clientState.indexApi.deleteAllDocuments.mockClear();
    clientState.indexApi.deleteDocument.mockClear();
    clientState.indexApi.search.mockClear();
  });

  it("builds published search documents from post content", async () => {
    const { buildPublishedSearchDocument } = await import("./meilisearch");

    expect(
      buildPublishedSearchDocument({
        id: 1,
        title: "Hello",
        slug: "hello",
        excerpt: null,
        content: "<p>Hello <strong>world</strong></p>",
        publishedAt: new Date("2026-03-30T12:00:00.000Z"),
        updatedAt: new Date("2026-03-30T12:30:00.000Z"),
      }),
    ).toEqual({
      id: 1,
      title: "Hello",
      slug: "hello",
      excerpt: null,
      contentPlainText: "Hello world",
      publishedAt: "2026-03-30T12:00:00.000Z",
      updatedAt: "2026-03-30T12:30:00.000Z",
    });
  });

  it("replaces the live published_posts index with rebuilt documents", async () => {
    clientState.client.getIndexes.mockResolvedValue({
      results: [{ uid: "published_posts" }],
    });

    const { replacePublishedPostsIndex } = await import("./meilisearch");
    const result = await replacePublishedPostsIndex({
      documents: [
        {
          id: 1,
          title: "Hello",
          slug: "hello",
          excerpt: null,
          contentPlainText: "Hello world",
          publishedAt: "2026-03-30T12:00:00.000Z",
          updatedAt: "2026-03-30T12:30:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      indexName: "published_posts",
      indexedCount: 1,
    });
    expect(clientState.indexApi.deleteAllDocuments).toHaveBeenCalledTimes(1);
    expect(clientState.indexApi.addDocuments).toHaveBeenCalledWith([
      {
        id: 1,
        title: "Hello",
        slug: "hello",
        excerpt: null,
        contentPlainText: "Hello world",
        publishedAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:30:00.000Z",
      },
    ]);
  });
});
