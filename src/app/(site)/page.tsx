import { loadHomeHero } from '@/domains/home/api/homeHeroLoad.server';
import { loadHomeVideoFeed } from '@/domains/home/api/homeVideoCache.server';
import { HomeVideoFeedProvider } from '@/domains/home/api/useHomeVideoFeed';
import { ChurchNews } from '@/domains/home/components/widgets/ChurchNews';
import { FirstVisit } from '@/domains/home/components/widgets/FirstVisit';
import { HomeLead } from '@/domains/home/components/widgets/HomeLead';
import { LiveStage } from '@/domains/home/components/widgets/LiveStage';
import { NextGeneration } from '@/domains/home/components/widgets/NextGeneration';
import { NoticeReel, NoticeReelSkeleton } from '@/domains/home/components/widgets/NoticeReel';
import { HomeVideoWarmup } from '@/domains/home/components/widgets/HomeVideoWarmup';
import { Section } from '@/domains/home/components/features/Section';
import { TurntableStage } from '@/domains/home/components/widgets/RecentSermons/TurntableStage';
import { WorshipTimes } from '@/domains/home/components/widgets/WorshipTimes';
import type { HomeVideoFeedData } from '@/domains/home/api/homeVideoFeed';
import { loadForPage } from '@/shared/api/loadForPage.server';
import { Suspense } from 'react';

// 홈은 미리 그려 둔다(ADR 0024) — 영상 피드는 서버 캐시(homeVideoCache.server, 60초마다 확인)에서 와 HTML 에 들어 있다.
// 캐시가 비어 있을 때도 첫 화면은 영상 조회를 기다리지 않는다 — 영상 영역만 따로 이어 보내고,
// 브라우저에서는 60초 간격 확인을 이어 간다.

const HomeVideoFallback = () => (
  <div role="status" aria-label="영상 정보 준비 중">
    <Section>
      <div className="bg-b1-border/40 aspect-[21/9] rounded-3xl" aria-hidden />
      <div
        className="bg-b1-surface border-b1-border relative mx-auto -mt-10 h-28 max-w-[640px] rounded-2xl border md:mr-10 md:ml-auto"
        aria-hidden
      />
    </Section>
    <NoticeReelSkeleton />
  </div>
);

const HomeVideoSections = async ({ feed }: { feed: Promise<HomeVideoFeedData | undefined> }) => (
  <HomeVideoFeedProvider initial={await feed}>
    <LiveStage />
    <NoticeReel />
  </HomeVideoFeedProvider>
);

export default async function Home() {
  // 실패 규칙은 loadForPage — 운영 중 다시 그리다 실패하면 직전 홈을 유지하고, 빌드 · 개발 서버에서는
  // 영상 영역을 비운 채 그려 브라우저가 /api/home-video 로 받게 한다.
  const feed = loadForPage(() => loadHomeVideoFeed());
  // 홈 히어로(관리자 설정 — 서버 캐시, 저장하면 바로 반영). 못 읽으면 직전 홈 · 장애 대비 사진
  const hero = await loadHomeHero();
  return (
    <>
      {/* 히어로 → 사진 띠 → 표어 → 담임 (HomeLead 가 HomeHero 를 품고 변형 무대로 잇는다) */}
      <HomeLead hero={hero} />
      <HomeVideoWarmup />
      <div className="bg-b1-bg relative z-0">
        <WorshipTimes />
        {/* 영상 준비는 첫 화면과 독립적으로 완료되는 대로 반영한다. */}
        <Suspense fallback={<HomeVideoFallback />}>
          <HomeVideoSections feed={feed} />
        </Suspense>
        {/* LP 턴테이블·다음세대 별자리는 폰(768px 미만)에서 숨긴다 — 넓은 화면용 인터랙션이고(기획 요구 8),
            별자리는 touch-action:none 이라 폰에서 그 화면 높이만큼 스크롤이 막힌다. 폰 대체 화면은 따로 만든다.
            숨겨져 있으면 화면 근처 감지가 안 걸려 턴테이블 유튜브 임베드·회전 루프도 시작하지 않는다. */}
        <div className="hidden md:block">
          {/* 청년 예배 영상 — LP 턴테이블 */}
          <TurntableStage endW={80} endH={45} endRadiusPx={16} darkHex="#0b0b0d" />
          {/* 다음세대 — LP 어둠 연속 → 여명. 밤하늘 별자리 + 커서 추종 카드 */}
          <NextGeneration />
        </div>
        {/* 교회 소식 — 좌 헤드라인 + 우 카드 뉴스 */}
        <ChurchNews />
        {/* 처음 오신 분께 (새신자) — 풀블리드 + 스크롤 고정 배경 + 등록·문의 플로팅 패널.
            지도 섹션은 찾아오시는 길 페이지로 옮겼다(ADR 0015) — 여기에는 주소 한 줄과 그 페이지 링크만 둔다. */}
        <FirstVisit />
      </div>
    </>
  );
}
