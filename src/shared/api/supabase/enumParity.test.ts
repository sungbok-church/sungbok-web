import type { NewsVideo, NewsVideoFeed } from '@/domains/news/api/news.types';
import type { DepartmentSlug } from '@/domains/next-generation/config/departmentSlug';
import type { ResourceSection } from '@/domains/resources/api/resource.types';
import type { ContentStatus } from '@/shared/api/content.types';
import { expectTypeOf, it } from 'vitest';

import type { Database } from './database.types';

// DB enum(supabase/migrations)과 화면이 쓰는 TS 타입이 어긋나면 `pnpm typecheck` 가 실패한다.
// 한쪽에만 값을 더하면 여기서 걸린다 — 변경 파일을 쓰고 `pnpm db:reset` → `pnpm db:types` 로 맞춘다.
// DB 값은 영문 대문자(LOWER_ELEMENTARY), 공개 사이트의 타입은 주소 · 화면 key 라 소문자(lower-elementary)다.
// 공개 사이트가 DB 를 읽을 때(패키지 B) 읽는 자리에서 바꾼다 — 여기서는 «소문자 타입의 대문자 = DB 값» 을 잠근다.
type E = Database['public']['Enums'];
type Snake<S extends string> = S extends `${infer A}-${infer B}` ? `${A}_${Snake<B>}` : S;
type Code<S extends string> = Uppercase<Snake<S>>;

it('DB enum 은 화면이 쓰는 타입과 같다', () => {
  expectTypeOf<E['content_status']>().toEqualTypeOf<Code<ContentStatus>>();
  expectTypeOf<E['resource_section']>().toEqualTypeOf<Code<ResourceSection>>();
  expectTypeOf<E['news_feed']>().toEqualTypeOf<Code<NewsVideoFeed>>();
  expectTypeOf<E['date_source']>().toEqualTypeOf<Code<NewsVideo['dateFrom']>>();
  expectTypeOf<E['department_slug']>().toEqualTypeOf<Code<DepartmentSlug>>();
});
