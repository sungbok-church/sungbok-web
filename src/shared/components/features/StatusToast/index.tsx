/**
 * 화면 아래에 잠깐 뜨는 알림(복사 결과 등). 알림 영역은 늘 두고 문구만 끼운다 — 영역째 넣었다 빼면
 * 화면낭독기가 변화를 읽지 못한다. 문구를 언제 지울지는 쓰는 곳(useCopyText 등)이 정한다.
 */
export const StatusToast = ({ message }: { message: string | null }) => (
  <div
    role="status"
    className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center"
  >
    {message && (
      <span className="bg-b1-text text-b1-surface text-body-sm rounded-lg px-5 py-3 text-center shadow-md">
        {message}
      </span>
    )}
  </div>
);
