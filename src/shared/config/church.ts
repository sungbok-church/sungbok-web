// 교회 위치·연락처 — 찾아오시는 길 페이지와 홈 «처음 오신 분께» 가 같은 값을 쓴다.
const MAP_QUERY = encodeURIComponent('성복교회 서울 동대문구 장안벚꽃로 139');

export const CHURCH_LOCATION = {
  address: '서울특별시 동대문구 장안벚꽃로 139',
  addressDetail: '성복교회 예루살렘성전',
  phone: '02-2245-5840',
  phoneHref: 'tel:02-2245-5840',
  /** 지도 검색어(주소로 찾는다) — 구글 지도 임베드에 넘긴다 */
  mapQuery: MAP_QUERY,
  naverMap: `https://map.naver.com/p/search/${MAP_QUERY}`,
  kakaoMap: `https://map.kakao.com/?q=${MAP_QUERY}`,
} as const;
