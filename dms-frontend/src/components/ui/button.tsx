import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Guide: 6px radius, semibold label, amber focus halo (2px white + 2px #FBB24A).
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Ember fill (brand-500) rather than the #F47F36 flame: white-on-flame fails WCAG AA.
        default: 'bg-brand-500 text-white hover:bg-brand-600',
        // High-contrast "executive" action.
        dark: 'bg-gray-900 text-white hover:bg-black',
        destructive:
          'border border-red-300 bg-critical-subtle text-red-600 hover:bg-red-100 focus-visible:ring-red-600',
        outline: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-100',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-brand-500 underline-offset-4 hover:underline',
        accent: 'bg-accent-400 text-gray-900 hover:bg-accent-500',
      },
      size: {
        // 44px touch targets on mobile, 40px on desktop.
        default: 'h-11 px-4 py-2 md:h-10',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-11 w-11 md:h-10 md:w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
