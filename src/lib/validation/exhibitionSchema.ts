import { z } from "zod";

const optionalUrl = z
  .string()
  .max(300)
  .optional()
  .refine((v) => !v || /^https?:\/\//.test(v), { message: "http:// 또는 https://로 시작하는 주소를 입력해주세요" });

export const referenceLinksSchema = z.object({
  homepage: optionalUrl,
  instagram: optionalUrl,
  youtube: optionalUrl,
  appStore: optionalUrl,
  googlePlay: optionalUrl,
});

export type ReferenceLinksValues = z.infer<typeof referenceLinksSchema>;

export const exhibitionMetaSchema = z.object({
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").max(60),
  oneLiner: z.string().min(1, "한줄 소개를 입력해주세요").max(120),
  projectUrl: optionalUrl,
  hashtags: z.array(z.string().min(1).max(15)).max(8, "해시태그는 최대 8개까지 등록할 수 있어요").optional(),
  referenceLinks: referenceLinksSchema.optional(),
});

export type ExhibitionMetaValues = z.infer<typeof exhibitionMetaSchema>;
