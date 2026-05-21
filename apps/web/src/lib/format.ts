/**
 * Format a number as Vietnamese currency string.
 * e.g. 1500000 → "1.500.000 đ"
 */
export function formatVnd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(num) + ' đ'
  );
}
