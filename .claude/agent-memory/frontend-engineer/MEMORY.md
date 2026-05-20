# Frontend Engineer Memory

## Conventions

- Route group `(dashboard)` cho mọi trang sau đăng nhập, share `layout.tsx` chứa Sidebar + Topbar.
- Trang client component khi cần useState/useQuery, đặt `'use client'` ở dòng đầu.
- Server component dùng cho layouts và data prefetch (nếu áp dụng SSR).
- Form: React Hook Form + zodResolver. Validation message tiếng Việt.

## Theme tokens (3 tone — xem ảnh `7_16_12`)

CSS variables trong `globals.css`:

```css
:root[data-tone="1"] { /* Pink Boutique */
  --primary: 322 70% 56%;   /* hồng đậm */
  --accent:  340 80% 70%;
}
:root[data-tone="2"] { /* Boutique Vibe (default) */
  --primary: 271 76% 53%;   /* tím chủ đạo trên template */
  --accent:  295 65% 60%;
}
:root[data-tone="3"] { /* Olive Organic */
  --primary: 95 40% 40%;
  --accent:  120 30% 55%;
}
```

## Status badge palette

| Trạng thái | Class Tailwind |
|---|---|
| Đang ở / Active | `bg-emerald-100 text-emerald-700` |
| Chờ xác nhận | `bg-amber-100 text-amber-700` |
| Đã đặt cọc | `bg-sky-100 text-sky-700` |
| Đã huỷ | `bg-rose-100 text-rose-700` |
| Đã trả phòng | `bg-zinc-100 text-zinc-700` |
| Bảo trì | `bg-orange-100 text-orange-700` |

## Reusable components

- `<PageHeader title actions />` — title + breadcrumb + actions slot (xem ảnh đầu mỗi page).
- `<DataTable columns data />` — TanStack Table v8 wrapper với pagination + sort + filter.
- `<KpiCard icon label value delta />` — card stat cho dashboard (xem ảnh `7_15_02`).
- `<StatusBadge value />` — map status enum → badge class.
- `<ChartAreaTrend />`, `<ChartDonutStatus />`, `<ChartGauge />`, `<ChartHeatmapOccupancy />`, `<ChartBar />` — Recharts wrappers.

## Gotchas

- _(trống — cập nhật khi gặp)_

## Decisions

- 2026-05-21: TanStack Query staleTime mặc định 30s cho list, 0 cho detail.
- 2026-05-21: 401 trên axios → tự refresh access token một lần, nếu vẫn 401 → redirect `/login`.
