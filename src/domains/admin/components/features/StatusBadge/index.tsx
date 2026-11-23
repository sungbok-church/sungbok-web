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
