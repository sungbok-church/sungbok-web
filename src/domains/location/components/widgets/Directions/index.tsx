// 찾아오시는 길 › 오시는 길 본문. 지도 + 주소(복사) + 지도 앱 링크, 옆에 주차·대중교통·전화.
// 홈에 있던 지도 섹션(LocationMap)을 여기로 옮겼다(2026-11-16, ADR 0015) — 홈에는 «처음 오신 분께» 의
// 주소 한 줄과 이 페이지로 오는 링크만 남는다. 길찾기 자체는 네이버·카카오 지도가 맡는다(새 창).
// 도착 시나리오 멘트(«안내 위원이 …»)는 두지 않는다 — 사실만 적는다(DESIGN.md §2).
import { ArrowUpRight, Bus, Car, MapPin, Phone, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { CHURCH_LOCATION } from '@/shared/config/church';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';

import { CopyAddressButton } from './CopyAddressButton';
import { MapEmbed } from './MapEmbed';

const CARD = 'bg-b1-surface ring-b1-border rounded-xl shadow-sm ring-1';
const MAP_LINK = 'text-label min-h-11 gap-1.5 px-4';

const NewTab = () => (
  <>
    <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
    <span className="sr-only">(새 창)</span>
  </>
);

const InfoCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) => (
  <li
    className={cn(CARD, 'flex items-start gap-4 p-5 lg:flex-1 lg:items-center lg:gap-3 xl:gap-4')}
  >
    <span
      aria-hidden
      className="bg-b1-bg border-b1-border flex size-10 shrink-0 items-center justify-center rounded-full border"
    >
      <Icon size={18} strokeWidth={1.8} className="text-b1-accent" />
    </span>
    <div className="min-w-0">
      <h3 className="text-b1-text text-title">{title}</h3>
      {children}
    </div>
  </li>
);

const INFO_TEXT = 'text-b1-sub text-body-sm mt-1';

export const Directions = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
    <div className={cn(CARD, 'overflow-hidden lg:col-span-8')}>
      <MapEmbed query={CHURCH_LOCATION.mapQuery} title="성복교회 위치" />
      <div className="flex flex-col gap-4 p-5 md:p-7 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start justify-between gap-3 xl:justify-start xl:gap-5">
          <address className="flex items-start gap-2.5 not-italic">
            <MapPin
              size={18}
              strokeWidth={1.8}
              aria-hidden
              className="text-b1-accent mt-1 shrink-0"
            />
            <span>
              <span className="text-b1-text text-title block">{CHURCH_LOCATION.address}</span>
              <span className="text-b1-sub text-body-sm mt-0.5 block">
                {CHURCH_LOCATION.addressDetail}
              </span>
            </span>
          </address>
          <CopyAddressButton address={CHURCH_LOCATION.address} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <a
            href={CHURCH_LOCATION.naverMap}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              FOCUS,
              MAP_LINK,
              'bg-b1-accent text-b1-bg duration-fast inline-flex items-center justify-center rounded-md font-semibold transition-opacity hover:opacity-90'
            )}
          >
            네이버 지도
            <NewTab />
          </a>
          <a
            href={CHURCH_LOCATION.kakaoMap}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(OUTLINE_BTN, FOCUS, MAP_LINK)}
          >
            카카오 지도
            <NewTab />
          </a>
        </div>
      </div>
    </div>

    {/* lg 미만은 한 줄에 하나 — 세 칸으로 나누면 칸이 좁아(약 210px) 시간·역 이름이 단어 중간에서 끊긴다 */}
    <ul role="list" className="flex flex-col gap-3 lg:col-span-4">
      <InfoCard icon={Car} title="주차">
        <p className={INFO_TEXT}>
          <span className="block">교회 주차장</span>
          <span className="block">예배 시간 무료 이용</span>
        </p>
      </InfoCard>
      <InfoCard icon={Bus} title="대중교통">
        <p className={INFO_TEXT}>
          <span className="block">지하철 5호선 장한평역 도보 7분</span>
          <span className="block">버스 장안초교 정류장 하차</span>
        </p>
      </InfoCard>
      <InfoCard icon={Phone} title="전화">
        <a
          href={CHURCH_LOCATION.phoneHref}
          className={cn(
            FOCUS,
            'text-b1-text text-body hover:text-b1-accent duration-fast inline-flex min-h-11 items-center rounded-sm font-semibold tabular-nums transition-colors'
          )}
        >
          {CHURCH_LOCATION.phone}
        </a>
        <p className="text-b1-sub text-body-sm">
          <span className="block">평일 09:00 – 18:00</span>
          <span className="block">주일 종일 응대</span>
        </p>
      </InfoCard>
    </ul>
  </div>
);
