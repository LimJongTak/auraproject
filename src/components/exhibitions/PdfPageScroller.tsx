export function PdfPageScroller({ pageImageUrls }: { pageImageUrls: string[] }) {
  if (pageImageUrls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-surface">
      {pageImageUrls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={url}
          alt={`페이지 ${i + 1}`}
          loading={i < 2 ? "eager" : "lazy"}
          className="w-full"
        />
      ))}
    </div>
  );
}
