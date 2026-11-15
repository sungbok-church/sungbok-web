// 교회앨범 시드 — 기존 사이트 사진첩 게시판(0408)의 4건(2026-11-13 옮김). 화보·포스터 한 장씩.
// 분류(교회행사·다음세대)는 시안에서 정한 것 — 관리자 연동 때 등록 화면에서 고른다.
import type { Album } from '../api/news.types';

export const ALBUM_SEED: readonly Album[] = [
  {
    id: '2',
    status: 'published',
    title: '2026 가을특별부흥집회',
    category: '교회행사',
    images: [
      {
        src: '/files/album/2-1.webp',
        width: 700,
        height: 998,
      },
    ],
  },
  {
    id: '4',
    status: 'published',
    title: '여름성경학교 · 유치부·영아부',
    category: '다음세대',
    images: [
      {
        src: '/files/album/4-1.webp',
        width: 700,
        height: 990,
      },
    ],
  },
  {
    id: '5',
    status: 'published',
    title: '중·고등부 연합수련회',
    category: '다음세대',
    images: [
      {
        src: '/files/album/5-1.webp',
        width: 700,
        height: 1050,
      },
    ],
  },
  {
    id: '1',
    status: 'published',
    title: '여름성경학교 · 영아부·초등부',
    category: '다음세대',
    images: [
      {
        src: '/files/album/1-1.webp',
        width: 700,
        height: 990,
      },
    ],
  },
];
