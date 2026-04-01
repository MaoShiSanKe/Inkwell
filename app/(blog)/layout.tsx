import {
  PublicCustomCss,
  PublicFooterHtml,
  PublicHeadHtml,
} from "@/components/blog/public-code-injection";
import { DismissiblePublicNotice } from "@/components/blog/dismissible-public-notice";
import { ThemeToggle } from "@/components/theme-toggle";
import { UmamiTracker } from "@/components/blog/umami-tracker";
import { getPublicCodeSettings, getPublicNoticeSettings } from "@/lib/settings";

type BlogLayoutProps = {
  children: React.ReactNode;
};

export default async function BlogLayout({ children }: BlogLayoutProps) {
  const [tracker, publicCodeSettings, publicNoticeSettings] = await Promise.all([
    UmamiTracker(),
    getPublicCodeSettings(),
    getPublicNoticeSettings(),
  ]);

  return (
    <>
      <PublicHeadHtml html={publicCodeSettings.public_head_html} />
      <PublicCustomCss css={publicCodeSettings.public_custom_css} />
      <div className="mx-auto flex w-full max-w-4xl justify-end px-6 pt-6">
        <ThemeToggle />
      </div>
      <DismissiblePublicNotice settings={publicNoticeSettings} />
      {children}
      {tracker}
      <PublicFooterHtml html={publicCodeSettings.public_footer_html} />
    </>
  );
}
