'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPerformanceReport, PerformanceMetric } from '@/utils/performance';
import { BarChart3Icon, ActivityIcon, ZapIcon, XIcon } from 'lucide-react';

interface PerformanceDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PerformanceDebugPanel({ isOpen, onClose }: PerformanceDebugPanelProps) {
  const [report, setReport] = useState(getPerformanceReport());

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setReport(getPerformanceReport());
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (metric: PerformanceMetric) => {
    if (metric.name === 'CLS') {
      return metric.value.toFixed(3);
    }
    return `${Math.round(metric.value)}ms`;
  };

  const getMetricIcon = (name: string) => {
    switch (name) {
      case 'LCP':
      case 'FCP':
        return <ZapIcon className="w-4 h-4" />;
      case 'FID':
      case 'INP':
        return <ActivityIcon className="w-4 h-4" />;
      case 'CLS':
        return <BarChart3Icon className="w-4 h-4" />;
      default:
        return <ActivityIcon className="w-4 h-4" />;
    }
  };

  if (!isOpen || !report) {
    return null;
  }

  const coreWebVitalsOrder = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'];
  const coreWebVitals = coreWebVitalsOrder
    .map(name => report.coreWebVitals[name])
    .filter(Boolean) as PerformanceMetric[];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Performance Debug Panel</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Session Info */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Session ID:</span>
                  <br />
                  <span className="text-gray-600 font-mono text-xs">
                    {report.session.sessionId}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <br />
                  <span className="text-gray-600">
                    {Math.round((Date.now() - report.session.startTime) / 1000)}s
                  </span>
                </div>
                <div>
                  <span className="font-medium">Connection:</span>
                  <br />
                  <span className="text-gray-600">
                    {report.session.connectionType || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Device Memory:</span>
                  <br />
                  <span className="text-gray-600">
                    {report.session.deviceMemory 
                      ? `${report.session.deviceMemory}GB` 
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Web Vitals */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Core Web Vitals</CardTitle>
              <CardDescription>
                Latest measurements for key performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {coreWebVitals.map((metric) => (
                  <div key={metric.name} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {getMetricIcon(metric.name)}
                      <span className="font-medium text-sm">{metric.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRatingColor(metric.rating)}`}
                      >
                        {metric.rating}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold">
                      {formatValue(metric)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {report.summary.goodMetrics}
                  </div>
                  <div className="text-xs text-gray-600">Good</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {report.summary.needsImprovementMetrics}
                  </div>
                  <div className="text-xs text-gray-600">Needs Work</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {report.summary.poorMetrics}
                  </div>
                  <div className="text-xs text-gray-600">Poor</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.summary.totalMetrics}
                  </div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Metrics</CardTitle>
              <CardDescription>
                Last 10 performance measurements
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.allMetrics.slice(-10).reverse().map((metric, index) => (
                  <div 
                    key={`${metric.timestamp}-${index}`} 
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getMetricIcon(metric.name)}
                      <span className="font-medium">{metric.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRatingColor(metric.rating)}`}
                      >
                        {metric.rating}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {formatValue(metric)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              Metrics are collected automatically and stored locally for debugging.
            </div>
            <Button onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}