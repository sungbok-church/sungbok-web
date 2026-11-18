# 성복교회 웹사이트

Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 기반 교회 웹사이트.

## Git 작업 규칙 (중요)

**스테이징·커밋·푸시 등 모든 git 변경은 사용자가 명시적으로 지시할 때만 수행한다. 스스로 판단해 `git add`(스테이징) 하지 않는다.**

- "스테이징해" 같은 지시는 그 시점의 변경에만 적용된다. 이후 코드를 더 수정해도 **지시 없이 다시 스테이징하지 않는다.**
- 작업(버그 수정·기능 추가 등)을 끝낸 뒤에도 git 인덱스에 손대지 않는다. 변경 사항만 보고하고 사용자의 다음 지시를 기다린다.
- 이 저장소는 여러 세션에서 동시에 커밋/리셋될 수 있으니, 임의의 git 조작은 더더욱 금지.

## 문서 위치

모든 프로젝트 문서는 `.md/` 디렉토리에 정리되어 있습니다.

- **인덱스**: [.md/README.md](.md/README.md) — 전체 문서 목록 + 추가/수정 규칙

새 문서를 만들기 전에 인덱스를 먼저 확인하세요. 카테고리·네이밍·동기화 규칙이 모두 거기 있습니다.

> 예외: [DESIGN.md](DESIGN.md) 만 **루트**에 둡니다 — gstack `/design-review` 가 레포 루트에서 이름 고정으로 탐색하기 때문. 디자인 바(채점 기준) 정본이며, 토큰 수치 표는 `.md/design/color-palette.md` 를 참조합니다.

## 작업 시 주의

### 디자인 시스템 변경
컬러·타이포·간격 등 디자인 토큰을 [src/app/globals.css](src/app/globals.css) 에서 변경하면 반드시 `.md/design/` 의 짝이 되는 문서도 함께 업데이트하세요.

| 코드 | 짝이 되는 문서 |
|------|----------------|
| `src/app/globals.css` 팔레트 토큰 | [.md/design/color-palette.md](.md/design/color-palette.md) |

### 시안(디자인 변형) 작업
레이아웃·효과·인터랙션 시안을 탐색·비교할 때는 [.md/workflow/prototype-preview.md](.md/workflow/prototype-preview.md) 의 방식을 따르세요. 프리뷰 라우트 컨벤션·전용 dev 포트·재사용 헬퍼·확정 후 정리 규칙이 모두 거기 있습니다.

### 디자인 QA
완성된 UI는 루트 [DESIGN.md](DESIGN.md) 의 바(토큰 규율·카피 톤·모션 바·한글 타이포·a11y·subtraction)에 맞춰 점검합니다. 3단으로 자동화돼 있습니다:
- **커밋 직전**: `pnpm design:lint --diff` 가 신규 색 하드코딩을 차단(레거시는 `.design-lint-baseline` 으로 grandfather, 토큰 없는 1회성은 같은 라인에 `/* design-lint-ignore: 사유 */`). 전체 리포트는 `pnpm design:lint`.
- **작업 종료**: UI 변경이 임계를 넘으면 [.claude/hooks/auto-design-review.sh](.claude/hooks/auto-design-review.sh) 가 `/design-qa`(또는 `design-reviewer` 서브에이전트) 실행을 권유.
- **승격 마일스톤**: 프리뷰 승자를 정식 위젯으로 올린 직후, gstack `/design-review` 로 라이브 감사(런타임 모션·대비 확정). 시점은 prototype-preview §E 참조.

### 중요 의사결정 기록
스택 전환, 팔레트 교체, 라우팅 구조 변경 등 되돌리기 어려운 결정은 `.md/decisions/` 에 ADR(Architecture Decision Record) 형식으로 기록하세요. 양식과 번호 컨벤션은 [.md/README.md](.md/README.md) 참조.

### shadcn 부품 작업 (관리자 화면)
관리자(`/admin`)는 shadcn 부품(base-nova · Base UI)을 원본 그대로 쓴다([ADR 0016](.md/decisions/0016-admin-ui-follows-shadcn.md) · [0018](.md/decisions/0018-ui-primitives-base-ui.md)). 부품을 쓰거나 더할 때는 **`shadcn` 스킬**([.claude/skills/shadcn](.claude/skills/shadcn/SKILL.md))의 규칙을 따른다 — 스킬에 적힌 방식이 권장 방식이고, 다르게 할 이유가 있으면 먼저 묻는다. 예: 폼은 `FieldGroup` + `Field`, 안내 상자는 `Alert`, 빈 목록은 `Empty`, 알림은 `toast`, 기다리는 버튼은 `Spinner`, 여는 버튼은 `render` 속성(링크로 그리면 `nativeButton={false}`), 항목은 그룹 안에, 부품의 색·글자를 `className` 으로 덮어쓰지 않는다, 부품 안 아이콘에 크기를 주지 않는다. 스킬은 `skills-lock.json` 으로 고정돼 있고 `pnpm dlx skills@latest update` 로 갱신한다(파일을 손으로 고치지 않는다).

이 프로젝트에서만 지키는 것:
- **받기 전에 본다.** `pnpm dlx shadcn@latest add <이름> --dry-run` 으로 덮어쓸 파일을 확인하고 `--view` 로 내용을 본다. 이미 있는 부품을 `--overwrite` 하지 않는다.
- **`cn` 은 두 가지다.** shadcn 원본 부품은 원본대로 `cn` 패키지에서 가져온다(`import { cn } from 'cn'` — 받은 파일을 고치지 않는다). 이 사이트가 만든 코드(화면 · 공개 사이트 부품)는 `@/shared/lib/utils` 의 `cn` 을 쓴다 — 이 사이트의 글자 크기 토큰(`text-body-sm` 등)을 아는 판이다.
- **머리 주석을 단다.** 파일 첫머리에 «shadcn/ui 부품(base-nova · Base UI) 원본 — … 원본과 다른 곳: …» 을 적는다. `design:lint` 가 이 주석이 있는 `ui` 부품을 건너뛴다. 원본을 고쳤으면 그 주석에 무엇을 고쳤는지 적는다.
- **`globals.css` 의 `@import 'shadcn/tailwind.css'` 를 지우지 않는다.** 원본 부품의 상태 모양(`data-active:` · `data-horizontal:` 등)이 여기서 정의된다 — 빠지면 오류 없이 모양만 깨진다.
- **공개 사이트는 대상이 아니다.** 공개 화면은 [DESIGN.md](DESIGN.md) 의 바(터치 44px · 입력칸 16px · B1 토큰)를 그대로 따른다.

## 코딩 컨벤션

- **패키지 매니저**: pnpm
- **도메인 분리**: `src/domains/<domain>/components/{features,widgets}` 구조
- **공유 컴포넌트**: `src/shared/components/`
- **전역 토큰만 사용**: 컬러·폰트·반경 등은 `src/app/globals.css` 의 `@theme inline` 블록 토큰을 Tailwind 유틸(`bg-b1-accent`, `text-b1-sub` 등)로 참조. 컴포넌트 내 HEX 하드코딩 지양.
- **단어 줄바꿈**: 한글 가독성을 위해 `globals.css` 에 `word-break: keep-all` 적용됨. 헤딩은 `text-wrap: balance`.
- **TDD (로직 한정)**: 디자인/UI는 테스트 강제 없음. 다만 **로직 모듈**(camelCase `.ts`·`.tsx`, `use*` 훅 — 순수함수·데이터변환·분기 등)은 RED-first로 작성한다: 실패 테스트 먼저 → `pnpm test` 로 RED 확인 → 구현해서 GREEN. 신규 로직 파일은 형제 테스트가 없으면 `.claude/hooks/tdd-guard.sh` 가 생성을 차단한다(기존 파일 수정은 알림만). 순수 데이터/상수 파일은 대상 아님.
