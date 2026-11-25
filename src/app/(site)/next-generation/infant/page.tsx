import { loadDepartmentPage } from '@/domains/next-generation/api/departmentsLoad.server';
import { DepartmentPage } from '@/domains/next-generation/components/widgets/DepartmentPage';

// 소개 · 담당자 · 사진은 관리자에서 고친다(DB — 저장하면 바로 반영). 이름 · 예배 시간은 코드(config/departmentInfo).
export default async function Page() {
  const { dept, photos } = await loadDepartmentPage('infant');
  return <DepartmentPage dept={dept} photos={photos} />;
}
