// 주보 시드 — 기존 사이트 주보 게시판(0402)의 전체 90호(2025-03-02 ~ 2026-11-15, 2026-11-16 옮김).
// 그림 한 장 = 펼친 두 면. 기존 사이트의 1200px 그림을 WebP 로 줄여 public/files/bulletin 에 두었다.
// 관리자·DB 가 생기기 전까지 주보 화면이 이 목록을 읽는다(api/newsRepository). id 는 주일 날짜.
import type { BulletinIssue } from '../api/news.types';

export const BULLETIN_SEED: readonly BulletinIssue[] = [
  {
    id: '2026-11-15',
    status: 'published',
    date: '2026-11-15',
    pages: [
      {
        src: '/files/bulletin/2026-11-15-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-15-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-15-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-15-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-11-08',
    status: 'published',
    date: '2026-11-08',
    pages: [
      {
        src: '/files/bulletin/2026-11-08-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-08-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-08-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-08-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-11-01',
    status: 'published',
    date: '2026-11-01',
    pages: [
      {
        src: '/files/bulletin/2026-11-01-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-01-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-01-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-11-01-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-10-25',
    status: 'published',
    date: '2026-10-25',
    pages: [
      {
        src: '/files/bulletin/2026-10-25-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-25-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-25-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-25-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-10-18',
    status: 'published',
    date: '2026-10-18',
    pages: [
      {
        src: '/files/bulletin/2026-10-18-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-18-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-18-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-18-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-10-11',
    status: 'published',
    date: '2026-10-11',
    pages: [
      {
        src: '/files/bulletin/2026-10-11-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-11-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-11-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-11-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-10-04',
    status: 'published',
    date: '2026-10-04',
    pages: [
      {
        src: '/files/bulletin/2026-10-04-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-04-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-04-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-10-04-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-09-27',
    status: 'published',
    date: '2026-09-27',
    pages: [
      {
        src: '/files/bulletin/2026-09-27-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-27-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-27-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-27-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-09-20',
    status: 'published',
    date: '2026-09-20',
    pages: [
      {
        src: '/files/bulletin/2026-09-20-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-20-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-20-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-20-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-09-13',
    status: 'published',
    date: '2026-09-13',
    pages: [
      {
        src: '/files/bulletin/2026-09-13-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-13-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-13-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-13-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-09-06',
    status: 'published',
    date: '2026-09-06',
    pages: [
      {
        src: '/files/bulletin/2026-09-06-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-06-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-06-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-09-06-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-08-30',
    status: 'published',
    date: '2026-08-30',
    pages: [
      {
        src: '/files/bulletin/2026-08-30-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-30-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-30-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-30-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-08-23',
    status: 'published',
    date: '2026-08-23',
    pages: [
      {
        src: '/files/bulletin/2026-08-23-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-23-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-23-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-23-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-08-16',
    status: 'published',
    date: '2026-08-16',
    pages: [
      {
        src: '/files/bulletin/2026-08-16-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-16-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-16-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-16-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-08-09',
    status: 'published',
    date: '2026-08-09',
    pages: [
      {
        src: '/files/bulletin/2026-08-09-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-09-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-09-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-09-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-08-02',
    status: 'published',
    date: '2026-08-02',
    pages: [
      {
        src: '/files/bulletin/2026-08-02-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-02-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-02-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-08-02-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-07-26',
    status: 'published',
    date: '2026-07-26',
    pages: [
      {
        src: '/files/bulletin/2026-07-26-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-26-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-26-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-26-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-07-19',
    status: 'published',
    date: '2026-07-19',
    pages: [
      {
        src: '/files/bulletin/2026-07-19-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-19-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-19-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-19-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-07-12',
    status: 'published',
    date: '2026-07-12',
    pages: [
      {
        src: '/files/bulletin/2026-07-12-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-12-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-12-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-12-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-07-05',
    status: 'published',
    date: '2026-07-05',
    pages: [
      {
        src: '/files/bulletin/2026-07-05-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-05-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-05-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-07-05-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-06-28',
    status: 'published',
    date: '2026-06-28',
    pages: [
      {
        src: '/files/bulletin/2026-06-28-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-28-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-28-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-28-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-06-21',
    status: 'published',
    date: '2026-06-21',
    pages: [
      {
        src: '/files/bulletin/2026-06-21-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-21-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-21-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-21-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-06-14',
    status: 'published',
    date: '2026-06-14',
    pages: [
      {
        src: '/files/bulletin/2026-06-14-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-14-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-14-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-14-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-06-07',
    status: 'published',
    date: '2026-06-07',
    pages: [
      {
        src: '/files/bulletin/2026-06-07-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-07-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-07-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-06-07-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-05-31',
    status: 'published',
    date: '2026-05-31',
    pages: [
      {
        src: '/files/bulletin/2026-05-31-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-31-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-31-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-31-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-05-24',
    status: 'published',
    date: '2026-05-24',
    pages: [
      {
        src: '/files/bulletin/2026-05-24-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-24-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-24-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-24-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-05-17',
    status: 'published',
    date: '2026-05-17',
    pages: [
      {
        src: '/files/bulletin/2026-05-17-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-17-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-17-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-17-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-05-10',
    status: 'published',
    date: '2026-05-10',
    pages: [
      {
        src: '/files/bulletin/2026-05-10-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-10-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-10-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-10-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-05-03',
    status: 'published',
    date: '2026-05-03',
    pages: [
      {
        src: '/files/bulletin/2026-05-03-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-03-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-03-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-05-03-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-04-26',
    status: 'published',
    date: '2026-04-26',
    pages: [
      {
        src: '/files/bulletin/2026-04-26-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-26-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-26-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-26-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-04-19',
    status: 'published',
    date: '2026-04-19',
    pages: [
      {
        src: '/files/bulletin/2026-04-19-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-19-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-19-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-19-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-04-12',
    status: 'published',
    date: '2026-04-12',
    pages: [
      {
        src: '/files/bulletin/2026-04-12-1.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-12-2.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-12-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-04-12-4.webp',
        width: 1200,
        height: 854,
      },
    ],
  },
  {
    id: '2026-04-05',
    status: 'published',
    date: '2026-04-05',
    pages: [
      {
        src: '/files/bulletin/2026-04-05-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-04-05-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-04-05-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-04-05-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-03-29',
    status: 'published',
    date: '2026-03-29',
    pages: [
      {
        src: '/files/bulletin/2026-03-29-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-29-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-29-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-29-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-03-22',
    status: 'published',
    date: '2026-03-22',
    pages: [
      {
        src: '/files/bulletin/2026-03-22-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-22-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-22-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-22-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-03-15',
    status: 'published',
    date: '2026-03-15',
    pages: [
      {
        src: '/files/bulletin/2026-03-15-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-15-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-15-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-15-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-03-08',
    status: 'published',
    date: '2026-03-08',
    pages: [
      {
        src: '/files/bulletin/2026-03-08-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-08-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-08-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-08-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-03-01',
    status: 'published',
    date: '2026-03-01',
    pages: [
      {
        src: '/files/bulletin/2026-03-01-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-01-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-01-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-03-01-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-02-22',
    status: 'published',
    date: '2026-02-22',
    pages: [
      {
        src: '/files/bulletin/2026-02-22-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-22-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-22-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-22-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-02-15',
    status: 'published',
    date: '2026-02-15',
    pages: [
      {
        src: '/files/bulletin/2026-02-15-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-15-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-15-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-15-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-02-08',
    status: 'published',
    date: '2026-02-08',
    pages: [
      {
        src: '/files/bulletin/2026-02-08-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-08-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-08-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-08-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-02-01',
    status: 'published',
    date: '2026-02-01',
    pages: [
      {
        src: '/files/bulletin/2026-02-01-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-01-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-01-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-02-01-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-01-25',
    status: 'published',
    date: '2026-01-25',
    pages: [
      {
        src: '/files/bulletin/2026-01-25-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-25-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-25-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-25-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-01-18',
    status: 'published',
    date: '2026-01-18',
    pages: [
      {
        src: '/files/bulletin/2026-01-18-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-18-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-18-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-18-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-01-11',
    status: 'published',
    date: '2026-01-11',
    pages: [
      {
        src: '/files/bulletin/2026-01-11-1.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-11-2.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-11-3.webp',
        width: 1200,
        height: 848,
      },
      {
        src: '/files/bulletin/2026-01-11-4.webp',
        width: 1200,
        height: 848,
      },
    ],
  },
  {
    id: '2026-01-04',
    status: 'published',
    date: '2026-01-04',
    pages: [
      {
        src: '/files/bulletin/2026-01-04-1.webp',
        width: 1200,
        height: 853,
      },
      {
        src: '/files/bulletin/2026-01-04-2.webp',
        width: 1200,
        height: 853,
      },
      {
        src: '/files/bulletin/2026-01-04-3.webp',
        width: 1200,
        height: 854,
      },
      {
        src: '/files/bulletin/2026-01-04-4.webp',
        width: 1200,
        height: 853,
      },
    ],
  },
  {
    id: '2025-12-28',
    status: 'published',
    date: '2025-12-28',
    pages: [
      {
        src: '/files/bulletin/2025-12-28-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-28-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-28-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-28-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-12-21',
    status: 'published',
    date: '2025-12-21',
    pages: [
      {
        src: '/files/bulletin/2025-12-21-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-21-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-21-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-21-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-12-14',
    status: 'published',
    date: '2025-12-14',
    pages: [
      {
        src: '/files/bulletin/2025-12-14-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-14-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-14-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-14-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-12-07',
    status: 'published',
    date: '2025-12-07',
    pages: [
      {
        src: '/files/bulletin/2025-12-07-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-07-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-07-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-12-07-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-11-30',
    status: 'published',
    date: '2025-11-30',
    pages: [
      {
        src: '/files/bulletin/2025-11-30-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-30-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-30-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-30-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-11-23',
    status: 'published',
    date: '2025-11-23',
    pages: [
      {
        src: '/files/bulletin/2025-11-23-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-23-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-23-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-23-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-11-16',
    status: 'published',
    date: '2025-11-16',
    pages: [
      {
        src: '/files/bulletin/2025-11-16-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-16-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-16-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-16-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-11-09',
    status: 'published',
    date: '2025-11-09',
    pages: [
      {
        src: '/files/bulletin/2025-11-09-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-09-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-09-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-09-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-11-02',
    status: 'published',
    date: '2025-11-02',
    pages: [
      {
        src: '/files/bulletin/2025-11-02-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-02-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-02-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-11-02-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-10-26',
    status: 'published',
    date: '2025-10-26',
    pages: [
      {
        src: '/files/bulletin/2025-10-26-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-26-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-26-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-26-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-10-19',
    status: 'published',
    date: '2025-10-19',
    pages: [
      {
        src: '/files/bulletin/2025-10-19-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-19-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-19-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-19-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-10-12',
    status: 'published',
    date: '2025-10-12',
    pages: [
      {
        src: '/files/bulletin/2025-10-12-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-12-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-12-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-12-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-10-05',
    status: 'published',
    date: '2025-10-05',
    pages: [
      {
        src: '/files/bulletin/2025-10-05-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-05-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-05-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-10-05-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-09-28',
    status: 'published',
    date: '2025-09-28',
    pages: [
      {
        src: '/files/bulletin/2025-09-28-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-28-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-28-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-28-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-09-21',
    status: 'published',
    date: '2025-09-21',
    pages: [
      {
        src: '/files/bulletin/2025-09-21-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-21-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-21-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-21-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-09-14',
    status: 'published',
    date: '2025-09-14',
    pages: [
      {
        src: '/files/bulletin/2025-09-14-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-14-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-14-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-14-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-09-07',
    status: 'published',
    date: '2025-09-07',
    pages: [
      {
        src: '/files/bulletin/2025-09-07-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-07-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-07-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-09-07-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-08-31',
    status: 'published',
    date: '2025-08-31',
    pages: [
      {
        src: '/files/bulletin/2025-08-31-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-31-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-31-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-31-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-08-24',
    status: 'published',
    date: '2025-08-24',
    pages: [
      {
        src: '/files/bulletin/2025-08-24-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-24-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-24-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-24-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-08-17',
    status: 'published',
    date: '2025-08-17',
    pages: [
      {
        src: '/files/bulletin/2025-08-17-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-17-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-17-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-17-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-08-10',
    status: 'published',
    date: '2025-08-10',
    pages: [
      {
        src: '/files/bulletin/2025-08-10-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-10-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-10-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-10-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-08-03',
    status: 'published',
    date: '2025-08-03',
    pages: [
      {
        src: '/files/bulletin/2025-08-03-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-03-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-03-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-08-03-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-07-27',
    status: 'published',
    date: '2025-07-27',
    pages: [
      {
        src: '/files/bulletin/2025-07-27-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-27-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-27-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-27-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-07-20',
    status: 'published',
    date: '2025-07-20',
    pages: [
      {
        src: '/files/bulletin/2025-07-20-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-20-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-20-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-20-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-07-13',
    status: 'published',
    date: '2025-07-13',
    pages: [
      {
        src: '/files/bulletin/2025-07-13-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-13-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-13-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-13-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-07-06',
    status: 'published',
    date: '2025-07-06',
    pages: [
      {
        src: '/files/bulletin/2025-07-06-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-06-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-06-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-07-06-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-06-29',
    status: 'published',
    date: '2025-06-29',
    pages: [
      {
        src: '/files/bulletin/2025-06-29-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-29-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-29-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-29-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-06-22',
    status: 'published',
    date: '2025-06-22',
    pages: [
      {
        src: '/files/bulletin/2025-06-22-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-22-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-22-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-22-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-06-15',
    status: 'published',
    date: '2025-06-15',
    pages: [
      {
        src: '/files/bulletin/2025-06-15-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-15-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-15-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-15-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-06-08',
    status: 'published',
    date: '2025-06-08',
    pages: [
      {
        src: '/files/bulletin/2025-06-08-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-08-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-08-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-08-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-06-01',
    status: 'published',
    date: '2025-06-01',
    pages: [
      {
        src: '/files/bulletin/2025-06-01-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-01-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-01-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-06-01-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-05-25',
    status: 'published',
    date: '2025-05-25',
    pages: [
      {
        src: '/files/bulletin/2025-05-25-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-25-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-25-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-25-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-05-18',
    status: 'published',
    date: '2025-05-18',
    pages: [
      {
        src: '/files/bulletin/2025-05-18-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-18-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-18-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-18-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-05-11',
    status: 'published',
    date: '2025-05-11',
    pages: [
      {
        src: '/files/bulletin/2025-05-11-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-11-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-11-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-11-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-05-04',
    status: 'published',
    date: '2025-05-04',
    pages: [
      {
        src: '/files/bulletin/2025-05-04-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-04-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-04-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-05-04-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-04-27',
    status: 'published',
    date: '2025-04-27',
    pages: [
      {
        src: '/files/bulletin/2025-04-27-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-27-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-27-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-27-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-04-20',
    status: 'published',
    date: '2025-04-20',
    pages: [
      {
        src: '/files/bulletin/2025-04-20-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-20-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-20-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-20-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-04-13',
    status: 'published',
    date: '2025-04-13',
    pages: [
      {
        src: '/files/bulletin/2025-04-13-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-13-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-13-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-13-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-04-06',
    status: 'published',
    date: '2025-04-06',
    pages: [
      {
        src: '/files/bulletin/2025-04-06-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-06-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-06-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-04-06-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-03-30',
    status: 'published',
    date: '2025-03-30',
    pages: [
      {
        src: '/files/bulletin/2025-03-30-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-30-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-30-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-30-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-03-23',
    status: 'published',
    date: '2025-03-23',
    pages: [
      {
        src: '/files/bulletin/2025-03-23-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-23-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-23-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-23-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-03-16',
    status: 'published',
    date: '2025-03-16',
    pages: [
      {
        src: '/files/bulletin/2025-03-16-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-16-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-16-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-16-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-03-09',
    status: 'published',
    date: '2025-03-09',
    pages: [
      {
        src: '/files/bulletin/2025-03-09-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-09-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-09-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-09-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
  {
    id: '2025-03-02',
    status: 'published',
    date: '2025-03-02',
    pages: [
      {
        src: '/files/bulletin/2025-03-02-1.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-02-2.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-02-3.webp',
        width: 1200,
        height: 888,
      },
      {
        src: '/files/bulletin/2025-03-02-4.webp',
        width: 1200,
        height: 888,
      },
    ],
  },
];
