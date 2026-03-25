import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminPath } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    adminPath: string;
  }>;
};

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const [{ adminPath }, configuredAdminPath] = await Promise.all([
    params,
    getAdminPath(),
  ]);

  if (adminPath !== configuredAdminPath) {
    notFound();
  }

  return <>{children}</>;
}
