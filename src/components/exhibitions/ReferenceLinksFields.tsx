import { Globe } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { AppStoreIcon, GooglePlayIcon, InstagramIcon, YoutubeIcon } from "@/lib/constants/referenceLinkIcons";
import type { ExhibitionMetaValues, ReferenceLinksValues } from "@/lib/validation/exhibitionSchema";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

const FIELDS: { key: keyof ReferenceLinksValues; label: string; placeholder: string; icon: React.ReactNode }[] = [
  { key: "homepage", label: "홈페이지", placeholder: "https://your-project.com", icon: <Globe size={18} /> },
  { key: "instagram", label: "인스타그램", placeholder: "https://instagram.com/...", icon: <InstagramIcon /> },
  { key: "youtube", label: "유튜브", placeholder: "https://youtube.com/...", icon: <YoutubeIcon /> },
  { key: "appStore", label: "App Store", placeholder: "https://apps.apple.com/...", icon: <AppStoreIcon /> },
  { key: "googlePlay", label: "Google Play", placeholder: "https://play.google.com/...", icon: <GooglePlayIcon /> },
];

export function ReferenceLinksFields({
  register,
  errors,
}: {
  register: UseFormRegister<ExhibitionMetaValues>;
  errors: FieldErrors<ExhibitionMetaValues>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-sm font-semibold text-foreground">참고 링크 (선택)</span>
        <p className="mt-0.5 text-xs text-muted">홈페이지, SNS, 앱 다운로드 링크를 등록하면 상세 페이지에 아이콘으로 노출돼요.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">{f.icon}</span>
            <Input
              placeholder={`${f.label} — ${f.placeholder}`}
              {...register(`referenceLinks.${f.key}` as const)}
              error={errors.referenceLinks?.[f.key]?.message}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
