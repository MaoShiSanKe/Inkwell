import {
  PublicCustomCss,
  PublicFooterHtml,
  PublicHeadHtml,
} from "@/components/blog/public-code-injection";
import { DismissiblePublicNotice } from "@/components/blog/dismissible-public-notice";
import { SiteFooter } from "@/components/blog/site-footer";
import { SiteHeader } from "@/components/blog/site-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { UmamiTracker } from "@/components/blog/umami-tracker";
import { listPublicSiteNavigationItems } from "@/lib/blog/site-navigation";
import {
  getPublicCodeSettings,
  getPublicNoticeSettings,
  getThemeFrameworkSettings,
} from "@/lib/settings";
import { resolveContentWidthClass } from "@/lib/theme";

type BlogLayoutProps = {
  children: React.ReactNode;
};

export default async function BlogLayout({ children }: BlogLayoutProps) {
  const [tracker, publicCodeSettings, publicNoticeSettings, themeFrameworkSettings, navigationItems] =
    await Promise.all([
      UmamiTracker(),
      getPublicCodeSettings(),
      getPublicNoticeSettings(),
      getThemeFrameworkSettings(),
      listPublicSiteNavigationItems(),
    ]);
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);

  return (
    <>
      <PublicHeadHtml html={publicCodeSettings.public_head_html} />
      <PublicCustomCss css={publicCodeSettings.public_custom_css} />
      <SiteHeader settings={themeFrameworkSettings} navigationItems={navigationItems} />
      <div className={`mx-auto flex w-full ${widthClass} justify-end px-6 pt-4`}>
        <ThemeToggle
          defaultMode={themeFrameworkSettings.public_theme_default_mode}
          accentTheme={themeFrameworkSettings.public_accent_theme}
        />
      </div>
      <DismissiblePublicNotice settings={publicNoticeSettings} />
      {children}
      <SiteFooter settings={themeFrameworkSettings} />
      {tracker}
      <PublicFooterHtml html={publicCodeSettings.public_footer_html} />
    </>
  );
}
