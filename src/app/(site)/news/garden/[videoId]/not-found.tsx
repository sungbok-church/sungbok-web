import { VideoNotFound } from '@/domains/worship-video/components/features/VideoNotFound';

// 목록에 없는 영상(지워졌거나 잘못된 주소)
export default function NotFound() {
  return <VideoNotFound page="garden" />;
}
