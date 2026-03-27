export type PostHeadingLevel = 2 | 3;

export type PostTocItem = {
  id: string;
  title: string;
  level: PostHeadingLevel;
};

export type PostContentBlock =
  | {
      type: "heading";
      id: string;
      title: string;
      level: PostHeadingLevel;
    }
  | {
      type: "paragraph";
      content: string;
    };

export type ParsedPostContent = {
  tocItems: PostTocItem[];
  blocks: PostContentBlock[];
};

const HEADING_PATTERN = /^\s*(###|##)\s+(.+?)\s*$/u;

export function buildPostHeadingAnchorId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

export function parsePostContentForToc(content: string): ParsedPostContent {
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  const tocItems: PostTocItem[] = [];
  const blocks: PostContentBlock[] = [];
  const anchorCounts = new Map<string, number>();
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const paragraph = paragraphLines.join("\n");

    if (paragraph.trim()) {
      blocks.push({
        type: "paragraph",
        content: paragraph,
      });
    }

    paragraphLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(HEADING_PATTERN);

    if (headingMatch) {
      const title = headingMatch[2].trim();

      if (title) {
        flushParagraph();

        const level = headingMatch[1].length as PostHeadingLevel;
        const baseId = buildPostHeadingAnchorId(title);
        const nextCount = (anchorCounts.get(baseId) ?? 0) + 1;
        const id = nextCount === 1 ? baseId : `${baseId}-${nextCount}`;

        anchorCounts.set(baseId, nextCount);
        tocItems.push({ id, title, level });
        blocks.push({
          type: "heading",
          id,
          title,
          level,
        });
        continue;
      }
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return {
    tocItems,
    blocks,
  };
}
