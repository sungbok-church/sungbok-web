import { describe, expect, it } from 'vitest';

import { SINGLES } from './sermonParse';
import { rowsToLibrary, type VideoRow } from './videoRows';

const row = (id: string, over: Partial<VideoRow> = {}): VideoRow => ({
  video_id: id,
  position: 0,
  title: `시리즈 1 | 제목 ${id} | 요한복음 3:16 | 이요셉 목사`,
  description: '2026년 10월 25일 성복교회 주일예배\n\n본문 내용',
  published_at: '2026-10-26T03:00:00Z',
  added_at: null,
  thumbnail: `h/${id}`,
  poster: `x/${id}`,
  ...over,
});

describe('rowsToLibrary — 받아 둔 유튜브 줄 → 설교 목록(제목 · 설명은 읽을 때 뽑는다)', () => {
  it('제목 · 설명에서 설교 정보를 읽는다', () => {
    const { sermons } = rowsToLibrary([
      row('a', {
        title: '사도행전 강해 66 | 구원을 위한 영과 육의 도장깨기 | 사도행전 13:4-7 | 이요셉 목사',
      }),
    ]);
    expect(sermons).toEqual([
      {
        id: 'a',
        title: '구원을 위한 영과 육의 도장깨기',
        series: '사도행전 강해',
        no: 66,
        passage: '사도행전 13:4-7',
        preacher: '이요셉 목사',
        date: '2026-10-25',
        dateFrom: 'sermon',
        thumbnail: 'h/a',
        poster: 'x/a',
      },
    ]);
  });

  it('설명에 설교일이 없으면 올린 시각을 한국 날짜로 바꿔 쓰고 출처를 upload 로', () => {
    // UTC 10/24 15:30 = 한국 10/25 00:30
    const [a] = rowsToLibrary([
      row('a', { description: '[절기설교]', published_at: '2026-10-24T15:30:00Z' }),
    ]).sermons;
    expect(a).toMatchObject({ date: '2026-10-25', dateFrom: 'upload' });
  });

  it('설명에 없어도 제목에 날짜가 있으면 그 날짜가 설교일', () => {
    const [a] = rowsToLibrary([
      row('a', { title: '2024년 12월 31일 성복교회 송구영신예배', description: '' }),
    ]).sermons;
    expect(a).toMatchObject({ date: '2024-12-31', dateFrom: 'sermon', series: SINGLES });
  });

  it('올린 시각이 없으면 재생목록에 넣은 시각, 날짜를 알 수 없는 영상은 뺀다', () => {
    const { sermons } = rowsToLibrary([
      row('a', { description: '', published_at: null, added_at: '2026-03-01T00:00:00Z' }),
      row('b', { description: '', published_at: null }),
    ]);
    expect(sermons).toMatchObject([{ id: 'a', date: '2026-03-01', dateFrom: 'upload' }]);
  });

  it('날짜 최신순', () => {
    const { sermons } = rowsToLibrary([
      row('old', { description: '2025년 1월 5일 주일예배' }),
      row('new', { description: '2026년 11월 1일 주일예배' }),
    ]);
    expect(sermons.map(s => s.id)).toEqual(['new', 'old']);
  });

  it('띄어쓰기만 다른 시리즈 이름은 한 시리즈 — 가장 최근 편의 표기', () => {
    const { sermons } = rowsToLibrary([
      row('m150', {
        title: '마태복음 강해 150 | 부활의 능력 | 이요셉 목사',
        description: '2025년 1월 19일 주일예배',
      }),
      row('m151', {
        title: '마태복음강해 151 | 지상대위임령 | 이요셉 목사',
        description: '2025년 1월 26일 주일예배',
      }),
    ]);
    expect(sermons.map(s => [s.id, s.series])).toEqual([
      ['m151', '마태복음강해'],
      ['m150', '마태복음강해'],
    ]);
  });

  it('설명 본문 — 설교일 줄은 뺀 것, 빈 설명은 빈 글', () => {
    const { descriptions } = rowsToLibrary([
      row('a', { description: '2026년 10월 25일 주일예배\n\n[사도행전 강해 66]\n#성복교회' }),
      row('b', { description: '' }),
    ]);
    expect(descriptions.get('a')).toBe('[사도행전 강해 66]\n#성복교회');
    expect(descriptions.get('b')).toBe('');
  });
});
