'use client';

import type { ResourceSectionKey } from '@/domains/admin/lib/resourceSection';
import { RESOURCE_SECTION_KEYS } from '@/domains/admin/lib/resourceSection';
import { useEffect, useState } from 'react';

import { ResourceForm } from './index';

type Series = Record<ResourceSectionKey, { value: string; label: string }[]>;

/** 새 시트지 폼이 서버에서 받는 것 — 사용자(임시 저장 칸) · 분류마다 묶음 목록 · 그 자리에서 묶음을 더할 수 있는가 */
export type ResourceNewData = { userId: string; seriesBySection: Series; canAddSeries: boolean };

const NO_SERIES = Object.fromEntries(RESOURCE_SECTION_KEYS.map(k => [k, []])) as unknown as Series;

// 새 시트지 — 분류는 주일 강해로 채워 둔다(가장 자주 올린다). 묶음은 목록이 오면 하나뿐일 때 골라 둔다(ResourceForm)
const INITIAL = {
  section: 'SUNDAY' as const,
  seriesId: '',
  episode: '',
  title: '',
  date: '',
  year: '',
  passage: '',
  file: [],
  pages: [],
  videos: '',
};

/**
 * 새 시트지 폼 — 누르는 즉시 그려 바로 쓰게 하고(미리 만든 틀, ADR 0027), 서버에서 받을 것(data)은 오는 대로 같은 폼에 채운다.
 * Suspense 로 폼을 통째로 바꿔 끼우지 않는다 — React 는 자리 표시를 한 번 보이면 0.3초는 두고 바꿔 그동안 쓸 수 없었다(운영 실측).
 * 묶음을 더해 화면을 다시 읽으면(router.refresh) 새 data 가 온다 — 받기 전까지는 받아 둔 것을 쓴다.
 */
export const ResourceNewForm = ({ data }: { data: Promise<ResourceNewData> }) => {
  const [loaded, setLoaded] = useState<ResourceNewData | null>(null);
  useEffect(() => {
    let live = true;
    data.then(
      d => {
        if (live) setLoaded(d);
      },
      // 받지 못하면(권한 없음 등) 폼은 그대로 둔다 — «없음» 은 화면의 권한 확인(PermissionGate)이 보인다
      () => {}
    );
    return () => {
      live = false;
    };
  }, [data]);
  return (
    <ResourceForm
      pending={!loaded}
      userId={loaded?.userId ?? ''}
      seriesBySection={loaded?.seriesBySection ?? NO_SERIES}
      canAddSeries={loaded?.canAddSeries ?? false}
      initial={INITIAL}
    />
  );
};
