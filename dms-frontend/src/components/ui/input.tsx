import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // Guide: white field, #E5E5E5 hairline, 6px radius; focus = flame border + soft 3px halo.
        // 16px text on mobile prevents iOS auto-zoom; 14px on desktop.
        'flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-400/15 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60 md:h-10 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
