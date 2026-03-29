import Script from "next/script";

import { getUmamiSettings } from "@/lib/settings";

import { UmamiPageviewTracker } from "./umami-pageview-tracker";

type UmamiTrackerProps = {
  scriptUrl: string;
  websiteId: string;
};

export async function UmamiTracker() {
  const settings = await getUmamiSettings();

  if (!isUmamiConfigured(settings)) {
    return null;
  }

  return (
    <ConfiguredUmamiTracker
      scriptUrl={settings.umami_script_url}
      websiteId={settings.umami_website_id}
    />
  );
}

export function ConfiguredUmamiTracker({ scriptUrl, websiteId }: UmamiTrackerProps) {
  return (
    <>
      <Script
        id="umami-script"
        src={scriptUrl}
        strategy="afterInteractive"
        data-website-id={websiteId}
        data-auto-track="false"
        data-do-not-track="true"
      />
      <UmamiPageviewTracker />
    </>
  );
}

function isUmamiConfigured(input: {
  umami_enabled: boolean;
  umami_website_id: string;
  umami_script_url: string;
}) {
  return input.umami_enabled && Boolean(input.umami_website_id) && Boolean(input.umami_script_url);
}
