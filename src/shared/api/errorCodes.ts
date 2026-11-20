// 오류 코드 목록(정본) — 서버와 화면이 한 코드베이스라 이 파일 하나를 함께 쓴다(ADR 0022).
// 서버는 코드 + metadata 로 문장을 완성해 보내고, 화면은 그 문장을 그대로 보여 준다(번역 단계가 없다).
// 화면이 code · metadata 를 보는 것은 동작(새로고침 버튼 · 기다리는 시간)을 고를 때뿐이다.
// 코드를 더하면 .md/architecture/api-response.md 표에도 더한다.

/** 코드마다 문장에 넣을 동적 값(몇 초 뒤 등). 화면도 받는다 — 개인정보 · 내부 원문은 넣지 않는다 */
export type ErrorMetadata = Record<string, string | number | boolean | null>;

type ErrorDef = {
  /** Route Handler 가 쓰는 HTTP 상태 */
  status: number;
  /** 사람이 읽는 문장 — metadata 로 채운다 */
  message: (metadata?: ErrorMetadata) => string;
  /** 언제 나는가 · 사용자가 할 일(문서 · 리뷰용) */
  when: string;
};

const num = (m: ErrorMetadata | undefined, key: string) =>
  typeof m?.[key] === 'number' ? (m[key] as number) : null;

const duration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return [m && `${m}분`, s && `${s}초`].filter(Boolean).join(' ') || '잠시';
};

export const ERROR_CODES = {
  INVALID_INPUT: {
    status: 400,
    message: () => '입력한 값을 확인해 주세요.',
    when: '입력 검증 실패. fields 에 칸별 문장 — 칸 밑에 보이고, 고쳐서 다시 저장한다.',
  },
  LOGIN_FAILED: {
    status: 401,
    message: () => '이메일 또는 비밀번호가 맞지 않습니다.',
    when: '로그인 거절. 어느 쪽이 틀렸는지는 말하지 않는다(계정이 있는지 알리지 않게).',
  },
  NO_PERMISSION: {
    status: 403,
    message: () => '권한이 없습니다.',
    when: '그 메뉴 · 기능의 권한이 없거나(화면이 열린 사이 빠짐 포함) DB 행 권한이 막음. 관리 담당자에게 권한을 요청한다.',
  },
  NOT_FOUND: {
    status: 404,
    message: () => '찾는 항목이 없습니다. 새로고침한 뒤 다시 골라 주세요.',
    when: '고른 항목이 없거나 이미 사라짐.',
  },
  DUPLICATE: {
    status: 409,
    message: () => '이미 있는 값입니다.',
    when: '같은 이름 · 값이 이미 있음(유일 제약). 다른 값으로 바꾼다.',
  },
  CONFLICT: {
    status: 409,
    message: () => '다른 사람이 먼저 고쳤습니다. 새로고침한 뒤 다시 저장해 주세요.',
    when: '동시 수정 — 연 뒤에 다른 사람이 저장함(updated_at 이 다름). 새로고침해 바뀐 내용을 보고 다시 고친다.',
  },
  NOT_ALLOWED: {
    status: 422,
    message: () => '이 값으로는 저장할 수 없습니다.',
    when: 'DB 규칙(트리거 · 검사)이 막음. 규칙이 준 한글 문장이 있으면 그 문장을 보낸다(예: «전체 관리» 에 한 명은 남아야 함).',
  },
  LOCKED_CODE: {
    status: 422,
    message: () => '프로그램이 쓰는 코드 묶음이라 코드를 더하거나 끌 수 없습니다.',
    when: '잠긴 공통코드 묶음(enum 과 같은 값)에 더하기 · 끄기. 이름 · 순서만 바꾼다.',
  },
  RATE_LIMITED: {
    status: 429,
    message: m => {
      const sec = num(m, 'retryAfterSec');
      return sec ? `${duration(sec)} 뒤에 다시 시도해 주세요.` : '잠시 뒤에 다시 시도해 주세요.';
    },
    when: '짧은 시간에 너무 많이 보냄(새가족 접수 등). metadata.retryAfterSec 초 뒤에 다시.',
  },
  QUOTA_EXCEEDED: {
    status: 429,
    message: () => '오늘은 영상 정보를 더 불러올 수 없습니다. 내일 다시 확인해 주세요.',
    when: '유튜브 하루 쿼터 소진. 다시 해도 같다(화면은 재시도하지 않는다).',
  },
  UPSTREAM_ERROR: {
    status: 502,
    message: () => '영상 정보를 불러오지 못했습니다.',
    when: '유튜브가 다시 해도 같은 오류를 줌(키 · 요청 · 응답 모양). 서버 로그를 본다.',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: () => '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    when: '바깥 서비스(Supabase · 유튜브) 일시 장애 · 연결 실패. 잠시 뒤 풀린다(화면이 재시도할 수 있다).',
  },
  NOT_CONFIGURED: {
    status: 503,
    message: () => '아직 설정되지 않았습니다. 관리 담당자에게 알려 주세요.',
    when: '서버 환경변수(Supabase 주소 · 키, 만능 키 등)가 없음. 배포 설정을 채운다.',
  },
  INTERNAL: {
    status: 500,
    message: () => '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    when: '예상하지 못한 오류(코드 버그 · DB 내부 오류). 원문은 서버 로그에만 남긴다.',
  },
} as const satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ERROR_CODES;
