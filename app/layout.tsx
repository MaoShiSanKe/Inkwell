import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { DEFAULT_DESCRIPTION } from "@/lib/blog/post-seo";
import { ThemeScript } from "@/components/theme-script";
import { getSiteBrandName, getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteOrigin = getSiteOrigin();

export async function generateMetadata(): Promise<Metadata> {
  const siteBrandName = await getSiteBrandName();

  return {
    metadataBase: siteOrigin ? new URL(siteOrigin) : undefined,
    title: {
      default: siteBrandName,
      template: `%s | ${siteBrandName}`,
    },
    description: DEFAULT_DESCRIPTION,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeFrameworkSettings = await getThemeFrameworkSettings();

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <ThemeScript defaultMode={themeFrameworkSettings.public_theme_default_mode} />
        {children}
      </body>
    </html>
  );
}
