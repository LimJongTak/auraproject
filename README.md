# 온라인전시관 — AI인재양성부트캠프사업단

국립순천대학교 AI인재양성부트캠프사업단의 AURA 대회 플랫폼 온라인전시관입니다. 대회별로 팀을
구성해 전시물(발표자료 PDF)을 등록하고, 다른 팀의 전시물을 둘러보며 좋아요·댓글로 응원할 수 있습니다.
관리자는 대회·심사·공지·문의·마일리지·방문자 통계를 한 곳에서 관리할 수 있습니다.

## 배포 주소
- [AURA 대회 플랫폼](https://scnuai.com)

## 주요 기능

### 참가자
- **회원가입 / 로그인** — 이름·학교·학과·학년·학번 정보로 가입 (Firebase Authentication), 비밀번호
  재설정 이메일 발송
- **대회별 팀 구성** — 대회(카테고리)마다 별도의 팀을 만들거나 초대코드로 참가. 한 사람이 여러
  대회에 각각 다른 팀으로 참가할 수 있지만, 같은 대회에는 팀 1개까지만 소속 가능. 대회별 최소/최대
  인원 제한 설정 가능(1인 대회 지원)
- **전시물 등록** — 발표자료 PDF를 업로드하면 페이지별 이미지로 자동 변환, 프로젝트 링크를 입력하면
  Open Graph 메타데이터로 미리보기 카드 생성
- **온라인전시관** — 게시된 전시물 목록(카테고리 필터·최신순/인기순 정렬·검색), 좋아요·댓글
- **대회 페이지** — 진행 중인 대회와 접수 기간 안내, 대회별 배너(신청시작·주제공개 카운트다운)
- **공지사항 / 문의하기** — 공지 목록·상세, 로그인한 사용자의 1:1 문의 등록 및 답변 확인
- **마일리지** — 학기별 활동 마일리지 확인
- **마이페이지** — 내 정보, 내가 속한 팀(대회별), 내가 등록한 전시물, 내 문의 내역, 마일리지 내역

### 심사위원
- **심사 워크스페이스** — 배정된 대회의 제출작 목록과 채점 진행률, 대회별 평가표(rubric) 기반 채점
- **채점 방식** — 작품별 개별 채점 화면 또는 엑셀 업로드로 일괄 채점, 실시간 반영
- **엑셀 채점표** — 대회별 채점 결과를 엑셀로 내려받아 오프라인 작성 후 재업로드 가능

### 관리자
- **카테고리(대회) 관리** — 대회 생성·수정, 접수 기간, 참가 인원 제한, 평가표(rubric) 설정
- **배너 · 퀵링크 · 공지사항 관리** — 홈 화면 배너와 바로가기, 공지 작성/수정/삭제
- **전시물 관리** — 게시물 숨김/공개 처리
- **사용자 관리** — 권한 변경, 임시 심사위원 계정 발급/회수, 회원 탈퇴 처리
- **신청자 관리** — 대회별 신청자 명단 확인 및 CSV 다운로드
- **심사 관리** — 심사위원 배정, 채점 현황 실시간 모니터링, 채점 갱신 이력 조회, 수상작 지정,
  작품별 심사평 확인 및 공개/비공개 전환
- **문의 관리** — 접수된 문의 확인 및 답변
- **마일리지 관리** — 학기별 마일리지 부여 내역 확인 및 엑셀 다운로드
- **방문자 통계** — 기간별 방문 추이 확인 및 엑셀 다운로드

### 서버(Cloud Functions)
- 비밀번호 재설정 이메일 발송(Resend)
- 임시 심사위원 계정 발급/회수
- 회원 탈퇴 처리, 학번 인덱스 백필
- 미완료 임시 저장 전시물 자동 정리, 인기상 자동 산정 스케줄러

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- [Firebase](https://firebase.google.com) — Authentication, Firestore, Storage, Cloud Functions,
  App Hosting
- Tailwind CSS v4
- react-hook-form + zod (폼 검증)
- pdfjs-dist / pdf-lib (PDF → 이미지 변환)
- exceljs / xlsx (엑셀 업로드 · 다운로드)
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
    (auth)/login, signup        로그인 · 회원가입 · 비밀번호 재설정
    admin/                       관리자 (대회 · 배너 · 퀵링크 · 공지 · 게시물 · 사용자 · 신청자 ·
                                  문의 · 마일리지 · 방문자 통계 관리)
    contest/                     대회 안내
    exhibitions/                 온라인전시관 목록 · 상세 · 등록 · 수정
    judge/                       심사위원 워크스페이스 (배정 대회 · 채점 · 심사 현황)
    notices/                     공지사항 목록 · 상세
    inquiries/                   문의하기
    team/                        대회별 팀 구성
    mypage/                      마이페이지 (전시물 · 팀 · 문의 · 마일리지)
    api/link-preview/            프로젝트 링크 미리보기 API
  components/                    레이아웃 · 전시물 · 심사 · 팀 · 배너 등 UI 컴포넌트
  lib/
    firebase/                    Firebase 클라이언트 초기화
    firestore/                   Firestore 데이터 접근 함수
    storage/                     Firebase Storage 업로드
    pdf/                         PDF → 이미지 렌더링
    admin/                       관리자용 엑셀 생성 등 유틸
    validation/                  zod 스키마
  types/models.ts                도메인 타입 정의
functions/src/index.ts           Cloud Functions (이메일 발송 · 계정 관리 · 스케줄러)
firestore.rules                  Firestore 보안 규칙
storage.rules                    Storage 보안 규칙
```

## 배포

이 저장소는 Firebase [App Hosting](https://firebase.google.com/docs/app-hosting)으로 배포됩니다
(설정은 `apphosting.yaml` 참고, Node 22 런타임 고정). Firestore/Storage 보안 규칙과 Cloud Functions은
아래 명령으로 별도 배포합니다.

```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only storage:rules
npx firebase deploy --only functions
```
