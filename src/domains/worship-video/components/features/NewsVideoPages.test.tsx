// 교회소식 영상(주일광고·성복의 뜰)이 예배와 같은 영상 화면을 쓰는지, 그리고 영상 화면의 «설교 시트지» 카드.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPlayIntent } from '@/domains/worship-video/api/playIntent';
import { resetSermonListState } from '@/domains/worship-video/api/sermonListState';
import {
  sermonDescriptionQueryKey,
  sermonLibraryQueryKey,
} from '@/domains/worship-video/api/worshipVideoQueries';
import type { Sermon } from '@/domains/worship-video/api/worshipVideo.types';
import type { VideoPage } from '@/domains/worship-video/config/worshipPages';

import { SermonListPage } from './SermonListPage';
import { SermonWatchPage } from './SermonWatchPage';

vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    children,
    scroll,
    prefetch,
    ...rest
  }: ComponentProps<'a'> & { href: string; scroll?: boolean; prefetch?: boolean }) => (
    // Next 링크 전용 옵션(scroll·prefetch)은 <a> 에 넘기지 않고 data-* 로 적어 둔다
    <a
      href={href}
      data-scroll={scroll === undefined ? undefined : String(scroll)}
      data-prefetch={prefetch === undefined ? undefined : String(prefetch)}
      onClick={e => {
        onClick?.(e);
        e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));
vi.mock('lenis/react', () => ({ useLenis: () => undefined }));

const video = (id: string, date: string, over: Partial<Sermon> = {}): Sermon => ({
  id,
  title: `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 주일 광고`,
  series: '주일광고',
  date,
  dateFrom: 'sermon',
  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  poster: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  ...over,
});
// 최신순(저장소가 주는 순서)
const ADS: Sermon[] = [
  video('ad1025', '2026-10-25'),
  video('ad1018', '2026-10-18'),
  video('ad1011', '2026-10-11'),
  video('ad0105', '2025-01-05'),
];
const GARDEN: Sermon[] = [
  video('g1106', '2026-11-06', { title: '가을특별부흥집회 11.06', series: '부흥집회' }),
  video('g1007', '2026-10-07', {
    title: '가을특별부흥집회',
    series: '부흥집회',
    dateFrom: 'upload',
  }),
  video('g0930', '2026-09-30', { title: '리모델링', series: '교회소식', dateFrom: 'upload' }),
];

const withData = (page: VideoPage, list: Sermon[], ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(sermonLibraryQueryKey(page), list);
  for (const s of list) client.setQueryData(sermonDescriptionQueryKey(page, s.id), '');
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  resetSermonListState();
  clearPlayIntent();
});

describe('주일광고 목록(/news/announcements) — 예배와 같은 영상 목록 화면', () => {
  const open = () => withData('announcements', ADS, <SermonListPage page="announcements" />);
  const list = () => screen.getByRole('region', { name: '주일광고 목록' });

  it('가장 최근 광고 한 편을 크게 — 머리표·시청 버튼은 주일광고의 말로, 주소는 /news 아래', () => {
    open();
    expect(screen.getByText('최근 주일광고')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '광고 영상 시청하기' })).toHaveAttribute(
      'href',
      '/news/announcements/ad1025'
    );
  });

  it('제목이 곧 날짜라 날짜를 따로 적지 않는다 — 큰 카드에는 날짜 줄이 없고, 목록 줄에는 연도만', () => {
    open();
    expect(screen.queryByText(/2026\.10\.25/)).toBeNull();
    const rows = within(list()).getAllByRole('listitem');
    expect(within(rows[0]).getByText('2026년')).toBeInTheDocument();
    expect(within(rows[0]).queryByText(/2026\.10\.18/)).toBeNull();
    expect(within(rows[0]).getByText('10월 18일 주일 광고')).toBeInTheDocument();
    expect(within(rows.at(-1)!).getByText('2025년')).toBeInTheDocument();
  });

  it('칩은 연도 — 고르면 그 해의 광고만', () => {
    open();
    const chips = within(list()).getByRole('group', { name: '연도' });
    expect(
      within(chips)
        .getAllByRole('button')
        .map(b => b.textContent)
    ).toEqual(['전체', '2026년', '2025년']);
    fireEvent.click(within(chips).getByRole('button', { name: '2025년' }));
    const rows = within(list()).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/news/announcements/ad0105');
  });

  it('날짜로 찾는다', () => {
    open();
    fireEvent.change(within(list()).getByRole('searchbox', { name: '주일광고 검색' }), {
      target: { value: '10.18' },
    });
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list()).getByText('1편')).toBeInTheDocument();
  });
});

describe('성복의 뜰 목록(/news/garden)', () => {
  it('칩은 분류(부흥집회·교회소식), 업로드 날짜를 쓴 영상은 «업로드» 로 표시', () => {
    withData('garden', GARDEN, <SermonListPage page="garden" />);
    const list = screen.getByRole('region', { name: '영상 목록' });
    const chips = within(list).getByRole('group', { name: '분류' });
    expect(
      within(chips)
        .getAllByRole('button')
        .map(b => b.textContent)
    ).toEqual(['전체', '부흥집회', '교회소식']);
    expect(within(list).getByText('교회소식 · 업로드 2026.09.30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '영상 시청하기' })).toHaveAttribute(
      'href',
      '/news/garden/g1106'
    );
  });
});

describe('주일광고 한 편(/news/announcements/영상id) — 예배와 같은 시청 화면', () => {
  const open = (id: string) =>
    withData('announcements', ADS, <SermonWatchPage page="announcements" videoId={id} />);

  it('유튜브 플레이어와 이전·목록·다음 — 묶음 없이 전체 날짜순으로 넘긴다', () => {
    open('ad1018');
    expect(document.querySelector('iframe')).toHaveAttribute(
      'title',
      '10월 18일 주일 광고 주일광고 영상'
    );
    const nav = screen.getByRole('navigation', { name: '주일광고 이동' });
    expect(
      within(nav).getByRole('link', { name: '이전 주일광고: 10월 11일 주일 광고' })
    ).toHaveAttribute('href', '/news/announcements/ad1011');
    expect(
      within(nav).getByRole('link', { name: '다음 주일광고: 10월 25일 주일 광고' })
    ).toHaveAttribute('href', '/news/announcements/ad1025');
    expect(within(nav).getByRole('link', { name: '목록' })).toHaveAttribute(
      'href',
      '/news/announcements'
    );
  });

  it('옆 목록은 전체 광고 — 시리즈 칩·고르기 상자 없이 편수만', () => {
    open('ad1018');
    const side = screen.getByRole('complementary', { name: '주일광고 목록' });
    expect(within(side).getByText('4편')).toBeInTheDocument();
    expect(within(side).getAllByRole('listitem')).toHaveLength(4);
    expect(within(side).queryByRole('button', { name: /전체/ })).toBeNull();
    expect(within(side).getByText('현재 영상')).toBeInTheDocument();
    // 옆 목록도 제목이 날짜라 연도만 적는다
    expect(within(side).queryByText(/2026\.10\.18/)).toBeNull();
    expect(within(side).getAllByText('2026년')).toHaveLength(3);
  });

  it('목록에 없는 영상이면 찾을 수 없다고 알리고 주일광고 목록으로 보낸다', () => {
    open('nope');
    expect(screen.getByRole('status')).toHaveTextContent('이 주일광고 영상을 찾을 수 없습니다.');
    expect(screen.getByRole('link', { name: '주일광고 목록' })).toHaveAttribute(
      'href',
      '/news/announcements'
    );
  });
});

describe('영상 화면의 «설교 시트지» 카드 — 자료실과 같은 자료', () => {
  const SUNDAY: Sermon[] = [
    video('YYW0D6JNrGQ', '2026-10-25', { title: '도장 깨기', series: '사도행전 강해', no: 66 }),
    video('Gi008JHTF5U', '2026-10-18', { title: '내려가는 용기', series: '사도행전 강해', no: 65 }),
  ];
  const sheets = [
    {
      id: '0404-40',
      href: '/resources/sunday-sermon/0404-40',
      title: '도장 깨기',
      label: '주일 설교 시트지',
    },
    {
      id: '0406-99',
      href: '/resources/seasonal-sermon/0406-99',
      title: '가정예배 순서지',
      label: '가정·명절·절기 설교 시트지',
    },
  ];

  it('연결된 공개 자료가 있으면 자료마다 카드 — 자료실의 그 자료로 간다(같은 창)', () => {
    withData(
      'sunday',
      SUNDAY,
      <SermonWatchPage page="sunday" videoId="YYW0D6JNrGQ" sheets={sheets} />
    );
    const card = screen.getByRole('link', { name: /주일 설교 시트지/ });
    expect(card).toHaveAttribute('href', '/resources/sunday-sermon/0404-40');
    expect(card).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: /가정·명절·절기 설교 시트지/ })).toHaveAttribute(
      'href',
      '/resources/seasonal-sermon/0406-99'
    );
  });

  it('연결된 자료가 없으면 카드를 그리지 않는다', () => {
    withData('sunday', SUNDAY, <SermonWatchPage page="sunday" videoId="Gi008JHTF5U" sheets={[]} />);
    expect(screen.queryByRole('link', { name: /시트지/ })).toBeNull();
    expect(screen.queryByText('보기')).toBeNull();
  });
});
