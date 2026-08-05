# 온라인전시관 — AI인재양성부트캠프사업단

국립순천대학교 AI인재양성부트캠프사업단의 AURA 대회 플랫폼 온라인전시관입니다. 대회별로 팀을
구성해 전시물(발표자료 PDF)을 등록하고, 다른 팀의 전시물을 둘러보며 좋아요·댓글로 응원할 수 있습니다.

## 도메인 주소
- [AURA 대회 플랫폼](https://scnuai.com)

## 주요 기능

- **회원가입 / 로그인** — 이름·학교·학과·학년·학번 정보로 가입 (Firebase Authentication)
- **대회별 팀 구성** — 대회(카테고리)마다 별도의 팀을 만들거나 초대코드로 참가. 한 사람이 여러
  대회에 각각 다른 팀으로 참가할 수 있지만, 같은 대회에는 팀 1개까지만 소속 가능. 대회별 최소/최대
  인원 제한 설정 가능(1인 대회 지원)
- **전시물 등록** — 발표자료 PDF를 업로드하면 페이지별 이미지로 자동 변환, 프로젝트 링크를 입력하면
  Open Graph 메타데이터로 미리보기 카드 생성
- **온라인전시관** — 게시된 전시물 목록(카테고리 필터·최신순/인기순 정렬·검색), 좋아요·댓글
- **대회 페이지** — 진행 중인 대회와 접수 기간 안내
- **대회별 배너** — 홈 화면 상단에 대회별 배너(이미지, 신청시작 카운트다운, 주제공개 카운트다운),
  접수 시작 시 "신청하기" 버튼으로 바로 등록 페이지 이동
- **마이페이지** — 내 정보, 내가 속한 팀(대회별), 내가 등록한 전시물
- **관리자 페이지** — 카테고리(대회) 관리, 배너·주제공개 관리, 게시물 숨김/공개, 사용자 권한 관리,
  대회별 신청자 명단 확인 및 CSV 다운로드

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- [Firebase](https://firebase.google.com) — Authentication, Firestore, Storage
- Tailwind CSS v4
- react-hook-form + zod (폼 검증)
- pdfjs-dist (PDF → 이미지 변환)
- motion (애니메이션)

## 시작하기

### 1. Firebase 프로젝트 연결

Firebase 프로젝트 생성, `.env.local` 설정, 보안 규칙 배포 등 최초 1회 설정은 [SETUP.md](./SETUP.md)를
참고하세요.

### 2. 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

### 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |

## 프로젝트 구조

```
src/
  app/
    (auth)/login, signup        로그인 · 회원가입
    admin/                      관리자 (카테고리 · 배너 · 게시물 · 사용자 · 신청자 관리)
    contest/                    대회 안내
    exhibitions/                온라인전시관 목록 · 상세 · 등록 · 수정
    team/                       대회별 팀 구성
    mypage/                     마이페이지
    api/link-preview/           프로젝트 링크 미리보기 API
  components/                   레이아웃 · 전시물 · 팀 · 배너 등 UI 컴포넌트
  lib/
    firebase/                   Firebase 클라이언트 초기화
    firestore/                  Firestore 데이터 접근 함수
    storage/                    Firebase Storage 업로드
    pdf/                        PDF → 이미지 렌더링
    validation/                 zod 스키마
  types/models.ts                도메인 타입 정의
firestore.rules                 Firestore 보안 규칙
storage.rules                   Storage 보안 규칙
```

## 배포

이 저장소는 Firebase(Firestore/Storage/Authentication)를 사용하며, 호스팅은 별도로 원하는 플랫폼에
연결하면 됩니다(Cloudflare로 배포할 경우 `@opennextjs/cloudflare` 어댑터가 추가로 필요합니다).
`firestore.rules` / `storage.rules` 변경 시 아래 명령으로 배포합니다.

```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only storage:rules
```
