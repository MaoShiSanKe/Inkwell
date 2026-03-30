import "server-only";

import { eq } from "drizzle-orm";

import { getAdminEmailNotifications } from "@/lib/admin/settings";
import {
  SITE_NAME,
  buildPostUrl,
  buildSiteUrl,
} from "@/lib/blog/post-seo";
import {
  buildSubscribePath,
  buildSubscriberUnsubscribePath,
} from "@/lib/blog/subscribers";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";
import {
  getAdminPath,
  getSiteOrigin,
  getSmtpSettings,
  listNotificationAdminRecipients,
  listSubscriberNotificationRecipients,
} from "@/lib/settings";

import {
  isMailConfigured,
  sendMailWithConfig,
  type MailConfig,
  type MailSendResult,
} from "./mail";

type NotificationScenario =
  | "comment_pending"
  | "comment_approved"
  | "comment_reply"
  | "post_published";

export type NotificationDispatchResult = {
  scenario: NotificationScenario;
  attempted: boolean;
  deliveries: MailSendResult[];
};

type CommentNotificationContext = {
  id: number;
  postId: number;
  postSlug: string;
  postTitle: string;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  content: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function dedupeRecipientList<T extends { email: string }>(recipients: T[]) {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const normalizedEmail = normalizeEmail(recipient.email);

    if (!normalizedEmail || seen.has(normalizedEmail)) {
      return false;
    }

    seen.add(normalizedEmail);
    return true;
  });
}

async function isScenarioEnabled(scenario: NotificationScenario) {
  const scenarios = await getAdminEmailNotifications();
  return scenarios.some((item) => item.scenario === scenario && item.enabled);
}

async function loadCommentNotificationContext(commentId: number): Promise<CommentNotificationContext | null> {
  const [row] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      postSlug: posts.slug,
      postTitle: posts.title,
      parentId: comments.parentId,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      content: comments.content,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  return row ?? null;
}

async function deliverToRecipients<T extends { email: string }>(
  scenario: NotificationScenario,
  recipients: T[],
  mailConfig: MailConfig,
  messageFactory: (recipient: T) => {
    subject: string;
    text: string;
    html?: string;
  },
): Promise<NotificationDispatchResult> {
  const uniqueRecipients = dedupeRecipientList(recipients);

  if (uniqueRecipients.length === 0 || !isMailConfigured(mailConfig)) {
    return {
      scenario,
      attempted: false,
      deliveries: [],
    };
  }

  const deliveries: MailSendResult[] = [];

  for (const recipient of uniqueRecipients) {
    const message = messageFactory(recipient);
    deliveries.push(
      await sendMailWithConfig(mailConfig, {
        to: recipient.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    );
  }

  return {
    scenario,
    attempted: true,
    deliveries,
  };
}

export async function notifyCommentPending(commentId: number): Promise<NotificationDispatchResult> {
  if (!(await isScenarioEnabled("comment_pending"))) {
    return {
      scenario: "comment_pending",
      attempted: false,
      deliveries: [],
    };
  }

  const comment = await loadCommentNotificationContext(commentId);

  if (!comment) {
    return {
      scenario: "comment_pending",
      attempted: false,
      deliveries: [],
    };
  }

  const [siteOrigin, adminPath, recipients, mailConfig] = await Promise.all([
    Promise.resolve(getSiteOrigin()),
    getAdminPath(),
    listNotificationAdminRecipients(),
    getSmtpSettings(),
  ]);
  const moderationUrl = buildSiteUrl(`/${adminPath}/comments`, siteOrigin);
  const postUrl = buildPostUrl(comment.postSlug, siteOrigin);

  return deliverToRecipients("comment_pending", recipients, mailConfig, () => ({
    subject: `[${SITE_NAME}] 新评论等待审核`,
    text: [
      `文章《${comment.postTitle}》收到一条新评论，当前状态为待审核。`,
      `评论作者：${comment.authorName}`,
      `评论邮箱：${comment.authorEmail}`,
      `评论内容：${comment.content}`,
      `审核地址：${moderationUrl}`,
      `文章地址：${postUrl}`,
    ].join("\n"),
  }));
}

export async function notifyCommentApproved(commentId: number): Promise<NotificationDispatchResult> {
  if (!(await isScenarioEnabled("comment_approved"))) {
    return {
      scenario: "comment_approved",
      attempted: false,
      deliveries: [],
    };
  }

  const comment = await loadCommentNotificationContext(commentId);

  if (!comment || !normalizeEmail(comment.authorEmail)) {
    return {
      scenario: "comment_approved",
      attempted: false,
      deliveries: [],
    };
  }

  const [siteOrigin, mailConfig] = await Promise.all([
    Promise.resolve(getSiteOrigin()),
    getSmtpSettings(),
  ]);
  const postUrl = buildPostUrl(comment.postSlug, siteOrigin);

  return deliverToRecipients(
    "comment_approved",
    [{ email: comment.authorEmail }],
    mailConfig,
    () => ({
      subject: `[${SITE_NAME}] 你的评论已通过审核`,
      text: [
        `你在《${comment.postTitle}》下的评论已通过审核并公开显示。`,
        `文章地址：${postUrl}`,
      ].join("\n"),
    }),
  );
}

export async function notifyCommentReply(commentId: number): Promise<NotificationDispatchResult> {
  if (!(await isScenarioEnabled("comment_reply"))) {
    return {
      scenario: "comment_reply",
      attempted: false,
      deliveries: [],
    };
  }

  const comment = await loadCommentNotificationContext(commentId);

  if (!comment || comment.parentId === null) {
    return {
      scenario: "comment_reply",
      attempted: false,
      deliveries: [],
    };
  }

  const [parentComment] = await db
    .select({
      id: comments.id,
      authorEmail: comments.authorEmail,
      status: comments.status,
    })
    .from(comments)
    .where(eq(comments.id, comment.parentId))
    .limit(1);

  const parentEmail = normalizeEmail(parentComment?.authorEmail);

  if (
    !parentComment ||
    parentComment.status !== "approved" ||
    !parentEmail ||
    parentEmail === normalizeEmail(comment.authorEmail)
  ) {
    return {
      scenario: "comment_reply",
      attempted: false,
      deliveries: [],
    };
  }

  const [siteOrigin, mailConfig] = await Promise.all([
    Promise.resolve(getSiteOrigin()),
    getSmtpSettings(),
  ]);
  const postUrl = buildPostUrl(comment.postSlug, siteOrigin);

  return deliverToRecipients(
    "comment_reply",
    [{ email: parentEmail }],
    mailConfig,
    () => ({
      subject: `[${SITE_NAME}] 你收到了一条新的评论回复`,
      text: [
        `你在《${comment.postTitle}》下的评论收到了新的回复。`,
        `回复作者：${comment.authorName}`,
        `回复内容：${comment.content}`,
        `文章地址：${postUrl}`,
      ].join("\n"),
    }),
  );
}

export async function notifyPostPublished(input: {
  postId: number;
  postSlug: string;
  postTitle: string;
  excerpt: string | null;
}): Promise<NotificationDispatchResult> {
  if (!(await isScenarioEnabled("post_published"))) {
    return {
      scenario: "post_published",
      attempted: false,
      deliveries: [],
    };
  }

  const [recipients, siteOrigin, mailConfig] = await Promise.all([
    listSubscriberNotificationRecipients(),
    Promise.resolve(getSiteOrigin()),
    getSmtpSettings(),
  ]);
  const postUrl = buildPostUrl(input.postSlug, siteOrigin);
  const subscribeUrl = buildSubscribePath();

  return deliverToRecipients("post_published", recipients, mailConfig, (recipient) => {
    const unsubscribeUrl = buildSubscriberUnsubscribePath({
      subscriberId: recipient.id,
      email: recipient.email,
    });

    return {
      subject: `[${SITE_NAME}] 新文章已发布：${input.postTitle}`,
      text: [
        `《${input.postTitle}》已发布。`,
        input.excerpt?.trim() ? `摘要：${input.excerpt.trim()}` : null,
        `阅读地址：${postUrl}`,
        subscribeUrl ? `订阅入口：${subscribeUrl}` : null,
        unsubscribeUrl ? `退订地址：${unsubscribeUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });
}
