const IMAGE_SYNTAX = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;

export function stripInlineImages(content: string): string {
  return content.replace(IMAGE_SYNTAX, "").trim();
}

// Renders plain text with the occasional inline image, written as markdown's
// `![](url)` inside an otherwise plain-text admin textarea — no rich text
// editor in this codebase, so this is the smallest way to let an image sit
// between two paragraphs.
export function RichText({ content, className }: { content: string; className?: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const re = new RegExp(IMAGE_SYNTAX);
  let match: RegExpExecArray | null;

  while ((match = re.exec(content))) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
    }
    nodes.push(
      // No fixed aspect ratio here on purpose — inline images range from wide
      // 16:9 photos to full A3-poster (842x1191) uploads, and this has to
      // display both without cropping. Bounding by max-height keeps a tall
      // poster from forcing a huge scroll; w-auto + max-w-full keeps a wide
      // image at its natural size up to the column width.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key++}
        src={match[1]}
        alt=""
        className="mx-auto my-4 block h-auto max-h-[80vh] w-auto max-w-full rounded-2xl shadow-md"
      />
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    nodes.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }

  return <div className={className}>{nodes}</div>;
}
