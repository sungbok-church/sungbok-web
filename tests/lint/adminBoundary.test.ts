// @vitest-environment node
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// 공개 사이트 쪽 코드가 관리자 코드·관리자 전용 라이브러리를 import 하면 방문자 번들에 실린다(ADR 0008).
// eslint.config.mjs 의 no-restricted-imports 블록이 막는지, 관리자·연결 계층은 그대로 쓸 수 있는지 확인한다.
const eslint = new ESLint();
const ruleIds = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath }))[0].messages.map(m => m.ruleId);

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
