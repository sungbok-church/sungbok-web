# ADR 0017: 관리자는 next-shadcn-dashboard-starter 를 참고하고, 폼은 TanStack Form 으로 한다

**상태**: 채택 — 3번(UI 기반은 Radix 유지)만 대체됨 (→ ADR 0018)
**날짜**: 2026-11-18
**관련 문서**: [ADR 0012](0012-date-temporal-and-admin-libraries.md)(폼 라이브러리 부분을 이 결정이 대체) · [ADR 0016](0016-admin-ui-follows-shadcn.md) · [domains/admin.md](../domains/admin.md) · [specs/2026-11-17-admin-design.md](../specs/2026-11-17-admin-design.md)

## 배경

[ADR 0016](0016-admin-ui-follows-shadcn.md) 에서 관리자 화면을 shadcn admin 기준으로 만들기로 했다. 처음 떠올린 참고 대상(`satnaing/shadcn-admin`)은 React + Vite 프로젝트라 이 프로젝트(Next.js App Router)와 구조가 다르다. 사용자가 `Kiranism/next-shadcn-dashboard-starter` 를 대신 지목했다.

2026-11-18 에 그 저장소를 확인했다: Next.js 16 App Router · MIT · 활발히 갱신 중. 틀은 shadcn sidebar 부품 + 쿠키로 접힘 상태 유지(이 프로젝트가 이미 만든 것과 같은 뼈대), 목록은 TanStack Table + 주소 쿼리(nuqs), 폴더는 `features/<이름>/{api, components, schemas}`. 한편 로그인은 Clerk, UI 기반은 Base UI, 폼은 **TanStack Form** 이고 Sentry · 명령 팔레트 · 칸반 · 차트 · 다크 모드 · AI 채팅이 들어 있다.

[ADR 0012](0012-date-temporal-and-admin-libraries.md) 는 관리자 폼을 react-hook-form + `@hookform/resolvers` 로 정했다(아직 설치하지 않았고 쓰는 코드도 없다).

## 결정

1. **참고 대상은 `next-shadcn-dashboard-starter` 다.** 저장소를 통째로 들이지 않고 구조와 화면 패턴을 가져온다 — 틀의 세부, 목록 화면(TanStack Table + 주소 쿼리), 폼 화면 배치, 기능별 폴더 구조.
2. **폼은 TanStack Form 으로 한다**(`@tanstack/react-form`). ADR 0012 의 react-hook-form 선택을 대체한다. 검증 스키마는 그대로 zod 다.
3. **UI 기반은 Radix 를 유지한다.** `src/shared/components/ui/*` 30여 개가 Radix 위에 있고 화면에 보이는 차이가 없다. 스타터에 있고 여기에 없는 부품은 스타터의 파일을 복사하지 않고 shadcn CLI 로 Radix 판을 받는다(같은 부품이 두 벌이 되지 않게).
4. **가져오지 않는 것**: Clerk(로그인은 Supabase Auth 로 이미 있다), Sentry, AI 채팅, 결제.
5. **필요해질 때 가져오는 것**: 명령 팔레트, 칸반(끌어 옮기기), 차트. 각각 독립된 덩어리라 나중에 넣어도 비용이 같다.
6. **다크 모드는 지금 만들지 않되 나중에 켤 수 있게 만든다**: 관리자 화면은 색을 shadcn 의미 토큰(`bg-background` · `text-foreground` · `bg-card` · `border` · `text-muted-foreground` · `--sidebar-*`)으로만 쓴다. B1 토큰을 화면에 직접 박지 않는다 — 그래야 어두운 값 한 벌을 더하는 것만으로 켤 수 있다.

## 대안 비교

| 무엇 | 탈락한 안 | 이유 |
|---|---|---|
| 참고 대상 | `satnaing/shadcn-admin` | React + Vite — 라우팅·서버 컴포넌트·Server Action 이 없어 옮겨 적을 것이 많다 |
| 들이는 방식 | 스타터를 통째로 복제해 그 위에 얹기 | Clerk · Sentry · Base UI 부품이 따라오고, 이미 있는 공개 사이트·디자인 토큰·공용 부품과 겹친다 |
| 폼 | react-hook-form 유지(ADR 0012) | 스타터의 폼 화면이 TanStack Form 으로 쓰여 있어 매번 옮겨 적어야 한다. 아직 설치 전이라 지금 바꾸는 비용이 0 이다 |
| UI 기반 | Base UI 로 전환 | 공용 부품 30여 개를 다시 써야 하고 화면은 그대로다. 공개 사이트도 같은 부품을 쓴다 |
| 부가 기능 | 명령 팔레트 · 칸반 · 차트를 지금 전부 넣기 | 쓰는 화면이 생기기 전에는 쓰이지 않는 코드와 의존성을 관리하게 된다(갱신 · 보안 패치 · 린트) |

## 영향

- 두 폼 라이브러리의 차이: 둘 다 폼의 값 · 검증 · 오류 · 제출 상태를 관리한다. react-hook-form 은 더 오래되고 사용처가 많다. TanStack Form 은 TanStack Table · Query 와 같은 곳에서 만들며, 칸 이름과 값의 타입 추론이 더 엄격하고 zod 스키마를 연결 패키지 없이 받는다. 쓰는 문법이 달라 한 프로젝트에서 섞지 않는다.
- 스타터의 화면 코드는 Base UI 문법(`render` 속성 등)을 쓰는 곳이 있어, 가져올 때 Radix 문법(`asChild`)으로 옮겨 적는다.
- 공개 쪽 ↔ 관리자 lint 경계의 금지 목록에 `@tanstack/react-form` 을 넣는다(react-hook-form 도 그대로 둔다 — 실수로 들이는 것을 막는다).
- 로그인 화면은 지금 폼 라이브러리 없이 `useActionState` 로 돼 있다. 칸이 둘뿐이라 그대로 둔다.
