// 다음세대 부서 페이지 데이터 계약 — 관리자에서 고친 값(DB)을 저장소가 이 모양으로 만든다(설계 6.13).
// 사진은 레포 사진(StaticImageData)과 올린 사진(UploadedPhoto) 둘 다 받는다 — 둘 다 src · width · height 가 있다.
import type { UploadedPhoto } from '@/shared/lib/photoVariant';
import type { StaticImageData } from 'next/image';

type SitePhoto = StaticImageData | UploadedPhoto;

export interface Photo {
  /** 리스트 key — 같은 사진을 두 번 써도 고유해야 한다 */
  id: string;
  src: SitePhoto;
  /** 대체 텍스트만. 화면에 보이는 캡션은 두지 않는다 */
  alt: string;
}

export interface Staff {
  name: string;
  /** 직함(간사·전도사·부장 등) */
  role: string;
  /** 없으면 이름 · 직함만 */
  photo?: SitePhoto;
  /** 담당자 인사말 한두 문장(사실 톤). 없을 수 있음 */
  greeting?: string;
}

export interface Department {
  name: string;
  /** 대상 나이 */
  ages: string;
  /** 첫 사진 위에 얹는 한 줄 */
  tagline: string;
  /** 소개 문단 */
  intro: string;
  worship: { day: string; time: string; place: string };
  staff: Staff[];
  /** 정보 덩어리 맨 아래 한 줄(처음 오는 가정 안내 등). 비면 그리지 않는다 */
  extra: string;
}

export interface DepartmentPageProps {
  dept: Department;
  /** photos[0] 이 들어서는 한 장(도입부), 나머지가 쇼케이스. 개수 상한 없음 */
  photos: Photo[];
}
