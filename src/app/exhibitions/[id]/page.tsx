import type { Metadata } from "next";
import { getExhibitionForMetadata } from "@/lib/firestore/exhibitionMetadataFetch";
import { ExhibitionDetailClient } from "./ExhibitionDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exhibition = await getExhibitionForMetadata(id);
  if (!exhibition) return {};

  const description = exhibition.oneLiner || undefined;
  const images = exhibition.thumbnailUrl ? [exhibition.thumbnailUrl] : undefined;

  return {
    title: `${exhibition.title} | 온라인전시관`,
    description,
    openGraph: {
      title: exhibition.title,
      description,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: exhibition.title,
      description,
      images,
    },
  };
}

export default function ExhibitionDetailPage() {
  return <ExhibitionDetailClient />;
}
