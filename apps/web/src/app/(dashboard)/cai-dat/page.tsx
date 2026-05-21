'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { AxiosError } from 'axios';

import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth/use-auth';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { Setting, ApiResponse } from '@/types';

// ─── Schema ────────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  propertyName: z.string().min(1, 'Vui lòng nhập tên cơ sở'),
  taxCode: z.string().optional(),
  address: z.string().optional(),
  email: z.union([z.string().email('Email không hợp lệ'), z.literal('')]).optional(),
  website: z
    .union([z.string().url('Website phải bắt đầu bằng http(s)://'), z.literal('')])
    .optional(),
  hotline: z.string().optional(),
  monthlyRevenueTarget: z
    .union([z.coerce.number().nonnegative('Phải >= 0'), z.literal('')])
    .optional(),
  note: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// ─── Tone config ──────────────────────────────────────────────────────────────

type ToneOption = {
  id: 1 | 2 | 3;
  name: string;
  description: string;
  swatches: string[];
};

const TONES: ToneOption[] = [
  {
    id: 1,
    name: 'Pink Boutique',
    description: 'Tông hồng nữ tính, phù hợp homestay boutique nhỏ',
    swatches: ['#d946a8', '#f0abca', '#fce7f3'],
  },
  {
    id: 2,
    name: 'Boutique Vibe',
    description: 'Tông tím chủ đạo, chuẩn thiết kế template',
    swatches: ['#7c3aed', '#a78bfa', '#ede9fe'],
  },
  {
    id: 3,
    name: 'Olive Organic',
    description: 'Tông xanh olive sinh thái, resort organic',
    swatches: ['#4d7c0f', '#86efac', '#f0fdf4'],
  },
];

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabId = 'info' | 'theme';

// ─── Page component ───────────────────────────────────────────────────────────

export default function CaiDatPage() {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const { hasRole } = useAuth();
  const { tone, setTone } = useTheme();
  const queryClient = useQueryClient();

  const canEdit = hasRole('ADMIN', 'MANAGER');

  // Fetch settings
  const {
    data: settingData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Setting>>('/settings');
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: settingData
      ? {
          propertyName: settingData.propertyName,
          taxCode: settingData.taxCode ?? '',
          address: settingData.address ?? '',
          email: settingData.email ?? '',
          website: settingData.website ?? '',
          hotline: settingData.hotline ?? '',
          monthlyRevenueTarget: settingData.monthlyRevenueTarget ?? '',
          note: settingData.note ?? '',
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsFormData) => {
      const payload = {
        ...values,
        monthlyRevenueTarget:
          values.monthlyRevenueTarget === '' || values.monthlyRevenueTarget === undefined
            ? null
            : String(values.monthlyRevenueTarget),
        taxCode: values.taxCode || null,
        address: values.address || null,
        email: values.email || null,
        website: values.website || null,
        hotline: values.hotline || null,
        note: values.note || null,
      };
      const res = await api.put<ApiResponse<Setting>>('/settings', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      reset({
        propertyName: data.propertyName,
        taxCode: data.taxCode ?? '',
        address: data.address ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        hotline: data.hotline ?? '',
        monthlyRevenueTarget: data.monthlyRevenueTarget ?? '',
        note: data.note ?? '',
      });
      toast({ title: 'Đã lưu cài đặt thành công', variant: 'success' });
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      const msgText = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lưu thất bại');
      toast({ title: msgText, variant: 'destructive' });
    },
  });

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span>Đang tải cài đặt...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="text-sm">Không thể tải cài đặt.</p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="text-xs text-muted-foreground">Cài đặt hệ thống › Cài đặt hệ thống</p>
        <h2 className="text-2xl font-semibold mt-0.5">Cài đặt hệ thống</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Cài đặt tabs">
        {(
          [
            { id: 'info' as TabId, label: 'Thông tin cơ sở' },
            { id: 'theme' as TabId, label: 'Giao diện' },
          ] satisfies Array<{ id: TabId; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-t-lg',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Thông tin cơ sở */}
      {activeTab === 'info' && (
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} aria-label="Thông tin cơ sở">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ sở</CardTitle>
              <CardDescription>
                Tên nhà nghỉ, địa chỉ, thông tin liên hệ và báo cáo tài chính.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="propertyName">Tên cơ sở</Label>
                  <Input
                    id="propertyName"
                    placeholder="Homestay Lá"
                    disabled={!canEdit}
                    aria-invalid={!!errors.propertyName}
                    {...register('propertyName')}
                  />
                  {errors.propertyName && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.propertyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taxCode">Số điện thoại / Mã số thuế</Label>
                  <Input
                    id="taxCode"
                    placeholder="0900-000-000"
                    disabled={!canEdit}
                    {...register('taxCode')}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    placeholder="Cần Thơ"
                    disabled={!canEdit}
                    {...register('address')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settingEmail">Email</Label>
                  <Input
                    id="settingEmail"
                    type="email"
                    placeholder="hotel@example.com"
                    disabled={!canEdit}
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://ahomestay.shop"
                    disabled={!canEdit}
                    {...register('website')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hotline">Hotline</Label>
                  <Input
                    id="hotline"
                    placeholder="1900 1234"
                    disabled={!canEdit}
                    {...register('hotline')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="monthlyRevenueTarget">Target doanh thu tháng</Label>
                  <Input
                    id="monthlyRevenueTarget"
                    type="number"
                    placeholder="160,000,000"
                    disabled={!canEdit}
                    {...register('monthlyRevenueTarget')}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="note">Ghi chú</Label>
                  <Input
                    id="note"
                    placeholder="Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi."
                    disabled={!canEdit}
                    {...register('note')}
                  />
                </div>
              </div>

              {!canEdit && (
                <p className="text-sm text-muted-foreground italic">
                  Bạn không có quyền chỉnh sửa cài đặt.
                </p>
              )}
            </CardContent>

            {canEdit && (
              <div className="flex justify-end px-5 pb-5">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || !isDirty}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Lưu cài đặt
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}

      {/* Tab: Giao diện / Theme */}
      {activeTab === 'theme' && (
        <div className="space-y-4" aria-label="Chọn giao diện màu sắc">
          <Card>
            <CardHeader>
              <CardTitle>Theme color switch</CardTitle>
              <CardDescription>Chọn bảng màu phù hợp với phong cách cơ sở của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TONES.map((t) => {
                const isActive = tone === t.id;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-4 transition-all',
                      isActive
                        ? 'ring-2 ring-primary border-primary/30 bg-primary/5'
                        : 'border-border',
                    )}
                    aria-label={`Tone ${t.id}: ${t.name}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Color swatches */}
                      <div className="flex gap-1.5">
                        {t.swatches.map((color) => (
                          <span
                            key={color}
                            className="inline-block h-6 w-6 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Tone {t.id} — {t.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Đang dùng
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant={isActive ? 'secondary' : 'default'}
                        onClick={() => setTone(t.id)}
                      >
                        {isActive ? 'Đang áp dụng' : 'Áp dụng'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
