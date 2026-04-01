"use client";

import parse from "html-react-parser";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

function parseHtmlFragment(html: string) {
  return parse(html, { trim: true });
}

type PublicHeadHtmlProps = {
  html: string;
};

type PublicFooterHtmlProps = {
  html: string;
};

type PublicCustomCssProps = {
  css: string;
};

export function PublicHeadHtml({ html }: PublicHeadHtmlProps) {
  const insertedRef = useRef(false);

  useServerInsertedHTML(() => {
    if (!html || insertedRef.current) {
      return null;
    }

    insertedRef.current = true;
    return <>{parseHtmlFragment(html)}</>;
  });

  return null;
}

export function PublicCustomCss({ css }: PublicCustomCssProps) {
  const insertedRef = useRef(false);

  useServerInsertedHTML(() => {
    if (!css || insertedRef.current) {
      return null;
    }

    insertedRef.current = true;
    return <style data-inkwell-public-custom-css>{css}</style>;
  });

  return null;
}

export function PublicFooterHtml({ html }: PublicFooterHtmlProps) {
  if (!html) {
    return null;
  }

  return <>{parseHtmlFragment(html)}</>;
}
