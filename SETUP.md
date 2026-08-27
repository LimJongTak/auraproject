# 온라인전시관 — 로컬 개발 환경 설정

## 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 프로젝트 이름 입력 (예: `online-exhibition-hall`) → 생성
2. 왼쪽 메뉴 **Authentication** → **시작하기** → **Sign-in method** 탭 → **이메일/비밀번호** 활성화
3. 왼쪽 메뉴 **Firestore Database** → **데이터베이스 만들기** → **프로덕션 모드** 선택 → 리전은 `asia-northeast3 (서울)` 권장
4. 왼쪽 메뉴 **Storage** → **시작하기** → **프로덕션 모드** → Firestore와 동일 리전 권장
5. 프로젝트 개요 옆 톱니바퀴 → **프로젝트 설정** → 아래로 스크롤 → **내 앱** → 웹 아이콘(</>) 클릭 → 앱 닉네임 입력 후 등록 (Firebase Hosting은 체크하지 않아도 됨)
6. 표시되는 `firebaseConfig` 값을 복사해 아래 2번 단계의 `.env.local`에 채워 넣기

## 2. 환경변수 설정

`.env.local` 파일(이미 `.env.local.example`을 복사해 생성되어 있음)을 열어 아래 값을 채워주세요:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 3. 로컬 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 4. Firestore / Storage 보안 규칙 배포

이 저장소에는 이미 `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`이 포함되어 있습니다. 아래 순서로 실제 Firebase 프로젝트에 연결하고 배포하세요.

```bash
npx firebase login
npx firebase use --add   # 방금 만든 프로젝트 선택, 별칭은 default로
npx firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

> ⚠️ Firestore를 프로덕션 모드로 만들면 기본적으로 모든 읽기/쓰기가 차단됩니다. 위 배포 명령을 실행하기 전까지는 앱에서 로그인/가입 등 어떤 동작도 되지 않는 것이 정상입니다.

규칙을 수정하며 반복 테스트할 때는 실제 프로젝트에 배포하는 대신 에뮬레이터를 사용하는 것을 권장합니다:

```bash
npx firebase emulators:start
```

## 5. 최초 관리자 지정 (수동, 앱에 UI 없음)

1. 앱에서 본인 계정으로 회원가입을 먼저 진행합니다.
2. Firebase 콘솔 → Firestore Database → `users` 컬렉션 → 방금 가입한 본인 uid 문서를 찾습니다.
3. `role` 필드 값을 `"user"`에서 `"admin"`으로 직접 수정합니다.
4. 다시 로그인하면(또는 새로고침하면) 헤더에 **관리자** 메뉴가 나타납니다.
5. `/admin/categories`에서 카테고리(대회)와 게시기간을, `/admin/countdown`에서 주제 공개 시각과 내용을 설정해야 온라인전시관이 정상적으로 동작합니다.

## 6. 색인(인덱스) 관련 참고

목록 페이지의 카테고리 필터 + 정렬 조합은 Firestore 복합 색인이 필요합니다. `firestore.indexes.json`에 필요한 색인을 미리 정의해 두었으므로 4번 단계의 배포 명령으로 함께 생성됩니다. 만약 개발 중 콘솔에 "색인이 필요합니다" 에러와 함께 링크가 뜨면, 그 링크를 클릭해 즉시 생성해도 됩니다.

## 7. App Check 설정 (선택, 봇/스크래핑 방지 — 권장)

로그인 없이도 읽을 수 있는 데이터(`studentIdIndex`의 학번→이메일 조회 등)를 실제 브라우저가 아닌 스크립트가 대량으로 긁어가는 것을 막아줍니다. 미설정 시에도 앱은 정상 동작하며, 설정 후에도 아래 5번(콘솔 강제 적용)을 켜기 전까지는 아무것도 차단되지 않습니다.

1. Google Cloud 콘솔 → **Fraud Defense**(reCAPTCHA Enterprise) → **키** → 도메인(`scnuai.com` 등)을 등록한 **reCAPTCHA Enterprise** 키 생성 (일반 reCAPTCHA v3 admin 콘솔 키와는 다른 종류라 서로 안 맞으니 주의 — 이 프로젝트는 이미 `aurarecapcha` 키를 사용 중)
2. 발급된 **사이트 키**를 `.env.local`의 `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY`에 채우고, Firebase 콘솔 → **App Check** → **앱** → 5번 단계에서 등록한 웹 앱 선택 → **reCAPTCHA Enterprise** 공급자에 같은 사이트 키 등록
3. 로컬 개발 중에는 App Check가 디버그 토큰을 콘솔에 한 번 출력합니다 — App Check → 앱 → **디버그 토큰 관리**에 등록해야 로컬에서 차단되지 않습니다
4. 배포 후 며칠간 App Check 콘솔의 **요청** 탭에서 "검증됨" 비율을 모니터링 — 정상 트래픽이 대부분 검증되는 것을 확인하기 전에는 강제 적용하지 않기
5. 문제없이 확인되면 App Check → **API** 탭에서 Firestore/Storage/Cloud Functions 각각을 **적용(Enforce)**으로 전환 — 이 순간부터 App Check 토큰이 없는 요청은 실제로 거부됩니다

## 8. 알아두면 좋은 점

- Cloud Functions(관리자 전용 탈퇴 처리, 심사위원 임시 계정 발급 등)를 사용하므로 Firebase **Blaze(종량제) 요금제**가 필요합니다. `functions/` 배포는 `npx firebase deploy --only functions`.
- 좋아요/댓글 카운터는 클라이언트 트랜잭션 + 보안 규칙(±1 제한)으로 관리되며 완전한 원자성을 100% 보장하진 않습니다. 대회 운영 중 수치가 어긋나는 것이 의심되면 Firestore 콘솔에서 해당 문서를 직접 확인/수정하면 됩니다.
- `/api/link-preview`는 서버(Node.js Route Handler)에서 외부 URL의 OG 메타데이터를 가져오는 용도로, 사설 IP·localhost 등은 요청하지 못하도록 막아뒀습니다.
- 추후 Cloudflare로 배포할 때는 `@opennextjs/cloudflare` 어댑터 설치 및 `wrangler` 설정이 별도로 필요합니다 (이번 단계에는 포함하지 않았습니다).
