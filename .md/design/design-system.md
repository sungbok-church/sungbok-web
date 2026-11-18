# 디자인 시스템 — 토큰·부품·반응형 기준

> 살아있는 문서. 현재 상태만 적는다. 결정 경위는 [ADR 0009](../decisions/0009-design-system-tokens-responsive.md)와 설계 [2026-11-05-design-system-design.md](../specs/2026-11-05-design-system-design.md).
> 색 값과 대비표는 [color-palette.md](color-palette.md)가 정본이다.

## 원칙

- **어느 화면을 누가 만들어도 같은 사이트로 보이게.** 색·글자 크기·그림자·모션은 이름(토큰)으로 고른다.
- **shadcn 부품은 base-nova 원본(Base UI) 그대로.** 파일 머리에 «shadcn/ui … 원본» 주석이 있는 부품은 원본이고, 다른 점은 그 주석에 적는다. `design:lint` 는 원본을 검사하지 않는다([ADR 0018](../decisions/0018-ui-primitives-base-ui.md)).
- **부품은 의미 토큰, 연출은 B1 토큰.** `src/shared/components/ui/*`는 `bg-primary`·`border-input` 같은 의미 토큰을 쓰고, 공개 사이트의 연출 위젯(히어로·사진 띠·부채·턴테이블·쇼케이스)은 B1 토큰을 쓴다.
- **연출 위젯은 토큰만 지키고 형태는 자유.** 부품 틀에 끼워 맞추지 않는다. 토큰이 안 맞는 연출 고유 값은 같은 줄에 `/* design-lint-ignore: 사유 */`.
- **관리자 화면은 shadcn admin 기준을 따르고 색만 이 사이트 것으로.** 배치·글자 크기·터치 영역·좁은 화면 기준(`md`)·모션은 shadcn 원본 그대로 쓴다([ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md)). 아래 반응형 표의 터치 영역·최소 글씨는 공개 사이트 기준이다.

## 토큰 (`src/app/globals.css` `@theme inline`)

### 글자 크기

| 유틸 | 크기 | 줄 간격 / 굵기 | 용도 |
|---|---|---|---|
| `text-display` | `clamp(36px, 7vw, 54px)` | 1.15 / 700 | 히어로 표어 |
| `text-h1` | `clamp(30px, 5vw, 40px)` | 1.2 / 700 | 페이지 제목 |
| `text-h2` | `clamp(24px, 4vw, 36px)` | 1.25 / 700 | 섹션 제목 |
| `text-h3` | 20px | 1.4 / 600 | 카드·블록 제목 |
| `text-title` | 17px | 1.5 / 600 | 목록 항목 제목 |
| `text-body` | 16px | 1.8 | 본문 |
| `text-body-sm` | 15px | 1.7 | 보조 본문, 표 |
| `text-label` | 14px | 1.4 / 500 | 버튼·탭·배지 **전용 — 본문 금지** |
| `text-caption` | 13px | 1.5 | 날짜·장소 등. **한글 최소 크기** |
| `text-eyebrow` | 12px | 1.2 / (굵기는 요소가 정함), 자간 0.08em | `● WORSHIP` 같은 **라틴 대문자 머리표 전용** |

### 그림자·모션

| 유틸 | 용도 |
|---|---|
| `shadow-sm` | 떠 있는 카드 |
| `shadow-md` | 드롭다운, 떠 있는 버튼 |
| `shadow-lg` | 대화상자, 시트 |
| `duration-fast` 150ms · `duration-base` 250ms · `duration-slow` 400ms | hover, 열고 닫기 |
| `ease-standard` | `cubic-bezier(0.16, 1, 0.3, 1)` (DockNav와 같은 곡선) |

둥글기는 Tailwind 단계(`rounded-sm`~`rounded-3xl`, `rounded-full`)를 쓴다.

## 반응형 기준

| 기준 | 값 |
|---|---|
| 확인 필수 폭 | 375 · 768 · 1280 (헤더는 1024도) |
| 브레이크포인트 | Tailwind 기본 `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 |
| 헤더 PC 메뉴 전환 | `lg`(1024). 태블릿은 메뉴 버튼 + 옆 메뉴 |
| 터치 영역 | 1024 미만 폭(터치 기기)에서 44×44px 이상(문단 안 글 링크 제외) — **공개 사이트 기준**. 관리자는 shadcn 원본 크기를 쓴다(ADR 0016) |
| 최소 글씨 | 한글 13px, 본문 16px, **입력칸 16px**(작으면 아이폰이 화면을 확대한다) |
| 가로 넘침 | 0 |

확인 도구: `pnpm dev` 상태에서 `pnpm design:audit` — 375·768·1024·1280 폭에서 모든 비-placeholder 라우트의 넘침·터치 영역·글씨 크기를 재고 `.design-audit/<폭>/`에 캡처를 남긴다. 옵션 `--widths 375 --routes /,/about/staff`.

## 부품 (`src/shared/components/ui/`)

**견본: 개발 서버에서 `/design`** — 모든 토큰과 부품을 상태별로 보여 준다(운영 빌드에서는 404). 넘겨받는 사람은 여기서 시작한다.

| 묶음 | 부품 | 규칙 |
|---|---|---|
| 버튼 | `Button` variant `default·secondary·outline·ghost·destructive·link`, size `default`(32px)·`lg`(36px)·`sm`(28px)·`xs`(24px)·`icon`(32px) 등 — shadcn base-nova 원본 | 관리자 기준(ADR 0016 · 0018). 공개 화면에서 쓰면 그 화면이 크기를 지정한다(터치 44px) |
| 입력 | `Input`·`Textarea`·`Select`(Base UI 는 `items` 를 넘긴다)·`Checkbox`·`Switch`·`RadioGroup`·`Label`·**`Field`**(`FieldGroup`·`FieldLabel`·`FieldDescription`·`FieldError`·`FieldSet` — 관리자 폼의 기본 틀) | base-nova 원본 값 그대로. 공개 화면의 입력칸은 16px 를 지킨다(그 화면이 지정) |
| 겹침 | `Dialog`·`Sheet`·`DropdownMenu`(base-nova 원본, Base UI)·`toast`(Base UI 알림 — `Toaster` 배치는 처음 쓰는 패키지에서). 여는 버튼은 `render` 속성으로 준다(`<DialogTrigger render={<Button />}>`). 공개 화면에서 사이트 헤더 위로 덮어야 하는 뷰어·바텀시트는 `@base-ui/react/dialog` 를 `z-[60]` 으로 직접 쓴다 — 공용 것은 헤더와 같은 `z-50` | 움직임 줄이기 설정이면 즉시 열고 닫음(`globals.css`) |
| 표시 | `Badge`(base-nova 원본 + 상태 톤 변형 `neutral·accent·success·warning·danger`), `Alert`, `Empty`(빈 목록 — 공개 화면의 자료실·앨범도 쓴다), `Spinner`, `Skeleton`, `Avatar` | 상태 색은 B1 상태 토큰만 |
| 목록 | **`ResponsiveList`** — `md` 이상 표, 그 아래 카드 | 관리자 목록 화면의 기본 틀 |
| 관리자 틀 | **`Sidebar`**(shadcn sidebar 원본) — `md` 이상은 아이콘만 남기고 접히는 왼쪽 메뉴, 그 아래는 시트 | 관리자 전용. 색만 `--sidebar-*` 의미 토큰(→ B1)으로 바꿨다(ADR 0016) |
| 업로드 | **`ImageDropzone`** — 여러 장 선택(휴대폰 카메라·앨범), 미리보기, 앞뒤 이동, 삭제 | UI만. 축소·업로드는 부르는 쪽 |
| 기존 | `Card`·`Tabs`·`Tooltip`·`NavigationMenu`·`Separator`(base-nova 원본), `Table`·`Pagination`(이 사이트 것 — 공개 사이트용. `Pagination` 은 칸 크기를 스스로 44px 로 지정한다) | |

**공개 화면의 목록·열람 조작**(예배 영상·교회소식·자료실이 같이 쓴다 — 연출 위젯이 아니라 B1 토큰을 쓰는 공용 조각):

| 무엇 | 어디 | 규칙 |
|---|---|---|
| 클래스 묶음 `FOCUS`·`PILL`·`OUTLINE_BTN`·`ARROW_BTN`·`HIT_34/36` | `src/shared/components/ui/controlStyles.ts` | 알약(34px)·테두리 버튼·포커스 링. 보이는 크기가 44px 보다 작으면 `HIT_*` 로 누르는 영역을 넓힌다(1024 미만) |
| `ChipRow` — «전체» + 분류 칩 한 줄 | `src/shared/components/features/ChipRow` | 넘치면 옆으로 넘기고 태블릿·PC 는 화살표. 설교 시리즈·주일광고 연도·자료 분류 |
| `ViewerControls` — `PageStepper`·`ZoomControls`·`Segmented`·`ToolButton` | `src/shared/components/features/ViewerControls` | 쪽·장 넘김, 확대 100~300%(`lib/zoomSteps`), 고정 선택 버튼(44px). 휴대폰에서는 버튼 폭을 36px 로 줄여(누르는 영역은 가상 영역으로 44px) 쪽 넘김과 확대가 한 줄에 들어간다 — 360px 미만에서는 배율 숫자를 접는다. 끝에서는 `disabled` 대신 `aria-disabled`(포커스가 빠지지 않게) |
| `StatusToast` — 화면 아래에 잠깐 뜨는 알림 | `src/shared/components/features/StatusToast` | 복사 결과 등. 알림 영역(`role="status"`)은 늘 두고 문구만 끼운다. 문구·시간은 쓰는 곳이 정한다(`lib/hooks/useCopyText` — «링크 복사»·«주소 복사») |

**shadcn 부품을 더 받을 때**: 절차는 `CLAUDE.md` 의 «shadcn 부품 작업» 과 `.claude/skills/shadcn` 을 따른다. 받은 원본은 고치지 않는다 — `import { cn } from 'cn'`(shadcn 이 배포하는 공식 패키지), `dark:` 클래스 모두 그대로 둔다. 원본이 기대는 변형·유틸은 `globals.css` 의 `@import 'shadcn/tailwind.css'` 가 정의한다. (2026-11-05 에는 `cn` import 를 `@/shared/lib/utils` 로 고치고 `dark:` 를 지우라고 적었으나 ADR 0018 로 바뀌었다.)
