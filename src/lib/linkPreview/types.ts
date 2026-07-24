export interface LinkPreviewApiResponse {
  ok: boolean;
  url?: string;
  domain?: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  error?: string;
}
