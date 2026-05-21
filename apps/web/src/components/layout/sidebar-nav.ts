import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  BookOpen,
  DoorOpen,
  Users,
  Sparkles,
  PackageOpen,
  Brush,
  Wallet,
  UserCog,
  BadgeDollarSign,
  FolderUp,
  ListTree,
  BarChart3,
  Settings,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/tong-quan', icon: LayoutDashboard },
  { label: 'Lịch', href: '/lich', icon: CalendarDays },
  { label: 'Phòng trống', href: '/phong-trong', icon: BedDouble },
  { label: 'Booking', href: '/booking', icon: BookOpen },
  { label: 'Phòng', href: '/phong', icon: DoorOpen },
  { label: 'Khách hàng', href: '/khach-hang', icon: Users },
  { label: 'Dịch vụ', href: '/dich-vu', icon: Sparkles },
  { label: 'Gói mẫu', href: '/goi-mau', icon: PackageOpen },
  { label: 'Dọn phòng', href: '/don-phong', icon: Brush },
  { label: 'Thu chi', href: '/thu-chi', icon: Wallet },
  { label: 'Nhân sự', href: '/nhan-su', icon: UserCog },
  { label: 'Lương', href: '/luong', icon: BadgeDollarSign },
  { label: 'Tệp upload', href: '/tep-upload', icon: FolderUp },
  { label: 'Danh mục', href: '/danh-muc', icon: ListTree },
  { label: 'Báo cáo', href: '/bao-cao', icon: BarChart3 },
  { label: 'Cài đặt', href: '/cai-dat', icon: Settings },
];

export const PAGE_TITLES: Record<string, string> = {
  '/tong-quan': 'Dashboard tổng quan',
  '/lich': 'Lịch booking',
  '/phong-trong': 'Tìm phòng trống',
  '/booking': 'Quản lý booking',
  '/phong': 'Quản lý phòng',
  '/khach-hang': 'Khách hàng',
  '/dich-vu': 'Dịch vụ',
  '/goi-mau': 'Gói mẫu',
  '/don-phong': 'Dọn phòng',
  '/thu-chi': 'Thu chi',
  '/nhan-su': 'Nhân sự',
  '/luong': 'Bảng lương',
  '/tep-upload': 'Tệp upload',
  '/danh-muc': 'Danh mục',
  '/bao-cao': 'Báo cáo',
  '/cai-dat': 'Cài đặt hệ thống',
};
