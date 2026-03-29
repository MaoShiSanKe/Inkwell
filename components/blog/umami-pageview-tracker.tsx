"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    umami?: {
      track: (input: ((props: Record<string, unknown>) => Record<string, unknown>) | string) => void;
    };
  }
}

export function UmamiPageviewTracker() {
  const pathname = usePathname();
  const lastTrackedPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTrackedPathname.current === pathname) {
      return;
    }

    lastTrackedPathname.current = pathname;
    window.umami?.track((props) => ({
      ...props,
      url: pathname,
    }));
  }, [pathname]);

  return null;
}
