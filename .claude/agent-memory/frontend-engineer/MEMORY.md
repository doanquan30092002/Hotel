# Frontend Engineer Memory

## Conventions

- Route group `(dashboard)` cho mọi trang sau đăng nhập, share `layout.tsx` chứa Sidebar + Topbar.
- Route group `(auth)` cho trang đăng nhập (centered card, no sidebar).
- Trang client component khi cần useState/useQuery, đặt `'use client'` ở dòng đầu.
- Server component dùng cho layouts và data prefetch (nếu áp dụng SSR).
- Form: React Hook Form + zodResolver. Validation message tiếng Việt.

## Auth store pattern (Phase 1)

- Zustand `persist` middleware lưu `hotel.auth` vào localStorage (JSON: `{state:{accessToken,refreshToken,user}}`).
- `useAuth()` hook wraps store → `isAuthenticated`, `hasRole(...roles)`.
- Dashboard layout guard: check `accessToken` on mount, call `/auth/me` to verify, redirect `/dang-nhap` on failure.
- `src/lib/auth/auth-store.ts` + `src/lib/auth/use-auth.ts`.

## Refresh-on-401 pattern (api-client.ts)

- Response interceptor: on 401 (non-auth path, not already retried), read `refreshToken` from `hotel.auth` localStorage key, POST `/auth/refresh`, update localStorage, retry original. On failure: clear + redirect `/dang-nhap`.
- Uses `isRefreshing` flag + `failedQueue` to prevent multiple simultaneous refresh calls.

## Layout shell pattern

- `Sidebar.tsx`: 240px expanded / 64px collapsed, toggle via `collapsed` prop from parent. Active item `bg-primary text-primary-foreground rounded-lg`. Nav items defined in `sidebar-nav.ts`.
- `Topbar.tsx`: 56px, page title from `PAGE_TITLES` map, "Booking mới" + "Dọn phòng" buttons, user avatar dropdown (fullName + role + logout).
- Dashboard layout: `flex h-screen overflow-hidden`. Sidebar fixed width, main content `flex-1 overflow-y-auto`.
- `sidebar-nav.ts` exports `NAV_ITEMS` (16 items) and `PAGE_TITLES` map.

## Theme switcher pattern (Phase 1)

- `ThemeProvider` (context): reads `hotel.themeTone` from localStorage on mount, sets `document.documentElement.dataset.tone`.
- `useTheme()` → `{tone: 1|2|3, setTone}`. `setTone` updates DOM + localStorage + calls `PUT /settings` if authenticated.
- CSS vars in `globals.css` use `:root[data-tone="1|2|3"]`. Tone 2 is default (`:root` + `[data-tone="2"]`).
- 3 tones: Pink Boutique (322 70% 56%), Boutique Vibe (271 76% 53%), Olive Organic (95 40% 40%).

## shadcn primitives (Phase 1, in `components/ui/`)

- `button.tsx` — CVA variants: default/secondary/destructive/outline/ghost/link. Sizes: default/sm/lg/icon.
- `input.tsx` — h-10, border-input, ring-primary/30 on focus.
- `label.tsx` — wraps `@radix-ui/react-label`.
- `card.tsx` — Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter.
- `use-toast.ts` — module-level store, auto-dismiss 4s, `toast()` imperative function.
- `toast.tsx` + `toaster.tsx` — fixed bottom-right stack, variants: default/destructive/success.
- `dropdown-menu.tsx` — wraps `@radix-ui/react-dropdown-menu`.
- `avatar.tsx` — initials fallback, `next/image` when src present.

## Providers pattern

- `components/providers.tsx` wraps `QueryClientProvider` + `ThemeProvider` + `Toaster`.
- Root layout (`app/layout.tsx`) keeps `<html data-tone="2">` (ThemeProvider overrides on mount from localStorage).

## Theme tokens (3 tone — xem ảnh `7_16_12`)

CSS variables trong `globals.css`:

```css
:root[data-tone='1'] {
  /* Pink Boutique */
  --primary: 322 70% 56%;
  --accent: 340 80% 70%;
}
:root[data-tone='2'] {
  /* Boutique Vibe (default) */
  --primary: 271 76% 53%;
  --accent: 295 65% 60%;
}
:root[data-tone='3'] {
  /* Olive Organic */
  --primary: 95 40% 40%;
  --accent: 120 30% 55%;
}
```

## Status badge palette

| Trạng thái      | Class Tailwind                    |
| --------------- | --------------------------------- |
| Đang ở / Active | `bg-emerald-100 text-emerald-700` |
| Chờ xác nhận    | `bg-amber-100 text-amber-700`     |
| Đã đặt cọc      | `bg-sky-100 text-sky-700`         |
| Đã huỷ          | `bg-rose-100 text-rose-700`       |
| Đã trả phòng    | `bg-zinc-100 text-zinc-700`       |
| Bảo trì         | `bg-orange-100 text-orange-700`   |

## Reusable components

- `<ComingSoon phase title />` — stub placeholder for unimplemented pages.
- `<PageHeader title actions />` — title + breadcrumb + actions slot (xem ảnh đầu mỗi page).
- `<DataTable columns data />` — TanStack Table v8 wrapper với pagination + sort + filter.
- `<KpiCard icon label value delta />` — card stat cho dashboard (xem ảnh `7_15_02`).
- `<StatusBadge value />` — map status enum → badge class.
- `<ChartAreaTrend />`, `<ChartDonutStatus />`, `<ChartGauge />`, `<ChartHeatmapOccupancy />`, `<ChartBar />` — Recharts wrappers.

## Phase 2 UI primitives (in `components/ui/`)

- `dialog.tsx` — wraps `@radix-ui/react-dialog`. DialogContent uses `z-50`, `rounded-xl`, `shadow-xl`, max-w-md. Close button (X icon) built-in with `aria-label="Đóng"`.
- `select.tsx` — wraps `@radix-ui/react-select`. SelectTrigger h-10 matches Input. Uses `popper` position for dropdown.
- `switch.tsx` — wraps `@radix-ui/react-switch`. h-5 w-9, primary when checked, input color when unchecked.
- `badge.tsx` — CVA variants: default/emerald/sky/amber/orange/rose/zinc/outline. Pill-shaped via `rounded-full`.
- `skeleton.tsx` — `animate-pulse rounded-md bg-muted`, `aria-hidden="true"`.

## GroupCount KPI pattern (Phase 2)

- `useGroupCounts()` returns `GroupCount[]`. KPI row derives 4 values: `sum(total)`, `length`, `sum(active)`, `total-active`.
- KPI card component: icon + label + animated Skeleton (while loading) or value (bold 2xl).
- GroupCount staleTime 30s same as list.

## Chip-filter pattern (Phase 2)

- Horizontal `flex flex-wrap gap-2` of `<button>` tags inside a Card.
- Active chip: `bg-primary text-primary-foreground`, inactive: `border border-border text-muted-foreground`.
- Each chip shows `<label> (<active count>)` from groupCounts data.
- Chip state is synced with the Select dropdown above via shared `activeGroup` state.
- `aria-pressed` on each chip for accessibility.

## RBAC-gated actions pattern (Phase 2)

- `const canEdit = hasRole('ADMIN', 'MANAGER')` from `useAuth()`.
- Edit/Delete buttons, Add button, and Switch toggle all wrapped in `{canEdit && ...}`.
- When `canEdit` is false, actions column renders nothing; read-only view for RECEPTIONIST/HOUSEKEEPING.
- Dialog form: Select for group is `disabled={isEditing}` (group immutable per API contract).

## Debounce hook

- `lib/hooks/use-debounced-value.ts` — generic `useDebouncedValue<T>(value, delay=300)` using `useEffect + setTimeout`. Resets page to 1 whenever keyword changes.

## Category hooks pattern

- `CATEGORY_KEYS` const for consistent query keys: `['categories']` as base, `['categories','list',params]`, `['categories','group-counts']`.
- All mutations invalidate `CATEGORY_KEYS.all` (which invalidates both list and group-counts).
- `useToggleActive()` calls `PATCH /categories/:id/toggle-active`.

## Phase 3 UI primitives (in `components/ui/`)

- `textarea.tsx` — native `<textarea>` with Tailwind ring + border + resize-y. Forwarded ref, same height/color tokens as Input.

## Rooms page patterns (Phase 3)

- `formatVnd(n)` in `lib/format.ts` — `Intl.NumberFormat('vi-VN', {style:'decimal'}).format(n) + ' đ'`. Returns '—' for null/undefined.
- `ROOM_KEYS` mirrors `CATEGORY_KEYS` pattern: `['rooms']`, `['rooms','list',params]`, `['rooms','detail',id]`.
- `useChangeRoomStatus()` → `PATCH /rooms/:id/status { statusId }`. `useChangeRoomCleaning()` → `PATCH /rooms/:id/cleaning { cleaningStatusId }`.
- Inline status/cleaning change: DropdownMenu wrapping a Badge (trigger=asChild button). Only rendered when `canChange` is true. Badge has `cursor-pointer hover:opacity-80`.
- View toggle (Bảng/Lưới): two `<button>` inside `role="group"` div, active = `bg-primary text-primary-foreground`, inactive = `bg-background text-muted-foreground`. Each has `aria-pressed` and `aria-label`.
- Grid view: `grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. Card with aspect-ratio image (relative h-36 w-full + next/image fill).
- Room image placeholder: `<div>` with `BedDouble` icon when `images[0]` is undefined.
- RoomFormDialog uses `max-w-2xl max-h-[90vh] overflow-y-auto` DialogContent for longer form.
- Edit dialog shows code as read-only text (no Input) — code is immutable post-creation.
- Images field: `<Textarea>` with one URL per line. `parseImages()` splits on newline, trims, filters empty.
- Zod weekendPrice/holidayPrice: `z.union([z.coerce.number().min(0), z.literal('')])` to allow clearing optional price fields.

## Zustand persist hydration gotcha (CRITICAL)

- Zustand `persist` middleware initializes store with null values on server/first render. Even in `'use client'` components with `addInitScript` in Playwright, the store starts null before hydration.
- Dashboard layout must wait for hydration with a `hydrated` flag state:
  ```ts
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return; /* auth check */
  }, [hydrated]);
  if (!hydrated || !checked) return null;
  ```
- Without this, Playwright tests with `addInitScript` for localStorage still redirect to `/dang-nhap`.

## Playwright auth pattern (Phase 3)

- Use `page.addInitScript((auth) => { window.localStorage.setItem('hotel.auth', auth); }, AUTH_JSON)` to inject auth BEFORE page JS runs — more reliable than `page.evaluate` after `goto('/')`.
- Set up `page.route()` mocks BEFORE `page.goto()`.
- `/auth/me` mock must return the CORRECT role — the layout calls `setSession()` with the me response, overwriting localStorage user. If you mock ADMIN user but inject RECEPTIONIST auth, page shows ADMIN controls.
- Separate `MOCK_ME_ADMIN` and `MOCK_ME_RECEPTIONIST` constants; pass role to `setupMocks(page, role)`.

## Playwright gotcha

- Login page has both `<input aria-label="Mật khẩu">` and a toggle button with `aria-label="Hiện mật khẩu"`. `getByLabel('Mật khẩu')` matches 2 elements → use `.first()` to avoid strict mode violation.

## Gotchas

- `noUncheckedIndexedAccess`: array index access returns `T | undefined` — always guard.
- Cài đặt page: `monthlyRevenueTarget` can be empty string in form (coerce to null before PUT).
- `sidebar-nav.ts` uses React type for icon prop — must be `.ts` not `.tsx` since it only exports data, but the type references `React.ComponentType` which resolves via global JSX namespace (tsconfig includes dom).
- `(auth)/layout.tsx` uses `React.ReactNode` without import — Next.js 14 global React type works via tsconfig lib.

## Pagination (MANDATORY for every list/table page)

User feedback 2026-05-22: phải luôn hiển thị pagination footer + pageSize picker, KHÔNG ẩn khi `totalPages === 1`. Default `pageSize = 10` (không phải 20).

Template — copy cho mọi trang list mới (Services, Bookings, Housekeeping, Finance, Staff, Payroll, Uploads, Reports):

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
// ...useXxx({ page, pageSize, ... })
const totalPages = meta?.totalPages ?? 1;
const total = meta?.total ?? items.length;

// Sau CardContent, LUÔN render (không có guard totalPages > 1):
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
  <span className="text-sm text-muted-foreground">
    {total === 0
      ? 'Không có dữ liệu'
      : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong tổng ${total} <đơn vị>`}
  </span>
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Số dòng / trang</span>
      <Select
        value={String(pageSize)}
        onValueChange={(v) => {
          setPageSize(Number(v));
          setPage(1);
        }}
      >
        <SelectTrigger className="h-9 w-[80px]" aria-label="Số dòng mỗi trang">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[5, 10, 20, 50, 100].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <span className="text-sm text-muted-foreground">
      Trang {page} / {totalPages}
    </span>
    <Button
      variant="outline"
      size="icon"
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page <= 1}
      aria-label="Trang trước"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      disabled={page >= totalPages}
      aria-label="Trang tiếp"
    >
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  </div>
</div>;
```

Reset `page = 1` khi: pageSize đổi, keyword đổi (debounce), filter đổi. Đã áp dụng retroactive cho `/phong` và `/khach-hang` 2026-05-22.

## Phase 4 patterns (Customers)

- `CUSTOMER_KEYS` mirrors `ROOM_KEYS`: `['customers']`, `['customers','list',params]`, `['customers','detail',id]`.
- RBAC for customers: `canAdd/canEdit = hasRole('ADMIN','MANAGER','RECEPTIONIST')`, `canDelete = hasRole('ADMIN','MANAGER')` — HOUSEKEEPING sees no Add button and no Edit/Delete.
- `Avatar` component in `components/ui/avatar.tsx` is a custom component (NOT radix-based). Props: `{ src?, name?, size?, className? }`. Renders initials internally — do NOT import AvatarFallback.
- Docs field: render as existence indicator only (FileText badge with count) in table; plain text count in detail dialog. No upload UI — deferred to Phase 12.
- Detail dialog "Lịch sử" section: static placeholder text "Sẽ hiển thị lịch sử booking ở Phase 6".
- Grid card layout: `Avatar name={c.fullName} size={40}` + code (mono xs) + fullName (semibold sm) + 3 body lines with Phone/CreditCard/MapPin icons + footer source badge + actions row.

## Decisions

- 2026-05-21: TanStack Query staleTime mặc định 30s cho list, 0 cho detail.
- 2026-05-21: 401 trên axios → tự refresh access token một lần, nếu vẫn 401 → redirect `/dang-nhap`.
- 2026-05-21: Toast dùng module-level store (không cần context/zustand riêng). `toast()` imperative API.
- 2026-05-21: Auth store persisted to `hotel.auth` (JSON), themeTone to `hotel.themeTone` (string).

## Phase 5 patterns (Services + Price Packages)

- `SERVICE_KEYS` / `PACKAGE_KEYS` follow same shape as `ROOM_KEYS` / `CUSTOMER_KEYS`: `['services']` base, `['services','list',params]`, `['services','detail',id]`.
- Services page uses `useCategories({ group: 'SERVICE_GROUP', active: true, pageSize: 100 })` and `useCategories({ group: 'UNIT', active: true, pageSize: 100 })` for dropdown options — same hook, different `group` param.
- RBAC for both pages: `canWrite = hasRole('ADMIN', 'MANAGER')`. RECEPTIONIST and HOUSEKEEPING get read-only (no Add/Edit/Delete).
- Package form uses Zod `.refine()` for cross-field validation: `validTo >= validFrom`. Path is `['validTo']` so the error appears on the `validTo` field.
- `formatDate(iso)` helper splits YYYY-MM-DD string and returns DD/MM/YYYY — avoids timezone issues from `new Date()` parsing.
- Playwright strict mode fix: when `getByText()` matches multiple elements, use `getByRole('columnheader', { name: ... })` for table headers, `getByRole('cell', { name: ..., exact: true })` for table cells with exact match.
- Playwright workers: run `--workers=2` when 4 workers cause timeout race on unauthenticated redirect tests (server cold start with 4 parallel navigations to unloaded pages). Tests pass at 2 workers.
- `import type { Package as PricePackage }` — rename to avoid conflict with built-in `Package` type if any; clearer intent.
- `Switch` component imported from `@/components/ui/switch` — available since Phase 2. Used for active/inactive toggle in form dialogs.
- Date inputs: use `<Input type="date">` with `aria-invalid`. BE expects ISO date string `YYYY-MM-DD` which is exactly what `<input type="date">` produces.
- Static apply type list for packages: `['Standard', 'VillaVIP', 'Bungalow', 'Family', 'Deluxe']` as `const` — not fetched from BE. Update if BE adds more types.

## Phase 6 patterns (Bookings)

- `BOOKING_KEYS` follows same shape as other keys: `['bookings']` base, `['bookings','list',params]`, `['bookings','detail',id]`.
- RBAC for bookings: `canAdd/canEdit = hasRole('ADMIN','MANAGER','RECEPTIONIST')`, `canDelete = hasRole('ADMIN','MANAGER')`. HOUSEKEEPING sees list read-only, no Add/Edit/Delete.
- Big dialog pattern: `DialogContent` with `max-w-5xl max-h-[92vh] overflow-y-auto` for forms with many fields. Use `SectionHeader` component with `bg-muted rounded-lg` bar to visually separate sections.
- `useFieldArray` for nested items table: `const { fields, append, remove } = useFieldArray({ control, name: 'items' })`. Use `watch('items.N.kind')` to conditionally render different select types per row (ROOM → room select, SERVICE → service select, SURCHARGE → surcharge type select, DISCOUNT → free text).
- Auto-fill pattern: when Select `onValueChange` fires for a room/service pick, call `setValue('items.N.refCode', ...)` + `setValue('items.N.unitPrice', ...)` to populate dependent fields automatically.
- Auto-fill customer: `useEffect` watching `customerId` from form → find customer in loaded list → `setValue` for fullName/phone/idNumber/email/address. Customer fields become `disabled={isExistingCustomer}`.
- Computed totals live: `watch('items')` and `watch('payments')` → reduce to get totalAmount + paidAmount → remaining = total - paid. DISCOUNT items subtract: `amount = -(qty * price)`.
- `useMemo` required for arrays derived from query data when used in `useEffect` deps: `const customers = useMemo(() => data?.data ?? [], [data])` — avoids react-hooks/exhaustive-deps warning.
- Kind badge: `ROOM → sky`, `SERVICE → emerald`, `SURCHARGE → amber`, `DISCOUNT → rose` — consistent with booking status palette.
- Booking status badge class map: `pending → amber`, `confirmed → sky`, `checked_in → emerald`, `checked_out → zinc`, `cancelled → rose`. Key is `status.code` (not name).
- Inline check-in/check-out buttons: only show `LogIn` icon when `status.code === 'confirmed'`, only show `LogOut` when `status.code === 'checked_in'`. Both behind `canEdit` RBAC gate.
- Mode prop pattern for shared form dialog: `mode: 'create' | 'edit' | 'view'`. In view mode all inputs are `disabled`, footer shows only "Đóng" button. Edit mode pre-fetches detail via `useBooking(id)` with `staleTime: 0`.
- `todayIso()` / `tomorrowIso()` helpers in dialog file: compute date strings client-side with `new Date()` avoiding SSR concerns (dialog is always client-rendered).
- Items table for DISCOUNT rows: refName field is writable (user types description), not auto-filled from a select — use same `<Input>` for both the "ref selector" column and the refName column but hide the duplicate.
- `items` table `kind` column uses `watch('items.${index}.kind')` to react to form state — ensures live badge update when kind changes.
