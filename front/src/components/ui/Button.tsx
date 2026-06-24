import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'social';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    let variantStyles = '';
    if (variant === 'primary') {
      variantStyles = 'bg-primary-container text-white border-transparent hover:bg-inverse-primary';
    } else if (variant === 'outline') {
      variantStyles = 'bg-surface-container-highest text-on-surface-variant border-[#2A2A32] hover:border-outline-variant';
    } else if (variant === 'ghost') {
      variantStyles = 'bg-transparent text-on-surface-variant border-transparent hover:bg-surface-container-high hover:text-primary';
    } else if (variant === 'social') {
      variantStyles = 'bg-[#15151A] text-on-surface border-[#2A2A32] hover:border-outline-variant flex items-center justify-center gap-sm';
    }

    let sizeStyles = '';
    if (size === 'sm') sizeStyles = 'px-4 py-2 text-sm';
    else if (size === 'md') sizeStyles = 'px-4 py-3 text-base';
    else if (size === 'lg') sizeStyles = 'px-10 py-4 text-lg';

    return (
      <button
        ref={ref}
        className={`font-label-md rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
