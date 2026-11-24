'use client';

import { type SearchHit, searchContent } from '@/domains/admin/api/actions/searchActions';
import { useEffect, useRef, useState } from 'react';

const DELAY_MS = 250;

/**
 * 명령 팔레트의 글 찾기 — 검색어를 칠 때마다 잠깐(250ms) 기다렸다가 마지막 검색어로만 서버에 묻는다(패키지 B5).
 * 답은 그 답의 검색어와 함께 두고, 지금 검색어의 답일 때만 보여 준다(창을 다시 열었을 때 옛 결과가 남지 않게).
 * 그 전까지는 pending. 늦게 온 옛 답은 버리고, 2자 미만이면 묻지 않고 비운다. 호출이 던지면 빈 결과로 끝낸다.
 */
export const useContentSearch = (q: string, search: typeof searchContent = searchContent) => {
  const [result, setResult] = useState<{ q: string; items: SearchHit[] }>({ q: '', items: [] });
  const seq = useRef(0);
  const query = q.trim();
  const enough = query.length >= 2;

  useEffect(() => {
    const mine = ++seq.current;
    if (!enough) return;
    const timer = setTimeout(async () => {
      let items: SearchHit[] = [];
      try {
        const res = await search({ q: query });
        if (res.ok && res.data) items = res.data.items;
      } catch {
        // 네트워크 · 서버 오류 — 글 찾기는 보조 기능이라 빈 결과로 둔다
      }
      if (mine !== seq.current) return; // 그사이 다른 검색어를 쳤다
      setResult({ q: query, items });
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, enough, search]);

  const fresh = enough && result.q === query;
  return { items: fresh ? result.items : [], pending: enough && !fresh };
};
