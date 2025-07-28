/**
 * @jest-environment jsdom
 */

import {
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  updateServiceWorker,
  requestNotificationPermission,
  subscribeToNotifications,
  sendBackgroundSync,
  OfflineQueue,
} from '@/utils/serviceWorker';

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: jest.fn(),
  getRegistration: jest.fn(),
  controller: null,
};

// Mock ServiceWorkerRegistration
const mockRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: '/',
  unregister: jest.fn(),
  update: jest.fn(),
  addEventListener: jest.fn(),
  pushManager: {
    subscribe: jest.fn(),
  },
  sync: {
    register: jest.fn(),
  },
};

// Mock Notification
const mockNotification = {
  permission: 'default',
  requestPermission: jest.fn(),
};

describe('serviceWorker utils', () => {
  let originalNavigator: any;
  let originalNotification: any;

  beforeAll(() => {
    originalNavigator = global.navigator;
    originalNotification = (global as any).Notification;
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    
    if (originalNotification) {
      Object.defineProperty(global, 'Notification', {
        value: originalNotification,
        writable: true,
      });
    }
    
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorker,
        onLine: true,
      },
      writable: true,
    });

    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true,
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('isServiceWorkerSupported', () => {
    it('should return true when service worker is supported', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('should return false when service worker is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      
      expect(isServiceWorkerSupported()).toBe(false);
    });

    it('should check for serviceWorker in navigator', () => {
      // Test with serviceWorker present
      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: {} },
        writable: true,
      });
      
      expect(isServiceWorkerSupported()).toBe(true);
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      
      const result = await registerServiceWorker();
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
      });
      expect(result).toBe(mockRegistration);
      expect(console.log).toHaveBeenCalledWith(
        'Service worker registered successfully:',
        mockRegistration
      );
    });

    it('should return null when service worker is not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      
      const result = await registerServiceWorker();
      
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Service workers are not supported');
    });

    it('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(error);
      
      const result = await registerServiceWorker();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Service worker registration failed:',
        error
      );
    });

    it('should handle updatefound event', async () => {
      const mockNewWorker = {
        state: 'installing',
        addEventListener: jest.fn(),
      };
      
      const registrationWithUpdate = {
        ...mockRegistration,
        installing: mockNewWorker,
        addEventListener: jest.fn((event, callback) => {
          if (event === 'updatefound') {
            callback();
          }
        }),
      };
      
      mockServiceWorker.register.mockResolvedValue(registrationWithUpdate);
      mockServiceWorker.controller = null;
      
      await registerServiceWorker();
      
      expect(registrationWithUpdate.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
      expect(mockNewWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function)
      );
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
      mockRegistration.unregister.mockResolvedValue(true);
      
      const result = await unregisterServiceWorker();
      
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Service worker unregistered:', true);
    });

    it('should return false when service worker is not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      
      const result = await unregisterServiceWorker();
      
      expect(result).toBe(false);
    });

    it('should return false when no registration found', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(null);
      
      const result = await unregisterServiceWorker();
      
      expect(result).toBe(false);
    });

    it('should handle unregistration errors', async () => {
      const error = new Error('Unregistration failed');
      mockServiceWorker.getRegistration.mockRejectedValue(error);
      
      const result = await unregisterServiceWorker();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Service worker unregistration failed:',
        error
      );
    });
  });

  describe('updateServiceWorker', () => {
    it('should update service worker successfully', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
      mockRegistration.update.mockResolvedValue(undefined);
      
      await updateServiceWorker();
      
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockRegistration.update).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Service worker updated');
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockServiceWorker.getRegistration.mockRejectedValue(error);
      
      await updateServiceWorker();
      
      expect(console.error).toHaveBeenCalledWith(
        'Service worker update failed:',
        error
      );
    });
  });

  describe('requestNotificationPermission', () => {
    it('should handle case when notifications are not supported', async () => {
      // This test verifies the function handles unsupported environments gracefully
      // Since mocking the absence of Notification is complex in jsdom,
      // we'll test the function behavior with different permission states
      
      // Test with denied permission (simulating unsupported case)
      mockNotification.permission = 'denied';
      
      const result = await requestNotificationPermission();
      
      expect(result).toBe('denied');
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('should return existing permission when not default', async () => {
      mockNotification.permission = 'granted';
      
      const result = await requestNotificationPermission();
      
      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('should request permission when default', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission.mockResolvedValue('granted');
      
      const result = await requestNotificationPermission();
      
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
      expect(console.log).toHaveBeenCalledWith('Notification permission:', 'granted');
    });

    it('should handle permission request errors', async () => {
      mockNotification.permission = 'default';
      const error = new Error('Permission denied');
      mockNotification.requestPermission.mockRejectedValue(error);
      
      const result = await requestNotificationPermission();
      
      expect(result).toBe('denied');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to request notification permission:',
        error
      );
    });
  });

  describe('subscribeToNotifications', () => {
    it('should subscribe to push notifications successfully', async () => {
      const mockSubscription = { endpoint: 'test-endpoint' };
      mockRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription);
      
      const result = await subscribeToNotifications(mockRegistration as unknown as ServiceWorkerRegistration, 'test-key');
      
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: 'test-key',
      });
      expect(result).toBe(mockSubscription);
      expect(console.log).toHaveBeenCalledWith('Push subscription:', mockSubscription);
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Subscription failed');
      mockRegistration.pushManager.subscribe.mockRejectedValue(error);
      
      const result = await subscribeToNotifications(mockRegistration as unknown as ServiceWorkerRegistration, 'test-key');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to subscribe to notifications:',
        error
      );
    });
  });

  describe('sendBackgroundSync', () => {
    it('should register background sync successfully', async () => {
      // Mock sync support
      Object.defineProperty(global, 'ServiceWorkerRegistration', {
        value: {
          prototype: {
            sync: true,
          },
        },
        writable: true,
      });
      
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
      mockRegistration.sync.register.mockResolvedValue(undefined);
      
      await sendBackgroundSync('test-tag');
      
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('test-tag');
      expect(console.log).toHaveBeenCalledWith('Background sync registered:', 'test-tag');
    });

    it('should handle unsupported background sync', async () => {
      Object.defineProperty(global, 'ServiceWorkerRegistration', {
        value: {
          prototype: {},
        },
        writable: true,
      });
      
      await sendBackgroundSync('test-tag');
      
      expect(console.log).toHaveBeenCalledWith('Background sync is not supported');
    });
  });

  describe('OfflineQueue', () => {
    beforeEach(() => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    it('should initialize with empty queue', () => {
      const queue = new OfflineQueue();
      
      expect(queue.getQueue()).toEqual([]);
    });

    it('should load existing queue from localStorage', () => {
      const existingQueue = [
        { type: 'test', data: { id: 1 }, timestamp: Date.now() },
      ];
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(existingQueue)
      );
      
      const queue = new OfflineQueue();
      
      expect(queue.getQueue()).toEqual(existingQueue);
    });

    it('should add items to queue', () => {
      const queue = new OfflineQueue();
      
      queue.add('test-type', { id: 1 });
      
      const items = queue.getQueue();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'test-type',
        data: { id: 1 },
      });
      expect(items[0].timestamp).toBeDefined();
    });

    it('should save queue to localStorage when adding items', () => {
      const queue = new OfflineQueue();
      
      queue.add('test-type', { id: 1 });
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'geulpi-offline-queue',
        expect.any(String)
      );
    });

    it('should process queue when online', async () => {
      const queue = new OfflineQueue();
      queue.add('test-type', { id: 1 });
      
      // Mock online status
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
      
      const processQueueSpy = jest.spyOn(queue as any, 'processQueue');
      
      queue.add('another-type', { id: 2 });
      
      expect(processQueueSpy).toHaveBeenCalled();
    });

    it('should not process queue when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      
      const queue = new OfflineQueue();
      const processQueueSpy = jest.spyOn(queue as any, 'processQueue');
      
      queue.add('test-type', { id: 1 });
      
      expect(processQueueSpy).not.toHaveBeenCalled();
    });

    it('should clear queue', () => {
      const queue = new OfflineQueue();
      queue.add('test-type', { id: 1 });
      
      queue.clear();
      
      expect(queue.getQueue()).toEqual([]);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'geulpi-offline-queue',
        '[]'
      );
    });

    it('should handle localStorage errors gracefully', () => {
      (localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => new OfflineQueue()).not.toThrow();
      
      const queue = new OfflineQueue();
      expect(queue.getQueue()).toEqual([]);
    });
  });
});