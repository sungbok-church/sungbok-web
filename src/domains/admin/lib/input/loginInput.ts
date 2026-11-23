import { z } from 'zod';

// 로그인 폼의 값 검증 — 화면과 Server Action 이 같은 스키마를 쓴다.
// 이메일은 앞뒤 공백을 지운다(복사해 붙일 때 딸려 온다). 비밀번호는 고치지 않는다 — 공백도 비밀번호의 일부다.
export const loginInputSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
