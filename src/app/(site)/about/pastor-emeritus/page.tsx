import { PastorIntro } from '@/domains/about/components/widgets/PastorIntro';
import { PASTOR_EMERITUS } from '@/domains/about/components/widgets/PastorIntro/pastors';

export default function Page() {
  return <PastorIntro pastor={PASTOR_EMERITUS} />;
}
