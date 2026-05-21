import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        emerald: 'bg-emerald-100 text-emerald-700',
        sky: 'bg-sky-100 text-sky-700',
        amber: 'bg-amber-100 text-amber-700',
        orange: 'bg-orange-100 text-orange-700',
        rose: 'bg-rose-100 text-rose-700',
        zinc: 'bg-zinc-100 text-zinc-700',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
