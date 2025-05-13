import { cn } from '@/client/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import '../../styles/button.css';

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'button-default',
      destructive: 'button-destructive',
      outline: 'button-outline',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      link: 'button-link',
    },
    size: {
      default: 'button-size-default',
      sm: 'button-size-sm',
      lg: 'button-size-lg',
      icon: 'button-size-icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
