import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Next 16 부터 `next lint` 가 없어지고 eslint-config-next 가 flat config 를 직접 내보낸다(FlatCompat 불필요).
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
    ignores: ['src/domains/admin/**', 'src/app/admin/**', 'src/proxy.ts', 'src/proxy.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
              ],
              message:
                '관리자 전용이다 — 방문자 번들에 실린다(ADR 0008). DB 는 @/shared/api/supabase 를 거쳐 서버에서 읽는다.',
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
