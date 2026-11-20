// 임시 비밀번호(설계 11-1: 계정을 만들거나 초기화하면 권한 있는 사람이 직접 전달하고, 받은 사람은 첫 로그인 때 바꾼다).
// 12자 · 영대/영소/숫자 섞음 · 손으로 옮겨 적을 때 헷갈리는 0 O 1 l I 는 뺀다.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;
const LENGTH = 12;

/** 0 이상 max 미만의 고른 난수(나머지 연산의 치우침을 버린다) */
const secureRandomInt = (max: number): number => {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
};

export const generateTempPassword = (
  randomInt: (max: number) => number = secureRandomInt
): string => {
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < LENGTH) chars.push(pick(ALL));
  // 앞 세 자리가 늘 «대 · 소 · 숫자» 순서가 되지 않게 섞는다(Fisher–Yates)
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};
