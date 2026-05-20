# UI Design System

## Tham chiếu

23 ảnh trong [TemplateImage/](../../TemplateImage/). Khi build trang, **mở ảnh tương ứng và đối chiếu trực quan**.

## Layout shell

- Sidebar trái: 240px (expanded), 64px (collapsed). Background trắng. Logo + tên cơ sở ở đầu. Menu item: icon 20px + label.
- Sidebar item active: `bg-primary text-primary-foreground rounded-lg`.
- Topbar: chiều cao 56px. Bên trái: tên trang (h1 18px semibold). Bên phải: nút "Booking mới", nút "Dọn phòng", avatar user (xem ảnh `7_15_02`).
- Content padding: 24px. Card padding: 16px–20px.

## Tokens

```css
--radius: 12px;        /* card / button */
--radius-sm: 8px;      /* input / badge */
--shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.06);
--font: 'Inter', system-ui, sans-serif;
```

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48.
- Font sizes: 12 (xs), 14 (sm — default), 16 (base), 18 (h3), 20 (h2), 24 (h1 trang).

## Color tones (3 theme — xem ảnh `7_16_12`)

| Tone | Tên | --primary HSL | Use case |
|---|---|---|---|
| 1 | Pink Boutique | `322 70% 56%` | Homestay nữ tính, boutique nhỏ |
| 2 | Boutique Vibe (mặc định) | `271 76% 53%` | Chuẩn theo template (tím) |
| 3 | Olive Organic | `95 40% 40%` | Resort sinh thái, organic |

Cả 3 tone share gray scale chung. CSS variables đổi theo `data-tone` attribute trên `<html>`.

## Components — quy tắc

### Button
- Primary: `bg-primary text-primary-foreground`. Hover: `bg-primary/90`.
- Secondary: `bg-secondary text-secondary-foreground border`.
- Destructive: `bg-destructive text-destructive-foreground`.
- Sizes: sm (32px), default (40px), lg (44px).

### Input / Select / DatePicker
- Height 40px, border `border-input`, focus ring `ring-2 ring-primary/30`.
- Label trên field, 14px font-medium, gap-y 6px.

### Card / Stat
- Card: `rounded-xl border bg-card shadow-sm p-5`.
- KPI card (dashboard): icon nhỏ trên góc + label nhỏ + value lớn (24-28px bold) + sparkline (xem ảnh `7_15_02`).

### Table
- Header: `bg-muted text-muted-foreground text-xs uppercase tracking-wide`.
- Row hover: `hover:bg-muted/50`.
- Action column phải, icon edit / view / delete.
- Pagination dưới phải.

### Badge — status palette cố định

| Trạng thái phòng | Class |
|---|---|
| Sẵn sàng | `bg-emerald-100 text-emerald-700` |
| Đang ở | `bg-sky-100 text-sky-700` |
| Bảo trì | `bg-orange-100 text-orange-700` |
| Dọn dẹp | `bg-amber-100 text-amber-700` |
| Ngưng | `bg-rose-100 text-rose-700` |

| Trạng thái booking | Class |
|---|---|
| Chờ xác nhận | `bg-amber-100 text-amber-700` |
| Đã xác nhận | `bg-sky-100 text-sky-700` |
| Đang ở | `bg-emerald-100 text-emerald-700` |
| Đã trả phòng | `bg-zinc-100 text-zinc-700` |
| Đã huỷ | `bg-rose-100 text-rose-700` |

### Chart (Recharts)
- Palette: `--primary` + ['#A78BFA', '#F0ABFC', '#34D399', '#FBBF24', '#FB7185'].
- Lưới `stroke-muted-foreground/20`, dashed.
- Tooltip: shadcn-style (rounded, border, shadow).

## Mandatory states cho mỗi page

- **Loading**: Skeleton placeholder.
- **Empty**: Icon + 1 dòng text + (optional) nút CTA.
- **Error**: Icon đỏ + message + nút Retry.
- **Permission denied**: 1 trang shared "Bạn không có quyền truy cập".

## Accessibility

- Mọi icon-only button phải có `aria-label`.
- Contrast ≥ AA. Text trên primary background phải đủ tương phản.
- Focus ring nhìn rõ, không tắt outline.
