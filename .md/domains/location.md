# 찾아오시는 길 (`/location`)

처음 오는 분이 **어디로·언제**를 한 페이지에서 본다. 위에 오시는 길(지도·주소·주차·대중교통·전화), 아래에 예배 시간표.

> 지도를 홈에서 이 페이지로 옮긴 배경은 [ADR 0015](../decisions/0015-location-map-to-location-page.md).

## 구성

| 순서 | 내용 | 코드 |
|---|---|---|
| 1 | 오시는 길 | [Directions](../../src/domains/location/components/widgets/Directions/index.tsx) |
| 2 | 예배 시간(`#worship-times`) | [WorshipTimesTable](../../src/domains/home/components/widgets/WorshipTimes/WorshipTimesTable.tsx) — 홈 «이번 주 예배» 와 같은 부품 |

조립: [src/app/(site)/location/page.tsx](../../src/app/(site)/location/page.tsx). 홈에서 오는 링크(히어로 «오시는 길», «이번 주 예배» 의 «찾아오시는 길», «처음 오신 분께» 의 «오시는 길»)는 모두 페이지 맨 위(`/location`)로 온다 — 예배 시간표는 홈에 같은 표가 있다. 시간표로 바로 가는 주소는 `/location#worship-times`.

## 오시는 길 화면 규칙

- **지도**: 구글 지도 임베드(키 없음, 도메인에 묶이지 않음). 약 1.8MB 라 지도 자리가 화면에 들어왔을 때 붙인다([MapEmbed](../../src/domains/location/components/widgets/Directions/MapEmbed.tsx), `useNearViewport(ref, '0px')`). 카카오 지도 API 는 앱 키·도메인 등록이 필요해 도메인 이관 뒤에 검토한다.
- **길찾기는 지도 앱이 맡는다**: «네이버 지도»(주 버튼)·«카카오 지도» 는 새 창으로 연다. 링크에는 화면낭독기용 «(새 창)» 을 붙인다.
- **주소 복사**: 휴대폰에서 주소를 자기 지도 앱·내비게이션에 붙여 넣는 가장 빠른 길. 결과는 화면 아래 알림으로 잠깐 보인다(`useCopyText` + [StatusToast](../../src/shared/components/features/StatusToast/index.tsx) — 예배 영상의 «링크 복사» 와 같은 부품).
- **전화**: 번호는 `tel:` 링크.
- **배치**: lg(1024) 이상은 지도 8 : 정보 카드 4. 그 아래는 지도 카드 → 정보 카드를 한 줄에 하나씩(세 칸으로 나누면 칸이 좁아 시간·역 이름이 단어 중간에서 끊긴다).
- **문구**: 사실만 적는다. 도착 시나리오 멘트(«안내 위원이 자리까지 …»)는 두지 않는다([DESIGN.md](../../DESIGN.md) §2).

## 값의 위치

주소·전화·지도 링크는 [src/shared/config/church.ts](../../src/shared/config/church.ts) 한 곳에 있다. 홈 «처음 오신 분께»(주소 한 줄, 등록 패널의 전화)와 푸터도 같은 값을 쓴다.

## 확인 필요

- 주차(«예배 시간 무료 이용»)·대중교통(«장한평역 도보 7분», «장안초교 정류장»)·응대 시간(«평일 09:00 – 18:00 · 주일 종일 응대») 문구는 홈에 있던 것을 옮긴 것으로 출처를 확인하지 못했다. 기존 사이트의 찾아오시는 길에는 주소·전화·팩스·이메일만 있다. 교회 확인 후 고친다.
