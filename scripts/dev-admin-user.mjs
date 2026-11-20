// node scripts/dev-admin-user.mjs <비밀번호> — 로컬 Supabase(pnpm db:start)에 관리자 로그인 계정을 만든다.
// 가입을 막아 뒀기 때문에(supabase/config.toml enable_signup = false) 계정은 Auth 관리 API 로만 만들 수 있다.
// 로컬 전용이다 — 주소가 127.0.0.1 · localhost 가 아니면 실행을 거부한다(운영에 계정을 만드는 데 쓰이지 않게).
// 만든 계정은 «전체 관리» 그룹에 넣고 비밀번호 변경 표시를 끈다(로컬 개발용).
// `pnpm db:reset` 은 계정도 지우므로 그 뒤에 다시 돌린다.
import { execFileSync } from 'node:child_process';

const EMAIL = 'admin@local.test';
const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('사용법: node scripts/dev-admin-user.mjs <비밀번호(8자 이상)>');
  process.exit(1);
}

// 로컬 스택의 주소와 관리 키를 CLI 에서 읽는다(환경변수·.env 를 보지 않는다 — 운영 값이 섞이지 않게).
const status = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const read = name => status.match(new RegExp(`^${name}="?([^"\\n]*)"?$`, 'm'))?.[1];
const apiUrl = read('API_URL');
const adminKey = read('SECRET_KEY') ?? read('SERVICE_ROLE_KEY');
if (!apiUrl || !adminKey) {
  console.error('로컬 Supabase 가 켜져 있지 않습니다 — pnpm db:start');
  process.exit(1);
}

const { hostname } = new URL(apiUrl);
if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
  console.error(`로컬 주소가 아닙니다(${hostname}) — 이 스크립트는 로컬 DB 에서만 씁니다.`);
  process.exit(1);
}

const res = await fetch(`${apiUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: adminKey,
    Authorization: `Bearer ${adminKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: { name: '로컬 관리자' },
  }),
});

if (res.ok) {
  console.log(`${EMAIL} 계정을 만들었습니다.`);
} else {
  const body = await res.json().catch(() => ({}));
  if (body.error_code === 'email_exists') {
    console.log(`${EMAIL} 계정이 이미 있습니다(그대로 둡니다).`);
  } else {
    console.error(
      `계정을 만들지 못했습니다(HTTP ${res.status}): ${body.msg ?? body.message ?? ''}`
    );
    process.exit(1);
  }
}

// «전체 관리» 그룹에 넣는다(서버 전용 키라 행 권한 규칙을 지나지 않는다).
const rest = (path, init = {}) =>
  fetch(`${apiUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: adminKey,
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

// 표가 없으면(변경 파일을 적용하지 않았으면) PostgREST 가 배열 대신 오류 객체를 돌려준다.
const firstRow = async path => {
  const res = await rest(path);
  const body = await res.json().catch(() => null);
  return res.ok && Array.isArray(body) ? body[0] : undefined;
};
const profile = await firstRow(`profiles?email=eq.${encodeURIComponent(EMAIL)}&select=id`);
const group = await firstRow('groups?key=eq.admin&select=id');
if (!profile || !group) {
  console.error(
    '사용자 정보나 «전체 관리» 그룹이 없습니다 — pnpm db:reset 으로 변경 파일을 적용했는지 확인하세요.'
  );
  process.exit(1);
}

const joined = await rest('user_groups', {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates' },
  body: JSON.stringify({ user_id: profile.id, group_id: group.id }),
});
const cleared = await rest(`profiles?id=eq.${profile.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ must_change_password: false }),
});
if (!joined.ok || !cleared.ok) {
  console.error(`«전체 관리» 에 넣지 못했습니다(HTTP ${joined.status} · ${cleared.status}).`);
  process.exit(1);
}
console.log(`${EMAIL} 을(를) «전체 관리» 그룹에 넣었습니다.`);
