// Server-only helper for generateMetadata (Open Graph previews for KakaoTalk,
// etc). The Firebase JS SDK is deliberately never initialized on the server
// (see src/lib/firebase/client.ts), so this hits the public Firestore REST
// API directly with a plain fetch instead — no admin credentials needed,
// since firestore.rules already allows unauthenticated reads of published
// exhibitions (the same rule the client SDK relies on).

export interface ExhibitionMetadataDoc {
  title: string;
  oneLiner: string;
  thumbnailUrl: string | null;
}

interface FirestoreValue {
  stringValue?: string;
  nullValue?: null;
}

function readString(fields: Record<string, FirestoreValue> | undefined, key: string): string | null {
  return fields?.[key]?.stringValue ?? null;
}

export async function getExhibitionForMetadata(id: string): Promise<ExhibitionMetadataDoc | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/exhibitions/${id}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;

    const json = (await res.json()) as { fields?: Record<string, FirestoreValue> };
    if (!json.fields || readString(json.fields, "status") !== "published") return null;

    return {
      title: readString(json.fields, "title") ?? "",
      oneLiner: readString(json.fields, "oneLiner") ?? "",
      thumbnailUrl: readString(json.fields, "thumbnailUrl"),
    };
  } catch {
    return null;
  }
}
