// 변경 이력 화면에 보일 표 · 칸 · 동작의 한글 이름(설계 6.7 «칸 이름과 코드 값은 한글로»). 순수 데이터.
// 표에 칸을 새로 만들면 여기에도 이름을 더한다 — 없으면 원래 칸 이름이 그대로 보인다.

export const TABLE_LABELS: Record<string, string> = {
  profiles: '사용자',
  user_groups: '그룹 소속',
  groups: '그룹',
  group_permissions: '그룹 권한',
  menus: '메뉴',
  categories: '분류',
  codes: '공통코드',
  files: '파일',
  bulletins: '주보',
  news_videos: '주일광고 · 성복의 뜰',
  albums: '교회앨범',
  resources: '설교 시트지',
  resource_videos: '시트지 영상 연결',
  home_hero: '홈 히어로',
  departments: '다음세대 부서',
  department_staff: '부서 담당자',
  newcomers: '새가족',
};

/** 같은 칸 이름이 표마다 뜻이 다를 때(FIELD_LABELS 보다 먼저 본다) */
export const TABLE_FIELD_LABELS: Record<string, Record<string, string>> = {
  categories: { slug: '영문 이름' },
};

export const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  email: '이메일',
  department: '담당 부서',
  is_active: '사용 여부',
  must_change_password: '비밀번호 변경 필요',
  label: '이름',
  default_label: '기본 이름',
  sort: '순서',
  description: '설명',
  key: '키',
  is_system: '시스템 그룹',
  is_locked: '잠김',
  user_id: '사용자',
  group_id: '그룹',
  menu_id: '메뉴',
  parent_id: '상위 메뉴',
  action: '기능',
  actions: '기능 목록',
  area: '영역',
  path: '주소',
  code: '코드 값',
  role_id: '직분',
  group_key: '묶음',
  status: '상태',
  title: '제목',
  date: '날짜',
  date_from: '날짜 출처',
  feed: '메뉴',
  thumbnail: '썸네일',
  poster: '표지',
  legacy_id: '기존 글번호',
  video_id: '영상',
  category_id: '분류',
  series_id: '묶음',
  section: '분류',
  episode: '회차',
  passage: '본문',
  year: '연도',
  slug: '주소 번호',
  deleted_at: '휴지통',
  deleted_by: '휴지통에 보낸 사람',
  list_id: '파일 묶음',
  pages_list_id: '쪽',
  images_list_id: '사진',
  file_list_id: '파일',
  photos_list_id: '사진',
  photo_list_id: '사진',
  bucket: '저장소',
  original_name: '파일 이름',
  alt: '대체 텍스트',
  kind: '종류',
  width: '가로',
  height: '세로',
  bytes: '크기',
  variants: '폭별 파일',
  ages: '대상 나이',
  tagline: '한 줄 소개',
  intro: '소개 글',
  extra: '안내 한 줄',
  role: '직함',
  greeting: '인사말',
  youtube_video_id: '유튜브 영상',
  intent: '종류',
  phone: '연락처',
  visit_date: '방문 예정일',
  message: '남긴 말',
  note: '메모',
  handled_by: '담당자',
  handled_at: '처리 시각',
  consent_at: '동의 시각',
  consent_version: '동의 문구 판',
};

export const ACTION_NAMES: Record<string, string> = {
  INSERT: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  EXPORT: '엑셀로 받기',
};

/**
 * 값을 남기지 않는 개인정보 칸 — schema.sql 의 새가족 이력 트리거 인자(`audit_row('', '', 'name,phone,message,note')`)와 같게 둔다.
 * 이 칸이 null 이면 «(값 숨김)», 다른 칸이 null 이면 «(없음)».
 */
export const MASKED_FIELDS: Record<string, readonly string[]> = {
  newcomers: ['name', 'phone', 'message', 'note'],
};

/** 값이 다른 행의 id 인 칸 — 화면이 이름표(names)를 주면 이름으로 보인다 */
export const REFERENCE_FIELDS = new Set([
  'user_id',
  'group_id',
  'menu_id',
  'parent_id',
  'category_id',
  'series_id',
  'handled_by',
  'deleted_by',
  'list_id',
  'pages_list_id',
  'images_list_id',
  'file_list_id',
  'photos_list_id',
  'photo_list_id',
]);
