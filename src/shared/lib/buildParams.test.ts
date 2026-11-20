import { describe, expect, it } from 'vitest';

import { BUILD_PLACEHOLDER, oneBuildParam } from './buildParams';

describe('oneBuildParam — 빌드 때 미리 만들 주소 하나(Cache Components 는 빈 목록이 안 된다)', () => {
  it('받은 id 가 있으면 그 주소 하나', async () => {
    expect(await oneBuildParam('videoId', async () => 'abc')).toEqual([{ videoId: 'abc' }]);
  });

  it('없으면 자리표시 주소 — 페이지는 목록에 없어 404 를 낸다', async () => {
    expect(await oneBuildParam('id', async () => undefined)).toEqual([{ id: BUILD_PLACEHOLDER }]);
  });

  it('받다가 실패해도(빌드 중 유튜브 실패) 자리표시로 — 빌드를 막지 않는다', async () => {
    const failing = async (): Promise<string> => {
      throw new Error('quota');
    };
    expect(await oneBuildParam('videoId', failing)).toEqual([{ videoId: BUILD_PLACEHOLDER }]);
  });
});
