import { describe, expect, it } from 'vitest';

import { putFile } from './putFile';

class FakeXhr {
  static last: FakeXhr;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  upload: {
    onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void;
  } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
}

const Xhr = FakeXhr as unknown as typeof XMLHttpRequest;

describe('putFile', () => {
  it('한 번 쓰는 주소로 PUT — 종류 · 덮어쓰지 않기 · 공개 키를 싣고, 진행을 0~1 로 알린다', async () => {
    const seen: number[] = [];
    const body = new Blob(['x']);
    const done = putFile(
      {
        url: 'https://s/upload/sign/media/p?token=t',
        body,
        contentType: 'image/webp',
        apiKey: 'pk',
      },
      p => seen.push(p),
      Xhr
    );
    const x = FakeXhr.last;
    expect(x.method).toBe('PUT');
    expect(x.headers).toEqual({
      'content-type': 'image/webp',
      'x-upsert': 'false',
      'cache-control': 'max-age=31536000',
      apikey: 'pk',
    });
    expect(x.body).toBe(body);
    x.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    x.status = 200;
    x.onload?.();
    await expect(done).resolves.toBeUndefined();
    expect(seen).toEqual([0.5, 1]);
  });

  it('2xx 가 아니거나 연결이 끊기면 실패', async () => {
    const a = putFile({ url: 'u', body: new Blob(), contentType: 't', apiKey: 'k' }, () => {}, Xhr);
    FakeXhr.last.status = 400;
    FakeXhr.last.onload?.();
    await expect(a).rejects.toThrow();
    const b = putFile({ url: 'u', body: new Blob(), contentType: 't', apiKey: 'k' }, () => {}, Xhr);
    FakeXhr.last.onerror?.();
    await expect(b).rejects.toThrow();
  });
});
