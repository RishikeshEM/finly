import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
