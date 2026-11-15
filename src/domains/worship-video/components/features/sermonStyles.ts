// 영상 화면 부품이 함께 쓰는 값. 조작 부품의 공용 모양(알약·테두리 버튼·포커스 링)은 shared/components/ui/controlStyles.

// 유튜브 썸네일 주소만 next/image 최적화를 거친다(next.config remotePatterns: i.ytimg.com/vi/).
// 다른 호스트·경로 한 장 때문에 화면 전체가 오류로 떨어지지 않게, 밖의 주소는 그대로 싣는다.
export const YT_THUMB = /^https:\/\/i\.ytimg\.com\/vi\//;
