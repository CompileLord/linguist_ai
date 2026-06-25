import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`bg-[#15151A] border border-[#2A2A32] w-full px-4 py-3 rounded-input text-on-surface placeholder:text-[#474555] font-body-md transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
