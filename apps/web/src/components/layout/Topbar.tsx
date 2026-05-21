'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, BookOpen, Brush, LogOut, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PAGE_TITLES } from './sidebar-nav';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPING: 'Buồng phòng',
};

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const pageTitle = PAGE_TITLES[pathname] ?? 'Hotel Management';

  function handleLogout() {
    clear();
    router.replace('/dang-nhap');
  }

  return (
    <header
      className={cn('flex h-14 items-center gap-3 border-b border-border bg-card px-4 shrink-0')}
    >
      <button
        aria-label="Mở/đóng sidebar"
        onClick={onToggleSidebar}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold leading-tight truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => router.push('/booking')}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Booking mới
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 hidden sm:inline-flex"
          onClick={() => router.push('/don-phong')}
        >
          <Brush className="h-4 w-4" aria-hidden="true" />
          Dọn phòng
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu người dùng"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Avatar src={user?.avatarUrl} name={user?.fullName} size={36} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-semibold">{user?.fullName ?? 'Người dùng'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/cai-dat')}>
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
