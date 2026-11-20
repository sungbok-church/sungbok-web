import { toast } from '@/shared/components/ui/toast';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { notifyResult } from './notify';

vi.mock('@/shared/components/ui/toast', () => ({ toast: { add: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

describe('notifyResult', () => {
  it('성공은 success 토스트(문구 그대로)', () => {
    notifyResult({ ok: true, message: '저장했습니다.' });
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: '저장했습니다.' })
    );
  });

  it('실패는 error 토스트', () => {
    notifyResult({ ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } });
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: '권한이 없습니다.' })
    );
  });

  it('되돌리기 같은 버튼을 함께 단다', () => {
    const onClick = vi.fn();
    notifyResult({ ok: true, message: '휴지통으로 보냈습니다.' }, { label: '되돌리기', onClick });
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        actionProps: expect.objectContaining({ children: '되돌리기', onClick }),
      })
    );
  });
});
