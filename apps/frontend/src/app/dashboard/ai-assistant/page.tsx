// FORBIDDEN_SCOPE_OVERRIDE: Rendering placeholder for excluded feature; not building AI Financial Assistant
'use client';

import { ComingSoonPage } from '@/components/placeholders/coming-soon-page';
import { SparkleIcon } from '@/components/icons';

export default function Page() {
  return (
    <ComingSoonPage
      icon={SparkleIcon}
      title="AI Financial Assistant"
      description="Ask questions about your money in plain English."
    />
  );
}
