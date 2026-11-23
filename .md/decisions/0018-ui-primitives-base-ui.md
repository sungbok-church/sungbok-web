# ADR 0018: UI 기반을 Radix 에서 Base UI 로 바꾸고, shadcn 부품은 base-nova 원본을 쓴다

**상태**: 채택
**날짜**: 2026-11-18
**관련 문서**: [ADR 0016](0016-admin-ui-follows-shadcn.md) · [ADR 0017](0017-admin-reference-next-starter-and-tanstack-form.md)(3번 «Radix 유지» 를 이 결정이 대체) · [design/design-system.md](../design/design-system.md) · [domains/admin.md](../domains/admin.md)

## 배경

공용 부품(`src/shared/components/ui/*`) 26개 중 15개가 Radix 위에 있었다(드롭다운·대화상자·시트·셀렉트·탭·툴팁 등의 동작). [ADR 0017](0017-admin-reference-next-starter-and-tanstack-form.md) 은 관리자의 참고 대상을 `next-shadcn-dashboard-starter` 로 정하면서, 스타터가 Base UI 를 쓰는데도 «바꾸는 품이 든다» 는 이유로 Radix 를 유지하기로 했다.

사용자가 «Base UI 가 있는데 Radix 를 써야 하는 이유가 뭔가» 를 물어 다시 따졌다.

- Radix 를 써야 할 기술적인 이유는 없다. shadcn 은 2026-07 부터 새 프로젝트의 기본을 Base UI 로 두었다(Radix 도 계속 지원한다).
- 스타터의 화면 코드는 Base UI 문법(`render` 속성 등)이다. Radix 에 남으면 가져올 때마다 옮겨 적는다.
- 실제 범위는 작았다. 공개 화면이 Radix 를 쓰는 곳은 주보·앨범의 «크게 보기»(`ImageViewer`)와 주보 고르기 시트(`BulletinPage`) 두 곳뿐이고, 관리자는 틀과 로그인만 있는 시점이다.

## 결정

1. **UI 기반을 Base UI(`@base-ui/react`)로 바꾼다.** `radix-ui` 의존성을 뺀다.
2. **shadcn 부품은 `base-nova` 스타일 원본을 그대로 쓴다**(스타터와 같은 스타일). `components.json` 의 `style` 을 `base-nova` 로 둔다. 대상(처음 20개, 뒤에 `alert` · `empty` · `field` · `spinner` · `toast` 추가): `avatar` · `badge` · `button` · `card` · `checkbox` · `dialog` · `dropdown-menu` · `input` · `label` · `navigation-menu` · `radio-group` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` · `switch` · `tabs` · `textarea` · `tooltip`.
3. **원본과 다르게 두는 것은 파일 머리 주석에 적는다.** 지금은 한글 문구, `badge` 의 상태 톤 변형 5개, `sidebar` 의 화면 폭 훅과 `SidebarMenuSkeleton` 제거뿐이다.
4. **shadcn 에 같은 것이 있는 부품은 shadcn 것으로 바꾼다**(스킬 규칙): `form-field` → `field`, `empty-state` → `empty`, `sonner` → `toast`. 지운 셋 말고 이 사이트가 만든 것은 그대로다: `responsive-list` · `image-dropzone` · `table` · `pagination` · `controlStyles` · `focusRing`. (2026-11-23: `pagination` 과 그 위의 `features/Pagination` · `features/Table` 은 쓰는 곳이 없어 지웠다 — 관리자 쪽 넘기기는 `AdminTable` 안에 있다.)
5. **`design:lint` 는 원본 부품을 검사하지 않는다.** `src/shared/components/ui` 의 파일 머리에 «shadcn/ui … 원본» 주석이 있으면 면제한다(원본에는 임의 둥글기·글자 크기가 들어 있다). 주석이 없는 부품은 그대로 검사한다.
6. **원본이 기대는 CSS 를 함께 들인다**: `globals.css` 에서 `@import 'shadcn/tailwind.css'`(shadcn 패키지가 배포하는 공식 파일)를 불러온다. 원본 부품의 `data-horizontal:` · `data-active:` · `data-open:` 같은 변형과 `no-scrollbar` 같은 유틸이 여기서 정의된다 — 빠지면 오류 없이 구분선이 안 보이고, 탭이 가로로 놓이고, 꺼진 메뉴 항목까지 켜진 모양이 된다(처음에 빠뜨렸다가 검토에서 잡혔다).
7. **`dark:` 클래스는 `.dark` 가 붙었을 때만 켠다**(`globals.css` 의 `@custom-variant dark`). 원본 부품에 `dark:` 클래스가 들어 있어, 이 줄이 없으면 기기의 다크 설정에 따라 부품만 어두운 값으로 바뀐다.

## 대안 비교

| 안 | 결과 |
|---|---|
| Radix 유지(ADR 0017 의 3번) | ✗ 스타터 코드를 가져올 때마다 옮겨 적는다. shadcn 의 기본 방향과도 어긋난다. 화면이 쌓일수록 바꾸는 비용이 커진다 |
| Base UI 로 바꾸되 부품의 지금 모양(44px 등)을 다시 입힌다 | ✗ 부품마다 손으로 합쳐야 하고, 관리자는 원본 그대로 쓴다는 ADR 0016 과 어긋난다 |
| **Base UI + base-nova 원본** | ✓ 채택(사용자 결정) |

## 영향

- **공용 부품의 크기가 원본 값이 됐다**: 버튼 기본 32px(전에는 44px), 입력칸 32px, 글자 `text-sm` 등. 관리자는 이것이 맞다(ADR 0016). 공개 화면에서 이 부품을 쓰게 되면 그 화면이 크기를 지정한다 — 공개 사이트의 디자인 바(터치 44px · 입력칸 16px)는 그대로다.
- **쓰는 쪽 문법**: `asChild` 가 없어지고 `render` 속성을 쓴다(`<DialogTrigger render={<Button />}>열기</DialogTrigger>`). 드롭다운의 라벨은 그룹 안에 두고, 항목의 동작은 `onClick` 으로 준다.
- **공개 화면의 두 대화상자**(`ImageViewer` · `BulletinPage`)는 Base UI Dialog 를 직접 쓴다(사이트 헤더 위로 덮어야 해서 `z-[60]`). 닫을 때의 포커스 복귀는 `finalFocus` 로 준다. 2026-11-18 에 브라우저로 열기 · 장 넘김 · Esc 닫기 · 포커스 복귀를 확인했다.
- **상태 선택자**: `data-[state=open]` · `data-[state=closed]` 대신 `data-open` · `data-closed` 를 쓴다. «동작 줄이기» 가드(`globals.css`)도 이 속성들을 잡도록 고쳤다.
- **부품을 더 받을 때**: `pnpm dlx shadcn@latest add <이름>` 은 이미 있는 부품을 덮어쓸 수 있다 — `--dry-run` 과 `--view` 로 먼저 보고, 받은 파일에는 머리 주석을 단다. `cn` 은 원본대로 `cn` 패키지에서 가져온다(처음에는 import 를 `@/shared/lib/utils` 로 고쳐 썼으나 원본대로 되돌렸다). 이 사이트가 만든 코드는 글자 크기 토큰을 아는 `utils` 의 `cn` 을 쓴다. 절차는 `CLAUDE.md` 의 «shadcn 부품 작업» 에 있다.
- **shadcn 스킬을 프로젝트에 넣었다**(`.claude/skills/shadcn`, `skills-lock.json` 으로 고정): 에이전트가 부품을 쓸 때 따르는 규칙이다. 이전용 스킬(`migrate-radix-to-base`)은 이전이 끝나 넣지 않았다. 이 규칙에 맞춰 로그인 화면을 `Card` · `FieldGroup` · `Field` · `Alert` 로 바꿨다(`field` · `alert` 부품 추가).
- **shadcn 의 공식 이전 안내와 대조했다**: shadcn 은 이 이전을 위한 에이전트 스킬(`npx skills add shadcn/ui` 뒤 «migrate <부품> to base-ui»)을 낸다. 이번 작업은 그 스킬 없이 했고, 끝난 뒤 스킬의 대응표(`skills/migrate-radix-to-base` — 호출부 속성 · 대화상자 · 메뉴)로 대조했다. 대응은 맞았다. 다른 점은 둘이다: ① 스킬은 `new-york` 같은 옛 스타일이면 «모양은 그대로 두고 기반만 바꾸라» 고 하는데, 여기서는 일부러 base-nova 원본으로 모양까지 바꿨다(결정 2번). ② 스킬은 부품 하나씩 커밋하라고 하는데, 한 번에 바꿨다.
- **스킬이 짚는 동작 차이**(컴파일은 되지만 다르게 움직인다): 탭은 화살표 키로 옮겨도 바로 바뀌지 않고 Enter·Space 로 고른다(Base UI 기본값 — 바로 바뀌게 하려면 `TabsList` 에 `activateOnFocus`), 내비게이션 메뉴의 올려놓음 지연이 200ms → 50ms, 메뉴의 체크·라디오 항목은 눌러도 메뉴가 닫히지 않는다. 지금 이 부품들을 쓰는 화면은 없다 — 처음 쓰는 화면에서 확인한다.
- `/design` 견본 페이지와 [design-system.md](../design/design-system.md) 의 부품 표를 새 크기에 맞게 고쳤다.
