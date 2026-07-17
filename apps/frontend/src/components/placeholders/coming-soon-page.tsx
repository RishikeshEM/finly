import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="p-8">
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h2 className="text-4xl font-bold mb-4 text-text-light dark:text-text-dark">Coming Soon</h2>
        <p className="text-lg text-text-muted-light dark:text-text-muted-dark mb-8 max-w-md">
          {title} is on our roadmap and will be available soon. Check back later for updates!
        </p>
        <Button variant="primary" href="/dashboard">
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
}
