import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full h-12 px-3 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-soft transition-all ${className}`}
      {...props}
    />
  );
}
