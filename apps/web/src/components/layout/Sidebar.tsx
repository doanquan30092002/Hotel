'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hotel } from 'lucide-react';

import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './sidebar-nav';

type SidebarProps = {
  collapsed: boolean;
};

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
      aria-label="Thanh điều hướng chính"
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4 border-b border-border',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Hotel className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Homestay Lá</p>
            <p className="truncate text-xs text-muted-foreground">Cài đặt</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Menu chính">
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href as `/`}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-2' : '',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary-foreground' : '')}
                    aria-hidden={true}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom tone indicator */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Tone 2</p>
        </div>
      )}
    </aside>
  );
}
