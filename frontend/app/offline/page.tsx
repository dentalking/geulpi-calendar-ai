'use client';

import { useEffect, useState } from 'react';
import { WifiOffIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Set initial state
    setIsOnline(navigator.onLine);

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      
      // If back online, redirect to main app
      if (navigator.onLine) {
        window.location.href = '/calendar';
      }
    };

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = '/calendar';
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
            <WifiOffIcon className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">You&apos;re offline</CardTitle>
          <CardDescription>
            No internet connection detected. Please check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>While you&apos;re offline, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View cached calendar data</li>
              <li>Browse previously loaded events</li>
              <li>Use basic navigation features</li>
            </ul>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Connection status: 
              <span className={`ml-2 font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
            
            <Button 
              onClick={handleRetry} 
              className="w-full"
              variant={isOnline ? 'default' : 'outline'}
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              {isOnline ? 'Go to Calendar' : 'Retry Connection'}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            This app works best with an internet connection. Some features may be limited while offline.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}