// 관리자가 등록하는 내용(자료실·교회소식)이 함께 쓰는 모양.

/** 임시저장(draft)은 공개 화면 어디에도 나오지 않는다 — 각 도메인의 저장소(resourceRepository·newsRepository)가 거른다. */
export type ContentStatus = 'draft' | 'published';
