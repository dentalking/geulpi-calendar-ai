'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CalendarIcon, LayoutDashboardIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { OfflineBanner, ConnectionStatus } from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' as const, icon: LayoutDashboardIcon },
    { name: 'Calendar', href: '/calendar' as const, icon: CalendarIcon },
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <OfflineBanner />
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 bg-white shadow-sm flex flex-col">
            <div className="p-4">
              <h1 className="text-xl font-semibold">Geulpi Calendar</h1>
              <ConnectionStatus className="mt-2" />
            </div>
            <div className="px-3 py-2 flex-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t mt-auto">
              <div className="flex items-center gap-3 mb-3">
                {user?.picture ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={user.picture}
                      alt={user.name || 'User avatar'}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                disabled={!isOnline}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isOnline ? 'Cannot logout while offline' : 'Logout'}
              >
                <LogOutIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </nav>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}