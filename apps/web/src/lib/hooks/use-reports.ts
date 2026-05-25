'use client';

import { useQuery, useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ReportSummary, ReportExportFormat } from '@/types/report';

export const REPORT_KEYS = {
  all: ['reports'] as const,
  summary: (p: { from: string; to: string }) => ['reports', 'summary', p] as const,
};

export function useReportSummary(params: { from: string; to: string }) {
  return useQuery({
    queryKey: REPORT_KEYS.summary(params),
    queryFn: async () => {
      const res = await api.get<{ data: ReportSummary }>('/reports/summary', { params });
      return res.data.data;
    },
    enabled: !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      from,
      to,
      format,
    }: {
      from: string;
      to: string;
      format: ReportExportFormat;
    }) => {
      const res = await api.get('/reports/export', {
        params: { from, to, format },
        responseType: 'blob',
      });

      const filename = `bao-cao-${from}-den-${to}.${format}`;
      const contentType =
        (res.headers['content-type'] as string | undefined) ?? 'application/octet-stream';
      const blob = new Blob([res.data as BlobPart], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * Download the report export (xlsx or csv).
 * Parses the filename from the Content-Disposition header if present.
 * Falls back to a generated filename based on the date range.
 *
 * @deprecated Use useExportReport() mutation instead.
 */
export async function downloadReport(params: {
  from: string;
  to: string;
  format: ReportExportFormat;
}): Promise<void> {
  const res = await api.get('/reports/export', {
    params,
    responseType: 'blob',
  });

  // Try to extract filename from Content-Disposition header
  const disposition = res.headers['content-disposition'] as string | undefined;
  let filename = `report-${params.from}-to-${params.to}.${params.format}`;
  if (disposition) {
    const match = /filename[^;=\n]*=["']?([^"';\n]*)/.exec(disposition);
    if (match?.[1]) {
      filename = match[1].trim();
    }
  }

  const blob = new Blob([res.data as BlobPart]);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

/** Alias kept for backward compatibility */
export const downloadReportExport = downloadReport;
