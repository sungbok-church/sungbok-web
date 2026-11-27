// 첫 화면 «저장 공간» 카드(domains/admin.md «첫 화면») — 올린 파일(Storage media 버킷)의 크기 합과 요금제에 든 크기. 순수 함수.

/**
 * Supabase 요금제에 든 파일 저장 공간 — 지금은 무료 요금제 1 GB(2026-11-26 사용자 확인). 넘으면 올리기가 막힌다.
 * Pro 로 바꾸면 100 GB — 여기만 고친다.
 */
export const STORAGE_INCLUDED_BYTES = 1 * 1024 ** 3;

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** 사람이 읽는 크기 — 1024 단위, 소수 한 자리까지(.0 은 뺀다) */
export const formatBytes = (bytes: number): string => {
  let v = Math.max(0, bytes);
  let i = 0;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  const n = i === 0 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  return `${n} ${UNITS[i]}`;
};

/** 쓴 크기 · 요금제에 든 크기 · 비율(%, 내림 — 2.5 GB 가 «3%» 로 어긋나 보이지 않게) — 조금이라도 쓰면 1% 로(0% 로 보이지 않게) */
export const storageUsage = (bytes: number) => ({
  used: formatBytes(bytes),
  included: formatBytes(STORAGE_INCLUDED_BYTES),
  percent: bytes > 0 ? Math.max(1, Math.floor((bytes / STORAGE_INCLUDED_BYTES) * 100)) : 0,
});
