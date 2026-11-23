'use client';

import { useCapsLock } from '@/domains/admin/hooks/useCapsLock';
import { FieldDescription } from '@/shared/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/ui/input-group';
import { cn } from '@/shared/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

type Props = Omit<ComponentProps<'input'>, 'type'> & { id: string };

/**
 * 비밀번호 칸 — 보기 · 숨기기 단추(shadcn InputGroup)와 Caps Lock 안내를 함께 둔다.
 * `Field` 안에서 `FieldLabel` 다음에 놓는다. 안내 줄은 늘 DOM 에 있어(aria-live) 켜질 때 읽힌다 —
 * 꺼져 있을 때는 sr-only 로 비워 둬서 칸 사이 간격을 늘리지 않는다.
 */
export const PasswordInput = ({ id, onKeyDown, onKeyUp, onBlur, ...props }: Props) => {
  const [visible, setVisible] = useState(false);
  const { capsLock, onKey, reset } = useCapsLock();
  const hintId = `${id}-capslock`;
  return (
    <>
      <InputGroup>
        <InputGroupInput
          id={id}
          type={visible ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={e => {
            onKey(e);
            onKeyDown?.(e);
          }}
          onKeyUp={e => {
            onKey(e);
            onKeyUp?.(e);
          }}
          onBlur={e => {
            reset();
            onBlur?.(e);
          }}
          {...props}
          // 부르는 쪽의 설명(규칙 안내 등)과 Caps Lock 안내를 함께 잇는다 — props 뒤에 둬야 덮어써지지 않는다
          aria-describedby={
            [props['aria-describedby'], capsLock ? hintId : null].filter(Boolean).join(' ') ||
            undefined
          }
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-controls={id}
            onClick={() => setVisible(v => !v)}
          >
            {visible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription
        id={hintId}
        role="status"
        aria-live="polite"
        className={cn(!capsLock && 'sr-only')}
      >
        {capsLock ? 'Caps Lock이 켜져 있습니다.' : ''}
      </FieldDescription>
    </>
  );
};
