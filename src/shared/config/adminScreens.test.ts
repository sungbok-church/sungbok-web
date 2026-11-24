import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ADMIN_SCREENS_READY, ADMIN_WARM_ORDER } from './adminScreens';

// 관리자 메뉴의 초기 행(주소)은 DB 정본에 있다 — 서버 미리 깨우기는 /admin/<key> 주소를 부른다
const reference = readFileSync('supabase/reference.sql', 'utf8');

describe('관리자 화면 목록 — 서버 미리 깨우기 순서', () => {
  it('만든 화면(첫 화면 빼고)은 모두 미리 깨우기 순서에 들어 있다 — 새 화면을 만들면 자주 쓰는 정도에 맞춰 자리를 정한다', () => {
    const missing = [...ADMIN_SCREENS_READY].filter(
      key => key !== 'dashboard' && !ADMIN_WARM_ORDER.includes(key)
    );
    expect(missing).toEqual([]);
  });

  it('순서의 화면은 겹치지 않고, 모두 DB 메뉴의 /admin/<key> 주소다', () => {
    expect(new Set(ADMIN_WARM_ORDER).size).toBe(ADMIN_WARM_ORDER.length);
    for (const key of ADMIN_WARM_ORDER) expect(reference).toContain(`'/admin/${key}'`);
  });
});
