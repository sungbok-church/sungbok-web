// 자료실 자료(설교 시트지)의 모양 — 자료실 화면과 예배 영상의 «설교 시트지» 카드가 같은 자료를 쓴다.
// 관리자 등록 → 유튜브 영상 id 연결 → 공개. 구조·연동 계획: .md/domains/resources.md
import type { ContentStatus } from '@/shared/api/content.types';

/** 자료실의 세 분류(메뉴와 1:1 — config/resourceSections). */
export type ResourceSection = 'sunday' | 'series' | 'seasonal';

/** 원본 파일(내려받기 대상). 화면에는 확장자·용량을 보이지 않는다(A안). */
export type ResourceFile = {
  /** 파일 주소(Storage) */
  url: string;
  /** 내려받을 때의 파일 이름(올린 원본 이름) */
  name: string;
  kind: 'pdf' | 'hwp';
};

/** 문서 한 쪽의 미리보기 그림(열람 화면이 보여 준다). */
export type ResourcePage = { src: string; width: number; height: number };

export type Resource = {
  id: string;
  status: ContentStatus;
  section: ResourceSection;
  /** 묶음 — 주일: 강해 이름(«사도행전 강해»), 시리즈: 시리즈 이름, 가정·명절·절기: «가정예배»·«명절»·«절기» */
  group: string;
  /** 설교 회차 */
  episode?: number;
  title: string;
  /** 사용 날짜(YYYY-MM-DD) — 문서·제목에서 확인된 것만. 모르면 비운다(지어내지 않는다) */
  date?: string;
  /** 날짜를 모를 때의 연도(«2025») */
  year?: string;
  passage?: string;
  /** 원본 파일. 이미지로만 제공되는 자료에는 없다 — 없는 파일의 내려받기 버튼을 만들지 않는다 */
  file?: ResourceFile;
  /** 미리보기 쪽. 미리보기가 없는 한글 파일은 빈 배열(원본 내려받기만 안내) */
  pages: readonly ResourcePage[];
  /**
   * 연결된 설교 영상의 유튜브 영상 id — 재생목록·제목·파일 이름이 아니라 영상 id 로만 잇는다.
   * 자료 하나를 여러 영상에, 영상 하나에 여러 자료를 이을 수 있다(다대다). 영상이 없는 자료는 빈 배열.
   */
  videoIds: readonly string[];
};
