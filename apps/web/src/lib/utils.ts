import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrencyVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const n = typeof amount === 'number' ? amount : Number(amount);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function formatDate(value: Date | string, pattern: 'short' | 'long' = 'short'): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('vi-VN', pattern === 'short'
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
