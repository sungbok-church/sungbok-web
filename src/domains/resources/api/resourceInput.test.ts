import { describe, expect, it } from 'vitest';

import { parseYoutubeVideoId, resourceInputSchema } from './resourceInput';

describe('parseYoutubeVideoId', () => {
  it('영상 id 그대로', () => {
    expect(parseYoutubeVideoId('YYW0D6JNrGQ')).toBe('YYW0D6JNrGQ');
    expect(parseYoutubeVideoId(' -Jek7_dGBDg ')).toBe('-Jek7_dGBDg');
  });

  it('유튜브 주소에서 영상 id 를 꺼낸다 — watch · youtu.be · embed · live · shorts', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=YYW0D6JNrGQ&t=30s')).toBe(
      'YYW0D6JNrGQ'
    );
    expect(parseYoutubeVideoId('https://youtu.be/YYW0D6JNrGQ?si=abc')).toBe('YYW0D6JNrGQ');
    expect(parseYoutubeVideoId('https://www.youtube-nocookie.com/embed/YYW0D6JNrGQ')).toBe(
      'YYW0D6JNrGQ'
    );
    expect(parseYoutubeVideoId('https://youtube.com/live/YYW0D6JNrGQ')).toBe('YYW0D6JNrGQ');
    expect(parseYoutubeVideoId('https://m.youtube.com/shorts/YYW0D6JNrGQ')).toBe('YYW0D6JNrGQ');
  });

  it('재생목록 주소·다른 사이트·모양이 다른 값은 받지 않는다 — 영상 하나를 가리켜야 한다', () => {
    expect(
      parseYoutubeVideoId('https://www.youtube.com/playlist?list=PLE3XUsm60vXSn')
    ).toBeUndefined();
    expect(parseYoutubeVideoId('https://example.com/watch?v=YYW0D6JNrGQ')).toBeUndefined();
    expect(parseYoutubeVideoId('사도행전 강해 66')).toBeUndefined();
    expect(parseYoutubeVideoId('')).toBeUndefined();
  });
});

describe('resourceInputSchema', () => {
  const base = {
    section: 'sunday',
    group: '사도행전 강해',
    title: '도장 깨기',
    status: 'draft',
  };

  it('영상 연결 없이도 등록된다(가정·명절 자료) — 연결은 빈 배열', () => {
    const r = resourceInputSchema.parse(base);
    expect(r.videoIds).toEqual([]);
    expect(r.status).toBe('draft');
  });

  it('붙여 넣은 유튜브 주소를 영상 id 로 바꾸고 중복을 없앤다', () => {
    const r = resourceInputSchema.parse({
      ...base,
      videos: ['https://youtu.be/YYW0D6JNrGQ', 'YYW0D6JNrGQ', 'Gi008JHTF5U'],
    });
    expect(r.videoIds).toEqual(['YYW0D6JNrGQ', 'Gi008JHTF5U']);
  });

  it('영상을 가리키지 않는 값·달력에 없는 날짜·빈 제목은 거절한다', () => {
    expect(resourceInputSchema.safeParse({ ...base, videos: ['사도행전 66'] }).success).toBe(false);
    expect(resourceInputSchema.safeParse({ ...base, date: '2026-02-30' }).success).toBe(false);
    expect(resourceInputSchema.safeParse({ ...base, date: '26.10.25' }).success).toBe(false);
    expect(resourceInputSchema.safeParse({ ...base, title: '  ' }).success).toBe(false);
    expect(
      resourceInputSchema.safeParse({ ...base, date: '2026-10-25', episode: 66 }).success
    ).toBe(true);
  });
});
