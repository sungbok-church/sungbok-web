import { describe, expect, it } from 'vitest';

import { SORT_INSTRUCTIONS, sortAnnouncements } from './sortAnnouncements';

const NAMES: Record<string, string> = { a: '주보', b: '주일광고', c: '교회앨범' };
const say = sortAnnouncements(['a', 'b', 'c'], id => NAMES[id]);
const item = (id: string) => ({ id }) as never;

describe('sortAnnouncements(화면 낭독기에 읽어 줄 한글 문장)', () => {
  it('집으면 이름과 지금 자리', () => {
    expect(say.onDragStart({ active: item('b') })).toBe(
      '«주일광고» 항목을 집었습니다. 지금 2번째(3개 중)입니다.'
    );
  });

  it('옮기는 중에는 놓일 자리', () => {
    expect(say.onDragOver({ active: item('a'), over: item('c') })).toBe(
      '«주보» 항목: 3번째 자리입니다.'
    );
    expect(say.onDragOver({ active: item('a'), over: null })).toBe(
      '«주보» 항목: 놓을 수 있는 자리 밖입니다.'
    );
  });

  it('놓으면 놓은 자리, 자리 밖이면 제자리', () => {
    expect(say.onDragEnd({ active: item('c'), over: item('a') })).toBe(
      '«교회앨범» 항목을 1번째에 놓았습니다.'
    );
    expect(say.onDragEnd({ active: item('c'), over: null })).toBe(
      '«교회앨범» 항목을 제자리에 두었습니다.'
    );
  });

  it('취소하면 처음 자리 그대로', () => {
    expect(say.onDragCancel({ active: item('b'), over: null })).toBe(
      '옮기기를 취소했습니다. «주일광고» 항목은 2번째 그대로입니다.'
    );
  });

  it('조작 안내는 키보드 기준', () => {
    expect(SORT_INSTRUCTIONS.draggable).toContain('스페이스');
    expect(SORT_INSTRUCTIONS.draggable).toContain('Esc');
  });
});
