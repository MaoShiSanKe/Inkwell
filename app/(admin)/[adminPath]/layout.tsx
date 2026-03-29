import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
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

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl justify-end px-6 pt-6">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
