"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminIpBlacklistEntry,
  deleteAdminIpBlacklistEntry,
} from "@/lib/admin/ip-blacklist";
import {
  createIpBlacklistFormState,
  type IpBlacklistFormState,
} from "@/lib/admin/ip-blacklist-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

function revalidateIpBlacklistPaths(adminPath: string) {
  revalidatePath(`/${adminPath}`);
  revalidatePath(`/${adminPath}/ip-blacklist`);
}

async function requireAuthenticatedAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/ip-blacklist`)}`,
    );
  }

  return effectiveAdminPath;
}

export async function createIpBlacklistAction(
  _prevState: IpBlacklistFormState,
  formData: FormData,
): Promise<IpBlacklistFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const result = await createAdminIpBlacklistEntry({
    network: String(formData.get("network") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });

  if (!result.success) {
    return createIpBlacklistFormState(result.values, result.errors);
  }

  revalidateIpBlacklistPaths(effectiveAdminPath);
  redirect(`/${effectiveAdminPath}/ip-blacklist?created=1`);
}

export async function deleteIpBlacklistAction(formData: FormData): Promise<void> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const entryId = Number.parseInt(String(formData.get("entryId") ?? ""), 10);
  const result = await deleteAdminIpBlacklistEntry(entryId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/ip-blacklist?error=delete_failed`);
  }

  revalidateIpBlacklistPaths(effectiveAdminPath);
  redirect(`/${effectiveAdminPath}/ip-blacklist?deleted=1`);
}
