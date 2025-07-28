'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, requestNotificationPermission, OfflineQueue } from '@/utils/serviceWorker';
import { announceToScreenReader } from '@/utils/accessibility';
import { performanceMonitor } from '@/utils/performance';
import PerformanceDebugPanel from './PerformanceDebugPanel';
import { BarChart3Icon } from 'lucide-react';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [offlineQueue] = useState(() => new OfflineQueue());

  useEffect(() => {
    // Register service worker
    const initServiceWorker = async () => {
      const registration = await registerServiceWorker();
      
      if (registration) {
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              announceToScreenReader('앱 업데이트가 사용 가능합니다', 'polite');
            }
          });
        });

        // Request notification permission
        await requestNotificationPermission();
      }
    };

    initServiceWorker();
  }, []);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Set initial state
    setIsOnline(navigator.onLine);

    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online) {
        announceToScreenReader('인터넷 연결이 복구되었습니다', 'polite');
        // Process offline queue when back online
        offlineQueue.processQueue();
      } else {
        announceToScreenReader('인터넷 연결이 끊어졌습니다', 'assertive');
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
  }, [offlineQueue]);

  const handleUpdateApp = () => {
    window.location.reload();
  };

  // Toggle performance panel with keyboard shortcut (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPerformancePanel(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {children}
      
      {/* Update notification */}
      {updateAvailable && (
        <div 
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-40"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-medium mb-1">업데이트 사용 가능</h3>
              <p className="text-sm opacity-90">
                새 버전의 앱이 준비되었습니다. 업데이트하시겠습니까?
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleUpdateApp}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              업데이트
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {/* Performance Debug Toggle (only in development or when enabled) */}
      {(process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && localStorage.getItem('geulpi-debug-mode') === 'true') && (
        <button
          onClick={() => setShowPerformancePanel(true)}
          className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-40"
          title="Performance Debug (Ctrl+Shift+P)"
          aria-label="Open performance debug panel"
        >
          <BarChart3Icon className="w-5 h-5" />
        </button>
      )}

      {/* Performance Debug Panel */}
      <PerformanceDebugPanel
        isOpen={showPerformancePanel}
        onClose={() => setShowPerformancePanel(false)}
      />
    </>
  );
}