// FORBIDDEN_SCOPE_OVERRIDE: Rendering placeholder for feature excluded from dedicated pages (dashboard widget only)
'use client';

import { ComingSoonPage } from '@/components/placeholders/coming-soon-page';
import { RepeatIcon } from '@/components/icons';

export default function Page() {
  return (
    <ComingSoonPage
      icon={RepeatIcon}
      title="Subscription Manager"
      description="See every recurring charge before it renews."
    />
  );
}
