// FORBIDDEN_SCOPE_OVERRIDE: Rendering placeholder for feature excluded from dedicated pages (dashboard widget only)
'use client';

import { ComingSoonPage } from '@/components/placeholders/coming-soon-page';
import { ReceiptIcon } from '@/components/icons';

export default function Page() {
  return (
    <ComingSoonPage
      icon={ReceiptIcon}
      title="Bills Reminder"
      description="Never miss a due date again."
    />
  );
}
