import { HTMLAttributes, forwardRef } from 'react';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-[#15151A] border border-[#2A2A32] rounded-card ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
