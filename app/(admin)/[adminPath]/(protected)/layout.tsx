import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminAuthenticated } from "@/lib/auth";

type ProtectedAdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    adminPath: string;
  }>;
};

export default async function ProtectedAdminLayout({
  children,
  params,
}: ProtectedAdminLayoutProps) {
  const [{ adminPath }, authenticated] = await Promise.all([
    params,
    isAdminAuthenticated(),
  ]);

  if (!authenticated) {
    const redirectPath = `/${adminPath}`;
    redirect(`/${adminPath}/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  return <AdminShell adminPath={adminPath}>{children}</AdminShell>;
}
