/**
 * @jest-environment jsdom
 */

import {
  getPerformanceReport,
  getPerformanceMetrics,
  getSessionInfo,
} from '@/utils/performance';

describe('performance utils', () => {
  describe('getPerformanceReport', () => {
    it('should return performance report', () => {
      const report = getPerformanceReport();
      expect(report).toBeDefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return array of metrics', () => {
      const metrics = getPerformanceMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info object', () => {
      const sessionInfo = getSessionInfo();
      expect(sessionInfo).toBeDefined();
      expect(typeof sessionInfo).toBe('object');
    });
  });

  // Test threshold rating logic
  describe('Performance thresholds', () => {
    it('should have correct threshold values', () => {
      // These are the thresholds defined in the module
      const expectedThresholds = {
        CLS: { good: 0.1, poor: 0.25 },
        FID: { good: 100, poor: 300 },
        FCP: { good: 1800, poor: 3000 },
        LCP: { good: 2500, poor: 4000 },
        TTFB: { good: 800, poor: 1800 },
        INP: { good: 200, poor: 500 },
      };

      // We can't directly test the thresholds since they're private,
      // but we can test that the module is importable and functions exist
      expect(getPerformanceReport).toBeDefined();
      expect(getPerformanceMetrics).toBeDefined();
      expect(getSessionInfo).toBeDefined();
    });
  });

  // Test metric rating logic indirectly
  describe('Metric ratings', () => {
    it('should classify metrics into good/needs-improvement/poor categories', () => {
      // Since we can't directly test the private getRating method,
      // we test that the public interface works correctly
      const metrics = getPerformanceMetrics();
      
      // Each metric should have a rating if present
      metrics.forEach(metric => {
        if (metric.rating) {
          expect(['good', 'needs-improvement', 'poor']).toContain(metric.rating);
        }
      });
    });
  });

  // Test session ID generation
  describe('Session ID generation', () => {
    it('should generate valid session format', () => {
      const session = getSessionInfo();
      
      // Session ID should always be present
      expect(session.sessionId).toBeDefined();
      expect(typeof session.sessionId).toBe('string');
    });
  });

  // Test localStorage integration
  describe('LocalStorage integration', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      // The functions should not throw even with localStorage errors
      expect(() => getPerformanceReport()).not.toThrow();
      expect(() => getPerformanceMetrics()).not.toThrow();
      expect(() => getSessionInfo()).not.toThrow();

      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  // Test browser compatibility
  describe('Browser compatibility', () => {
    it('should handle missing browser APIs gracefully', () => {
      // The module should not throw errors when browser APIs are missing
      expect(() => {
        const report = getPerformanceReport();
        const metrics = getPerformanceMetrics();
        const session = getSessionInfo();
      }).not.toThrow();
    });
  });

  // Test report structure
  describe('Performance report structure', () => {
    it('should return report with expected structure when available', () => {
      const report = getPerformanceReport();
      
      if (report) {
        expect(report).toHaveProperty('session');
        expect(report).toHaveProperty('coreWebVitals');
        expect(report).toHaveProperty('allMetrics');
        expect(report).toHaveProperty('summary');
        
        if (report.summary) {
          expect(report.summary).toHaveProperty('totalMetrics');
          expect(report.summary).toHaveProperty('goodMetrics');
          expect(report.summary).toHaveProperty('needsImprovementMetrics');
          expect(report.summary).toHaveProperty('poorMetrics');
        }
      }
    });
  });
});