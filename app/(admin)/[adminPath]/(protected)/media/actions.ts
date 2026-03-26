"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminExternalImage,
  deleteAdminMedia,
  uploadAdminLocalImage,
} from "@/lib/admin/media";
import {
  createExternalImageFormState,
  createLocalImageUploadState,
  type ExternalImageFormState,
  type LocalImageUploadState,
} from "@/lib/admin/media-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

function revalidateMediaPaths(adminPath: string, affectedSlugs: string[] = []) {
  revalidatePath(`/${adminPath}/media`);
  revalidatePath(`/${adminPath}/posts/new`);
  revalidatePath(`/${adminPath}/posts/[postId]`, "page");

  for (const slug of Array.from(new Set(affectedSlugs.map((value) => value.trim()).filter(Boolean)))) {
    revalidatePath(`/post/${slug}`);
  }
}

async function requireAuthenticatedAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/media`)}`,
    );
  }

  return effectiveAdminPath;
}

export async function uploadLocalImageAction(
  _prevState: LocalImageUploadState,
  formData: FormData,
): Promise<LocalImageUploadState> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const imageEntry = formData.get("image");
  const file = typeof File !== "undefined" && imageEntry instanceof File ? imageEntry : null;
  const result = await uploadAdminLocalImage({
    file,
    altText: String(formData.get("altText") ?? ""),
    caption: String(formData.get("caption") ?? ""),
  });

  if (!result.success) {
    return createLocalImageUploadState(result.values, result.errors);
  }

  revalidateMediaPaths(effectiveAdminPath);
  redirect(`/${effectiveAdminPath}/media?uploaded=1`);
}

export async function createExternalImageAction(
  _prevState: ExternalImageFormState,
  formData: FormData,
): Promise<ExternalImageFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const result = await createAdminExternalImage({
    externalUrl: String(formData.get("externalUrl") ?? ""),
    altText: String(formData.get("altText") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    width: String(formData.get("width") ?? ""),
    height: String(formData.get("height") ?? ""),
  });

  if (!result.success) {
    return createExternalImageFormState(result.values, result.errors);
  }

  revalidateMediaPaths(effectiveAdminPath);
  redirect(`/${effectiveAdminPath}/media?created=1`);
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const mediaId = Number.parseInt(String(formData.get("mediaId") ?? ""), 10);
  const result = await deleteAdminMedia(mediaId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/media?error=delete_failed`);
  }

  revalidateMediaPaths(effectiveAdminPath, result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/media?deleted=1`);
}
