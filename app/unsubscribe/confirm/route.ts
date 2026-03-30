import { redirect } from "next/navigation";

import { unsubscribeSubscriberByToken } from "@/lib/blog/subscribers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  const result = await unsubscribeSubscriberByToken(token);

  if (!result.success) {
    redirect("/unsubscribe");
  }

  redirect(`/unsubscribe?status=${encodeURIComponent(result.status)}`);
}
