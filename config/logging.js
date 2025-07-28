/**
 * Production-Ready Logging Configuration
 * Using Winston for structured, high-performance logging
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Custom log format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    if (metaStr) {
      msg += `\n${metaStr}`;
    }
    
    return msg;
  })
);

// Production format (structured JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Add standard fields for better searchability
    const logEntry = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: process.env.SERVICE_NAME || 'geulpi-backend',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      hostname: require('os').hostname(),
      pid: process.pid,
      ...info
    };
    
    // Remove duplicate timestamp field
    delete logEntry.timestamp;
    logEntry['@timestamp'] = info.timestamp;
    
    return JSON.stringify(logEntry);
  })
);

// Create log directory if it doesn't exist
function ensureLogDirectory() {
  const logDir = process.env.LOG_FILE_PATH || './logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

// Create transports based on environment
function createTransports() {
  const transports = [];
  const logDir = ensureLogDirectory();
  const isDev = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
  
  // Console transport
  transports.push(new winston.transports.Console({
    level: logLevel,
    format: isDev ? devFormat : prodFormat,
    handleExceptions: true,
    handleRejections: true
  }));
  
  // File transports for production and staging
  if (!isDev || process.env.LOG_FILE_ENABLED === 'true') {
    const maxSize = process.env.LOG_FILE_MAX_SIZE || '10MB';
    const maxFiles = parseInt(process.env.LOG_FILE_MAX_FILES || '10');
    
    // Combined log file
    transports.push(new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: logLevel,
      format: prodFormat,
      maxsize: parseSize(maxSize),
      maxFiles: maxFiles,
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    }));
    
    // Error log file
    transports.push(new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: prodFormat,
      maxsize: parseSize(maxSize),
      maxFiles: maxFiles,
      tailable: true
    }));
    
    // Access log file (for HTTP requests)
    transports.push(new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      format: prodFormat,
      maxsize: parseSize(maxSize),
      maxFiles: maxFiles,
      tailable: true
    }));
  }
  
  return transports;
}

// Helper function to parse size strings
function parseSize(sizeStr) {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  
  const match = sizeStr.match(/^(\d+)(\w+)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const [, size, unit] = match;
  return parseInt(size) * (units[unit.toUpperCase()] || 1);
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports: createTransports(),
  exitOnError: false,
  silent: process.env.LOG_SILENT === 'true'
});

// Custom log levels for HTTP and performance
logger.addLevel = function(name, level) {
  winston.addColors({ [name]: 'cyan' });
  this.levels[name] = level;
};

// Add custom levels
logger.addLevel('http', 25);
logger.addLevel('database', 15);
logger.addLevel('performance', 35);

// Helper methods for structured logging
logger.logRequest = function(req, res, responseTime) {
  this.http('HTTP Request', {
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    contentLength: res.get('content-length'),
    userId: req.user?.id,
    sessionId: req.sessionID,
    requestId: req.id
  });
};

logger.logError = function(error, context = {}) {
  this.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  });
};

logger.logDatabase = function(query, duration, context = {}) {
  this.database('Database Query', {
    sql: query,
    duration: `${duration}ms`,
    ...context
  });
};

logger.logPerformance = function(operation, duration, context = {}) {
  this.performance('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...context
  });
};

logger.logSecurity = function(event, details = {}) {
  this.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Shutting down logger...');
  logger.end();
});

process.on('SIGHUP', () => {
  logger.info('Rotating log files...');
  // Winston handles file rotation automatically
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
});

module.exports = logger;
