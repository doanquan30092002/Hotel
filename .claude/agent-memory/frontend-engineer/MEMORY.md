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

## Phase 7 patterns (Calendar booking)

### Date helpers (lib/calendar-utils.ts)

- `parseDate(iso)`: split YYYY-MM-DD on `-`, pass to `new Date(y, m-1, d)` — avoids UTC timezone shift from `new Date(isoString)`.
- `formatIso(d)`: manual `getFullYear/getMonth/getDate` + padStart — same timezone safety.
- `addDays(d, n)`: clone Date, setDate. `startOfMonth/endOfMonth/startOfWeek/endOfWeek/startOfDay/endOfDay` all return new Date objects.
- `endOfMonth` returns first day of NEXT month (exclusive), `endOfWeek` returns Monday of next week (exclusive) — use `daysBetween(rangeStart, rangeEnd)` to get the count N.
- `startOfWeek`: day=0(Sun) → offset=-6, else → offset=1-day. ISO Monday-start week.
- `daysBetween(from, to)`: `Math.round((to - from) / 86_400_000)`. Works for computing startCol/endCol for booking bars.
- `VN_WEEKDAYS = ['CN','T2','T3','T4','T5','T6','T7']` — index 0 = Sunday, matches `Date.getDay()`.

### Absolute-positioned booking bars over CSS grid

- Month/week view uses a `<div className="relative flex">` per room row. Day cells are rendered as normal flow divs (width=cellWidth) for background lines and today highlight.
- Booking bars are `position: absolute` on top, computed via: `startCol = max(0, daysBetween(rangeStart, checkInDate))`, `endCol = min(N, daysBetween(rangeStart, checkOutDate))`. `left = startCol * cellWidth + 1`, `width = (endCol - startCol) * cellWidth - 2`.
- Cell widths: `MONTH_CELL_W = 48`, `WEEK_CELL_W = 140`. Label inside bar truncates — show full code + customer name only when cellWidth >= 100.
- `title` attribute on each bar for hover tooltip: `{code} · {customer?.fullName ?? '—'} · {status.name}`.
- Playwright test: `page.getByTitle(/BK001/).first()` to assert booking bar visible.

### View switcher pattern (3 pill buttons)

- State: `view: CalendarView = 'month'`, `anchorDate: Date = today`.
- Derive `from`/`to` via `useMemo` on (view, anchorDate): month → startOfMonth..endOfMonth, week → startOfWeek..endOfWeek, day → startOfDay..endOfDay.
- Navigation `goPrev/goNext`: month → addDays(startOfMonth(d), -1) / addDays(endOfMonth(d), 1); week → addDays(d, ±7); day → addDays(d, ±1).
- View switcher: `role="group"` div, each button has `aria-pressed={view===v}` and `aria-label="Xem theo Tháng/Tuần/Ngày"`.
- Active style: `bg-primary text-primary-foreground`, inactive: `bg-background text-muted-foreground hover:bg-muted`.

### Day view

- Time strip is a `relative` container. Grid lines at 0, 6, 12, 18, 24h using `border-l border-dashed` absolute divs at `left: ${h/24*100}%`.
- Booking block: `leftPct = (startMin / 1440) * 100`, `widthPct = max(2, (durationMin / 1440) * 100)`. Default checkInTime = '14:00', checkOutTime = '12:00'.
- Empty room: "Trống trong ngày — Nhấp đôi để đặt nhanh hoặc thêm mới".

### Status color map for booking bars

- `pending → bg-amber-400 text-amber-900`
- `confirmed → bg-sky-400 text-sky-900`
- `checked_in → bg-emerald-400 text-emerald-900`
- `checked_out → bg-zinc-300 text-zinc-800`
- `cancelled → bg-rose-300 text-rose-900`

### Sticky room label column

- `sticky left-0 z-10 bg-card` ensures the room label stays visible when scrolling horizontally.
- Room label col width: `ROOM_COL_W = 180px`. Set both `width` and `minWidth` in style prop.

### Calendar query key pattern

- `CALENDAR_KEYS = { all: ['calendar'], range: (params) => ['calendar', 'range', params] }`. Same shape as ROOM_KEYS / BOOKING_KEYS.

### KPI test locator gotcha

- Avoid `getByText('2')` — it matches any element with text containing "2" (Tone 2 in theme switcher, month numbers, etc.). Use specific text like `getByText('81%')` or `getByText('Công suất ước tính')` instead.

## Phase 8 patterns (Tìm phòng trống nhanh)

### Date-range filter bar pattern

- Filter bar in a `<Card className="p-4">` with `flex flex-wrap items-end gap-3`.
- Date inputs: `<Input type="date">` with `aria-label` for Playwright accessibility.
- Capacity/type selects: use `__all__` as the "all" select value — NEVER use empty string `""` as `SelectItem value`. Radix Select throws `A <Select.Item /> must have a value prop that is not an empty string`.
- Initial state for selects: `useState('__all__')`. Translate `'__all__'` → `undefined` before building query params.
- Submit button fires `handleSearch()` which copies state to `submitted` object (TanStack Query key). This decouples filter inputs from API calls — no request until user clicks Search.

### useAvailableRooms hook

- File: `lib/hooks/use-available-rooms.ts`.
- `AVAILABLE_KEYS = { all: ['rooms-available'], list: (params) => ['rooms-available', 'list', params] }`.
- Accepts `(params: AvailableRoomsQuery, enabled: boolean)`. `enabled` gate prevents spurious requests.
- Returns `{ data: Room[], meta: AvailableRoomsMeta }` where meta includes `{ totalRooms, totalAvailable, totalBooked, checkIn, checkOut }`.

### KPI row from BE meta

- Four KPI cards in `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4`.
- Values from `query.data?.meta`: `totalAvailable`, `totalBooked`, derived `Math.max(0, totalRooms - totalAvailable - totalBooked)` for "other", `totalRooms`.
- While loading: `<Skeleton className="h-9 w-16 mt-1" />` inside each card.
- Cards show `?? 0` as fallback when data is undefined.

### Room card grid

- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` for 1→2→3→4 responsive.
- Each card: `Card className="overflow-hidden"` + `div relative h-36 w-full bg-muted` (image or BedDouble icon placeholder) + `div p-4 space-y-1.5`.
- `next/image` with `fill` + `object-cover` for room images. `sizes` prop for responsive image loading.
- Placeholder: `BedDouble` icon centered in `bg-muted` div.

### BookingFormDialog initialValues prop extension

- Added `export type BookingFormInitialValues { checkIn?, checkOut?, items? }`.
- Added `initialValues?: BookingFormInitialValues` to `BookingFormDialogProps`.
- In create-mode reset block: use `initialValues?.checkIn ?? todayIso()` etc.
- Added `initialValues` to the `useEffect` dependency array.
- `items` type in `BookingFormInitialValues` is `BookingFormData['items']` — requires `BookingFormData` to be exported (`export type BookingFormData = z.infer<typeof bookingSchema>`).
- Pre-filling items for "Tạo booking" from room card: compute `nights = max(1, round((checkOut-checkIn)/86400000))`, then seed `items: [{ kind: 'ROOM', roomId, refCode, refName, quantity: nights, unitPrice: basePrice }]`.

### Playwright route mock ordering for specific vs catch-all

- Playwright routes use LIFO (last-in, first-out): the LAST `page.route()` registered fires FIRST.
- Pattern for specific endpoint + catch-all:
  1. Register catch-all `**/api/v1/rooms**` FIRST (fires last, is the fallback).
  2. Register specific `**/api/v1/rooms/available**` LAST (fires first, takes priority).
- Without this ordering, the catch-all `rooms**` swallows all `rooms/available` requests.

## Phase 9 patterns (Housekeeping / Dọn phòng)

### Priority badge palette

```tsx
function PriorityBadge({ priority }: { priority: 'high' | 'normal' | 'low' }) {
  const map = {
    high: ['Cao', 'bg-rose-100 text-rose-700'],
    normal: ['Trung bình', 'bg-amber-100 text-amber-700'],
    low: ['Thấp', 'bg-zinc-100 text-zinc-700'],
  } as const;
  const [label, cls] = map[priority];
  return <Badge className={`${cls} border-0 text-xs whitespace-nowrap`}>{label}</Badge>;
}
```

### Task status badge palette (code → class)

- `waiting` → `bg-amber-100 text-amber-700`
- `in_progress` → `bg-sky-100 text-sky-700`
- `done` → `bg-emerald-100 text-emerald-700`
- `skipped` → `bg-zinc-100 text-zinc-700`

### Time range cell

```tsx
function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} →`;
  return '—';
}
```

Show `"HH:MM → HH:MM"` when both present; `"HH:MM →"` when only start; `"—"` when neither.

### Assignee dropdown with users API

- Created `apps/web/src/lib/hooks/use-users.ts` — `USER_KEYS` + `useUsers(params: { page?, pageSize?, keyword?, role? })`. No built-in role filter on server — filter client-side if needed.
- `housekeepingUsers = useMemo(() => (usersData?.data ?? []).filter(u => u.role === 'HOUSEKEEPING' || u.role === 'MANAGER' || u.role === 'ADMIN'), [usersData])` — show all relevant roles in assignee dropdown.
- Use `'__none__'` as the "unassigned" Select value. Map `'__none__'` → `null` before posting to BE.

### HOUSEKEEPING_KEYS

```ts
export const HOUSEKEEPING_KEYS = {
  all: ['housekeeping'] as const,
  list: (params: HousekeepingListQuery) => ['housekeeping', 'list', params] as const,
  detail: (id: string) => ['housekeeping', 'detail', id] as const,
};
```

### Priority filter with typed state

```tsx
const [priorityFilter, setPriorityFilter] = useState<HousekeepingPriority | ''>('');
// ...
priority: (priorityFilter || undefined,
  // In Select onValueChange:
  setPriorityFilter(v === '__all__' ? '' : (v as HousekeepingPriority)));
```

### useMemo for query data arrays used in useEffect deps

When a `const arr = data?.something ?? []` is used in a `useEffect` dependency array, ESLint `react-hooks/exhaustive-deps` warns it changes every render. Fix:

```ts
// WRONG: const statuses = statusesData?.data ?? [];
// CORRECT:
const statuses = useMemo(() => statusesData?.data ?? [], [statusesData]);
```

Same applies to filtered arrays derived from query data — do NOT create intermediate `const allUsers = data?.data ?? []` then filter in another useMemo; instead filter directly from the query data inside a single useMemo:

```ts
const filteredUsers = useMemo(() => (usersData?.data ?? []).filter(...), [usersData]);
```

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

## Phase 10 patterns (Finance / Thu chi)

### 2-panel layout

```tsx
<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
  <Card className="lg:col-span-2 p-0">
    {' '}
    {/* left: table */}
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <h2 className="text-base font-semibold">...</h2>
      <div className="flex items-center gap-2">{/* buttons */}</div>
    </div>
    <CardContent className="p-0">{/* table */}</CardContent>
    {/* pagination footer */}
  </Card>
  <Card className="p-4">{/* right: booking payments sidebar */}</Card>
</div>
```

### Finance type badge palette

- `INCOME` → `bg-emerald-100 text-emerald-700` label "Thu"
- `EXPENSE` → `bg-rose-100 text-rose-700` label "Chi"

### KPI cards for financial summary

- `totalIncome` → emerald color
- `totalExpense - payrollExpense` (operation expense) → rose color
- `payrollExpense` → orange color
- `netProfit` → emerald if >= 0, rose if < 0. Sub-label "Âm — cần chú ý" when negative.

### Page-level RBAC gate (ADMIN/MANAGER only)

```tsx
const canManage = hasRole('ADMIN', 'MANAGER');
if (!canManage) return <PermissionDenied />;
```

This is appropriate for finance pages that only ADMIN and MANAGER should view. RECEPTIONIST and HOUSEKEEPING get a "Bạn không có quyền truy cập" panel. The dashboard layout renders after `/auth/me` completes, so `canManage` is always evaluated with the correct user role.

### FINANCE_KEYS query keys

```ts
export const FINANCE_KEYS = {
  all: ['finance'] as const,
  list: (p) => ['finance', 'list', p] as const,
  detail: (id) => ['finance', 'detail', id] as const,
  summary: (p) => ['finance', 'summary', p] as const,
  bookingPayments: (p) => ['finance', 'booking-payments', p] as const,
};
```

### Default date range (current month)

```ts
const today = new Date();
const defaultFrom = toIso(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultTo = toIso(new Date(today.getFullYear(), today.getMonth() + 1, 1));
```

`toIso(date)` = manual `getFullYear/getMonth/getDate + padStart` to avoid timezone issues.

### Playwright route ordering for finance (3 sub-endpoints + catch-all)

Register in LIFO order (last fires first):

1. FIRST: `**/api/v1/finance**` catch-all (fires LAST)
2. LAST: `**/api/v1/finance/summary**` (fires FIRST)
3. LAST: `**/api/v1/finance/booking-payments**` (fires FIRST)

Without this ordering, the catch-all swallows summary and booking-payments requests.

### Strict mode violations in Playwright

- `getByText(/BK001/)` matches multiple elements if the code appears in table cells AND booking payment rows → use `getByText(/BK001 – Standard/)` to be specific.
- `getByText('Tạo phiếu thu chi')` matches both the button text and the dialog heading → use `getByRole('heading', { name: 'Tạo phiếu thu chi' })` for the dialog title assertion.
