import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Next 16 부터 `next lint` 가 없어지고 eslint-config-next 가 flat config 를 직접 내보낸다(FlatCompat 불필요).
const NEWCOMER_SUBMIT = 'src/domains/home/api/newcomerSubmit.server.ts';
// 하루 한 번 예약 작업(설계 6.9) — 지난 행 · 주인 없는 Storage 파일을 만능 키로 지운다
const DAILY_CRON = 'src/app/api/cron/daily/route.ts';
// 유튜브 재생목록 → DB 동기화(묶음 E) — 받아 둔 영상 줄을 만능 키로 바꾼다
const YOUTUBE_SYNC = 'src/domains/worship-video/api/youtubeSync.server.ts';

// 공개 쪽(방문자 번들에 실리는 코드)이 가져오면 안 되는 것 — 아래 경계 블록 두 곳(공개 쪽 · 새가족 접수 파일)이 같이 쓴다.
const PUBLIC_IMPORT_BANS = [
  {
    // 별칭(@/…)과 상대 경로(../admin/…) 둘 다
    group: ['@/domains/admin', '@/domains/admin/**', '@/app/admin/**', '**/admin/**'],
    message: '관리자 전용이다 — 방문자 번들에 실린다(ADR 0008).',
  },
  {
    group: [
      '@tanstack/react-form',
      'react-hook-form',
      '@hookform/*',
      '@tanstack/react-table',
      '@supabase/*',
      'cmdk',
    ],
    message:
      '관리자 전용이다 — 방문자 번들에 실린다(ADR 0008). DB 는 @/shared/api/supabase 를 거쳐 서버에서 읽는다.',
  },
  {
    group: ['@/shared/components/ui/command'],
    message: '명령 팔레트(cmdk)는 관리자 전용이다 — 방문자 번들에 실린다(ADR 0008).',
  },
];
// 만능 키 클라이언트 — 관리자의 계정 만들기 · 비밀번호 초기화, 그리고 새가족 접수 파일(아래)만(설계 6.1 · 6.11)
const ADMIN_CLIENT_BAN = {
  group: ['@/shared/api/supabase/adminClient.server', '**/adminClient.server'],
  message:
    '만능 키(SUPABASE_SECRET_KEY) 클라이언트는 관리자 코드 · 새가족 접수 파일(newcomerSubmit.server) · 예약 작업(api/cron/daily) · 유튜브 동기화(youtubeSync.server)에서만 쓴다(설계 6.1 · 6.9 · 6.11 · 묶음 E).',
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  // 시안 프리뷰 라우트(*-preview)는 비교용 임시물이라 린트 대상에서 뺀다 — 커밋 금지 대상이라 고칠 수도 없다
  // (pre-commit 의 «임시 프리뷰 누출» 검사). 승자는 정식 위젯으로 옮긴 뒤 그쪽에서 린트한다.
  globalIgnores(['src/app/**/*-preview/**']),
  // 시안 변형(_variants)도 같은 이유로 뺀다 — pre-commit 이 커밋을 막는 임시물이라 린트 에러를 고칠 길이 없고,
  // 다른 작업의 미커밋 시안이 전체 트리 lint(eslint .)를 실패시켜 무관한 커밋까지 막는다.
  globalIgnores(['**/_variants/**']),
  // DB 에서 자동 생성한 타입(pnpm db:types) — 손으로 고치지 않는 파일이라 린트·포맷 대상이 아니다.
  globalIgnores(['src/shared/api/supabase/database.types.ts']),
  // PDF.js 자료 사본(scripts/pdfjs-assets.mjs 가 node_modules 에서 복사 — 우리 코드가 아니다)
  globalIgnores(['public/pdfjs/**']),
  // 날짜(ADR 0012): Temporal 은 Node 26 엔 있지만 Safari 정식판·iOS 엔 아직 없다 — 화면 코드에서 쓰면 아이폰에서만 깨진다.
  // 서버 전용 파일·Route Handler·관리자 영역만 예외로 연다(아래 블록).
  // 주의: 아래 예외 블록이 두 규칙을 통째로 끈다 — 이 두 규칙에는 Temporal 항목만 둔다(다른 금지는 다른 규칙·블록으로).
  {
    files: ['src/**/*.{js,jsx,mjs,ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Temporal',
          message:
            "Temporal 은 Safari·iOS 에 없다(ADR 0012). 화면 표시는 Intl.DateTimeFormat + timeZone: 'Asia/Seoul', 서버 계산은 *.server.ts 로 옮긴다.",
        },
      ],
      // 어떤 객체를 거치든(globalThis·window·self·캐스트·['Temporal']·구조 분해) Temporal 접근은 모두 막는다
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='Temporal']",
          message: 'Temporal 은 Safari·iOS 에 없다(ADR 0012).',
        },
        {
          selector: "MemberExpression[computed=true][property.value='Temporal']", // globalThis['Temporal']
          message: 'Temporal 은 Safari·iOS 에 없다(ADR 0012).',
        },
        {
          selector: "ObjectPattern > Property[key.name='Temporal']", // const { Temporal } = globalThis
          message: 'Temporal 은 Safari·iOS 에 없다(ADR 0012).',
        },
      ],
    },
  },
  {
    files: [
      'src/**/*.server.{js,mjs,ts,tsx}',
      'src/**/*.server.test.{ts,tsx}',
      'src/app/api/**',
      'src/app/admin/**',
      'src/domains/admin/**',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  // 공개 쪽 ↔ 관리자 경계(ADR 0008): 공개 사이트 코드가 관리자 코드나 관리자 전용 라이브러리를 import 하면 방문자 번들에 실린다.
  // 위의 Temporal 규칙과 섞이지 않게 다른 규칙(no-restricted-imports)으로 둔다 — 저 예외 블록은 이 규칙을 끄지 않는다.
  // 대상은 src 전체다 — 루트 레이아웃·_provider·shared/lib 처럼 모든 공개 페이지에 실리는 파일로 돌아 들어오는 길까지 막는다.
  // 예외는 관리자 자신(domains/admin · app/admin · proxy)뿐이다. 연결 계층(`src/shared/api/supabase/**`)은 아래 블록에서
  // Supabase 라이브러리만 풀어 준다. `import()` · `require()` 는 이 규칙이 잡지 못한다.
  // 잠그는 테스트: tests/lint/adminBoundary.test.ts
  {
    files: ['src/**/*.{js,jsx,mjs,ts,tsx}'],
    ignores: [
      'src/domains/admin/**',
      'src/app/admin/**',
      'src/proxy.ts',
      'src/proxy.test.ts',
      // 명령 팔레트 부품은 cmdk 를 쓴다 — 부품 파일 자체는 풀고, 공개 코드가 이 부품을 가져오는 것은 아래에서 막는다
      'src/shared/components/ui/command.tsx',
      // 새가족 접수 · 예약 작업 — 아래 블록(만능 키만 푼다)
      NEWCOMER_SUBMIT,
      DAILY_CRON,
      YOUTUBE_SYNC,
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [...PUBLIC_IMPORT_BANS, ADMIN_CLIENT_BAN],
        },
      ],
    },
  },
  // 새가족 접수(설계 6.11) — 방문자에게 DB 권한을 열지 않고 서버가 검증한 뒤 만능 키로 넣는다. 이 파일만 만능 키를 쓴다
  // (서버 전용 — server-only). 나머지 공개 쪽 금지는 그대로.
  {
    files: [NEWCOMER_SUBMIT, DAILY_CRON, YOUTUBE_SYNC],
    rules: { 'no-restricted-imports': ['error', { patterns: PUBLIC_IMPORT_BANS }] },
  },
  // 관리자 화면의 링크는 손을 올렸을 때만 미리 받는다(IntentLink) — next/link 기본(보이면 미리 받기)이면 첫 화면 카드 · 목록 줄마다
  // 서버 요청이 나가고(운영 실측: 첫 화면 12건), 무엇을 저장할 때마다 그것들이 다시 받아진다. 로그인 화면 쪽(로그인 전)은 예외.
  {
    files: ['src/domains/admin/**/*.{ts,tsx}', 'src/app/admin/**/*.{ts,tsx}'],
    ignores: [
      'src/domains/admin/components/features/IntentLink/**',
      'src/domains/admin/components/widgets/LoginForm/**',
      'src/app/admin/login/**',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/link',
              message:
                '관리자 화면은 IntentLink 를 쓴다(@/domains/admin/components/features/IntentLink) — 보이는 링크마다 미리 받지 않게.',
            },
          ],
        },
      ],
    },
  },
  // 연결 계층은 Supabase 라이브러리를 쓸 수 있다. 관리자 코드는 여기서도 못 가져온다 —
  // 공개 코드가 이 폴더를 자유롭게 import 하므로, 여기가 관리자 코드를 끌어오면 그대로 방문자 번들로 나간다.
  {
    files: ['src/shared/api/supabase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domains/admin', '@/domains/admin/**', '@/app/admin/**', '**/admin/**'],
              message: '관리자 전용이다 — 방문자 번들에 실린다(ADR 0008).',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
