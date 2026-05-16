import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

export async function requireAuthenticatedAdminPath(
  submittedAdminPath: string,
  redirectPath: (adminPath: string) => string,
) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    submittedAdminPath === configuredAdminPath ? submittedAdminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    const destination = redirectPath(effectiveAdminPath);
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(destination)}`,
    );
  }

  return effectiveAdminPath;
}
