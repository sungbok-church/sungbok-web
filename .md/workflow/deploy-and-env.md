# 배포와 환경변수 — 운영 절차

**현재 상태**: 셋업 0~5·7~10 완료, 동기화 실측 성공(2026-11-11). 남은 것: 6번 동료 push 게이트·11번 옛 이름 정리·12번 동료 단독 실행. 결정 기록은 [ADR 0011](../decisions/0011-github-org-and-env-source.md), 설계는 [스펙](../specs/2026-11-10-github-org-env-sync-design.md).

## 1. 구조 한 장

```
협업자 ──(Secrets 추가·변경)──▶ GitHub Org / sungbok-web (공개)
                                   │  Settings › Secrets and variables › Actions
                                   │        └─ VERCEL_TOKEN · VERCEL_ORG_ID · VERCEL_PROJECT_ID  (제어용, 소유자가 1회)
                                   │        └─ YOUTUBE_API_KEY                        (앱 변수 — 서버 전용, ADR 0010)
                                   │
   Run workflow(변수 이름 입력) ──▶  Actions: "Sync env to Vercel" (수동)
                                   │   Vercel REST API: POST /v10/projects/{id}/env?upsert=true (production,preview)
                                   ▼
                              Vercel (소유자 Hobby) · 프로젝트 sungbok-web
                                   ▲
   git push ─────────────────────── Vercel Git 연동 자동 배포 (공개 레포라 협업자 커밋도 배포됨)
```

- **환경변수의 정본은 GitHub Secrets.** Vercel 환경변수는 복사본이다. 동기화는 **덮어쓰기만** 한다 — Secrets 에서 지운 변수는 Vercel 에 남는다(정리는 소유자가 대시보드에서).
- 한 번 실행에 변수 하나. 입력한 이름의 Secret 만 읽는다.
- 배포는 지금처럼 Vercel 이 Git 에서 자동으로 한다. 워크플로우는 배포를 건드리지 않는다.
- 워크플로우 파일: [.github/workflows/sync-vercel-env.yml](../../.github/workflows/sync-vercel-env.yml)

## 2. 1회 셋업 체크리스트 (소유자 계정 필요)

- [x] **0. (이전 전) 동료가 지금 레포에 커밋 하나 push → Vercel 이 배포하는지 확인.** ✅ 2026-11-10 확인: 동료(jwkim705) 커밋 7f61c48·80d5bc2·69aacaa 등이 Production 으로 자동 배포 성공(GitHub deployments 기록, vercel[bot]). 공식 문서상 커밋 작성자 제한은 비공개·조직 레포에만 걸리고 개인 계정의 협업자에게는 적용되지 않는다. 배포돼야 정상. 막히면 여기서 멈추고 설계로 돌아간다.
- [x] 1. ✅ 2026-11-10 `sungbok-church`(Free) 생성. GitHub Organization 생성(Free). GitHub › 프로필 메뉴 › Your organizations › New organization.
- [x] 2. ✅ 2026-11-10 `gh api …/transfer` 로 이전, 공개 유지 확인. 레포 이전: `jihkyuo/sungbok-web` › Settings › Danger Zone › **Transfer ownership** → 조직. **공개 유지.** 비공개로 바꾸면 Hobby 는 조직 레포를 배포하지 못한다.
- [x] 3. ✅ 2026-11-10 `jwkim705` 레포 Admin 부여(이전 시 Write 로 따라옴). 조직 멤버 초대는 생성 화면에서 처리. `rladnjs705` 는 Write 유지. 동료를 조직 멤버로 초대하고 레포 **Admin**(또는 조직 Owner) 부여. Secrets 는 Admin 이상만 편집할 수 있다.
- [x] 4. ✅ 2026-11-10 완료. 로컬 remote 갱신: `git remote set-url origin git@github.com:<org>/sungbok-web.git`
- [x] 5. ✅ 2026-11-10 Vercel GitHub App 을 조직에 설치(sungbok-web 만, installation 180468160). 프로젝트 Settings › Git 이 `sungbok-church/sungbok-web` 로 자동 추적되는 것처럼 보였지만 push 가 배포를 만들지 않아 **Disconnect → Connect 로 재연결 필요했음**(Activity log: disconnected jihkyuo/sungbok-web → connected sungbok-church/sungbok-web). Vercel 재연결. 조건: **Vercel 에 연결된 소유자 GitHub 계정이 조직의 Member 이고 레포 Write 이상**(Outside Collaborator 로는 조직 레포를 연결할 수 없다). GitHub › 조직 Settings › GitHub Apps › Vercel 설치(또는 Vercel › Add New › Import 의 "Adjust GitHub App Permissions"). Vercel › 프로젝트 › Settings › Git › Connected Git Repository 가 `<org>/sungbok-web` 인지 확인, 아니면 Disconnect → Connect.
- [ ] **6. 게이트: 소유자 커밋 push → 자동 배포 확인. 동료 커밋 push → 자동 배포 확인.** ✅ 소유자 쪽 2026-11-11 확인: 빈 커밋 db19696 push → 약 40초 뒤 Production 자동 배포 success(GitHub deployments, vercel[bot]). 주의: 기존 커밋을 새 브랜치 이름으로만 push 하면(새 커밋 0개) 배포가 안 생기니 게이트 실측은 반드시 새 커밋으로. ⏳ 동료 쪽: jwkim705 가 `git remote set-url origin git@github.com:sungbok-church/sungbok-web.git` 뒤 커밋 하나 push → 배포 확인 대기. 둘 다 되면 설계 전제가 실측으로 확인된 것. 동료 커밋이 막히면 멈추고 ADR 0011 을 보류한다.
- [x] 7. ✅ 2026-11-11 팀 범위·1년으로 발급해 `VERCEL_TOKEN` 등록. 주의: 팀 범위 토큰은 Vercel CLI 가 못 쓴다(`GET /v2/user` 404 → "Could not retrieve Project Settings", vercel@65.14.0 실측). 그래서 워크플로우는 CLI 대신 REST API 를 직접 부른다 — 토큰을 전체 계정 범위로 넓히지 말 것. Vercel 토큰 발급: Vercel › Account Settings › Tokens › Create. Scope = 소유자 팀, 만료 1년 권장. 만료되면 워크플로우가 실패해서 알게 된다 → 재발급 후 Secret 교체.
- [x] 8. ✅ 2026-11-11 등록(`team_…`·`prj_…` — 비밀값이 아니라 `GET api.vercel.com/v9/projects?search=sungbok` 으로 토큰만 있으면 다시 얻을 수 있다). ID 확보: `VERCEL_ORG_ID` = Vercel › 팀 Settings › General › Team ID. `VERCEL_PROJECT_ID` = 프로젝트 Settings › General › Project ID.
- [x] 9. ✅ 2026-11-11 4개 등록(`YOUTUBE_API_KEY` 값은 Vercel 에 이미 있던 같은 이름 변수의 값을 복사). 주의: `gh secret set NAME` 을 `--body` 없이 여러 줄 한꺼번에 붙여넣으면 stdin 이 비어 **빈 값이 저장**되고 에러도 없다 — 한 줄씩 `--body` 로. GitHub › 레포 Settings › Secrets and variables › Actions › New repository secret 로 4개 등록: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `YOUTUBE_API_KEY`(값은 현재 Vercel 대시보드의 옛 이름 `NEXT_PUBLIC_YOUTUBE_API_KEY` 값과 동일. 당시 코드는 새 이름을 먼저 읽고 없으면 옛 이름을 읽었다 — ADR 0010. 옛 이름 fallback 은 11번에서 제거).
- [x] 10. ✅ 2026-11-11 run 42974766792 `synced: YOUTUBE_API_KEY → production, preview`. 실측: Vercel 에 이미 있던 `YOUTUBE_API_KEY`(5/29, 3환경 한 레코드)는 upsert 로 **production·preview 만 새 레코드로 분리**되고 development 는 옛 레코드에 그대로 남았다(삭제 없음). 같은 push(65cf83f) 의 새 배포 success → `/api/home-video` 200. Actions › Sync env to Vercel › Run workflow › `name` 에 `YOUTUBE_API_KEY` → 실행. 로그에 `synced: YOUTUBE_API_KEY → production, preview` 확인. Vercel › 프로젝트 › Settings › Environment Variables 에서 그 키가 Production·Preview 에 있고, `VERCEL_*` 는 없는지 확인. 원래 있던 다른 변수는 그대로 남는 게 정상. Development 값이 남았는지도 기록해 둔다(문서가 명시하지 않는 부분).
- [ ] 11. ⏳ 2026-11-11 코드 쪽 완료: 옛 이름 fallback 제거 PR(동료). 남은 것: 소유자가 PR 머지 후 Vercel 대시보드에서 `NEXT_PUBLIC_YOUTUBE_API_KEY` 삭제. Redeploy(Vercel › Deployments › 최신 › ⋯ › Redeploy) 또는 아무 커밋 push → **새 배포**에서 홈 영상 섹션이 production·preview 모두 정상인지 확인. 환경변수 변경은 기존 배포에 반영되지 않는다. 새 배포가 정상이면 Vercel 대시보드에서 옛 이름 `NEXT_PUBLIC_YOUTUBE_API_KEY` 를 지우고, 코드의 옛 이름 fallback(`src/shared/api/youtubeApi.server.ts`)도 별도 PR 로 지운다.
- [ ] 12. 동료 계정으로 `YOUTUBE_API_KEY` Secret 값을 바꾸고 Run workflow → Vercel 값이 바뀌는지 확인(소유자 개입 없이). 확인 후 원래 값으로 되돌리고 한 번 더 실행.

끝나면 ADR 0011 상태의 "셋업 검증 대기" 꼬리를 떼고 `채택` 만 남긴다.

## 3. 일상 절차: 변수 추가·변경 (협업자 혼자 가능)

1. GitHub › 레포 Settings › Secrets and variables › Actions 에 Secret 등록 또는 값 갱신. 이름은 그대로 Vercel 환경변수 이름이 된다(**대문자**·숫자·밑줄만. 소문자가 섞이면 워크플로우가 거부한다).
2. Actions › **Sync env to Vercel** › Run workflow › `name` 에 그 이름 입력 › Run. 로그 끝에 `synced: <이름> → production, preview` 가 보이면 성공. 빨간색이면 이름 오타·미등록·토큰 만료 중 하나다(로그의 `::error::` 줄).
3. 반영은 다음 배포부터. 바로 보려면 소유자에게 Redeploy 를 부탁하거나 아무 커밋을 push 한다. 새 배포에서 확인한다.

새 변수를 추가할 때 워크플로우 파일을 고칠 필요는 없다. 코드에서 `process.env.<이름>` 으로 읽는 부분은 별도 PR.

## 4. 로컬 개발

- [`.env.example`](../../.env.example) 을 복사해 `.env.local` 로 저장(커밋되지 않음).
- `YOUTUBE_API_KEY`(서버 전용, `NEXT_PUBLIC_` 없음) 는 **각자** Google Cloud 콘솔에서 발급한다(무료, YouTube Data API v3 활성화 → 사용자 인증 정보 › API 키). 운영 키를 로컬로 돌리지 않는다.
- `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` 는 공개 값이고 코드에 같은 fallback 이 있다.
- `vercel link`·`vercel env pull` 은 쓰지 않는다(`.vercel/` 없음).
- **관리자(`/admin`)는 로컬 Supabase 로 개발한다.** `pnpm db:start` 가 podman(또는 Docker)으로 DB·로그인·REST 만 띄운다(스튜디오·Storage 등은 뺐다 — `package.json` 의 `db:start`). `pnpm supabase status -o env` 의 `API_URL` · `PUBLISHABLE_KEY` 를 `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 에 넣는다(로컬 전용 값). 로그인 계정은 `node scripts/dev-admin-user.mjs <비밀번호>` 로 만든다(`admin@local.test`, «전체 관리» 그룹). 끝나면 `pnpm db:stop`.
- 운영 프로젝트의 값을 `.env.local` 에 넣지 않는다 — 개발 중에 운영 DB 를 건드리게 된다. 운영에 붙여 확인해야 할 때만 `.env.production.local` 에 넣고 `pnpm build && pnpm start` 로 본다.
- 두 값이 없어도 공개 사이트는 빌드되고 열린다. `/admin` 은 로그인 화면에 «설정되지 않았습니다» 를 보여 준다. 다만 DB 를 읽는 화면(설교 영상 · 주보 등)은 비거나 «불러오지 못함» 이 된다. 로컬에서 설교 목록을 보려면 로컬 DB + 만능 키(`SUPABASE_SECRET_KEY`) + `YOUTUBE_API_KEY` 가 다 있어야 재생목록을 받아 둔다(받기는 운영 배포와 로컬 DB 에서만 — preview · 운영 키로 띄운 로컬 서버는 읽기만, 묶음 E).

## 5. 규칙

- **레포는 공개로 유지한다.** 비공개 조직 레포는 Hobby 로 배포할 수 없다.
- **fork 에서 온 PR 의 Vercel 배포를 승인하지 않는다.** 승인하면 그 코드가 preview 환경변수(유튜브 키)를 읽을 수 있다. 협업자는 fork 가 아니라 조직 레포의 브랜치에서 작업한다.
- 레포 Secrets 에는 Vercel 환경변수와 제어용 5개만 둔다: Vercel 동기화용 3개(`VERCEL_TOKEN` · `VERCEL_ORG_ID` · `VERCEL_PROJECT_ID`)와 DB 변경 적용용 2개(`SUPABASE_ACCESS_TOKEN` · `SUPABASE_PROJECT_ID`). 제어용 이름은 워크플로우가 앱 변수로 받지 않는다 — DB 비밀번호가 Vercel 환경변수로 들어가지 않는다.
- Supabase 의 만능 키(`SUPABASE_SECRET_KEY` — GitHub Secret 에 등록됨, 2026-11-20)는 서버 전용이다(`NEXT_PUBLIC_` 없음). Vercel 에는 Sync env to Vercel 로 넣는다. preview 배포도 이 키를 가진다 — fork PR 의 배포를 승인하지 않는 규칙이 이것도 지킨다.
- 운영 전용 표시(묶음 E): `PRODUCTION_WRITES=on` — **production 에만** 넣는다(Sync env to Vercel 의 `targets` 를 `production`, 워크플로우가 preview 를 거절한다). 이 표시가 있는 곳만 운영 DB 를 바꾸는 서버 일(유튜브 재생목록 받기 · 예약 작업)을 한다([sharedDbWrites.server](../../src/shared/api/sharedDbWrites.server.ts)). preview 와 운영 키로 띄운 로컬 서버는 운영 DB 를 보지만 읽기만 한다. Vercel 시스템 변수(`VERCEL_ENV`)에 기대지 않는 까닭: 함수에 오지 않을 수 있다(2026-11-26 운영 실측). 로컬 DB 를 보는 로컬 개발은 표시 없이 된다.
- 예약 작업(설계 6.9): `CRON_SECRET` — 하루 한 번(03:00 한국, `vercel.json` 의 `crons`) Vercel 이 `/api/cron/daily` 를 이 값으로 부른다. 없으면 예약 작업이 401 로 돌지 않는다. GitHub Secret 에 등록하고 Sync env to Vercel 로. 서버 전용(`NEXT_PUBLIC_` 없음). 돌았는지는 Vercel › 프로젝트 › Settings › Cron Jobs(또는 함수 로그의 `[cron daily]`)에서 본다.
- 메일(새가족 알림, 설계 12절 1번): `RESEND_API_KEY` · `MAIL_FROM`(예: `성복교회 <noreply@sungbok.or.kr>`) — 둘 다 있어야 보낸다. **아직 넣지 않았다**(`sungbok.or.kr` 의 DNS 인증 전). 넣을 때는 GitHub Secret 에 등록하고 Sync env to Vercel 로. 서버 전용(`NEXT_PUBLIC_` 없음).
- Supabase 의 만능 키(secret key)와 프로젝트 주소를 코드·문서·로그에 적지 않는다. 주소는 환경변수로만 받는다(프로젝트를 교회 계정으로 옮길 수 있어야 한다).
- Vercel 대시보드에서 환경변수를 직접 고치지 않는다. 정본은 Secrets 다.
- 협업자가 빠지면 Vercel 토큰을 재발급하고 `VERCEL_TOKEN` 을 교체한다. 토큰은 소유자 팀 전체 범위라, 레포 Admin 은 사실상 그 권한을 갖는다.

## 6. DB 변경 적용

DB 는 **정본 두 파일**로만 바꾼다([ADR 0019](../decisions/0019-db-schema-ssot-uuid-v7.md)). 대시보드에서 손으로 만들지 않는다 — 프로젝트를 옮기거나 넘겨받는 사람이 같은 DB 를 다시 만들 수 있어야 한다.

| 파일 | 담는 것 |
|---|---|
| [`supabase/schemas/schema.sql`](../../supabase/schemas/schema.sql) | 구조 — enum · 표 · 인덱스 · 함수 · 트리거 · 행 권한 · GRANT |
| [`supabase/reference.sql`](../../supabase/reference.sql) | 초기 행 — 관리자 메뉴 · 처음 그룹 · 공통코드 묶음 · Storage 버킷 · 첫 관리자 |

`supabase/migrations/` 의 변경 파일은 손으로 쓰지 않는다.

1. 정본을 고친다(로컬 DB 가 켜져 있어야 한다 — `pnpm db:start`).
2. `pnpm db:sync [이름]` — 구조가 바뀌었으면 `<시각>_<이름>.sql`, 초기 행이 바뀌었으면 `<시각>_reference.sql` 을 만든다. 바뀐 것이 없으면 만들지 않는다. 만든 파일을 열어 의도한 변경만 있는지 본다.
3. 로컬에서 확인한다.
   - `pnpm db:reset`: 모든 변경 파일을 처음부터 다시 적용한다. 로컬 계정도 지우므로 `node scripts/dev-admin-user.mjs <비밀번호>` 를 다시 돌린다.
   - `pnpm db:types`: `src/shared/api/supabase/database.types.ts` 를 다시 만든다.
   - `pnpm db:test`: pgTAP. 구조 규칙과 권한을 본다.
   - `pnpm db:advisors`: Supabase 점검 도구. 경고 이상이면 실패한다. 빈 DB 의 «안 쓴 인덱스» 는 정보 수준이라 괜찮다.
   - `pnpm db:probe`: 실제 API 로 공격 시나리오(개인정보 · 권한 표 읽기, 함수 직접 부르기, SQL 인젝션, 위조 토큰, refresh token 재사용)를 돌려 모두 막히는지 본다. 로컬 전용이다.
   - `pnpm typecheck`: enum 이 화면의 TS 타입과 어긋나면 `enumParity.test.ts` 에서 걸린다.
4. main 에 들어간 뒤 Actions › **Apply DB migrations** › Run workflow. 처음에는 `apply` 를 끄고 실행해 적용될 목록을 보고, 맞으면 `apply` 를 켜서 다시 실행한다.

- **코드보다 먼저 적용한다.** production 과 preview 가 같은 운영 DB 를 보므로, 변경 파일은 먼저 적용해도 지금 코드가 깨지지 않게 쓴다: 칸·표를 **추가** → 코드 배포 → 안 쓰는 것 **제거**(다음 변경).
- **만든 변경 파일은 고치지 않는다.**
  - 아직 운영에 적용하지 않았으면: 그 실행이 만든 파일을 **모두**(구조 · 초기 행) 지우고, 정본을 고친 뒤 `pnpm db:sync` 를 다시 돌린다. 하나만 지우면 초기 행 파일이 구조 파일보다 앞서게 되어 적용 순서가 뒤집힌다.
  - 이미 적용했으면: 정본만 고쳐 새 파일을 만든다.
- `reference.sql` 은 여러 번 돌아도 같은 결과여야 하고, 화면에서 바꾼 값(메뉴 이름 · 사용 여부 · 순서, 그룹 권한)을 덮어쓰지 않는다 — 파일 머리의 규칙을 따른다.
- 필요한 Secret: `SUPABASE_ACCESS_TOKEN`(Supabase 계정 › Access Tokens) · `SUPABASE_PROJECT_ID`(프로젝트 ref). DB 비밀번호는 필요 없다 — CLI 가 계정 토큰으로 임시 로그인 역할을 만들어 접속한다(2026-11-18, `link` → `db push --remote --dry-run` 을 운영 프로젝트에 돌려 확인). 토큰이 계정 전체 권한이므로 프로젝트를 교회 계정으로 옮기면 그 계정의 토큰으로 바꾼다.
- CLI 버전은 `package.json` 의 `supabase` 와 워크플로우의 `version` 두 곳에 같은 값으로 고정돼 있다.
- 운영 프로젝트의 가입 차단(Authentication › Sign In / Providers › 새 사용자 가입 허용 끄기)은 대시보드 설정이 정본이다. `supabase/config.toml` 의 `enable_signup = false` 는 로컬 스택용이다.

- **교회 계정으로 옮길 때(나중에)**: 새 프로젝트로 복사하지 않고 Supabase 의 «프로젝트 이전»(Settings › General › Transfer project)을 쓴다(사용자 결정, 2026-11-19). 같은 프로젝트라 주소 · 키 · DB · 파일 · 로그인 계정이 그대로이고, 바꿀 것은 GitHub Secret `SUPABASE_ACCESS_TOKEN`(교회 계정 토큰)뿐이다. 조건: 지금 조직의 owner + 교회 조직의 member 이상, GitHub 연동 · 로그 드레인 없음, 리전은 바꿀 수 없다([공식 문서](https://supabase.com/docs/guides/platform/project-transfer)). 절차 문서와 이전 뒤 확인 명령은 이전할 때 만든다.

## 7. Vercel 방화벽 — 공식 권장만

Vercel 은 운영에서도 **Hobby(무료)** 로 쓴다(유료는 Supabase Pro). Hobby 는 청구가 없는 대신 한 달 한도(CDN 요청 100만 · 함수 호출 100만 · Active CPU 4시간 등, [Hobby 한도](https://vercel.com/docs/plans/hobby))를 넘으면 그 기능이 최대 30일 멈춘다. 방화벽이 막은 요청은 한도에 잡히지 않는다([공식](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing)).

[출시 전 체크리스트](https://vercel.com/docs/production-checklist)가 권하는 것만 한다(공식은 숫자를 정해 주지 않는다). DDoS 차단은 자동이라 할 것이 없다.

- [x] **요청 제한 1개** ✅ 2026-11-23 적용·실측(소유자 토큰으로 REST `PUT /v1/security/firewall/config`, config version 1, rule `rule_rate_limit_api_and_admin_49DL9y`). 조건은 `^/(?:api|admin)(?:/|$)` — `^/(api|admin)/` 는 `/api`·`/admin` 자체를 빠뜨린다. 실측: 캐시 데운 뒤 2.7초 burst 105회 → 99×200 + 6×429(데운 1회 포함 100 허용), 같은 시각 `/` 200, 65초 뒤 200 복귀, 전부 icn1 한 POP. 정정: `/api/home-video` 는 CDN 이 30초 캐시해 함수는 안 돌지만 방화벽은 캐시 **앞**이라 캐시 응답도 센다 — 이 규칙은 함수 보호와 «막힌 요청은 한도에 안 잡힘» 둘 다 노린다. **운영 주의**: 한 공인 IP(교회 와이파이) 뒤에서 홈 탭이 많이 열리면 60초 100건이 모자랄 수 있다(홈은 미리 그려 보내므로 영상 섹션은 보이고 라이브 표시만 1분 늦음). 주일 뒤 Firewall › 이벤트에서 이 규칙의 429 를 **소유자가** 확인하고, 사람 트래픽이면 300/60초로 **올린다**(삭제 아님). 롤백은 같은 PUT 에 `{"firewallEnabled":false,"rules":[]}`(미실행). 팀 범위 토큰은 Vercel CLI 가 못 쓰니 REST 로. 원래 절차: 배포와 상관없이 지금 켤 수 있다. 프로젝트 소유자 계정으로 한다**(체크리스트: «Consider implementing rate limiting»): Vercel › 프로젝트 › Firewall › New Rule › 조건 Request Path · Matches expression · `^/(api|admin)/` → Rate Limit, 대시보드 기본값 그대로(**60초 · 100건**, 기준 IP) → **Too Many Requests(429)**. 요청마다 함수가 도는 곳만 건다 — `/api/*` 와, 요청마다 로그인 확인(`src/proxy.ts`)이 도는 `/admin/*`. 미리 만든 공개 페이지는 CDN 이 답한다. Hobby 는 요청 제한 규칙이 1개라 두 경로를 정규식 조건 하나로 묶는다(조건을 둘 걸면 «둘 다 맞아야» 라 아무것도 안 걸린다). 공식 예시도 API 경로에 거는 방식이다([요청 제한](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)).
- [x] **켜져 있는지 확인만** ✅ 2026-11-23 API 로 확인(`ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`, `resourceConfig.fluid=true`): 배포 보호(Deployment Protection — 2023-11 이후 새 프로젝트는 기본 켜짐), Fluid compute(체크리스트 «비용» 항목).
- **공격받을 때**: Firewall › **Attack Challenge Mode** 를 1 · 6 · 24시간 켠다([Attack Mode](https://vercel.com/docs/vercel-firewall/attack-mode)) — 사람과 화면의 API 호출, 확인된 검색 · 미리보기 봇은 통과한다.

배포 뒤 `/api/home-video` 가 CDN 에서 답하는지 확인(도메인은 운영 주소로):

```bash
curl -sI https://<도메인>/api/home-video | grep -i -E '^(x-vercel-cache|age):'   # 두 번째부터 HIT, age 는 30 미만
```

## 8. 알려진 제약

- 삭제 동기화 없음. Secrets 에서 지운 변수는 Vercel 에서 소유자가 지운다.
- production·preview 에 같은 값이 들어간다. 환경별로 달라야 하는 변수가 생기면 접미사 규약(예: `X_PREVIEW`)으로 워크플로우를 확장한다.
- 첫 동기화 때 대시보드에서 만든 3-타깃(production·preview·development) 레코드가 어떻게 재편되는지는 문서가 명시하지 않는다. 체크리스트 10번에서 기록.
- 유튜브 키는 서버 전용이다(`import "server-only"`, ADR 0010). 브라우저 번들에 실리지 않으므로 Google Cloud 에서 "YouTube Data API v3 만 허용" 제한을 걸 수 있다. HTTP 리퍼러 제한은 서버 호출이라 걸지 않는다.
- 관리자·백엔드(ADR 0008, Supabase)의 앱 변수는 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 다(만능 키는 필요해지는 패키지에서 추가). 같은 절차로 동기화한다. ADR 0008 은 Vercel 계정을 교회 명의로 두기로 했는데, 그때는 제어용 Secret 3개(`VERCEL_TOKEN`·`VERCEL_ORG_ID`·`VERCEL_PROJECT_ID`)만 새 계정 것으로 바꾸면 된다. 이 구조는 Vercel 계정이 누구 것이든 같다.

## 9. 관리자 비밀번호 찾기 — Supabase 대시보드 설정 (소유자)

> **지금은 꺼 두었다(2026-11-23 사용자)** — 메일 서비스(Resend)를 Supabase SMTP 에 붙일 때 아래를 함께 하고 `src/domains/admin/lib/passwordReset.ts` 의 `PASSWORD_RESET_ENABLED` 를 `true` 로 바꾼다. 그 전까지 비밀번호를 잊은 사람은 사용자 상세의 «비밀번호 초기화»(임시 비밀번호).

관리자가 잊은 비밀번호를 스스로 다시 정하는 흐름(`/admin/login/forgot` → 메일 → `/admin/login/confirm` → `/admin/password`, [admin.md](../domains/admin.md) «로그인 흐름» 5번)은 코드가 끝나 있다. 운영에서 돌게 하려면 소유자가 운영 프로젝트 대시보드에서 아래를 한 번 한다. 코드는 바꾸지 않는다.

- [ ] 1. **Authentication › URL Configuration**
  - **Site URL**: `https://sungbok-web.vercel.app` (교회 도메인으로 옮기면 그 주소로 바꾼다). 메일의 링크가 이 주소로 만들어진다 — 미리보기 배포에서 요청해도 링크는 운영으로 간다.
  - **Redirect URLs** 에 `https://sungbok-web.vercel.app/admin/login/confirm` 을 더한다(도메인을 옮기면 새 주소도). 우리 메일 양식은 Site URL 로 링크를 만들어 이 목록을 쓰지 않지만, 양식을 바꾸기 전의 기본 링크가 여기로 돌아온다.
- [ ] 2. **Authentication › Emails › Templates › Reset password**(비밀번호 재설정)
  - 제목: `[성복교회 관리자] 비밀번호 찾기`
  - 본문: [supabase/templates/recovery.html](../../supabase/templates/recovery.html) 의 내용을 그대로 붙인다. 핵심은 링크 한 줄이다:
    `{{ .SiteURL }}/admin/login/confirm?token_hash={{ .TokenHash }}&type=recovery`
  - 기본 양식(`{{ .ConfirmationURL }}`)을 그대로 두면 메일을 **요청한 브라우저에서만** 링크가 열린다(PC 에서 요청하고 휴대폰에서 열면 «링크가 만료됐습니다»). 반드시 바꾼다.
- [ ] 3. **Authentication › Sign In / Providers › Email** 의 «Email OTP Expiration» 이 `3600`(1시간)인지 본다 — 메일 문구가 «1시간 뒤에 만료됩니다» 라서다. 다르게 두면 양식의 문구도 맞춘다.
- [ ] 4. 확인: 운영 로그인 화면 › «비밀번호를 잊으셨나요?» › 프로젝트 팀 구성원인 자기 주소로 요청 → 메일의 링크를 **다른 기기**에서 열어 비밀번호 바꾸기 화면이 뜨는지, 새 비밀번호로 로그인되는지 본다.

**메일 발송의 한계(2026-11-23, Supabase 공식 문서 [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) 확인)**: 사용자 정의 SMTP 를 붙이기 전의 기본 메일은 **프로젝트 팀(조직 구성원) 주소에만** 가고(그 밖의 주소는 «Email address not authorized» 로 거절), **시간당 2통**이며, 운영용이 아니다(전달 보장 없음). 그래서 지금은 대시보드 팀에 든 사람만 스스로 찾을 수 있다 — 화면은 계정이 있는지 드러내지 않으려고 이 거절도 «보냈습니다» 로 답한다(원인은 Vercel 함수 로그의 `[requestPasswordReset]`). 다른 관리자에게도 메일이 가려면 Resend(교회 도메인 DNS 인증)를 **Authentication › Emails › SMTP Settings** 에 넣는다 — 넣으면 처음 한도는 시간당 30통이고 **Authentication › Rate Limits** 에서 바꾼다. 그 전까지 팀 밖 관리자는 지금처럼 «전체 관리» 담당자가 비밀번호를 초기화한다(설계 12절 1 · 2번).

## 10. «전체 관리» 구성원 넣고 빼기 — Supabase 대시보드 SQL 편집기 (소유자)

«전체 관리» 소속은 관리자 화면에서 아무도 — «전체 관리» 도 — 바꾸지 못한다(2026-11-23 결정, 설계 6.4 ⑥ — «전체 관리» 계정을 빼앗겨도 새 «전체 관리» 를 만들지 못하게). 바꿀 때는 소유자가 운영 프로젝트 대시보드 **SQL Editor** 에서 한다(로그인한 세션이 아니라 `auth.uid()` 가 비어 있어 `guard_user_groups` 가 통과시킨다). 넣을 사람은 먼저 화면에서 계정을 만들어 둔다.

```sql
-- 1) 사람 찾기
select id, name, email, is_active from public.profiles where email = 'someone@example.com';

-- 2) 넣기
insert into public.user_groups (user_id, group_id)
select p.id, g.id from public.profiles p, public.groups g
 where p.email = 'someone@example.com' and g.is_system;

-- 3) 빼기
delete from public.user_groups ug
 using public.profiles p, public.groups g
 where ug.user_id = p.id and ug.group_id = g.id
   and p.email = 'someone@example.com' and g.is_system;
```

- 잠김 방지(`ensure_admin_remains`)는 여기서도 걸린다 — 빼서 활성 구성원이 0명이 되면 거절된다(다른 사람을 먼저 넣는다).
- 변경 이력에는 «누가» 가 «시스템» 으로 남는다. 언제 · 왜 바꿨는지는 따로 적어 둔다.
