'use client';

import { MagnifyingGlass, CaretDown, List } from '@phosphor-icons/react';
import * as React from 'react';
import Link from 'next/link';

import dynamic from 'next/dynamic';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { CartBadge } from '@/components/store';

const CartDrawer = dynamic(
  () => import('@/components/store/cart-drawer').then((m) => m.CartDrawer),
);
import { SearchInputCompact } from '@/components/search/search-input';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  useContentStore,
  CONTENT_TYPES,
} from '@/stores/content.store';
import { useUIStore } from '@/stores/ui.store';

interface AppHeaderProps {
  className?: string;
}

/**
 * Application header with content type tabs matching Figma design
 */
export function AppHeader({ className }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { setMobileMenuOpen, setSearchOpen } = useUIStore();
  const { activeContentType, setContentType } = useContentStore();
  const [cartOpen, setCartOpen] = React.useState(false);

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Гость';
  const email = user?.email || '';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 bg-mp-bg-primary/90 backdrop-blur-xl border-b border-mp-border',
        className
      )}
    >
      <div className="h-full flex items-center justify-between px-4 md:px-6 gap-4">
        {/* Left section - Mobile menu + Content type tabs */}
        <div className="flex items-center gap-6">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Открыть меню"
              className="p-2 text-mp-text-secondary hover:text-mp-text-primary rounded-lg hover:bg-mp-surface transition-colors"
            >
              <List className="w-5 h-5" />
            </button>
          )}

          {/* Content type tabs - hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-1">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeContentType === type.id
                    ? 'text-mp-accent-primary'
                    : 'text-mp-text-secondary hover:text-mp-text-primary'
                )}
              >
                {type.labelRu}
              </button>
            ))}
          </nav>
        </div>

        {/* Center section - Search bar */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <SearchInputCompact placeholder="Поиск фильмов, сериалов..." />
        </div>

        {/* Right section - Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Поиск"
            className="sm:hidden text-mp-text-secondary hover:text-mp-text-primary"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass className="w-5 h-5" />
          </Button>

          {/* Cart */}
          <CartBadge onClick={() => setCartOpen(true)} />
          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

          {/* Notifications */}
          <NotificationBell />

          {/* User profile */}
          <Link
            href="/account/profile"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <UserAvatar
              src={user?.avatarUrl}
              name={fullName}
              size="sm"
            />
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-mp-text-primary leading-tight">
                {fullName}
              </p>
              <p className="text-xs text-mp-text-secondary leading-tight">
                {email}
              </p>
            </div>
            <CaretDown className="hidden lg:block w-4 h-4 text-mp-text-secondary" />
          </Link>
        </div>
      </div>
    </header>
  );
}
