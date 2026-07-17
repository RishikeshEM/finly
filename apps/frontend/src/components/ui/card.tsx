import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'alt';
}

export function Card({ className = '', variant = 'default', ...props }: CardProps) {
  const bgColor = variant === 'alt'
    ? 'bg-card-alt-light dark:bg-card-alt-dark'
    : 'bg-card-light dark:bg-card-dark';

  return (
    <div
      className={`${bgColor} rounded-lg border border-border-light dark:border-border-dark p-6 ${className}`}
      {...props}
    />
  );
}
