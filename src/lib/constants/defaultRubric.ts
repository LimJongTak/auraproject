import type { RubricItem } from "@/types/models";

export const DEFAULT_RUBRIC: RubricItem[] = [
  {
    id: "q1",
    group: "독창성",
    label: "문제 정의",
    maxScore: 10,
    criteria: "새로운 문제를 해결하고자 했거나, 기존 문제라면 접근의 차별성을 가지고 있는가?",
  },
  {
    id: "q2",
    group: "독창성",
    label: "문제 해결",
    maxScore: 10,
    criteria: "유사 서비스 또는 경쟁 서비스와 비교 분석하여 차별점을 제시하였는가?",
  },
  {
    id: "q3",
    group: "독창성",
    label: "문제 해결",
    maxScore: 10,
    criteria: "제시된 문제의 적절한 해결 방안이 제시되었는가?",
  },
  {
    id: "q4",
    group: "사업성",
    label: "시장성",
    maxScore: 10,
    criteria: "아이디어 및 서비스의 주요 타겟이 구체적인가?",
  },
  {
    id: "q5",
    group: "사업성",
    label: "수익성",
    maxScore: 10,
    criteria: "마케팅 혹은 영업 전략 등 초기의 비즈니스 대상을 확보할 구체적인 전략을 제시하였는가?",
  },
  {
    id: "q6",
    group: "사업성",
    label: "실현 가능성",
    maxScore: 10,
    criteria: "서비스가 지속될 수 있는 적절한 수익 모델을 가지고 있는가?",
  },
  {
    id: "q7",
    group: "사업성",
    label: "실현 가능성",
    maxScore: 10,
    criteria: "실제 서비스로 이어질 수 있도록 로드맵을 잘 작성하였는가?",
  },
  {
    id: "q8",
    group: "전달력",
    label: "발표",
    maxScore: 10,
    criteria: "아이디어 및 서비스의 실현 가능성이 높은가?",
  },
  {
    id: "q9",
    group: "전달력",
    label: "공감대 형성",
    maxScore: 10,
    criteria: "발표 자료를 시각화하여 잘 표현하였는가?",
  },
  {
    id: "q10",
    group: "전달력",
    label: "공감대 형성",
    maxScore: 10,
    criteria: "기획 의도와 아이디어가 잘 전달이 되었는가?",
  },
];
