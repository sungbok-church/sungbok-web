import { Reveal } from '@/shared/components/features/Reveal';
import { CHURCH_LOCATION } from '@/shared/config/church';

const CHURCH = {
  name: '성복교회',
  wordmark: 'SUNGBOK',
  pastorLabel: '담임목사',
  pastor: '이요셉',
  tel: CHURCH_LOCATION.phone,
  telHref: CHURCH_LOCATION.phoneHref,
  email: 'sungbok1979@naver.com',
  emailHref: 'mailto:sungbok1979@naver.com',
  address: CHURCH_LOCATION.address,
  copyright: '© 2026 성복교회. All rights reserved.',
} as const;

const Dot = () => <span className="text-b1-border px-2.5">·</span>;

export const Footer = () => (
  <footer
    data-site-footer
    className="bg-b1-surface border-t-b1-border relative z-10 border-t px-5 py-16 text-center md:py-20"
  >
    <Reveal>
      <div className="text-b1-text text-[26px] font-bold tracking-[-0.01em] md:text-[30px]">
        {CHURCH.name}
        <span className="b1-mono text-b1-muted text-eyebrow ml-2 align-middle font-medium tracking-[0.12em]">
          {CHURCH.wordmark}
        </span>
      </div>

      <p className="text-b1-sub text-caption md:text-body-sm mx-auto mt-5 flex max-w-[640px] flex-wrap items-center justify-center leading-[1.9]">
        <span>
          {CHURCH.pastorLabel} {CHURCH.pastor}
        </span>
        <Dot />
        <a href={CHURCH.telHref} className="hover:text-b1-text transition-colors">
          {CHURCH.tel}
        </a>
        <Dot />
        <a href={CHURCH.emailHref} className="hover:text-b1-text transition-colors">
          {CHURCH.email}
        </a>
        <Dot />
        <span>{CHURCH.address}</span>
      </p>

      <div className="b1-mono text-b1-muted text-caption mt-8 tracking-[0.04em]">
        {CHURCH.copyright}
      </div>
    </Reveal>
  </footer>
);
