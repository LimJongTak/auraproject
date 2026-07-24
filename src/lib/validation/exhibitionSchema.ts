import { z } from "zod";

export const exhibitionMetaSchema = z.object({
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").max(60),
  oneLiner: z.string().min(1, "한줄 소개를 입력해주세요").max(120),
  projectUrl: z
    .string()
    .max(300)
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), { message: "http:// 또는 https://로 시작하는 주소를 입력해주세요" }),
});

export type ExhibitionMetaValues = z.infer<typeof exhibitionMetaSchema>;
