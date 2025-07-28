import React from 'react';
import { WifiOffIcon, WifiIcon } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 ${className}`}>
      <WifiOffIcon className="w-4 h-4" />
      <span className="text-sm font-medium">You&apos;re offline</span>
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={`w-full bg-yellow-100 border-b border-yellow-200 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-center gap-2 text-yellow-800">
        <WifiOffIcon className="w-4 h-4" />
        <span className="text-sm font-medium">
          You&apos;re offline. Some features may not work until you reconnect.
        </span>
      </div>
    </div>
  );
}

interface ConnectionStatusProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function ConnectionStatus({ className = '', showWhenOnline = false }: ConnectionStatusProps) {
  const isOnline = useOnlineStatus();

  if (!showWhenOnline && isOnline) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isOnline ? (
        <>
          <WifiIcon className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOffIcon className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  );
}