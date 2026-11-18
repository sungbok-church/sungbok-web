import { VideoNotFound } from '@/domains/worship-video/components/features/VideoNotFound';

// 목록에 없는 설교(지워졌거나 잘못된 주소) — 안내와 목록 링크(다른 영상 페이지와 같은 부품)
export default function NotFound() {
  return <VideoNotFound page="sunday" />;
}
