'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Toast, ToastVariant } from './use-toast';

type ToastProps = Toast & {
  onRemove: (id: string) => void;
};

function variantClasses(variant: ToastVariant | undefined): string {
  switch (variant) {
    case 'destructive':
      return 'bg-destructive text-destructive-foreground border-destructive/30';
    case 'success':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    default:
      return 'bg-card text-card-foreground border-border';
  }
}

export function ToastItem({ id, title, description, variant, onRemove }: ToastProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-md',
        variantClasses(variant),
      )}
    >
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs opacity-80">{description}</p>}
      </div>
      <button
        aria-label="Đóng thông báo"
        onClick={() => onRemove(id)}
        className="mt-0.5 rounded-md opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
