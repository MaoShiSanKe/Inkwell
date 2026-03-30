"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteAdminSubscriber } from "@/lib/admin/subscribers";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

function revalidateSubscriberPaths(adminPath: string) {
  revalidatePath(`/${adminPath}`);
  revalidatePath(`/${adminPath}/subscribers`);
}

async function requireAuthenticatedAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath = adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/subscribers`)}`,
    );
  }

  return effectiveAdminPath;
}

export async function deleteSubscriberAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const subscriberId = Number.parseInt(String(formData.get("subscriberId") ?? ""), 10);
  const result = await deleteAdminSubscriber(subscriberId);

  if (!result.success) {
    return {
      error: result.error,
    };
  }

  revalidateSubscriberPaths(effectiveAdminPath);
  redirect(`/${effectiveAdminPath}/subscribers?deleted=1`);
}
