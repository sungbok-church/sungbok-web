// 비밀번호 바꾸기 입력(화면 · Server Action 이 같은 스키마). 길이 상한 72 는 로그인 서버(bcrypt)가 받는 길이다.
import { z } from 'zod';

export const passwordInputSchema = z
  .object({
    password: z.string().min(8, '8자 이상으로 정해 주세요.').max(72, '72자 이하로 정해 주세요.'),
    confirm: z.string(),
  })
  .refine(v => v.password === v.confirm, {
    path: ['confirm'],
    message: '두 비밀번호가 같지 않습니다.',
  });

export type PasswordInput = z.infer<typeof passwordInputSchema>;
