import { describe, expect, it } from 'vitest';

import { actionLabel, formatChanges, subjectOf, tableLabel } from './auditFormat';

describe('formatChanges', () => {
  it('수정 — 바뀐 칸만 «이전 → 이후», 칸 이름은 한글', () => {
    expect(
      formatChanges({
        table_name: 'groups',
        action: 'UPDATE',
        changes: { name: ['주보', '주보 담당'], is_active: [true, false] },
      })
    ).toEqual([
      { field: '이름', before: '주보', after: '주보 담당' },
      { field: '사용 여부', before: '예', after: '아니오' },
    ]);
  });

  it('개인정보 칸(새가족의 이름 · 연락처 · 남긴 말 · 메모)은 «(값 숨김)»', () => {
    expect(
      formatChanges({ table_name: 'newcomers', action: 'UPDATE', changes: { name: null } })
    ).toEqual([{ field: '이름', before: '(값 숨김)', after: '(값 숨김)' }]);
    expect(
      formatChanges({
        table_name: 'newcomers',
        action: 'INSERT',
        changes: { phone: null, status: 'new' },
      })
    ).toEqual([
      { field: '연락처', before: '', after: '(값 숨김)' },
      { field: '상태', before: '', after: 'new' },
    ]);
  });

  it('개인정보 칸이 아닌데 비어 있으면 «(없음)», 부서 범위가 비어 있으면 «모든 부서»', () => {
    expect(
      formatChanges({ table_name: 'groups', action: 'INSERT', changes: { description: null } })
    ).toEqual([{ field: '설명', before: '', after: '(없음)' }]);
    expect(
      formatChanges({ table_name: 'profiles', action: 'INSERT', changes: { department: null } })
    ).toEqual([{ field: '담당 부서', before: '', after: '모든 부서' }]);
  });

  it('콘텐츠 상태는 한글로, 등록 때 늘 빈 휴지통 칸은 보이지 않는다', () => {
    expect(
      formatChanges({
        table_name: 'bulletins',
        action: 'INSERT',
        changes: { status: 'PUBLISHED', deleted_at: null, deleted_by: null },
      })
    ).toEqual([{ field: '상태', before: '', after: '공개' }]);
    expect(
      formatChanges({
        table_name: 'bulletins',
        action: 'UPDATE',
        changes: { status: ['PUBLISHED', 'DRAFT'], deleted_at: [null, '2026-11-24T00:00:00Z'] },
      })
    ).toEqual([
      { field: '상태', before: '공개', after: '임시저장' },
      // 시각 칸은 서울 시각으로
      { field: '휴지통', before: '(없음)', after: '2026-11-24 09:00' },
    ]);
  });

  it('id 칸은 이름표가 있으면 이름으로, 기능 · 부서는 한글로', () => {
    const names = { 'menu-1': '주보', 'group-1': '콘텐츠 담당' };
    expect(
      formatChanges(
        {
          table_name: 'group_permissions',
          action: 'INSERT',
          changes: { menu_id: 'menu-1', group_id: 'group-1', action: 'PURGE' },
        },
        names
      )
    ).toEqual([
      { field: '메뉴', before: '', after: '주보' },
      { field: '그룹', before: '', after: '콘텐츠 담당' },
      { field: '기능', before: '', after: '영구 삭제' },
    ]);
    expect(
      formatChanges({
        table_name: 'profiles',
        action: 'UPDATE',
        changes: { department: [null, 'INFANT'] },
      })
    ).toEqual([{ field: '담당 부서', before: '모든 부서', after: '영아부' }]);
  });

  it('등록은 «→ 값», 삭제는 «값 →», id 칸은 뺀다', () => {
    expect(
      formatChanges({
        table_name: 'codes',
        action: 'INSERT',
        changes: { id: 'x', label: '교회행사', sort: 10 },
      })
    ).toEqual([
      { field: '이름', before: '', after: '교회행사' },
      { field: '순서', before: '', after: '10' },
    ]);
    expect(
      formatChanges({
        table_name: 'codes',
        action: 'DELETE',
        changes: { id: 'x', label: '교회행사' },
      })
    ).toEqual([{ field: '이름', before: '교회행사', after: '' }]);
  });

  it('값 모양 — 없음 · 목록', () => {
    expect(
      formatChanges({
        table_name: 'menus',
        action: 'UPDATE',
        changes: { label: ['분류 관리', null], actions: [['READ'], ['READ', 'UPDATE']] },
      })
    ).toEqual([
      { field: '이름', before: '분류 관리', after: '(없음)' },
      { field: '기능 목록', before: '조회', after: '조회, 수정' },
    ]);
  });

  it('엑셀로 받기는 건수', () => {
    expect(
      formatChanges({ table_name: 'newcomers', action: 'EXPORT', changes: { count: 12 } })
    ).toEqual([{ field: '엑셀로 받기', before: '', after: '12건' }]);
  });

  it('모르는 칸은 원래 이름 그대로', () => {
    expect(
      formatChanges({ table_name: 'groups', action: 'UPDATE', changes: { weird: [1, 2] } })[0].field
    ).toBe('weird');
  });
});

describe('labels', () => {
  it('표 · 동작 이름', () => {
    expect(tableLabel('group_permissions')).toBe('그룹 권한');
    expect(tableLabel('unknown_table')).toBe('unknown_table');
    expect(actionLabel('INSERT')).toBe('등록');
    expect(actionLabel('EXPORT')).toBe('엑셀로 받기');
  });
});

describe('subjectOf', () => {
  it('바뀐 값에 이름(name · label · title)이 있으면 그것을 대상 이름으로', () => {
    expect(
      subjectOf({ table_name: 'groups', action: 'INSERT', changes: { name: '주보 담당' } })
    ).toBe('주보 담당');
    expect(
      subjectOf({ table_name: 'codes', action: 'UPDATE', changes: { label: ['행사', '교회행사'] } })
    ).toBe('교회행사');
    expect(
      subjectOf({ table_name: 'groups', action: 'UPDATE', changes: { is_active: [true, false] } })
    ).toBeNull();
  });

  it('새가족 이름은 값이 없으므로(값 숨김) 대상 이름도 없다', () => {
    expect(
      subjectOf({ table_name: 'newcomers', action: 'INSERT', changes: { name: null } })
    ).toBeNull();
  });

  it('표마다 다른 칸 이름(분류의 slug = 영문 이름, 앨범의 slug = 주소 번호)', () => {
    expect(
      formatChanges({
        table_name: 'categories',
        action: 'INSERT',
        changes: { slug: 'church-event' },
      })
    ).toEqual([{ field: '영문 이름', before: '', after: 'church-event' }]);
    expect(
      formatChanges({ table_name: 'albums', action: 'INSERT', changes: { slug: '1000' } })[0].field
    ).toBe('주소 번호');
  });
});
