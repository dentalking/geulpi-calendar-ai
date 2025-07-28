'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineQueueItem {
  id: string;
  type: 'mutation';
  operation: string;
  variables: any;
  timestamp: number;
}

interface OfflineContextType {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const OFFLINE_QUEUE_KEY = 'geulpi_offline_queue';

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);

  useEffect(() => {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined') return;
    
    const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Failed to parse offline queue:', error);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    // Only save to localStorage in browser environment
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline]);

  const addToQueue = useCallback((item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) => {
    const newItem: OfflineQueueItem = {
      ...item,
      id: `offline-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    setQueue(prev => [...prev, newItem]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    // Only clear localStorage in browser environment
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    console.log(`Processing ${queue.length} offline operations...`);

    for (const item of queue) {
      try {
        console.log(`Processing offline operation: ${item.operation}`);
        removeFromQueue(item.id);
      } catch (error) {
        console.error(`Failed to process offline operation ${item.id}:`, error);
      }
    }
  }, [queue, isOnline, removeFromQueue]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        processQueue,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}