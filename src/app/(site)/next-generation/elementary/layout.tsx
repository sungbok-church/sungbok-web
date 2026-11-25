import { siteMenuRoute } from '@/shared/components/layout/SiteMenuRoute';

// 메뉴가 꺼지면 404 · 제목은 메뉴 이름(설계 6.5)
const route = siteMenuRoute('/next-generation/elementary');
export const generateMetadata = route.generateMetadata;
export default route.Layout;
