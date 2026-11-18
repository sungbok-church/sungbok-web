import { ResourceNotFound } from '@/domains/resources/components/features/ResourceNotFound';

// 없는 자료(지워졌거나 잘못된 주소·다른 분류의 자료·임시저장)
export default function NotFound() {
  return <ResourceNotFound section="seasonal" />;
}
