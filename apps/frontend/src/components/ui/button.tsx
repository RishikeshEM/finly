import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<string, string> = {
    primary: 'bg-secondary text-white hover:opacity-90 active:scale-95',
    secondary: 'bg-accent text-white hover:opacity-90 active:scale-95',
    outline: 'border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark',
    ghost: 'text-text-light dark:text-text-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}
