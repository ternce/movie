'use client';

import { CaretDown, User, BookmarkSimple, Crown, Gear, SignOut } from '@phosphor-icons/react';
import Link from 'next/link';

import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';

export function ProfileDropdown() {
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Гость';
  const email = user?.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-mp-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary/50"
          aria-label="Меню профиля"
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
          <CaretDown className="hidden lg:block w-4 h-4 text-mp-text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={user?.avatarUrl}
              name={fullName}
              size="sm"
            />
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium leading-tight">{fullName}</p>
              <p className="text-xs text-mp-text-secondary leading-tight">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Мой аккаунт
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/watchlist" className="flex items-center gap-2">
              <BookmarkSimple className="w-4 h-4" />
              Избранное
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/subscriptions" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Подписки
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/settings" className="flex items-center gap-2">
              <Gear className="w-4 h-4" />
              Настройки
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => logout()}
          className="text-mp-error-text focus:text-mp-error-text focus:bg-mp-error-bg"
        >
          <SignOut className="w-4 h-4 mr-2" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
