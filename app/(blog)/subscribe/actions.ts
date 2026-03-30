"use server";

import { revalidatePath } from "next/cache";

import { createSubscriptionFormState, type SubscriptionFormState } from "@/lib/blog/subscription-form";
import { subscribeToBlog, unsubscribeSubscriberByToken } from "@/lib/blog/subscribers";

function resolveSubscriptionValues(formData: FormData) {
  return {
    displayName: String(formData.get("displayName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  };
}

export async function subscribeAction(
  _prevState: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const result = await subscribeToBlog({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!result.success) {
    return createSubscriptionFormState(result.values, result.errors);
  }

  revalidatePath("/");
  revalidatePath("/subscribe");

  return createSubscriptionFormState(
    {
      displayName: result.status === "created" ? "" : result.subscriber.displayName,
      email: result.subscriber.email,
    },
    {},
    result.status,
    result.status === "created"
      ? "订阅成功。后续有新文章发布时，你会收到邮件通知。"
      : "这个邮箱已经订阅，无需重复提交。",
  );
}

export async function unsubscribeAction(formData: FormData): Promise<SubscriptionFormState> {
  const token = String(formData.get("token") ?? "").trim();
  const result = await unsubscribeSubscriberByToken(token);

  if (!result.success) {
    return createSubscriptionFormState(
      resolveSubscriptionValues(formData),
      { form: result.error },
      "idle",
      null,
    );
  }

  revalidatePath("/");
  revalidatePath("/subscribe");
  revalidatePath("/unsubscribe");

  return createSubscriptionFormState(
    {
      displayName: "",
      email: result.email,
    },
    {},
    "unsubscribed",
    result.status === "removed"
      ? "你已成功退订后续新文章邮件。"
      : "该邮箱当前已经不在订阅列表中。",
  );
}
