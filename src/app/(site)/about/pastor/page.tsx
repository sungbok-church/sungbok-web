import { PastorIntro } from '@/domains/about/components/widgets/PastorIntro';
import { LEAD_PASTOR } from '@/domains/about/components/widgets/PastorIntro/pastors';

export default function Page() {
  return <PastorIntro pastor={LEAD_PASTOR} />;
}
