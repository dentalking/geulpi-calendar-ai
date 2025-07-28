// Performance monitoring utilities for Core Web Vitals and custom metrics

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id?: string;
  delta?: number;
  entries?: PerformanceEntry[];
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
}

// Thresholds for Core Web Vitals (as per Google's recommendations)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private session: UserSession;
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      this.session = {
        sessionId: '',
        startTime: 0,
        userAgent: '',
        connectionType: undefined,
        deviceMemory: undefined,
      };
      return;
    }
    
    this.session = this.initializeSession();
    this.setupPerformanceObserver();
    this.trackPageLoad();
    this.trackUserInteractions();
  }

  private initializeSession(): UserSession {
    return {
      sessionId: this.generateSessionId(),
      startTime: performance.now(),
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceMemory: (navigator as any).deviceMemory,
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || connection?.type;
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // Observe Core Web Vitals
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      // Observe different entry types
      const entryTypes = [
        'navigation',
        'paint',
        'largest-contentful-paint',
        'first-input',
        'layout-shift',
        'long-animation-frame',
        'measure',
        'resource',
      ];

      entryTypes.forEach((type) => {
        try {
          this.observer?.observe({ type, buffered: true });
        } catch (error) {
          // Some entry types might not be supported
          console.warn(`Performance entry type "${type}" not supported`);
        }
      });
    } catch (error) {
      console.error('Failed to setup performance observer:', error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.trackNavigationTiming(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.trackPaintTiming(entry as PerformancePaintTiming);
        break;
      case 'largest-contentful-paint':
        this.trackLCP(entry as LargestContentfulPaint);
        break;
      case 'first-input':
        this.trackFID(entry as FirstInputPolyfillEntry);
        break;
      case 'layout-shift':
        this.trackCLS(entry as LayoutShift);
        break;
      case 'resource':
        this.trackResourceTiming(entry as PerformanceResourceTiming);
        break;
    }
  }

  private trackNavigationTiming(entry: PerformanceNavigationTiming): void {
    const ttfb = entry.responseStart - entry.requestStart;
    this.recordMetric('TTFB', ttfb, this.getRating('TTFB', ttfb));

    const domContentLoaded = entry.domContentLoadedEventEnd - entry.fetchStart;
    this.recordMetric('DCL', domContentLoaded, this.getRating('FCP', domContentLoaded));

    const loadComplete = entry.loadEventEnd - entry.fetchStart;
    this.recordMetric('Load', loadComplete, this.getRating('LCP', loadComplete));
  }

  private trackPaintTiming(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-contentful-paint') {
      this.recordMetric('FCP', entry.startTime, this.getRating('FCP', entry.startTime));
    }
  }

  private trackLCP(entry: LargestContentfulPaint): void {
    this.recordMetric('LCP', entry.startTime, this.getRating('LCP', entry.startTime));
  }

  private trackFID(entry: FirstInputPolyfillEntry): void {
    const fid = entry.processingStart - entry.startTime;
    this.recordMetric('FID', fid, this.getRating('FID', fid));
  }

  private trackCLS(entry: LayoutShift): void {
    if (!entry.hadRecentInput) {
      this.recordMetric('CLS', entry.value, this.getRating('CLS', entry.value));
    }
  }

  private trackResourceTiming(entry: PerformanceResourceTiming): void {
    // Track slow resources
    const duration = entry.responseEnd - entry.requestStart;
    if (duration > 1000) { // Resources taking more than 1 second
      this.recordMetric('SlowResource', duration, 'poor', {
        name: entry.name,
        size: entry.transferSize,
      });
    }
  }

  private trackPageLoad(): void {
    window.addEventListener('load', () => {
      // Track page load time
      const loadTime = performance.now();
      this.recordMetric('PageLoad', loadTime, this.getRating('LCP', loadTime));

      // Track memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('JSHeapSize', memory.usedJSHeapSize, 'good');
        this.recordMetric('JSHeapLimit', memory.jsHeapSizeLimit, 'good');
      }
    });
  }

  private trackUserInteractions(): void {
    let interactionCount = 0;
    let lastInteractionTime = 0;

    const trackInteraction = (event: Event) => {
      interactionCount++;
      const now = performance.now();
      
      if (lastInteractionTime > 0) {
        const timeBetweenInteractions = now - lastInteractionTime;
        this.recordMetric('InteractionGap', timeBetweenInteractions, 'good');
      }
      
      lastInteractionTime = now;

      // Track INP (Interaction to Next Paint) if supported
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(() => {
          const inp = performance.now() - now;
          this.recordMetric('INP', inp, this.getRating('INP', inp));
        });
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true });
    });

    // Track session duration periodically
    setInterval(() => {
      const sessionDuration = performance.now() - this.session.startTime;
      this.recordMetric('SessionDuration', sessionDuration, 'good');
    }, 30000); // Every 30 seconds
  }

  private getRating(metric: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metric];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private recordMetric(
    name: string, 
    value: number, 
    rating: 'good' | 'needs-improvement' | 'poor',
    metadata?: any
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      id: this.generateSessionId(),
      ...metadata,
    };

    this.metrics.push(metric);
    this.sendMetric(metric);
  }

  private async sendMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // In a real application, you would send this to your analytics service
      // For now, we'll just log it and store it locally
      console.log('Performance Metric:', metric);
      
      // Store in localStorage for debugging
      const stored = localStorage.getItem('geulpi-performance-metrics');
      const metrics = stored ? JSON.parse(stored) : [];
      metrics.push(metric);
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
      
      localStorage.setItem('geulpi-performance-metrics', JSON.stringify(metrics));

      // Send to analytics service (if configured)
      if (this.shouldSendToAnalytics(metric)) {
        await this.sendToAnalyticsService(metric);
      }
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  private shouldSendToAnalytics(metric: PerformanceMetric): boolean {
    // Only send Core Web Vitals and important metrics
    const importantMetrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'];
    return importantMetrics.includes(metric.name);
  }

  private async sendToAnalyticsService(metric: PerformanceMetric): Promise<void> {
    // This would integrate with your analytics service
    // Example: Google Analytics, Datadog, New Relic, etc.
    
    // For Google Analytics 4 (example)
    if ('gtag' in window) {
      (window as any).gtag('event', 'web_vital', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_parameter_rating: metric.rating,
        custom_parameter_session_id: this.session.sessionId,
      });
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getSession(): UserSession {
    return { ...this.session };
  }

  public generateReport(): {
    session: UserSession;
    coreWebVitals: Record<string, PerformanceMetric | undefined>;
    allMetrics: PerformanceMetric[];
    summary: {
      goodMetrics: number;
      needsImprovementMetrics: number;
      poorMetrics: number;
      totalMetrics: number;
    };
  } {
    const coreWebVitals = {
      LCP: this.metrics.find(m => m.name === 'LCP'),
      FID: this.metrics.find(m => m.name === 'FID'),
      CLS: this.metrics.find(m => m.name === 'CLS'),
      FCP: this.metrics.find(m => m.name === 'FCP'),
      TTFB: this.metrics.find(m => m.name === 'TTFB'),
      INP: this.metrics.find(m => m.name === 'INP'),
    };

    const summary = this.metrics.reduce(
      (acc, metric) => {
        acc.totalMetrics++;
        acc[`${metric.rating}Metrics` as keyof typeof acc]++;
        return acc;
      },
      { goodMetrics: 0, needsImprovementMetrics: 0, poorMetrics: 0, totalMetrics: 0 }
    );

    return {
      session: this.session,
      coreWebVitals,
      allMetrics: this.metrics,
      summary,
    };
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// Type definitions for browser APIs that might not be fully typed
interface LargestContentfulPaint extends PerformanceEntry {
  renderTime: number;
  loadTime: number;
  size: number;
  id: string;
  url: string;
  element?: Element;
}

interface FirstInputPolyfillEntry extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  cancelable?: boolean;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  lastInputTime: number;
  sources: Array<{
    node?: Node;
    currentRect: DOMRectReadOnly;
    previousRect: DOMRectReadOnly;
  }>;
}

// Export singleton instance
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;

// Export utilities
export const getPerformanceReport = () => performanceMonitor?.generateReport() || null;
export const getPerformanceMetrics = () => performanceMonitor?.getMetrics() || [];
export const getSessionInfo = () => performanceMonitor?.getSession() || { 
  sessionId: '', 
  startTime: 0, 
  userAgent: '',
  connectionType: undefined,
  deviceMemory: undefined,
  userId: undefined
};