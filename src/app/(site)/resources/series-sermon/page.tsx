import ResourceLibrary from '@/domains/resources/components/widgets/ResourceLibrary';

// 시리즈 설교 시트지 목록(A안) — 검색·분류 칩·정렬. 제목을 누르면 문서 열람(./[id]), 오른쪽 아이콘은 원본 내려받기.
export default function Page() {
  return <ResourceLibrary section="series" />;
}
