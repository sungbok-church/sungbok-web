import type { NewsVideo, NewsVideoFeed } from '@/domains/news/api/news.types';
import type { DepartmentSlug } from '@/domains/next-generation/data/departments';
import type { ResourceSection } from '@/domains/resources/api/resource.types';
import type { ContentStatus } from '@/shared/api/content.types';
import { expectTypeOf, it } from 'vitest';

import type { Database } from './database.types';

// DB enum(supabase/migrations)과 화면이 쓰는 TS 타입이 어긋나면 `pnpm typecheck` 가 실패한다.
// 한쪽에만 값을 더하면 여기서 걸린다 — 변경 파일을 쓰고 `pnpm db:reset` → `pnpm db:types` 로 맞춘다.
type E = Database['public']['Enums'];

it('DB enum 은 화면이 쓰는 타입과 같다', () => {
  expectTypeOf<E['content_status']>().toEqualTypeOf<ContentStatus>();
  expectTypeOf<E['resource_section']>().toEqualTypeOf<ResourceSection>();
  expectTypeOf<E['news_feed']>().toEqualTypeOf<NewsVideoFeed>();
  expectTypeOf<E['date_source']>().toEqualTypeOf<NewsVideo['dateFrom']>();
  expectTypeOf<E['department_slug']>().toEqualTypeOf<DepartmentSlug>();
});
