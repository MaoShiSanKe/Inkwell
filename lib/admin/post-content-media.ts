export type PostContentMediaItem = {
  altText: string | null;
  assetUrl: string | null;
};

export type InsertPostContentBlockResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function normalizeAltText(value: string | null) {
  const trimmed = value?.trim().replace(/[\[\]]/g, "") ?? "";
  return trimmed || "图片";
}

function getLeadingSpacing(before: string) {
  if (!before) {
    return "";
  }

  if (before.endsWith("\n\n")) {
    return "";
  }

  if (before.endsWith("\n")) {
    return "\n";
  }

  return "\n\n";
}

function getTrailingSpacing(after: string) {
  if (!after) {
    return "";
  }

  if (after.startsWith("\n\n")) {
    return "";
  }

  if (after.startsWith("\n")) {
    return "\n";
  }

  return "\n\n";
}

export function buildPostContentImageMarkdown(media: PostContentMediaItem) {
  if (!media.assetUrl) {
    return null;
  }

  return `![${normalizeAltText(media.altText)}](${media.assetUrl})`;
}

export function insertPostContentBlock(
  currentValue: string,
  block: string,
  selectionStart: number,
  selectionEnd: number,
): InsertPostContentBlockResult {
  const safeStart = Math.max(0, Math.min(selectionStart, currentValue.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, currentValue.length));
  const before = currentValue.slice(0, safeStart);
  const after = currentValue.slice(safeEnd);
  const leadingSpacing = getLeadingSpacing(before);
  const trailingSpacing = getTrailingSpacing(after);
  const insertedValue = `${before}${leadingSpacing}${block}${trailingSpacing}${after}`;
  const cursorPosition = (before + leadingSpacing + block).length;

  return {
    value: insertedValue,
    selectionStart: cursorPosition,
    selectionEnd: cursorPosition,
  };
}
