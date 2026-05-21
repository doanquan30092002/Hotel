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

## Playwright gotcha

- Login page has both `<input aria-label="Mật khẩu">` and a toggle button with `aria-label="Hiện mật khẩu"`. `getByLabel('Mật khẩu')` matches 2 elements → use `.first()` to avoid strict mode violation.

## Gotchas

- `noUncheckedIndexedAccess`: array index access returns `T | undefined` — always guard.
- Cài đặt page: `monthlyRevenueTarget` can be empty string in form (coerce to null before PUT).
- `sidebar-nav.ts` uses React type for icon prop — must be `.ts` not `.tsx` since it only exports data, but the type references `React.ComponentType` which resolves via global JSX namespace (tsconfig includes dom).
- `(auth)/layout.tsx` uses `React.ReactNode` without import — Next.js 14 global React type works via tsconfig lib.

## Decisions

- 2026-05-21: TanStack Query staleTime mặc định 30s cho list, 0 cho detail.
- 2026-05-21: 401 trên axios → tự refresh access token một lần, nếu vẫn 401 → redirect `/dang-nhap`.
- 2026-05-21: Toast dùng module-level store (không cần context/zustand riêng). `toast()` imperative API.
- 2026-05-21: Auth store persisted to `hotel.auth` (JSON), themeTone to `hotel.themeTone` (string).
