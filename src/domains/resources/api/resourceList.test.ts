import { describe, expect, it } from 'vitest';

import type { Resource } from './resource.types';
import {
  countLabel,
  dateLabel,
  documentTitle,
  downloadTarget,
  filterOptions,
  findResources,
  groupLabel,
  NO_YEAR,
  videoLinkLabel,
} from './resourceList';

const page = (n: number) => ({ src: `/p/${n}.webp`, width: 1200, height: 1698 });
const doc = (over: Partial<Resource> & Pick<Resource, 'id'>): Resource => ({
  status: 'published',
  section: 'sunday',
  group: '사도행전 강해',
  title: `제목 ${over.id}`,
  pages: [page(1), page(2)],
  videoIds: [],
  file: { url: `/f/${over.id}.pdf`, name: `${over.id} 나눔지.pdf`, kind: 'pdf' },
  ...over,
});

// 저장소가 주는 순서(최신순)
const SUNDAY = [
  doc({
    id: 's66',
    episode: 66,
    date: '2026-10-25',
    passage: '사도행전 13:4-7',
    title: '도장 깨기',
  }),
  doc({ id: 's65', episode: 65, date: '2026-10-18', passage: '사도행전 13:4-5' }),
  doc({ id: 's10', episode: 10, date: '2025-03-02', title: '옛 설교' }),
];
const SEASONAL = [
  doc({ id: 'holy', section: 'seasonal', group: '절기', date: '2026-11-08', title: '[성찬]은혜' }),
  doc({
    id: 'hwp',
    section: 'seasonal',
    group: '명절',
    date: '2026-09-20',
    title: '추석 예배 순서지',
    file: { url: '/f/hwp.hwp', name: '2026년 추석 가정예배 순서지.hwp', kind: 'hwp' },
  }),
  doc({ id: 'home', section: 'seasonal', group: '가정예배', date: '2026-08-30' }),
  doc({
    id: 'img',
    section: 'seasonal',
    group: '명절',
    year: '2026',
    title: '설 명절 순서지',
    file: undefined,
  }),
  doc({
    id: 'nopreview',
    section: 'seasonal',
    group: '명절',
    year: '2024',
    pages: [],
    file: { url: '/f/n.hwp', name: '2024 추석가정예배 순서지.hwp', kind: 'hwp' },
  }),
];
const ids = (list: Resource[]) => list.map(r => r.id);
const all = { q: '', filter: '', sort: 'new' as const };

describe('filterOptions — 분류 칩', () => {
  it('주일 설교는 연도(최근 연도부터), 연도를 모르는 자료가 있으면 «연도 미표기» 가 맨 뒤', () => {
    expect(filterOptions('sunday', SUNDAY)).toEqual([
      { value: '2026', label: '2026년' },
      { value: '2025', label: '2025년' },
    ]);
    expect(filterOptions('sunday', [doc({ id: 'x' }), ...SUNDAY]).at(-1)).toEqual({
      value: NO_YEAR,
      label: NO_YEAR,
    });
  });

  it('시리즈·가정/명절/절기는 묶음 이름 — 최근 자료가 있는 묶음부터, 한 번씩만', () => {
    expect(filterOptions('seasonal', SEASONAL)).toEqual([
      { value: '절기', label: '절기' },
      { value: '명절', label: '명절' },
      { value: '가정예배', label: '가정예배' },
    ]);
  });
});

describe('findResources — 칩·검색·정렬', () => {
  it('조건이 없으면 최신순', () => {
    expect(ids(findResources(SUNDAY, all))).toEqual(['s66', 's65', 's10']);
  });

  it('주일은 연도 칩, 그 밖은 묶음 칩으로 거른다', () => {
    expect(ids(findResources(SUNDAY, { ...all, filter: '2025' }))).toEqual(['s10']);
    expect(ids(findResources(SEASONAL, { ...all, filter: '명절' }))).toEqual([
      'hwp',
      'img',
      'nopreview',
    ]);
  });

  it('제목·묶음·회차·날짜·본문·원본 파일 이름으로 찾는다 — 띄어쓰기·대소문자는 무시', () => {
    const find = (q: string, list = SUNDAY) => ids(findResources(list, { ...all, q }));
    expect(find('도장깨기')).toEqual(['s66']);
    expect(find('사도행전강해')).toEqual(['s66', 's65', 's10']);
    expect(find('66회')).toEqual(['s66']);
    expect(find('강해 65회')).toEqual(['s65']);
    expect(find('2026.10.18')).toEqual(['s65']);
    expect(find('13:4-5')).toEqual(['s65']);
    expect(find('추석 가정예배', SEASONAL)).toEqual(['hwp', 'nopreview']);
    expect(find('없는 말')).toEqual([]);
  });

  it('낱말을 띄어 쓰면 낱말마다 찾는다(모두 들어 있어야 한다) — 순서·사이 글자와 무관', () => {
    const series = [
      doc({
        id: 'h9',
        section: 'series',
        group: '성령의 능력, 성령의 열매',
        episode: 9,
        title: '성령의 능력, 성령의 열매 9',
        date: '2025-03-30',
      }),
      doc({
        id: 'h2',
        section: 'series',
        group: '성령의 능력, 성령의 열매',
        episode: 2,
        title: '성령의 능력, 성령의 열매 2',
        date: '2025-02-09',
      }),
      doc({
        id: 'w3',
        section: 'series',
        group: '우리를 살리는 예배',
        episode: 3,
        title: '우리를 살리는 예배[찬양]',
        date: '2025-01-18',
        passage: '시편 69:30-31',
      }),
    ];
    const find = (q: string) => ids(findResources(series, { ...all, q }));
    expect(find('성령 9')).toEqual(['h9']); // 날짜 «02.09» 의 9 에는 걸리지 않는다
    expect(find('9 성령')).toEqual(['h9']);
    expect(find('열매 능력')).toEqual(['h9', 'h2']);
    expect(find('예배 찬양')).toEqual(['w3']);
    expect(find('시편 69')).toEqual(['w3']);
    expect(find('성령 찬양')).toEqual([]);
    // 주일 자료: 묶음 + 회차, 제목 낱말 + 연도
    expect(ids(findResources(SUNDAY, { ...all, q: '사도행전 65' }))).toEqual(['s65']);
    expect(ids(findResources(SUNDAY, { ...all, q: '도장 2026' }))).toEqual(['s66']);
  });

  it('숫자로 시작하는 낱말은 어느 칸에서든 앞이 숫자가 아닌 자리에서만 — «9» 가 «2025.02.09»·«19» 에 걸리지 않는다', () => {
    const list = [
      doc({ id: 'nineteen', date: '2025-02-09', episode: 19, title: '제목' }),
      doc({ id: 'nine', date: '2025-03-02', episode: 9, title: '제목' }),
    ];
    expect(ids(findResources(list, { ...all, q: '9' }))).toEqual(['nine']);
    // 앞에서부터 맞추므로 치는 도중에도 걸린다(«6» → 6회·60번대)
    expect(ids(findResources(SUNDAY, { ...all, q: '6' }))).toEqual(['s66', 's65']);
  });

  it('본문은 «13장»·«13장 4절» 처럼 쳐도 찾는다(예배 설교 목록과 같은 규칙) — 올린 쪽의 «13: 4» 띄어쓰기도 무시', () => {
    const find = (q: string, list = SUNDAY) => ids(findResources(list, { ...all, q }));
    expect(find('13장')).toEqual(['s66', 's65']);
    expect(find('13장 4절')).toEqual(['s66', 's65']);
    expect(find('사도행전 13장')).toEqual(['s66', 's65']);
    expect(find('3장')).toEqual([]); // «13:» 안의 «3:» 에 걸리지 않는다
    const spaced = [doc({ id: 'sp', passage: '요한복음 13: 4-7' })];
    expect(find('13:4', spaced)).toEqual(['sp']);
    expect(find('13장 4절', spaced)).toEqual(['sp']);
  });

  it('낱말은 한 칸 안에서만 맞는다 — 제목 끝과 날짜 앞이 이어져 걸리지 않는다', () => {
    // 제목 «도장 깨기» + 날짜 «2026.10.25» 를 이어 붙인 «깨기2026» 은 없는 말이다
    expect(ids(findResources(SUNDAY, { ...all, q: '깨기2026' }))).toEqual([]);
    expect(ids(findResources(SUNDAY, { ...all, q: '깨기 2026' }))).toEqual(['s66']);
  });

  it('공백만 친 검색어는 조건이 없는 것과 같다', () => {
    expect(ids(findResources(SUNDAY, { ...all, q: '   ' }))).toEqual(['s66', 's65', 's10']);
  });

  it('숫자로 시작하는 회차 검색은 앞이 숫자가 아닌 자리에서만 — «6회» 가 «66회» 에 걸리지 않는다', () => {
    const list = [...SUNDAY, doc({ id: 's6', episode: 6, date: '2025-02-02' })];
    expect(ids(findResources(list, { ...all, q: '6회' }))).toEqual(['s6']);
  });

  it('오래된 순 — 날짜 없는 자료는 연도로 세우고, 날짜도 연도도 모르는 자료는 어느 정렬에서나 맨 뒤', () => {
    expect(ids(findResources(SUNDAY, { ...all, sort: 'old' }))).toEqual(['s10', 's65', 's66']);
    const mixed = [doc({ id: 'unknown', section: 'seasonal', group: '명절' }), ...SEASONAL];
    expect(ids(findResources(mixed, { ...all, sort: 'old' }))).toEqual([
      'nopreview',
      'img',
      'home',
      'hwp',
      'holy',
      'unknown',
    ]);
    expect(ids(findResources(mixed, all)).at(-1)).toBe('unknown');
  });

  it('받은 배열은 바꾸지 않는다', () => {
    const before = ids(SUNDAY);
    findResources(SUNDAY, { ...all, sort: 'old' });
    expect(ids(SUNDAY)).toEqual(before);
  });
});

describe('표시 문구', () => {
  it('묶음 표시 — 주일은 «강해 이름 N회», 그 밖은 묶음 이름', () => {
    expect(groupLabel(SUNDAY[0])).toBe('사도행전 강해 66회');
    expect(groupLabel(doc({ id: 'x', group: '주일 설교' }))).toBe('주일 설교');
    expect(
      groupLabel(doc({ id: 'y', section: 'series', group: '우리를 살리는 예배', episode: 3 }))
    ).toBe('우리를 살리는 예배');
  });

  it('날짜 표시 — 날짜는 «2026.10.25», 연도만 알면 «2025년», 모르면 빈 문자열(지어내지 않는다)', () => {
    expect(dateLabel(SUNDAY[0])).toBe('2026.10.25');
    expect(dateLabel(doc({ id: 'x', year: '2025' }))).toBe('2025년');
    expect(dateLabel(doc({ id: 'y' }))).toBe('');
  });

  it('결과 수 앞의 말 — 검색 중이면 «검색 결과», 칩만 골랐으면 칩 이름, 조건이 없으면 «전체»', () => {
    const options = filterOptions('sunday', SUNDAY);
    expect(countLabel(all, options)).toBe('전체');
    expect(countLabel({ ...all, filter: '2026' }, options)).toBe('2026년');
    expect(countLabel({ ...all, q: '도장', filter: '2026' }, options)).toBe('검색 결과');
  });

  it('열람 페이지 제목 — «자료 제목 | 분류 | 성복교회», 자료를 못 찾았으면 분류부터', () => {
    expect(documentTitle('sunday', SUNDAY[0])).toBe('도장 깨기 | 주일 설교 시트지 | 성복교회');
    expect(documentTitle('series')).toBe('시리즈 설교 시트지 | 성복교회');
  });

  it('영상 버튼 — 사이트 안은 «설교 영상 보기», 유튜브는 «유튜브에서 보기», 여러 개면 번호', () => {
    expect(videoLinkLabel(false, 0, 1)).toBe('설교 영상 보기');
    expect(videoLinkLabel(true, 0, 1)).toBe('유튜브에서 보기');
    expect(videoLinkLabel(false, 1, 2)).toBe('설교 영상 보기 2');
  });
});

describe('downloadTarget — 내려받을 것', () => {
  it('원본 파일이 있으면 그 파일을 올린 이름 그대로', () => {
    expect(downloadTarget(SUNDAY[0])).toEqual({
      kind: 'file',
      href: '/f/s66.pdf',
      name: 's66 나눔지.pdf',
    });
  });

  it('이미지로만 제공되는 자료는 보고 있는 쪽 그림(없는 파일의 내려받기를 만들지 않는다)', () => {
    expect(downloadTarget(SEASONAL[3], 1)).toEqual({
      kind: 'image',
      href: '/p/2.webp',
      name: '설 명절 순서지 2.webp',
    });
    expect(downloadTarget(SEASONAL[3])?.href).toBe('/p/1.webp');
    // 없는 쪽 번호면 첫 쪽
    expect(downloadTarget(SEASONAL[3], 9)?.href).toBe('/p/1.webp');
  });

  it('파일 이름에 쓸 수 없는 글자는 빈칸으로', () => {
    const r = doc({ id: 'x', file: undefined, title: '성찬: 은혜/응답?' });
    expect(downloadTarget(r)?.name).toBe('성찬 은혜 응답 1.webp');
  });

  it('파일도 그림도 없으면 undefined', () => {
    expect(downloadTarget(doc({ id: 'none', file: undefined, pages: [] }))).toBeUndefined();
  });
});
