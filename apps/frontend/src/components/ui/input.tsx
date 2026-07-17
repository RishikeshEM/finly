import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

// forwardRef is required here: react-hook-form's register() attaches a ref
// to read/focus the underlying <input> DOM node directly (it is fundamentally
// an uncontrolled-input library) - without forwarding it, React silently
// drops the ref and RHF's internal value tracking breaks on every form using
// this component, with no visible error beyond a dev-console warning.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full h-12 px-3 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-soft transition-all ${className}`}
      {...props}
    />
  );
});
