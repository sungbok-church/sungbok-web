'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * 관리자 화면의 링크 — Next 기본 미리 받기(Partial Prefetching: 화면에 보이는 링크의 «화면 종류마다 틀 하나» 를 받아 세션 동안
 * 들고 있는다)를 그대로 쓴다(ADR 0027). 틀은 미리 만든 파일이라 서버 함수를 부르지 않고, 저장해도 다시 받지 않는다.
 * 그래서 누르는 즉시 그 화면의 틀(제목 · 폼 · 표 머리)이 보이고 내용은 뒤따라 온다.
 * 예전(2026-11-23 ~ 11-28)에는 올렸을 때만 받았다 — 그때는 화면을 통째로 서버에서 받아 첫 화면 12건 · 저장마다 13건이 나갔다.
 * 관리자 코드는 next/link 를 직접 쓰지 않고 이것을 쓴다(lint) — 미리 받기 방식을 한 곳에서 정하려고. 서버에 묻지 않고 화면 안에서
 * 바로 바꾸는 링크(GroupNav, data-in-place)는 미리 받을 것이 없어 보통 링크다.
 */
export const IntentLink = (props: Omit<ComponentProps<typeof Link>, 'prefetch'>) => (
  <Link {...props} />
);
