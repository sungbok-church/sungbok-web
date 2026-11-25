// 운영 DB 를 바꾸는 서버 일(유튜브 재생목록 받기 · 하루 한 번 예약 작업)을 해도 되는 곳 — 허용 목록.
// preview 배포와, 운영 키로 띄운 로컬 서버(.env.production.local)도 운영 DB 를 본다 — 브랜치의 설정 · 코드로 운영 데이터를
// 바꾸거나 지우지 않게 둘 다 읽기만 한다. 운영인지는 Vercel 시스템 변수(VERCEL_ENV)가 아니라 운영 환경에만 넣은 표시
// PRODUCTION_WRITES=on 으로 본다 — 시스템 변수는 프로젝트 설정에 따라 함수에 오지 않을 수 있다(2026-11-26 운영 실측:
// VERCEL_ENV 로 막았더니 운영에서도 받지 않았다). 표시는 GitHub Secret → «Sync env to Vercel» 을 production 만으로.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

const LOCAL_DB = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/;

export const mayWriteSharedDb = (): boolean =>
  process.env.PRODUCTION_WRITES === 'on' ||
  LOCAL_DB.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
