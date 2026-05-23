'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Loader2,
  BedDouble,
  Sparkles,
  ArrowUpCircle,
  MinusCircle,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { useCreateBooking, useUpdateBooking, useBooking } from '@/lib/hooks/use-bookings';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCustomers } from '@/lib/hooks/use-customers';
import { useRooms } from '@/lib/hooks/use-rooms';
import { useServices } from '@/lib/hooks/use-services';
import { usePackages } from '@/lib/hooks/use-packages';
import { formatVnd } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking, BookingItemKind } from '@/types/booking';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  kind: z.enum(['ROOM', 'SERVICE', 'SURCHARGE', 'DISCOUNT']),
  roomId: z.string().optional(),
  serviceId: z.string().optional(),
  surchargeTypeId: z.string().optional(),
  refCode: z.string().optional(),
  refName: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Số lượng phải >= 0'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá phải >= 0'),
  note: z.string().optional(),
});

const paymentSchema = z.object({
  methodId: z.string().min(1, 'Vui lòng chọn phương thức'),
  amount: z.coerce.number().min(0, 'Số tiền phải >= 0'),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

const bookingSchema = z
  .object({
    statusId: z.string().min(1, 'Vui lòng chọn trạng thái'),
    sourceId: z.string().optional(),
    priceTypeId: z.string().optional(),
    packageId: z.string().optional(),
    checkIn: z.string().min(1, 'Vui lòng chọn ngày check-in'),
    checkOut: z.string().min(1, 'Vui lòng chọn ngày check-out'),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    adults: z.coerce.number().min(0, 'Số người lớn phải >= 0'),
    children: z.coerce.number().min(0, 'Số trẻ em phải >= 0'),
    numRooms: z.coerce.number().min(1, 'Số phòng phải >= 1'),
    note: z.string().optional(),
    // Customer
    customerId: z.string().optional(),
    fullName: z.string().optional(),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || /^\+?[0-9]{8,15}$/.test(v), 'Số điện thoại không hợp lệ (8-15 chữ số)'),
    idNumber: z.string().optional(),
    email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
    address: z.string().optional(),
    // Items + Payments
    items: z.array(itemSchema),
    payments: z.array(paymentSchema),
  })
  .refine((d) => !d.checkIn || !d.checkOut || d.checkOut > d.checkIn, {
    message: 'Ngày check-out phải sau ngày check-in',
    path: ['checkOut'],
  });

type BookingFormData = z.infer<typeof bookingSchema>;

// ─── Kind badge helper ────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: BookingItemKind }) {
  const map: Record<BookingItemKind, { label: string; cls: string }> = {
    ROOM: { label: 'Phòng', cls: 'bg-sky-100 text-sky-700' },
    SERVICE: { label: 'Dịch vụ', cls: 'bg-emerald-100 text-emerald-700' },
    SURCHARGE: { label: 'Phụ thu', cls: 'bg-amber-100 text-amber-700' },
    DISCOUNT: { label: 'Giảm trừ', cls: 'bg-rose-100 text-rose-700' },
  };
  const { label, cls } = map[kind];
  return <Badge className={`${cls} border-0 text-xs`}>{label}</Badge>;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5">
      <span className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Mode = 'create' | 'edit' | 'view';

type BookingFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  editTarget?: Booking | null;
};

// ─── BookingFormDialog ────────────────────────────────────────────────────────

export function BookingFormDialog({
  open,
  onOpenChange,
  mode,
  editTarget,
}: BookingFormDialogProps) {
  const isEditing = mode === 'edit';
  const isViewing = mode === 'view';
  const isDisabled = isViewing;

  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();

  // Detail fetch for edit mode
  const { data: detailBooking, isLoading: detailLoading } = useBooking(
    isEditing && editTarget ? editTarget.id : '',
  );

  // Reference data
  const { data: statusesData } = useCategories({
    group: 'BOOKING_STATUS',
    active: true,
    pageSize: 100,
  });
  const statuses = statusesData?.data ?? [];

  const { data: sourcesData } = useCategories({
    group: 'BOOKING_SOURCE',
    active: true,
    pageSize: 100,
  });
  const sources = sourcesData?.data ?? [];

  const { data: priceTypesData } = useCategories({
    group: 'PRICE_TYPE',
    active: true,
    pageSize: 100,
  });
  const priceTypes = priceTypesData?.data ?? [];

  const { data: paymentMethodsData } = useCategories({
    group: 'PAYMENT_METHOD',
    active: true,
    pageSize: 100,
  });
  const paymentMethods = paymentMethodsData?.data ?? [];

  const { data: surchargeTypesData } = useCategories({
    group: 'SURCHARGE_TYPE',
    active: true,
    pageSize: 100,
  });
  const surchargeTypes = surchargeTypesData?.data ?? [];

  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customers = useMemo(() => customersData?.data ?? [], [customersData]);

  const { data: roomsData } = useRooms({ pageSize: 100 });
  const rooms = roomsData?.data ?? [];

  const { data: servicesData } = useServices({ pageSize: 100 });
  const services = servicesData?.data ?? [];

  const { data: packagesData } = usePackages({ active: true, pageSize: 100 });
  const packages = packagesData?.data ?? [];

  // Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      statusId: '',
      sourceId: '',
      priceTypeId: '',
      packageId: '',
      checkIn: todayIso(),
      checkOut: tomorrowIso(),
      checkInTime: '',
      checkOutTime: '',
      adults: 1,
      children: 0,
      numRooms: 1,
      note: '',
      customerId: '',
      fullName: '',
      phone: '',
      idNumber: '',
      email: '',
      address: '',
      items: [],
      payments: [],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: 'items',
  });

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: 'payments',
  });

  // Pre-fill form when editing
  useEffect(() => {
    const booking = detailBooking ?? editTarget;
    if ((isEditing || isViewing) && booking) {
      reset({
        statusId: booking.status.id,
        sourceId: booking.source?.id ?? '',
        priceTypeId: booking.priceType?.id ?? '',
        packageId: booking.package?.id ?? '',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        checkInTime: booking.checkInTime ?? '',
        checkOutTime: booking.checkOutTime ?? '',
        adults: booking.adults,
        children: booking.children,
        numRooms: booking.numRooms,
        note: booking.note ?? '',
        customerId: booking.customer?.id ?? '',
        fullName: booking.customer?.fullName ?? '',
        phone: booking.customer?.phone ?? '',
        idNumber: '',
        email: '',
        address: '',
        items:
          booking.items?.map((item) => ({
            kind: item.kind,
            roomId: item.roomId ?? undefined,
            serviceId: item.serviceId ?? undefined,
            surchargeTypeId: item.surchargeTypeId ?? undefined,
            refCode: item.refCode ?? undefined,
            refName: item.refName ?? undefined,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            note: item.note ?? undefined,
          })) ?? [],
        payments:
          booking.payments?.map((p) => ({
            methodId: p.method.id,
            amount: parseFloat(p.amount),
            paidAt: p.paidAt.split('T')[0],
            note: p.note ?? undefined,
          })) ?? [],
      });
    } else if (mode === 'create') {
      reset({
        statusId: '',
        sourceId: '',
        priceTypeId: '',
        packageId: '',
        checkIn: todayIso(),
        checkOut: tomorrowIso(),
        checkInTime: '',
        checkOutTime: '',
        adults: 1,
        children: 0,
        numRooms: 1,
        note: '',
        customerId: '',
        fullName: '',
        phone: '',
        idNumber: '',
        email: '',
        address: '',
        items: [],
        payments: [],
      });
    }
  }, [isEditing, isViewing, mode, editTarget, detailBooking, reset]);

  // Auto-fill customer fields when selecting existing customer
  const watchedCustomerId = watch('customerId');
  useEffect(() => {
    if (watchedCustomerId && watchedCustomerId !== '__new__') {
      const cust = customers.find((c) => c.id === watchedCustomerId);
      if (cust) {
        setValue('fullName', cust.fullName);
        setValue('phone', cust.phone ?? '');
        setValue('idNumber', cust.idNumber ?? '');
        setValue('email', cust.email ?? '');
        setValue('address', cust.address ?? '');
      }
    }
  }, [watchedCustomerId, customers, setValue]);

  // Computed totals live
  const watchedItems = watch('items');
  const watchedPayments = watch('payments');
  const totalAmount = watchedItems.reduce((sum, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const amount = item.kind === 'DISCOUNT' ? -qty * price : qty * price;
    return sum + amount;
  }, 0);
  const paidAmount = watchedPayments.reduce((sum, p) => {
    return sum + (typeof p.amount === 'number' ? p.amount : 0);
  }, 0);
  const remaining = totalAmount - paidAmount;

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Handlers for adding items by kind
  const addItem = useCallback(
    (kind: BookingItemKind) => {
      appendItem({
        kind,
        roomId: undefined,
        serviceId: undefined,
        surchargeTypeId: undefined,
        refCode: '',
        refName: '',
        quantity: 1,
        unitPrice: 0,
        note: '',
      });
    },
    [appendItem],
  );

  function onSubmit(data: BookingFormData) {
    const handleError = (err: unknown) => {
      const axiosErr = err as AxiosError<{ message: string | string[] }>;
      const msg = axiosErr.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Lỗi không xác định');
      toast({ title: text, variant: 'destructive' });
    };

    const customerPayload = {
      customerId: data.customerId && data.customerId !== '__new__' ? data.customerId : undefined,
      fullName: data.fullName || undefined,
      phone: data.phone || undefined,
      idNumber: data.idNumber || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      sourceId: data.sourceId || undefined,
    };

    const itemsPayload = data.items.map((item) => ({
      kind: item.kind,
      roomId: item.roomId || undefined,
      serviceId: item.serviceId || undefined,
      surchargeTypeId: item.surchargeTypeId || undefined,
      refCode: item.refCode || undefined,
      refName: item.refName || undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note || undefined,
    }));

    const paymentsPayload = data.payments.map((p) => ({
      methodId: p.methodId,
      amount: p.amount,
      paidAt: p.paidAt || undefined,
      note: p.note || undefined,
    }));

    if (isEditing && editTarget) {
      updateMutation.mutate(
        {
          id: editTarget.id,
          body: {
            statusId: data.statusId,
            sourceId: data.sourceId || undefined,
            priceTypeId: data.priceTypeId || undefined,
            packageId: data.packageId || undefined,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            checkInTime: data.checkInTime || undefined,
            checkOutTime: data.checkOutTime || undefined,
            adults: data.adults,
            children: data.children,
            numRooms: data.numRooms,
            note: data.note || undefined,
            customer: customerPayload,
            items: itemsPayload,
            payments: paymentsPayload,
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Cập nhật booking thành công', variant: 'success' });
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(
        {
          statusId: data.statusId,
          sourceId: data.sourceId || undefined,
          priceTypeId: data.priceTypeId || undefined,
          packageId: data.packageId || undefined,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          checkInTime: data.checkInTime || undefined,
          checkOutTime: data.checkOutTime || undefined,
          adults: data.adults,
          children: data.children,
          numRooms: data.numRooms,
          note: data.note || undefined,
          customer: customerPayload,
          items: itemsPayload,
          payments: paymentsPayload,
        },
        {
          onSuccess: () => {
            toast({ title: 'Tạo booking thành công', variant: 'success' });
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    }
  }

  const isExistingCustomer =
    watchedCustomerId !== '' && watchedCustomerId !== '__new__' && !!watchedCustomerId;

  const dialogTitle =
    mode === 'create'
      ? 'Tạo booking'
      : mode === 'edit'
        ? 'Sửa booking'
        : `Chi tiết booking${editTarget ? ' ' + editTarget.code : ''}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {(isEditing || isViewing) && detailLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <form
            onSubmit={isViewing ? undefined : handleSubmit(onSubmit)}
            id="booking-form"
            className="space-y-5"
          >
            {/* ── Section 1: THÔNG TIN BOOKING ─────────────────────────────── */}
            <SectionHeader title="Thông tin booking" />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* Ngày tạo */}
              <div className="space-y-1.5">
                <Label>Ngày tạo</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {isEditing && editTarget ? editTarget.createdAt.split('T')[0] : todayIso()}
                </div>
              </div>

              {/* Trạng thái */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-status">Trạng thái</Label>
                <Controller
                  name="statusId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="booking-status" aria-invalid={!!errors.statusId}>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.statusId && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.statusId.message}
                  </p>
                )}
              </div>

              {/* Loại giá */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-price-type">Loại giá</Label>
                <Controller
                  name="priceTypeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="booking-price-type">
                        <SelectValue placeholder="Chọn loại giá" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {priceTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Nguồn booking */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-source">Nguồn booking</Label>
                <Controller
                  name="sourceId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="booking-source">
                        <SelectValue placeholder="Chọn nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {sources.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {/* Gói giá ưu đãi */}
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="booking-package">Gói giá ưu đãi</Label>
                <Controller
                  name="packageId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="booking-package">
                        <SelectValue placeholder="Không chọn gói" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn gói nào</SelectItem>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Check-in date */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-checkin">Check-in</Label>
                <Input
                  id="booking-checkin"
                  type="date"
                  aria-invalid={!!errors.checkIn}
                  disabled={isDisabled}
                  {...register('checkIn')}
                />
                {errors.checkIn && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.checkIn.message}
                  </p>
                )}
              </div>

              {/* Check-in time */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-checkin-time">Giờ check-in</Label>
                <Input
                  id="booking-checkin-time"
                  type="time"
                  disabled={isDisabled}
                  {...register('checkInTime')}
                />
              </div>

              {/* Check-out date */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-checkout">Check-out</Label>
                <Input
                  id="booking-checkout"
                  type="date"
                  aria-invalid={!!errors.checkOut}
                  disabled={isDisabled}
                  {...register('checkOut')}
                />
                {errors.checkOut && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.checkOut.message}
                  </p>
                )}
              </div>

              {/* Check-out time */}
              <div className="space-y-1.5">
                <Label htmlFor="booking-checkout-time">Giờ check-out</Label>
                <Input
                  id="booking-checkout-time"
                  type="time"
                  disabled={isDisabled}
                  {...register('checkOutTime')}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="booking-adults">Người lớn</Label>
                <Input
                  id="booking-adults"
                  type="number"
                  min={0}
                  disabled={isDisabled}
                  {...register('adults')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-children">Trẻ em</Label>
                <Input
                  id="booking-children"
                  type="number"
                  min={0}
                  disabled={isDisabled}
                  {...register('children')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-num-rooms">Số phòng</Label>
                <Input
                  id="booking-num-rooms"
                  type="number"
                  min={1}
                  disabled={isDisabled}
                  {...register('numRooms')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-note">Ghi chú</Label>
                <Input
                  id="booking-note"
                  placeholder="Ghi chú booking..."
                  disabled={isDisabled}
                  {...register('note')}
                />
              </div>
            </div>

            {/* ── Section 2: KHÁCH HÀNG ─────────────────────────────────────── */}
            <SectionHeader title="Khách hàng & tự fill thông tin" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="booking-customer-select">Khách lẻ / mới khách</Label>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="booking-customer-select">
                        <SelectValue placeholder="Khách mới (nhập tay)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">Khách mới (nhập tay)</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullName}
                            {c.phone ? ` — ${c.phone}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="booking-fullname">Họ tên</Label>
                <Input
                  id="booking-fullname"
                  placeholder="Nguyễn Văn A"
                  disabled={isDisabled || isExistingCustomer}
                  {...register('fullName')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="booking-phone">SĐT đặt phòng</Label>
                <Input
                  id="booking-phone"
                  placeholder="0912345678"
                  aria-invalid={!!errors.phone}
                  disabled={isDisabled || isExistingCustomer}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="booking-idnumber">CCCD/CMND</Label>
                <Input
                  id="booking-idnumber"
                  placeholder="012345678910"
                  disabled={isDisabled || isExistingCustomer}
                  {...register('idNumber')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-email">Email</Label>
                <Input
                  id="booking-email"
                  type="email"
                  placeholder="khach@example.com"
                  aria-invalid={!!errors.email}
                  disabled={isDisabled || isExistingCustomer}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-address">Địa chỉ</Label>
                <Input
                  id="booking-address"
                  placeholder="Tp. Hồ Chí Minh"
                  disabled={isDisabled || isExistingCustomer}
                  {...register('address')}
                />
              </div>
            </div>

            {/* ── Section 3: CHI TIẾT BOOKING LINH HOẠT ───────────────────── */}
            <SectionHeader title="Chi tiết booking linh hoạt" />

            {/* Add-item chips */}
            {!isDisabled && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addItem('ROOM')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  aria-label="Thêm thuê phòng"
                >
                  <BedDouble className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  Thuê phòng
                </button>
                <button
                  type="button"
                  onClick={() => addItem('SERVICE')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  aria-label="Thêm dịch vụ"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  Dịch vụ
                </button>
                <button
                  type="button"
                  onClick={() => addItem('SURCHARGE')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  aria-label="Thêm phụ thu"
                >
                  <ArrowUpCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  Phụ thu
                </button>
                <button
                  type="button"
                  onClick={() => addItem('DISCOUNT')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  aria-label="Thêm giảm trừ"
                >
                  <MinusCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
                  Giảm trừ
                </button>
              </div>
            )}

            {/* Items table */}
            {itemFields.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4 border border-dashed border-border rounded-lg">
                Chưa có dòng nào — chọn loại ở trên để thêm
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Chi tiết booking">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Loại
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Phòng / DV / Loại
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Tên tham chiếu
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        SL
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Đơn giá
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Thành tiền
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Ghi chú
                      </th>
                      {!isDisabled && <th className="px-2 py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {itemFields.map((field, index) => {
                      const kind = watch(`items.${index}.kind`);
                      const qty = watch(`items.${index}.quantity`) ?? 0;
                      const price = watch(`items.${index}.unitPrice`) ?? 0;
                      const lineAmount = kind === 'DISCOUNT' ? -(qty * price) : qty * price;

                      return (
                        <tr key={field.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-2 py-2">
                            <KindBadge kind={kind} />
                          </td>

                          {/* Conditional ref selector */}
                          <td className="px-2 py-2 min-w-[140px]">
                            {kind === 'ROOM' ? (
                              <Controller
                                name={`items.${index}.roomId`}
                                control={control}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value ?? ''}
                                    onValueChange={(v) => {
                                      f.onChange(v);
                                      const r = rooms.find((room) => room.id === v);
                                      if (r) {
                                        setValue(`items.${index}.refCode`, r.code);
                                        setValue(`items.${index}.refName`, r.name);
                                        setValue(
                                          `items.${index}.unitPrice`,
                                          parseFloat(r.basePrice),
                                        );
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Chọn phòng" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {rooms.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                          {r.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : kind === 'SERVICE' ? (
                              <Controller
                                name={`items.${index}.serviceId`}
                                control={control}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value ?? ''}
                                    onValueChange={(v) => {
                                      f.onChange(v);
                                      const svc = services.find((s) => s.id === v);
                                      if (svc) {
                                        setValue(`items.${index}.refCode`, svc.code);
                                        setValue(`items.${index}.refName`, svc.name);
                                        setValue(`items.${index}.unitPrice`, parseFloat(svc.price));
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Chọn dịch vụ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {services.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : kind === 'SURCHARGE' ? (
                              <Controller
                                name={`items.${index}.surchargeTypeId`}
                                control={control}
                                render={({ field: f }) => (
                                  <Select
                                    value={f.value ?? ''}
                                    onValueChange={(v) => {
                                      f.onChange(v);
                                      const st = surchargeTypes.find((t) => t.id === v);
                                      if (st) {
                                        setValue(`items.${index}.refCode`, st.code);
                                        setValue(`items.${index}.refName`, st.name);
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Chọn loại phụ thu" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {surchargeTypes.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : (
                              <Input
                                className="h-8 text-xs"
                                placeholder="Mô tả giảm trừ"
                                disabled={isDisabled}
                                {...register(`items.${index}.refName`)}
                              />
                            )}
                          </td>

                          {/* refName read-only for ROOM/SERVICE/SURCHARGE */}
                          <td className="px-2 py-2 min-w-[120px]">
                            <Input
                              className="h-8 text-xs"
                              placeholder="Tên tham chiếu"
                              disabled={isDisabled || kind !== 'DISCOUNT'}
                              {...register(`items.${index}.refName`)}
                            />
                          </td>

                          {/* Quantity */}
                          <td className="px-2 py-2 w-16">
                            <Input
                              className="h-8 text-xs text-center"
                              type="number"
                              min={0}
                              disabled={isDisabled}
                              {...register(`items.${index}.quantity`)}
                            />
                          </td>

                          {/* Unit price */}
                          <td className="px-2 py-2 w-28">
                            <Input
                              className="h-8 text-xs text-right"
                              type="number"
                              min={0}
                              disabled={isDisabled}
                              {...register(`items.${index}.unitPrice`)}
                            />
                          </td>

                          {/* Line total */}
                          <td className="px-2 py-2 text-right whitespace-nowrap font-medium">
                            <span className={lineAmount < 0 ? 'text-rose-600' : ''}>
                              {lineAmount < 0
                                ? `- ${formatVnd(Math.abs(lineAmount))}`
                                : formatVnd(lineAmount)}
                            </span>
                          </td>

                          {/* Note */}
                          <td className="px-2 py-2 min-w-[100px]">
                            <Input
                              className="h-8 text-xs"
                              placeholder="Ghi chú"
                              disabled={isDisabled}
                              {...register(`items.${index}.note`)}
                            />
                          </td>

                          {/* Remove */}
                          {!isDisabled && (
                            <td className="px-2 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(index)}
                                aria-label={`Xoá dòng ${index + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Section 4: THANH TOÁN NHIỀU ĐỢT ─────────────────────────── */}
            <SectionHeader title="Thanh toán nhiều đợt" />

            {!isDisabled && (
              <button
                type="button"
                onClick={() =>
                  appendPayment({
                    methodId: '',
                    amount: 0,
                    paidAt: todayIso(),
                    note: '',
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                aria-label="Thêm thanh toán"
              >
                <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                Thanh toán
              </button>
            )}

            {paymentFields.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-3 border border-dashed border-border rounded-lg">
                Chưa có đợt thanh toán nào
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Thanh toán">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Phương thức
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Số tiền
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Ngày
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                        Ghi chú
                      </th>
                      {!isDisabled && <th className="px-2 py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentFields.map((field, index) => (
                      <tr key={field.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-2 py-2 min-w-[140px]">
                          <Controller
                            name={`payments.${index}.methodId`}
                            control={control}
                            render={({ field: f }) => (
                              <Select
                                value={f.value}
                                onValueChange={f.onChange}
                                disabled={isDisabled}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Chọn phương thức" />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethods.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.payments?.[index]?.methodId && (
                            <p className="text-xs text-destructive mt-0.5" role="alert">
                              {errors.payments[index]?.methodId?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2 w-32">
                          <Input
                            className="h-8 text-xs text-right"
                            type="number"
                            min={0}
                            disabled={isDisabled}
                            {...register(`payments.${index}.amount`)}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[130px]">
                          <Input
                            className="h-8 text-xs"
                            type="date"
                            disabled={isDisabled}
                            {...register(`payments.${index}.paidAt`)}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Ghi chú"
                            disabled={isDisabled}
                            {...register(`payments.${index}.note`)}
                          />
                        </td>
                        {!isDisabled && (
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removePayment(index)}
                              aria-label={`Xoá thanh toán ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Summary ──────────────────────────────────────────────────── */}
            <div className="flex flex-col items-end gap-1 rounded-lg bg-muted px-4 py-3 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Tổng tiền:</span>
                <span className="font-semibold min-w-[100px] text-right">
                  {formatVnd(totalAmount)}
                </span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground">Đã thanh toán:</span>
                <span className="font-semibold min-w-[100px] text-right text-emerald-600">
                  {formatVnd(paidAmount)}
                </span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground">Còn lại:</span>
                <span
                  className={`font-semibold min-w-[100px] text-right ${remaining > 0 ? 'text-rose-600' : remaining < 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                >
                  {formatVnd(remaining)}
                </span>
              </div>
            </div>
          </form>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              {isViewing ? 'Đóng' : 'Huỷ'}
            </Button>
          </DialogClose>
          {!isViewing && (
            <Button form="booking-form" type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
              Lưu booking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
