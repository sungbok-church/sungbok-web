// @vitest-environment node
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// 공개 사이트 쪽 코드가 관리자 코드·관리자 전용 라이브러리를 import 하면 방문자 번들에 실린다(ADR 0008).
// eslint.config.mjs 의 no-restricted-imports 블록이 막는지, 관리자·연결 계층은 그대로 쓸 수 있는지 확인한다.
const eslint = new ESLint();
const ruleIds = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath }))[0].messages.map(m => m.ruleId);

// 첫 검사가 설정 · 플러그인을 읽느라 몇 초 걸린다 — 시험 하나의 시간 한도에 걸리지 않게 먼저 데워 둔다
beforeAll(async () => {
  await eslint.lintText('', { filePath: 'src/x.ts' });
}, 60_000);

describe('공개 쪽 ↔ 관리자 경계', () => {
  it.each([
    ["import { signIn } from '@/domains/admin/api/actions/authActions';", 'src/domains/home/x.tsx'],
    [
      "import { AdminShell } from '@/domains/admin/components/widgets/AdminShell';",
      'src/app/(site)/x.tsx',
    ],
    ["import { useForm } from 'react-hook-form';", 'src/app/(site)/location/x.tsx'],
    ["import { useForm } from '@tanstack/react-form';", 'src/domains/home/components/x.tsx'],
    ["import { zodResolver } from '@hookform/resolvers/zod';", 'src/domains/news/components/x.tsx'],
    ["import { useReactTable } from '@tanstack/react-table';", 'src/shared/components/ui/x.tsx'],
    ["import { createServerClient } from '@supabase/ssr';", 'src/domains/news/api/x.ts'],
    ["import { createClient } from '@supabase/supabase-js';", 'src/domains/resources/api/x.ts'],
    // 상대 경로로 돌아 들어오는 길
    ["import { signIn } from '../admin/api/actions/authActions';", 'src/domains/home/x.tsx'],
    [
      "import { AdminShell } from '../../admin/components/widgets/AdminShell';",
      'src/domains/news/api/x.ts',
    ],
    // 모든 공개 페이지에 실리는 파일과 공용 폴더
    ["import { createBrowserClient } from '@supabase/ssr';", 'src/app/_provider.tsx'],
    ["import { useForm } from 'react-hook-form';", 'src/app/layout.tsx'],
    ["import { signIn } from '@/domains/admin/api/actions/authActions';", 'src/app/not-found.tsx'],
    ["import { createServerClient } from '@supabase/ssr';", 'src/shared/lib/x.ts'],
    ["import { useReactTable } from '@tanstack/react-table';", 'src/shared/lib/hooks/useX.ts'],
    ["import { signIn } from '@/domains/admin/api/actions/authActions';", 'src/shared/config/x.ts'],
    ["import { createClient } from '@supabase/supabase-js';", 'src/app/api/home-video/route.ts'],
    // 연결 계층은 Supabase 라이브러리만 쓸 수 있다 — 관리자 코드를 끌어오면 공개 코드가 그 파일을 거쳐 싣게 된다
    [
      "import { signIn } from '@/domains/admin/api/actions/authActions';",
      'src/shared/api/supabase/x.server.ts',
    ],
  ])('공개 쪽에서 %s 는 막힌다', async (code, file) => {
    expect(await ruleIds(code, file)).toContain('no-restricted-imports');
  });

  it.each([
    [
      "import { signIn } from '@/domains/admin/api/actions/authActions';",
      'src/app/admin/login/x.tsx',
    ],
    ["import { useForm } from 'react-hook-form';", 'src/domains/admin/components/x.tsx'],
    ["import { createServerClient } from '@supabase/ssr';", 'src/shared/api/supabase/x.server.ts'],
    [
      "import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';",
      'src/domains/news/api/x.ts',
    ],
    ["import { adminAuthDecision } from '@/domains/admin/lib/authRedirect';", 'src/proxy.ts'],
    ["import { updateSession } from '@/shared/api/supabase/proxySession.server';", 'src/proxy.ts'],
    [
      "import { NavLinks } from './NavLinks';",
      'src/domains/admin/components/widgets/AdminShell/x.tsx',
    ],
    ["import { useForm } from 'react-hook-form';", 'src/app/admin/(panel)/x.tsx'],
    // 관리자가 아닌 곳의 평범한 상대 경로는 건드리지 않는다
    ["import { x } from './data';", 'src/domains/home/x.tsx'],
  ])('관리자·연결 계층에서 %s 는 된다', async (code, file) => {
    expect(await ruleIds(code, file)).not.toContain('no-restricted-imports');
  });
});

// 새가족 접수(설계 6.11)는 방문자에게 DB 권한을 열지 않고 서버가 만능 키로 넣는다. 하루 한 번 예약 작업(6.9)도 만능 키로
// 지난 행 · 파일을 지운다 — 공개 쪽에서는 그 두 파일만 만능 키를 쓴다.
describe('만능 키는 관리자 코드 · 새가족 접수 파일 · 예약 작업만', () => {
  const code =
    "import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';";
  it.each(['src/domains/home/api/newcomerSubmit.server.ts', 'src/app/api/cron/daily/route.ts'])(
    '%s 는 된다',
    async file => {
      expect(await ruleIds(code, file)).not.toContain('no-restricted-imports');
    }
  );
  it.each([
    'src/domains/home/api/newcomerActions.ts',
    'src/domains/home/components/widgets/FirstVisit/RegisterPanel.tsx',
    'src/domains/news/api/x.server.ts',
    'src/app/api/home-video/route.ts',
  ])('%s 에서는 막힌다', async file => {
    expect(await ruleIds(code, file)).toContain('no-restricted-imports');
  });
  it('그 파일도 관리자 코드는 못 가져온다', async () => {
    expect(
      await ruleIds(
        "import { signIn } from '@/domains/admin/api/actions/authActions';",
        'src/domains/home/api/newcomerSubmit.server.ts'
      )
    ).toContain('no-restricted-imports');
  });
});

// 관리자 화면의 링크는 손을 올렸을 때만 미리 받는다(IntentLink) — next/link 를 직접 쓰면 보이는 링크마다 서버 요청이 나간다.
describe('관리자 화면은 next/link 대신 IntentLink', () => {
  const code = "import Link from 'next/link';\nexport const X = Link;\n";

  it.each([
    'src/app/admin/(panel)/page.tsx',
    'src/app/admin/(panel)/users/[id]/page.tsx',
    'src/domains/admin/components/features/AdminList/AdminTable.tsx',
    'src/domains/admin/components/widgets/AdminShell/UserMenu.tsx',
    'src/app/admin/password/page.tsx',
  ])('%s 에서는 막힌다', async file => {
    expect(await ruleIds(code, file)).toContain('no-restricted-imports');
  });

  it.each([
    // IntentLink 자신 · 로그인 전 화면(로그인 · 비밀번호 찾기)
    'src/domains/admin/components/features/IntentLink/index.tsx',
    'src/domains/admin/components/widgets/LoginForm/index.tsx',
    'src/app/admin/login/page.tsx',
    'src/app/admin/login/forgot/page.tsx',
  ])('%s 에서는 쓸 수 있다', async file => {
    expect(await ruleIds(code, file)).not.toContain('no-restricted-imports');
  });
});
