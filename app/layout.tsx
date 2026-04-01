import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeScript } from "@/components/theme-script";
import { getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  metadataBase: siteOrigin ? new URL(siteOrigin) : undefined,
  title: {
    default: "Inkwell",
    template: "%s | Inkwell",
  },
  description: "一个面向内容管理、评论互动与 SEO 优化的自建博客框架。",
};

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
