import { relations } from "drizzle-orm";

import { categories } from "./categories";
import { comments } from "./comments";
import { ipBlacklist } from "./ip-blacklist";
import { media } from "./media";
import { postLikes } from "./post-likes";
import { postMeta } from "./post-meta";
import { postSlugAliases } from "./post-slug-aliases";
import { postRevisions } from "./post-revisions";
import { postSeries } from "./post-series";
import { posts } from "./posts";
import { postTags } from "./post-tags";
import { postViews } from "./post-views";
import { series } from "./series";
import { sitemapEntries } from "./sitemap-entries";
import { tags } from "./tags";
import { users } from "./users";

export * from "./categories";
export * from "./comments";
export * from "./custom-types";
export * from "./email-notifications";
export * from "./enums";
export * from "./ip-blacklist";
export * from "./media";
export * from "./post-likes";
export * from "./post-meta";
export * from "./post-revisions";
export * from "./post-slug-aliases";
export * from "./post-series";
export * from "./post-tags";
export * from "./post-views";
export * from "./posts";
export * from "./series";
export * from "./settings";
export * from "./sitemap-entries";
export * from "./tags";
export * from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  postRevisions: many(postRevisions),
  comments: many(comments),
  media: many(media),
  ipBlacklistEntries: many(ipBlacklist),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, {
    relationName: "category_parent",
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  revisions: many(postRevisions),
  postTags: many(postTags),
  postSeries: many(postSeries),
  comments: many(comments),
  postMeta: one(postMeta),
  slugAliases: many(postSlugAliases),
  views: many(postViews),
  likes: many(postLikes),
  sitemapEntry: one(sitemapEntries),
}));

export const postRevisionsRelations = relations(postRevisions, ({ one }) => ({
  post: one(posts, {
    fields: [postRevisions.postId],
    references: [posts.id],
  }),
  editor: one(users, {
    fields: [postRevisions.editorId],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  postSeries: many(postSeries),
}));

export const postSeriesRelations = relations(postSeries, ({ one }) => ({
  post: one(posts, {
    fields: [postSeries.postId],
    references: [posts.id],
  }),
  series: one(series, {
    fields: [postSeries.seriesId],
    references: [series.id],
  }),
}));

export const postSlugAliasesRelations = relations(postSlugAliases, ({ one }) => ({
  post: one(posts, {
    fields: [postSlugAliases.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_parent",
  }),
  replies: many(comments, {
    relationName: "comment_parent",
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, {
    fields: [media.uploaderId],
    references: [users.id],
  }),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, {
    fields: [postViews.postId],
    references: [posts.id],
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
}));

export const ipBlacklistRelations = relations(ipBlacklist, ({ one }) => ({
  creator: one(users, {
    fields: [ipBlacklist.createdBy],
    references: [users.id],
  }),
}));

export const postMetaRelations = relations(postMeta, ({ one }) => ({
  post: one(posts, {
    fields: [postMeta.postId],
    references: [posts.id],
  }),
  ogImage: one(media, {
    fields: [postMeta.ogImageMediaId],
    references: [media.id],
  }),
}));

export const sitemapEntriesRelations = relations(sitemapEntries, ({ one }) => ({
  post: one(posts, {
    fields: [sitemapEntries.postId],
    references: [posts.id],
  }),
}));
