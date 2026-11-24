// 다음세대 부서에서 코드에 남는 값(설계 6.13) — 이름은 홈페이지 메뉴를 따르고, 예배 요일 · 시간 · 장소는 예배 페이지의
// 시간표와 같은 값이라 2차 «예배 시간표» 때 함께 옮긴다. 소개 · 담당자 · 사진은 DB(관리자). 순수 데이터.
import type { DepartmentSlug } from './departmentSlug';

export type DepartmentInfo = {
  name: string;
  worship: { day: string; time: string; place: string };
};

export const DEPARTMENT_INFO: Record<DepartmentSlug, DepartmentInfo> = {
  infant: { name: '영아부', worship: { day: '주일', time: '오전 11:30', place: '사랑성전 1F' } },
  kindergarten: {
    name: '유치부',
    worship: { day: '주일', time: '오전 11:30', place: '믿음성전 2F' },
  },
  'lower-elementary': {
    name: '유년부',
    worship: { day: '주일', time: '오전 11:30', place: '소망성전 2F' },
  },
  elementary: {
    name: '초등부',
    worship: { day: '주일', time: '오전 11:30', place: '화평성전 4F' },
  },
  middle: { name: '중등부', worship: { day: '주일', time: '오전 11:30', place: '벧엘성전 4F' } },
  high: { name: '고등부', worship: { day: '주일', time: '오전 9:00', place: '벧엘성전 4F' } },
  'young-adult': {
    name: '청년부',
    worship: { day: '주일', time: '오후 1:30', place: '예루살렘성전 3F' },
  },
  english: {
    name: '영어예배부',
    worship: { day: '주일', time: '오후 2:00', place: '벧엘성전 4F' },
  },
};
