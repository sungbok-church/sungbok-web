import { describe, expect, it, vi } from 'vitest';

import { submitNewcomerForm } from './newcomerActions';

const m = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  submit: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => m.headers.get(k) ?? null }),
}));
vi.mock('./newcomerSubmit.server', () => ({ submitNewcomer: m.submit }));

describe('submitNewcomerForm', () => {
  it('접속 IP(프록시 뒤 첫 주소)와 사이트 주소를 넘긴다', async () => {
    m.headers = new Map([
      ['x-forwarded-for', '203.0.113.7, 10.0.0.1'],
      ['x-forwarded-host', 'sungbok.or.kr'],
      ['x-forwarded-proto', 'https'],
    ]);
    await submitNewcomerForm({ name: 'x' });
    expect(m.submit).toHaveBeenCalledWith(
      { name: 'x' },
      { ip: '203.0.113.7', origin: 'https://sungbok.or.kr' }
    );
  });
  it('헤더가 없으면 IP 는 null, 주소는 host', async () => {
    m.headers = new Map([['host', 'localhost:3000']]);
    await submitNewcomerForm({});
    expect(m.submit).toHaveBeenLastCalledWith({}, { ip: null, origin: 'https://localhost:3000' });
  });
});
