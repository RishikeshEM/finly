import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IconProps } from '@/components/icons';

interface ComingSoonPageProps {
  icon: (props: IconProps) => JSX.Element;
  title: string;
  description: string;
}

export function ComingSoonPage({ icon: Icon, title, description }: ComingSoonPageProps) {
  return (
    <Card className="flex flex-col items-center justify-center text-center" style={{ padding: '100px 0' }}>
      <div
        className="flex items-center justify-center bg-secondary-soft text-secondary"
        style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 20 }}
      >
        <Icon size={28} />
      </div>
      <h2 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">{title}</h2>
      <p className="text-[15px] text-text-muted-light dark:text-text-muted-dark mb-8" style={{ maxWidth: 380 }}>
        {description}
      </p>
      <Link href="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </Card>
  );
}
