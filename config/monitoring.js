/**
 * Production Monitoring and Health Check Configuration
 * Provides comprehensive health checks, metrics, and monitoring
 */

const os = require('os');
const fs = require('fs');
const { Pool } = require('pg');
const Redis = require('ioredis');
const logger = require('./logging');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.metrics = {
      requests: {
        total: 0,
        errors: 0,
        lastMinute: []
      },
      performance: {
        responseTime: [],
        memoryUsage: [],
        cpuUsage: []
      },
      database: {
        connections: 0,
        queries: 0,
        errors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        errors: 0
      }
    };
    
    this.startTime = Date.now();
    this.initializeChecks();
    this.startMetricsCollection();
  }

  initializeChecks() {
    // Database health check
    this.addCheck('database', async () => {
      try {
        if (!process.env.DATABASE_URL) {
          return { status: 'pass', message: 'Database not configured' };
        }
        
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        const result = await client.query('SELECT 1 as health');
        client.release();
        await pool.end();
        
        return {
          status: 'pass',
          message: 'Database connection successful',
          responseTime: Date.now()
        };
      } catch (error) {
        logger.logError(error, { component: 'health-check', check: 'database' });
        return {
          status: 'fail',
          message: error.message,
          error: error.code
        };
      }
    });

    // Redis health check
    this.addCheck('redis', async () => {
      try {
        if (!process.env.REDIS_URL) {
          return { status: 'pass', message: 'Redis not configured' };
        }
        
        const redis = new Redis(process.env.REDIS_URL);
        await redis.ping();
        await redis.disconnect();
        
        return {
          status: 'pass',
          message: 'Redis connection successful'
        };
      } catch (error) {
        logger.logError(error, { component: 'health-check', check: 'redis' });
        return {
          status: 'fail',
          message: error.message
        };
      }
    });

    // Disk space check
    this.addCheck('disk-space', async () => {
      try {
        const stats = fs.statSync('.');
        const free = stats.free || 0;
        const total = stats.size || 1;
        const usedPercent = ((total - free) / total) * 100;
        
        const threshold = 90; // 90% threshold
        const status = usedPercent > threshold ? 'warn' : 'pass';
        
        return {
          status,
          message: `Disk usage: ${usedPercent.toFixed(2)}%`,
          details: {
            free: this.formatBytes(free),
            total: this.formatBytes(total),
            usedPercent: Math.round(usedPercent)
          }
        };
      } catch (error) {
        return {
          status: 'warn',
          message: 'Could not check disk space',
          error: error.message
        };
      }
    });

    // Memory usage check
    this.addCheck('memory', async () => {
      const usage = process.memoryUsage();
      const systemMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = systemMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / systemMemory) * 100;
      
      const threshold = 85; // 85% threshold
      const status = memoryUsagePercent > threshold ? 'warn' : 'pass';
      
      return {
        status,
        message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        details: {
          process: {
            rss: this.formatBytes(usage.rss),
            heapUsed: this.formatBytes(usage.heapUsed),
            heapTotal: this.formatBytes(usage.heapTotal),
            external: this.formatBytes(usage.external)
          },
          system: {
            total: this.formatBytes(systemMemory),
            free: this.formatBytes(freeMemory),
            used: this.formatBytes(usedMemory),
            usedPercent: Math.round(memoryUsagePercent)
          }
        }
      };
    });

    // CPU usage check
    this.addCheck('cpu', async () => {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const cpuCount = cpus.length;
      const loadPercent = (loadAvg[0] / cpuCount) * 100;
      
      const threshold = 80; // 80% threshold
      const status = loadPercent > threshold ? 'warn' : 'pass';
      
      return {
        status,
        message: `CPU load: ${loadPercent.toFixed(2)}%`,
        details: {
          cores: cpuCount,
          loadAverage: {
            '1min': loadAvg[0].toFixed(2),
            '5min': loadAvg[1].toFixed(2),
            '15min': loadAvg[2].toFixed(2)
          },
          loadPercent: Math.round(loadPercent)
        }
      };
    });

    // External services check
    this.addCheck('external-services', async () => {
      const services = [];
      const failures = [];
      
      // Check OpenAI API
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'User-Agent': 'Geulpi/1.0'
            },
            timeout: 5000
          });
          
          if (response.ok) {
            services.push({ name: 'OpenAI', status: 'pass' });
          } else {
            failures.push({ name: 'OpenAI', error: `HTTP ${response.status}` });
          }
        } catch (error) {
          failures.push({ name: 'OpenAI', error: error.message });
        }
      }
      
      // Check Anthropic API
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            }),
            timeout: 5000
          });
          
          // Even if we get an error response, the service is reachable
          if (response.status < 500) {
            services.push({ name: 'Anthropic', status: 'pass' });
          } else {
            failures.push({ name: 'Anthropic', error: `HTTP ${response.status}` });
          }
        } catch (error) {
          failures.push({ name: 'Anthropic', error: error.message });
        }
      }
      
      const status = failures.length === 0 ? 'pass' : 
                    failures.length < services.length + failures.length ? 'warn' : 'fail';
      
      return {
        status,
        message: `External services: ${services.length} up, ${failures.length} down`,
        details: {
          services,
          failures
        }
      };
    });
  }

  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async runCheck(name) {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return { status: 'fail', message: 'Check not found' };
    }

    try {
      const startTime = Date.now();
      const result = await Promise.race([
        checkFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { component: 'health-check', check: name });
      return {
        status: 'fail',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllChecks() {
    const results = {};
    const checkPromises = Array.from(this.checks.keys()).map(async (name) => {
      results[name] = await this.runCheck(name);
    });
    
    await Promise.all(checkPromises);
    return results;
  }

  getOverallStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('fail')) return 'fail';
    if (statuses.includes('warn')) return 'warn';
    return 'pass';
  }

  async getHealthReport() {
    const checks = await this.runAllChecks();
    const overallStatus = this.getOverallStatus(checks);
    const uptime = Date.now() - this.startTime;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.formatDuration(uptime),
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: process.env.SERVICE_NAME || 'geulpi-backend',
      checks,
      metrics: this.getMetricsSummary()
    };
  }

  recordRequest(duration, error = false) {
    this.metrics.requests.total++;
    if (error) this.metrics.requests.errors++;
    
    // Track requests in the last minute
    const now = Date.now();
    this.metrics.requests.lastMinute.push({ timestamp: now, duration, error });
    
    // Clean old entries (older than 1 minute)
    this.metrics.requests.lastMinute = this.metrics.requests.lastMinute
      .filter(req => now - req.timestamp < 60000);
    
    // Record performance metrics
    this.metrics.performance.responseTime.push(duration);
    if (this.metrics.performance.responseTime.length > 1000) {
      this.metrics.performance.responseTime = this.metrics.performance.responseTime.slice(-1000);
    }
  }

  recordDatabaseQuery(error = false) {
    this.metrics.database.queries++;
    if (error) this.metrics.database.errors++;
  }

  recordCacheHit(hit = true) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
  }

  recordCacheError() {
    this.metrics.cache.errors++;
  }

  getMetricsSummary() {
    const responseTime = this.metrics.performance.responseTime;
    const lastMinuteRequests = this.metrics.requests.lastMinute.length;
    
    return {
      requests: {
        total: this.metrics.requests.total,
        errors: this.metrics.requests.errors,
        lastMinute: lastMinuteRequests,
        errorRate: this.metrics.requests.total > 0 ? 
          ((this.metrics.requests.errors / this.metrics.requests.total) * 100).toFixed(2) + '%' : '0%'
      },
      performance: {
        averageResponseTime: responseTime.length > 0 ? 
          Math.round(responseTime.reduce((a, b) => a + b, 0) / responseTime.length) + 'ms' : '0ms',
        p95ResponseTime: this.calculatePercentile(responseTime, 95) + 'ms',
        p99ResponseTime: this.calculatePercentile(responseTime, 99) + 'ms'
      },
      database: {
        queries: this.metrics.database.queries,
        errors: this.metrics.database.errors,
        errorRate: this.metrics.database.queries > 0 ? 
          ((this.metrics.database.errors / this.metrics.database.queries) * 100).toFixed(2) + '%' : '0%'
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: (this.metrics.cache.hits + this.metrics.cache.misses) > 0 ? 
          ((this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100).toFixed(2) + '%' : '0%',
        errors: this.metrics.cache.errors
      }
    };
  }

  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.performance.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      });
      
      // Keep only last 100 entries (50 minutes of data)
      if (this.metrics.performance.memoryUsage.length > 100) {
        this.metrics.performance.memoryUsage = this.metrics.performance.memoryUsage.slice(-100);
      }
    }, 30000);
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] || 0);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Middleware for Express.js
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        this.recordRequest(duration, isError);
        
        logger.logRequest(req, res, duration);
      });
      
      next();
    };
  }

  // Health check endpoint handler
  healthEndpoint() {
    return async (req, res) => {
      try {
        const health = await this.getHealthReport();
        const statusCode = health.status === 'pass' ? 200 : 
                          health.status === 'warn' ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        logger.logError(error, { component: 'health-endpoint' });
        res.status(503).json({
          status: 'fail',
          message: 'Health check failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Readiness probe endpoint
  readinessEndpoint() {
    return async (req, res) => {
      try {
        // Only check critical services for readiness
        const criticalChecks = ['database', 'redis'];
        const results = {};
        
        for (const checkName of criticalChecks) {
          if (this.checks.has(checkName)) {
            results[checkName] = await this.runCheck(checkName);
          }
        }
        
        const isReady = Object.values(results).every(check => check.status === 'pass');
        
        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not ready',
          checks: results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.logError(error, { component: 'readiness-endpoint' });
        res.status(503).json({
          status: 'not ready',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Liveness probe endpoint
  livenessEndpoint() {
    return (req, res) => {
      // Simple liveness check - just verify the process is running
      res.status(200).json({
        status: 'alive',
        uptime: this.formatDuration(Date.now() - this.startTime),
        timestamp: new Date().toISOString()
      });
    };
  }

  // Metrics endpoint (Prometheus format)
  metricsEndpoint() {
    return (req, res) => {
      const metrics = this.getMetricsSummary();
      const promMetrics = this.formatPrometheusMetrics(metrics);
      
      res.set('Content-Type', 'text/plain');
      res.send(promMetrics);
    };
  }

  formatPrometheusMetrics(metrics) {
    const serviceName = process.env.SERVICE_NAME || 'geulpi_backend';
    const lines = [];
    
    // Request metrics
    lines.push(`# HELP ${serviceName}_requests_total Total number of requests`);
    lines.push(`# TYPE ${serviceName}_requests_total counter`);
    lines.push(`${serviceName}_requests_total ${metrics.requests.total}`);
    
    lines.push(`# HELP ${serviceName}_requests_errors_total Total number of request errors`);
    lines.push(`# TYPE ${serviceName}_requests_errors_total counter`);
    lines.push(`${serviceName}_requests_errors_total ${metrics.requests.errors}`);
    
    // Response time metrics
    const avgResponseTime = parseFloat(metrics.performance.averageResponseTime.replace('ms', ''));
    lines.push(`# HELP ${serviceName}_response_time_ms Average response time in milliseconds`);
    lines.push(`# TYPE ${serviceName}_response_time_ms gauge`);
    lines.push(`${serviceName}_response_time_ms ${avgResponseTime}`);
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    lines.push(`# HELP ${serviceName}_memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE ${serviceName}_memory_usage_bytes gauge`);
    lines.push(`${serviceName}_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
    lines.push(`${serviceName}_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`);
    lines.push(`${serviceName}_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`);
    
    // Database metrics
    lines.push(`# HELP ${serviceName}_database_queries_total Total database queries`);
    lines.push(`# TYPE ${serviceName}_database_queries_total counter`);
    lines.push(`${serviceName}_database_queries_total ${metrics.database.queries}`);
    
    lines.push(`# HELP ${serviceName}_database_errors_total Total database errors`);
    lines.push(`# TYPE ${serviceName}_database_errors_total counter`);
    lines.push(`${serviceName}_database_errors_total ${metrics.database.errors}`);
    
    // Cache metrics
    lines.push(`# HELP ${serviceName}_cache_hits_total Total cache hits`);
    lines.push(`# TYPE ${serviceName}_cache_hits_total counter`);
    lines.push(`${serviceName}_cache_hits_total ${metrics.cache.hits}`);
    
    lines.push(`# HELP ${serviceName}_cache_misses_total Total cache misses`);
    lines.push(`# TYPE ${serviceName}_cache_misses_total counter`);
    lines.push(`${serviceName}_cache_misses_total ${metrics.cache.misses}`);
    
    return lines.join('\n') + '\n';
  }
}

// Singleton instance
const healthChecker = new HealthChecker();

module.exports = healthChecker;
