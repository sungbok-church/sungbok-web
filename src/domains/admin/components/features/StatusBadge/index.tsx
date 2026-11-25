import { cleanupDay } from '@/domains/admin/lib/adminTime';
import { statusLabel } from '@/domains/admin/lib/newcomer';
import { Badge } from '@/shared/components/ui/badge';

/** 목록 거르기의 «상태» 고르기 — 주소에는 1 · 0 으로 남는다(사용자 · 그룹 목록) */
export const STATUS_FILTER_OPTIONS = [
  { value: '1', label: '사용 중' },
  { value: '0', label: '꺼짐' },
];

/**
 * 계정 · 그룹의 사용 여부 — «사용 중»(초록) · «꺼짐»(회색). onlyOff 면 켜져 있을 때는 그리지 않는다
 * (구성원 · 소속 그룹 목록처럼 꺼진 것만 눈에 띄면 되는 곳).
 */
export const StatusBadge = ({ active, onlyOff }: { active: boolean; onlyOff?: boolean }) =>
  active ? (
    !onlyOff && <Badge variant="success">사용 중</Badge>
  ) : (
    <Badge variant="neutral">꺼짐</Badge>
  );

/** 콘텐츠 상태 조건의 선택지(설계 6.6 — 휴지통은 «삭제된 항목» 스위치로 따로 본다) */
export const CONTENT_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: '공개' },
  { value: 'DRAFT', label: '임시저장' },
];

/** 콘텐츠 5종의 상태 — «공개»(초록) · «임시저장»(회색) · 휴지통에 들었으면 완전히 지울 날 */
export const ContentStatusBadge = ({
  status,
  deletedAt,
  compact,
}: {
  status: 'DRAFT' | 'PUBLISHED';
  /** 휴지통에 넣은 시각 — 주면 예약 작업이 완전히 지울 날을 함께 보인다(«휴지통 · 12-26 완전 삭제») */
  deletedAt?: string | null;
  /** 휴지통 목록 — 줄마다 «휴지통» 은 같은 말이라 날만(«12-26 완전 삭제», 좁은 칸) */
  compact?: boolean;
}) =>
  deletedAt ? (
    <Badge variant="danger">
      {`${compact ? '' : '휴지통 · '}${cleanupDay(deletedAt, { days: 30 }).slice(5)} 완전 삭제`}
    </Badge>
  ) : status === 'PUBLISHED' ? (
    <Badge variant="success">공개</Badge>
  ) : (
    <Badge variant="neutral">임시저장</Badge>
  );

/** 새가족 처리 상태 — 접수(아직 연락 전, 눈에 띄게) · 연락함 · 완료 */
export const NewcomerStatusBadge = ({ status }: { status: string }) =>
  status === 'NEW' ? (
    <Badge variant="warning">{statusLabel(status)}</Badge>
  ) : status === 'CONTACTED' ? (
    <Badge variant="accent">{statusLabel(status)}</Badge>
  ) : (
    <Badge variant="success">{statusLabel(status)}</Badge>
  );
