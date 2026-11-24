'use server';

import { issueLongDate } from '@/domains/news/api/bulletinList';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { z } from 'zod';

import type { ActionResult } from '../../lib/actionResult';
import { bulletinDateRange, normalizeQuery } from '../../lib/contentSearch';
import { orIlike } from '../../lib/listQuery';
import { NEWS_FEEDS } from '../../lib/newsFeed';
import { actionPermission } from '../server/adminContext.server';

// 명령 팔레트의 글 찾기(패키지 B5, 설계 6.10 «권한이 있는 메뉴와 글만 찾는다») — 그 사람이 조회 권한을 가진 콘텐츠 메뉴만,
// 휴지통 아닌 글(임시저장 포함)을 메뉴마다 최신 5개. 로그인한 사람의 세션으로 읽는다(RLS 가 다시 거른다).

export type SearchHit = {
  /** 메뉴 key */
  menu: string;
  id: string;
  title: string;
  /** 날짜 · 상태 한 줄 */
  detail: string;
  href: string;
};

const LIMIT = 5;
const STATUS = { DRAFT: '임시저장', PUBLISHED: '공개' } as const;
const inputSchema = z.object({ q: z.string().max(200) });

/** ilike 의 % · _ · \ 를 글자 그대로 */
const like = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

type Row = { id: string; title?: string; date?: string | null; status: keyof typeof STATUS };

const hit = (menu: string, r: Row, title: string): SearchHit => ({
  menu,
  id: r.id,
  title,
  detail: [r.date, STATUS[r.status]].filter(Boolean).join(' · '),
  href: `/admin/${menu}/${r.id}`,
});

export const searchContent = async (
  raw: unknown
): Promise<ActionResult<{ items: SearchHit[] }>> => {
  const parsed = inputSchema.safeParse(raw);
  const q = parsed.success ? normalizeQuery(parsed.data.q) : null;
  if (!q) return { ok: true, data: { items: [] } };
  const range = bulletinDateRange(q);
  const menus = ['bulletin', 'announcements', 'garden', 'album', 'resources'] as const;
  const allowed = await Promise.all(menus.map(m => actionPermission(m, 'READ')));
  const can = (m: (typeof menus)[number]) => Boolean(allowed[menus.indexOf(m)]);
  const supabase = await createSupabaseServerClient();

  const searches: Promise<SearchHit[]>[] = [];
  if (can('bulletin') && range)
    searches.push(
      Promise.resolve(
        supabase
          .from('bulletins')
          .select('id, date, status')
          .is('deleted_at', null)
          .gte('date', range[0])
          .lt('date', range[1])
          .order('date', { ascending: false })
          .limit(LIMIT)
      ).then(({ data }) =>
        ((data ?? []) as Row[]).map(r =>
          hit('bulletin', { ...r, date: null }, `${issueLongDate(r.date as string)} 주보`)
        )
      )
    );
  for (const key of ['announcements', 'garden'] as const)
    if (can(key))
      searches.push(
        Promise.resolve(
          supabase
            .from('news_videos')
            .select('id, title, date, status')
            .eq('feed', NEWS_FEEDS[key].feed)
            .is('deleted_at', null)
            .ilike('title', like(q))
            .order('date', { ascending: false })
            .limit(LIMIT)
        ).then(({ data }) => ((data ?? []) as Row[]).map(r => hit(key, r, r.title ?? '')))
      );
  if (can('album'))
    searches.push(
      Promise.resolve(
        supabase
          .from('albums')
          .select('id, title, status')
          .is('deleted_at', null)
          .ilike('title', like(q))
          .order('created_at', { ascending: false })
          .limit(LIMIT)
      ).then(({ data }) => ((data ?? []) as Row[]).map(r => hit('album', r, r.title ?? '')))
    );
  if (can('resources'))
    searches.push(
      Promise.resolve(
        supabase
          .from('resources')
          .select('id, title, date, status')
          .is('deleted_at', null)
          .or(orIlike(['title', 'passage'], q))
          .order('date', { ascending: false, nullsFirst: false })
          .limit(LIMIT)
      ).then(({ data }) => ((data ?? []) as Row[]).map(r => hit('resources', r, r.title ?? '')))
    );

  const items = (await Promise.all(searches)).flat();
  return { ok: true, data: { items } };
};
