// 성경 본문 표기를 맞춰 찾기(순수) — 예배 설교 목록과 자료실 검색이 같이 쓴다.
// 올리는 사람마다 표기가 다르고(«10:8» · «10: 8»), 찾는 사람은 «12장» 처럼 친다 — 양쪽을 같은 꼴로 맞춘 뒤 견준다.

/** 본문 표기의 «:» 앞뒤 공백을 없앤다 — 비교할 땐 붙여서 본다. */
export const tightColon = (v: string): string => v.replace(/\s*:\s*/g, ':');

/** «N장 M절»·«N장»·«M절» 을 «N:M» 꼴로(소문자) — 검색어와 찾는 대상 글 양쪽에 똑같이 적용해 표기 차이를 없앤다. */
export const verseForm = (v: string): string =>
  tightColon(
    v
      .toLowerCase()
      .replace(/(\d+)\s*장\s*(\d+)/g, '$1:$2')
      .replace(/(\d+)\s*장/g, '$1:')
      .replace(/(\d)\s*절/g, '$1')
  );

/**
 * 숫자로 시작하는 말은 앞이 숫자가 아닌 자리에서만 맞춘다 — «2:» 가 «12:» 안에서, «6회» 가 «66회» 안에서 걸리지 않게.
 * 뒤쪽은 막지 않는다(치는 도중에도 걸려야 한다). 숫자로 시작하지 않으면 그냥 들어 있는지 본다.
 */
export const includesAtBoundary = (text: string, key: string): boolean => {
  if (!/^\d/.test(key)) return text.includes(key);
  for (let i = text.indexOf(key); i >= 0; i = text.indexOf(key, i + 1)) {
    if (i === 0 || !/\d/.test(text[i - 1])) return true;
  }
  return false;
};
