import { WorshipTimesTable } from '@/domains/home/components/widgets/WorshipTimes/WorshipTimesTable';
import { Directions } from '@/domains/location/components/widgets/Directions';
import { SectionShell } from '@/shared/components/layout/SectionShell';

// 처음 오는 분이 어디로·언제를 한 페이지에서 본다. 위치(지도·주소·주차·대중교통)가 먼저, 예배 시간이 다음.
// 지도는 홈에 있던 섹션을 옮겨 왔고(2026-11-16, ADR 0015), 예배 시간표는 예배 메뉴의 «예배 안내»에서
// 옮겨 왔다(2026-11-12, 예배 메뉴는 영상만) — 홈 예배 시간 섹션과 같은 부품(WorshipTimesTable).
export default function Page() {
  return (
    <SectionShell section="location">
      <section aria-labelledby="directions-title">
        {/* 페이지 제목 «찾아오시는 길» 바로 아래라 보이는 제목은 두지 않는다(같은 말 반복) — 화면낭독기용으로만 */}
        <h2 id="directions-title" className="sr-only">
          오시는 길
        </h2>
        <Directions />
      </section>
      {/* id 는 시간표로 바로 오는 주소(/location#worship-times)용 — 고정 헤더 보정은 전역 scroll-padding-top 이 한다 */}
      <section id="worship-times" aria-labelledby="worship-times-title" className="mt-14 md:mt-20">
        <h2 id="worship-times-title" className="text-b1-text text-h3 mb-5 text-balance md:mb-6">
          예배 시간
        </h2>
        <WorshipTimesTable />
      </section>
    </SectionShell>
  );
}
