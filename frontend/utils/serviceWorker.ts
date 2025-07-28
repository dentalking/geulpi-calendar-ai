export const isServiceWorkerSupported = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.log('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          console.log('New version available. Please refresh the page.');
          
          // Optionally show a notification to the user
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Update Available', {
              body: 'A new version of the app is available. Please refresh the page.',
              icon: '/icon-192x192.png'
            });
          }
        }
      });
    });

    console.log('Service worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const unregistered = await registration.unregister();
      console.log('Service worker unregistered:', unregistered);
      return unregistered;
    }
    return false;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
};

export const updateServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('Service worker updated');
    }
  } catch (error) {
    console.error('Service worker update failed:', error);
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
};

export const subscribeToNotifications = async (
  registration: ServiceWorkerRegistration,
  publicKey: string
): Promise<PushSubscription | null> => {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to notifications:', error);
    return null;
  }
};

export const sendBackgroundSync = async (tag: string): Promise<void> => {
  if (!isServiceWorkerSupported() || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync is not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && 'sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
};

// Utility to handle offline queue
export class OfflineQueue {
  private queue: Array<{ type: string; data: any; timestamp: number }> = [];
  private storageKey = 'geulpi-offline-queue';

  constructor() {
    this.loadQueue();
  }

  add(type: string, data: any): void {
    const item = {
      type,
      data,
      timestamp: Date.now(),
    };
    
    this.queue.push(item);
    this.saveQueue();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  async processQueue(): Promise<void> {
    if (!navigator.onLine || this.queue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        // Process the queued item
        await this.processItem(item);
        
        // Remove from queue if successful
        const index = this.queue.findIndex(q => 
          q.timestamp === item.timestamp && q.type === item.type
        );
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
      } catch (error) {
        console.error('Failed to process queued item:', error);
        // Keep item in queue for next attempt
      }
    }
    
    this.saveQueue();
  }

  private async processItem(item: { type: string; data: any }): Promise<void> {
    // This would be implemented based on your specific needs
    // For example, retrying failed mutations
    console.log('Processing offline queue item:', item);
  }

  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  getQueue(): Array<{ type: string; data: any; timestamp: number }> {
    return [...this.queue];
  }
}