// 자료 목록 계산(순수) — 검색·분류 칩·정렬과 화면 문구, 내려받기 대상. 서버가 한 번 실어 보낸 그 분류의 자료 배열을
// 화면에서 그대로 다룬다(조건을 바꿀 때마다 서버를 부르지 않는다).
// A안 규칙: 화면 어디에도 확장자(PDF·HWP)와 파일 용량을 적지 않는다 — 여기서 만드는 문구에도 넣지 않는다.
import { includesAtBoundary, verseForm } from '@/shared/lib/verseSearch';

import { RESOURCE_SECTIONS } from '../config/resourceSections';
import type { Resource, ResourceSection } from './resource.types';

export type ResourceQuery = {
  q: string;
  /** 고른 분류 칩의 값. '' 이면 전체 */
  filter: string;
  sort: 'new' | 'old';
};

export type FilterOption = { value: string; label: string };

/** 사용 날짜도 연도도 모르는 주일 자료의 칩 */
export const NO_YEAR = '연도 미표기';

/** 정렬·연도의 기준 — 사용 날짜, 없으면 연도. 둘 다 없으면 ''(맨 뒤). 저장소(resourceRepository)도 이 기준으로 세운다. */
export const dateKey = (r: Resource) => r.date ?? r.year ?? '';

// 칩이 가르는 기준 — 주일은 연도(한 강해가 몇 해씩 이어져 묶음 이름으로는 갈리지 않는다), 그 밖은 묶음 이름
const filterKey = (r: Resource) =>
  r.section === 'sunday' ? dateKey(r).slice(0, 4) || NO_YEAR : r.group;

/**
 * 분류 칩 — 자료에서 만든다(«전체» 는 화면이 앞에 붙인다).
 * 주일: 연도, 최근 연도부터(연도를 모르는 자료가 있으면 «연도 미표기» 가 맨 뒤).
 * 그 밖: 묶음 이름, 최근 자료가 있는 묶음부터(예배 영상의 시리즈 칩과 같은 순서).
 */
export const filterOptions = (
  section: ResourceSection,
  resources: readonly Resource[]
): FilterOption[] => {
  if (section === 'sunday') {
    const years = [...new Set(resources.map(filterKey))];
    return [
      ...years.filter(y => y !== NO_YEAR).sort((a, b) => b.localeCompare(a)),
      ...years.filter(y => y === NO_YEAR),
    ].map(y => ({ value: y, label: y === NO_YEAR ? y : `${y}년` }));
  }
  const latest = new Map<string, string>();
  for (const r of resources) {
    const cur = latest.get(r.group);
    if (cur === undefined || dateKey(r) > cur) latest.set(r.group, dateKey(r));
  }
  return [...latest]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([group]) => ({ value: group, label: group }));
};

/** 묶음 표시 — 주일은 «사도행전 강해 66회», 그 밖은 묶음 이름(제목에 회차가 들어 있다). */
export const groupLabel = (r: Resource): string =>
  r.section === 'sunday' && r.episode !== undefined ? `${r.group} ${r.episode}회` : r.group;

/** 날짜 표시 — 사용 날짜는 «2026.10.25», 연도만 알면 «2025년», 둘 다 모르면 ''(줄에서 뺀다). */
export const dateLabel = (r: Resource): string =>
  r.date ? r.date.replaceAll('-', '.') : r.year ? `${r.year}년` : '';

/** 쪽 수 — 문서는 «2쪽», 첨부 없이 이미지로만 제공되는 자료는 «2장». 미리보기가 없으면 ''. */
export const pageCountLabel = (r: Resource): string =>
  r.pages.length ? `${r.pages.length}${r.file ? '쪽' : '장'}` : '';

/** 결과 수(«N개») 앞에 붙는 말 — 검색 중이면 «검색 결과», 칩만 골랐으면 그 칩 이름, 조건이 없으면 «전체». */
export const countLabel = (query: ResourceQuery, options: readonly FilterOption[]): string => {
  if (query.q.trim()) return '검색 결과';
  return options.find(o => o.value === query.filter)?.label ?? '전체';
};

/** 문서 열람 페이지의 제목 — «자료 제목 | 주일 설교 시트지 | 성복교회». 자료를 못 찾았으면 분류 이름부터. */
export const documentTitle = (section: ResourceSection, r?: Resource): string =>
  [r?.title, RESOURCE_SECTIONS[section].title, '성복교회'].filter(Boolean).join(' | ');

/** 영상 버튼 문구 — 사이트 안의 설교 페이지는 «설교 영상 보기», 유튜브는 «유튜브에서 보기». 여러 개면 번호를 붙인다. */
export const videoLinkLabel = (external: boolean, index: number, total: number): string =>
  `${external ? '유튜브에서 보기' : '설교 영상 보기'}${total > 1 ? ` ${index + 1}` : ''}`;

// 한 낱말(칸) 안의 공백·대소문자는 무시한다 — «도장깨기» 로 «도장 깨기» 를, «13:4» 로 «13: 4» 를 찾는다
const squash = (v: string) => v.toLowerCase().replace(/\s/g, '');

// 찾는 대상 글 — 칸마다 공백을 지워 한 줄로 잇는다(칸 사이는 빈칸: 낱말이 두 칸에 걸쳐 맞지 않게).
// 묶음과 회차는 한 칸으로 — «강해66회» 처럼 붙여 쳐도 찾고, 회차가 안 보이는 분류에서도 회차로 찾을 수 있다.
const searchText = (r: Resource): string =>
  [
    `${r.group}${r.episode !== undefined ? ` ${r.episode}회` : ''}`,
    r.title,
    dateLabel(r),
    r.passage,
    r.file?.name,
  ]
    .filter((v): v is string => Boolean(v))
    .map(squash)
    .join(' ');

/**
 * 검색어가 그 자료에 맞는지 — 띄어 쓴 낱말이 **모두** 들어 있으면 맞다(순서·사이 글자와 무관: «성령 9» 로
 * «성령의 능력, 성령의 열매 9» 를 찾는다). 낱말은 친 그대로, 또는 본문 표기로 바꿔(«13장» → «13:») 찾는다 —
 * 예배 설교 목록과 같은 규칙(shared/lib/verseSearch). 숫자로 시작하는 낱말은 앞이 숫자가 아닌 자리에서만 맞는다.
 */
const matches = (r: Resource, q: string): boolean => {
  const text = searchText(r);
  const verseText = verseForm(text);
  // «13장 4절» 처럼 띄어 친 장·절은 낱말로 가르기 전에 한 덩이(«13:4»)로 만든다
  const words = verseForm(q).split(/\s+/).filter(Boolean);
  const rawWords = q.toLowerCase().split(/\s+/).filter(Boolean);
  return (
    rawWords.every(w => includesAtBoundary(text, w)) ||
    words.every(w => includesAtBoundary(verseText, w))
  );
};

/** 검색·칩으로 거르고 정렬한다. 날짜도 연도도 모르는 자료는 어느 정렬에서나 맨 뒤. 받은 배열은 바꾸지 않는다. */
export const findResources = (resources: readonly Resource[], query: ResourceQuery): Resource[] => {
  const q = query.q.trim();
  const list = resources.filter(
    r => (!query.filter || filterKey(r) === query.filter) && (!q || matches(r, q))
  );
  const dated = list.filter(r => dateKey(r));
  dated.sort((a, b) =>
    query.sort === 'old'
      ? dateKey(a).localeCompare(dateKey(b))
      : dateKey(b).localeCompare(dateKey(a))
  );
  return [...dated, ...list.filter(r => !dateKey(r))];
};

export type DownloadTarget = {
  /** file: 올린 원본 파일, image: 보고 있는 쪽의 미리보기 그림(첨부가 없는 자료) */
  kind: 'file' | 'image';
  href: string;
  /** 내려받을 때의 파일 이름(download 속성) */
  name: string;
};

/**
 * 내려받기 대상 — 원본 파일이 있으면 그 파일(올린 이름 그대로). 첨부 없이 이미지로만 제공되는 자료는
 * 보고 있는 쪽의 그림(«이미지 저장»). 둘 다 없으면 undefined — 없는 파일의 버튼을 만들지 않는다.
 */
export const downloadTarget = (r: Resource, pageIndex = 0): DownloadTarget | undefined => {
  if (r.file) return { kind: 'file', href: r.file.url, name: r.file.name };
  const index = r.pages[pageIndex] ? pageIndex : 0;
  const page = r.pages[index];
  if (!page) return undefined;
  const ext = /\.(\w+)$/.exec(page.src)?.[1] ?? 'webp';
  // 파일 이름에 쓸 수 없는 글자(윈도우 기준)는 빈칸으로
  const title = r.title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { kind: 'image', href: page.src, name: `${title} ${index + 1}.${ext}` };
};
