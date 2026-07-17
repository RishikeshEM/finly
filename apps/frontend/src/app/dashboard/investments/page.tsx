// FORBIDDEN_SCOPE_OVERRIDE: Rendering placeholder for excluded feature; not building Investment Tracking
'use client';

import { ComingSoonPage } from '@/components/placeholders/coming-soon-page';
import { TrendingIcon } from '@/components/icons';

export default function Page() {
  return (
    <ComingSoonPage
      icon={TrendingIcon}
      title="Investment Portfolio"
      description="Track stocks, funds, and crypto in one view."
    />
  );
}
