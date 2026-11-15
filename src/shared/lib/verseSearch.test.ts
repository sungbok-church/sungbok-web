import { describe, expect, it } from 'vitest';

import { includesAtBoundary, tightColon, verseForm } from './verseSearch';

describe('verseSearch — 성경 본문 표기를 맞춰 찾기(예배 설교 목록·자료실이 같이 쓴다)', () => {
  it('tightColon — «:» 앞뒤 공백을 없앤다', () => {
    expect(tightColon('사도행전 13 : 4-7')).toBe('사도행전 13:4-7');
  });

  it('verseForm — «N장 M절»·«N장»·«M절» 을 «N:M» 꼴로, 소문자로', () => {
    expect(verseForm('13장 4절')).toBe('13:4');
    expect(verseForm('12장')).toBe('12:');
    expect(verseForm('사도행전13장')).toBe('사도행전13:');
    expect(verseForm('John 3장 16절')).toBe('john 3:16');
    expect(verseForm('성탄절')).toBe('성탄절'); // 숫자 뒤의 «절» 만 본다
  });

  it('includesAtBoundary — 숫자로 시작하는 말은 앞이 숫자가 아닌 자리에서만', () => {
    expect(includesAtBoundary('사도행전 12:23', '2:')).toBe(false);
    expect(includesAtBoundary('사도행전 2:42', '2:')).toBe(true);
    expect(includesAtBoundary('2:42', '2:')).toBe(true);
    expect(includesAtBoundary('66회', '6회')).toBe(false);
    expect(includesAtBoundary('6회 66회', '6회')).toBe(true);
  });

  it('includesAtBoundary — 숫자로 시작하지 않으면 그냥 들어 있는지', () => {
    expect(includesAtBoundary('사도행전 강해', '강해')).toBe(true);
    expect(includesAtBoundary('사도행전 강해', '마태')).toBe(false);
  });
});
