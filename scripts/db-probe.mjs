// pnpm db:probe — 로컬 스택(pnpm db:start)에 실제 API 로 공격 시나리오를 돌려 막히는지 본다.
//   방문자(공개 키) · 권한 없는 계정 · 콘텐츠 담당으로 개인정보 · 권한 표 읽기, 함수 직접 부르기, SQL 인젝션,
//   위조 토큰, 로그인 응답으로 계정 존재 알아내기, refresh token 재사용.
// DB 를 바꾼 뒤(pnpm db:reset 다음) 돌린다. 로컬 전용 — 주소가 127.0.0.1 · localhost 가 아니면 거부한다.
// 시험 계정(probe-*@local.test)과 시험 데이터는 끝나면 지운다. 키는 출력하지 않는다.
// 로컬은 Storage 서비스를 빼고 띄우므로 Storage 권한은 여기서 보지 않는다(.md/workflow/deploy-and-env.md 6절).
import { execFileSync } from 'node:child_process';
const env = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const read = n => env.match(new RegExp(`^${n}="?([^"\\n]*)"?$`, 'm'))?.[1];
const API = read('API_URL'),
  ANON = read('PUBLISHABLE_KEY') ?? read('ANON_KEY'),
  ADMIN = read('SECRET_KEY') ?? read('SERVICE_ROLE_KEY');
if (!API || !ANON || !ADMIN) {
  console.error('로컬 Supabase 가 켜져 있지 않습니다 — pnpm db:start');
  process.exit(1);
}
const { hostname } = new URL(API);
if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
  console.error(`로컬 주소가 아닙니다(${hostname}) — 이 점검은 로컬 DB 에서만 돌린다.`);
  process.exit(1);
}
const sql = q =>
  execFileSync(
    'podman',
    ['exec', '-i', 'supabase_db_sungbok-web', 'psql', '-U', 'postgres', '-tA', '-c', q],
    { encoding: 'utf8' }
  ).trim();
const results = [];
const check = (name, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const req = async (path, { token = ANON, method = 'GET', body, headers = {} } = {}) => {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body && JSON.stringify(body),
  });
  let j = null;
  try {
    j = await r.json();
  } catch {}
  return { status: r.status, body: j };
};
const rows = r => (Array.isArray(r.body) ? r.body.length : -1);

// 준비: 새가족 1건, 계정 2개(권한 없음 · 콘텐츠 담당)
sql(
  `insert into public.newcomers (intent,name,phone,consent_at,consent_version) values ('REGISTER','탈취대상','010-9999-8888',now(),'t')`
);
const mk = async email => {
  await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: ADMIN,
      Authorization: `Bearer ${ADMIN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: 'probe-pass-1234', email_confirm: true }),
  });
  const r = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'probe-pass-1234' }),
  });
  const j = await r.json();
  return { token: j.access_token, refresh: j.refresh_token, id: j.user?.id };
};
const low = await mk('probe-low@local.test');
const content = await mk('probe-content@local.test');
sql(
  `insert into public.user_groups (user_id, group_id) select '${content.id}', id from public.groups where key='content'`
);

// 1. 방문자(공개 키)
for (const t of [
  'profiles',
  'newcomers',
  'audit_log',
  'user_groups',
  'group_permissions',
  'submission_attempts',
  'youtube_sync',
  'groups',
]) {
  const r = await req(`/rest/v1/${t}?select=*`);
  check(
    `방문자: ${t} 읽기 막힘`,
    r.status >= 400 || rows(r) === 0,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}
for (const fn of [
  'newcomer_notify_emails',
  'my_permissions',
  'purge_expired',
  'orphan_storage_objects',
  'claim_youtube_sync',
  'replace_youtube_videos',
]) {
  const r = await req(`/rest/v1/rpc/${fn}`, { method: 'POST', body: {} });
  check(`방문자: rpc ${fn} 막힘`, r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/rpc/has_permission`, {
    method: 'POST',
    body: { p_menu: 'users', p_action: 'READ' },
  });
  check('방문자: private 함수는 API 에 없음', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/youtube_videos`, {
    method: 'POST',
    body: {
      page: 'sunday',
      video_id: 'aaaaaaaaaaa',
      position: 0,
      title: 'x',
      thumbnail: 'x',
      poster: 'x',
    },
  });
  check('방문자: 유튜브 영상 직접 넣기 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/newcomers`, {
    method: 'POST',
    body: {
      intent: 'REGISTER',
      name: 'x',
      phone: '010-1111-2222',
      consent_at: new Date().toISOString(),
      consent_version: 'x',
    },
  });
  check('방문자: 새가족 직접 넣기 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'probe-signup@local.test', password: 'probe-pass-1234' }),
  });
  check('방문자: 스스로 가입 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await fetch(`${API}/auth/v1/admin/users`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  check('방문자: 계정 목록(관리 API) 막힘', r.status >= 400, `HTTP ${r.status}`);
}

// 2. SQL 인젝션 시도 — PostgREST 는 값을 매개변수로 넘긴다
{
  const r = await req(`/rest/v1/albums?title=eq.${encodeURIComponent("x' or '1'='1")}&select=id`);
  check(
    "인젝션: 값에 ' or '1'='1",
    r.status < 500 && rows(r) <= 0,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}
{
  const r = await req(
    `/rest/v1/albums?title=eq.${encodeURIComponent("x'); drop table public.newcomers; --")}&select=id`
  );
  check(
    '인젝션: 값에 drop table',
    sql(`select to_regclass('public.newcomers') is not null`) === 't',
    `HTTP ${r.status}`
  );
}
{
  const r = await req(
    `/rest/v1/albums?select=id,${encodeURIComponent('(select name from newcomers)')}`
  );
  check('인젝션: select 칸에 하위 쿼리', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/albums?select=*,newcomers(*)`);
  check(
    '인젝션: 관계 끼워 읽기(albums→newcomers)',
    r.status >= 400 || !JSON.stringify(r.body).includes('탈취대상'),
    `HTTP ${r.status}`
  );
}
{
  const r = await req(
    `/rest/v1/albums?or=${encodeURIComponent('(id.is.null,title.neq.x)')}&select=id`
  );
  check(
    '필터 문법 끼워 넣기(or)로도 공개 글만',
    rows(r) <= 0 || r.status < 500,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}

// 3. 권한 없는 로그인 계정
const L = { token: low.token };
for (const t of ['newcomers', 'audit_log', 'group_permissions']) {
  const r = await req(`/rest/v1/${t}?select=*`, L);
  check(
    `권한 없음: ${t} 0줄/막힘`,
    r.status >= 400 || rows(r) === 0,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}
{
  const r = await req(`/rest/v1/profiles?select=id,email`, L);
  check(
    '권한 없음: 다른 사람 이메일 못 봄(자기 1줄)',
    rows(r) === 1,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}
{
  const r = await req(`/rest/v1/user_groups`, {
    ...L,
    method: 'POST',
    body: { user_id: low.id, group_id: sql(`select id from public.groups where key='admin'`) },
  });
  check('권한 없음: 스스로 «전체 관리» 들어가기 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/profiles?id=eq.${low.id}`, {
    ...L,
    method: 'PATCH',
    body: { name: 'x', is_active: true, department: null },
  });
  check('권한 없음: 자기 정보 고치기 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/rpc/newcomer_notify_emails`, { ...L, method: 'POST', body: {} });
  check('권한 없음: 알림 받을 사람 이메일 목록 막힘', r.status >= 400, `HTTP ${r.status}`);
}
{
  const r = await req(`/rest/v1/rpc/my_permissions`, { ...L, method: 'POST', body: {} });
  check('권한 없음: 내 권한 목록은 빈 목록', rows(r) === 0, `HTTP ${r.status}, ${rows(r)}줄`);
}
{
  const r = await req(`/rest/v1/audit_log`, {
    ...L,
    method: 'POST',
    body: { table_name: 'newcomers', action: 'EXPORT', changes: {} },
  });
  check('권한 없음: 이력 쓰기 막힘', r.status >= 400, `HTTP ${r.status}`);
}

// 4. 콘텐츠 담당 — 개인정보는 못 봄
const C = { token: content.token };
{
  const r = await req(`/rest/v1/newcomers?select=name,phone`, C);
  check(
    '콘텐츠 담당: 새가족 0줄/막힘',
    r.status >= 400 || rows(r) === 0,
    `HTTP ${r.status}, ${rows(r)}줄`
  );
}
{
  const r = await req(`/rest/v1/audit_log?table_name=eq.newcomers&select=changes`, C);
  check('콘텐츠 담당: 새가족 이력 0줄', rows(r) === 0, `HTTP ${r.status}, ${rows(r)}줄`);
}
{
  const r = await req(`/rest/v1/profiles?select=email`, C);
  check('콘텐츠 담당: 다른 사람 이메일 못 봄', rows(r) === 1, `HTTP ${r.status}, ${rows(r)}줄`);
}
{
  const r = await req(`/rest/v1/group_permissions`, {
    ...C,
    method: 'POST',
    body: {
      group_id: sql(`select id from public.groups where key='content'`),
      menu_id: sql(`select id from public.menus where key='newcomers'`),
      action: 'READ',
    },
  });
  check('콘텐츠 담당: 자기 그룹에 새가족 권한 추가 막힘', r.status >= 400, `HTTP ${r.status}`);
}

// 5. 위조 토큰
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: low.id, role: 'service_role', exp: 9999999999 })}.`;
{
  const r = await req(`/rest/v1/newcomers?select=*`, { token: forged });
  check(
    '위조 토큰(alg none, service_role)',
    r.status === 401 || r.status === 403,
    `HTTP ${r.status}`
  );
}
const parts = content.token.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
const tampered = `${parts[0]}.${b64({ ...payload, role: 'service_role' })}.${parts[2]}`;
{
  const r = await req(`/rest/v1/newcomers?select=*`, { token: tampered });
  check(
    '서명은 그대로, 내용만 service_role 로 바꾼 토큰',
    r.status === 401 || r.status === 403,
    `HTTP ${r.status}`
  );
}

// 6. 로그인 반복 시도 · 존재 여부 노출
const tryLogin = async (email, pw) =>
  (
    await fetch(`${API}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    })
  ).json();
const a = await tryLogin('probe-low@local.test', 'wrong'),
  b = await tryLogin('nobody@local.test', 'wrong');
check(
  '로그인: 없는 계정과 틀린 비밀번호의 응답이 같다',
  a.error_code === b.error_code,
  `${a.error_code} / ${b.error_code}`
);

// 7. refresh token — 사용자가 다음 토큰까지 쓴 뒤에는, 훔친 옛 토큰을 거절한다
//    (다음 토큰을 아직 쓰지 않았으면 Supabase 가 한 번 허용한다 — 네트워크가 끊긴 경우를 위한 기본 동작)
const refreshWith = async t => {
  const r = await fetch(`${API}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: t }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, token: j.refresh_token };
};
const second = await refreshWith(low.refresh);
const third = await refreshWith(second.token);
await new Promise(r => setTimeout(r, 11000)); // refresh_token_reuse_interval(10초) 지난 뒤
const stolen = await refreshWith(low.refresh);
check(
  'refresh token: 다음 토큰이 쓰인 뒤 옛 토큰 재사용은 거절',
  second.status === 200 && third.status === 200 && stolen.status >= 400,
  `${second.status} → ${third.status} → 재사용 ${stolen.status}`
);

// 정리
sql(`delete from public.newcomers where name='탈취대상'`);
sql(
  `delete from public.user_groups where user_id in (select id from auth.users where email like 'probe-%')`
);
sql(`delete from public.profiles where email like 'probe-%'`);
sql(`delete from auth.users where email like 'probe-%'`);
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed}개 실패` : `\n${results.length}개 모두 막혔습니다.`);
process.exit(failed ? 1 : 0);
