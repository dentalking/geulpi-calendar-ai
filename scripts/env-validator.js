#!/usr/bin/env node

/**
 * Environment Variable Validator
 * Validates required environment variables across all services
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Required environment variables per service
const requiredVars = {
  common: [
    'NODE_ENV',
    'JWT_SECRET',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'REDIS_PASSWORD'
  ],
  backend: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ],
  frontend: [
    'NEXT_PUBLIC_GRAPHQL_URL',
    'NEXT_PUBLIC_API_URL'
  ],
  production: [
    'SSL_CERT_PATH',
    'SSL_KEY_PATH',
    'LOG_FILE_PATH'
  ]
};

// Environment variable validation rules
const validationRules = {
  NODE_ENV: /^(development|staging|production)$/,
  POSTGRES_PORT: /^\d+$/,
  REDIS_PORT: /^\d+$/,
  JWT_EXPIRES_IN: /^\d+[smhd]$/,
  LOG_LEVEL: /^(error|warn|info|debug|trace)$/,
  METRICS_PORT: /^\d+$/,
  RATE_LIMIT_MAX_REQUESTS: /^\d+$/,
  POSTGRES_MAX_CONNECTIONS: /^\d+$/
};

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.env = process.env.NODE_ENV || 'development';
  }

  log(message, type = 'info') {
    const prefix = {
      error: `${colors.red}${colors.bold}[ERROR]${colors.reset}`,
      warn: `${colors.yellow}${colors.bold}[WARN]${colors.reset}`,
      info: `${colors.blue}${colors.bold}[INFO]${colors.reset}`,
      success: `${colors.green}${colors.bold}[SUCCESS]${colors.reset}`
    };
    
    console.log(`${prefix[type]} ${message}`);
  }

  loadEnvFile(envFile) {
    try {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
          if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
          }
        });
        
        this.log(`Loaded environment file: ${envFile}`, 'info');
        return true;
      }
      return false;
    } catch (error) {
      this.log(`Failed to load ${envFile}: ${error.message}`, 'error');
      return false;
    }
  }

  validateRequired() {
    this.log('Validating required environment variables...', 'info');
    
    const allRequired = [...requiredVars.common];
    
    // Add service-specific variables
    if (process.env.SERVICE_TYPE === 'backend') {
      allRequired.push(...requiredVars.backend);
    }
    if (process.env.SERVICE_TYPE === 'frontend') {
      allRequired.push(...requiredVars.frontend);
    }
    
    // Add environment-specific variables
    if (this.env === 'production') {
      allRequired.push(...requiredVars.production);
    }
    
    allRequired.forEach(varName => {
      if (!process.env[varName]) {
        this.errors.push(`Missing required environment variable: ${varName}`);
      }
    });
  }

  validateFormats() {
    this.log('Validating environment variable formats...', 'info');
    
    Object.entries(validationRules).forEach(([varName, pattern]) => {
      const value = process.env[varName];
      if (value && !pattern.test(value)) {
        this.errors.push(`Invalid format for ${varName}: ${value}`);
      }
    });
  }

  validateSecurity() {
    this.log('Validating security configurations...', 'info');
    
    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.warnings.push('JWT_SECRET should be at least 32 characters long');
    }
    
    // Check for default passwords
    const defaultPasswords = [
      'password', 'admin', '123456', 'root', 'test'
    ];
    
    ['POSTGRES_PASSWORD', 'REDIS_PASSWORD'].forEach(varName => {
      const value = process.env[varName];
      if (value && defaultPasswords.includes(value.toLowerCase())) {
        this.errors.push(`${varName} uses a default/weak password`);
      }
    });
    
    // Production-specific security checks
    if (this.env === 'production') {
      if (!process.env.SSL_ENABLED || process.env.SSL_ENABLED !== 'true') {
        this.warnings.push('SSL should be enabled in production');
      }
      
      if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace') {
        this.warnings.push('Debug logging should be disabled in production');
      }
    }
  }

  validateConnectivity() {
    this.log('Validating service connectivity...', 'info');
    
    // Check if database variables are consistent
    const dbVars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB'];
    const missingDbVars = dbVars.filter(v => !process.env[v]);
    
    if (missingDbVars.length > 0 && missingDbVars.length < dbVars.length) {
      this.warnings.push('Incomplete database configuration');
    }
    
    // Check Redis configuration
    const redisVars = ['REDIS_HOST', 'REDIS_PORT'];
    const missingRedisVars = redisVars.filter(v => !process.env[v]);
    
    if (missingRedisVars.length > 0 && missingRedisVars.length < redisVars.length) {
      this.warnings.push('Incomplete Redis configuration');
    }
  }

  async testConnections() {
    this.log('Testing external connections...', 'info');
    
    const tests = [];
    
    // Test database connection (if variables are set)
    if (process.env.POSTGRES_HOST && process.env.POSTGRES_PORT) {
      tests.push(this.testDatabaseConnection());
    }
    
    // Test Redis connection (if variables are set)
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      tests.push(this.testRedisConnection());
    }
    
    const results = await Promise.allSettled(tests);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.warnings.push(`Connection test failed: ${result.reason}`);
      }
    });
  }

  async testDatabaseConnection() {
    const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
    
    try {
      // Simple TCP connection test
      const { stdout } = await execAsync(
        `timeout 5 bash -c "</dev/tcp/${POSTGRES_HOST}/${POSTGRES_PORT}"`,
        { timeout: 6000 }
      );
      this.log('Database connection test passed', 'success');
    } catch (error) {
      throw new Error(`Database connection failed: ${POSTGRES_HOST}:${POSTGRES_PORT}`);
    }
  }

  async testRedisConnection() {
    const { REDIS_HOST, REDIS_PORT } = process.env;
    
    try {
      // Simple TCP connection test
      const { stdout } = await execAsync(
        `timeout 5 bash -c "</dev/tcp/${REDIS_HOST}/${REDIS_PORT}"`,
        { timeout: 6000 }
      );
      this.log('Redis connection test passed', 'success');
    } catch (error) {
      throw new Error(`Redis connection failed: ${REDIS_HOST}:${REDIS_PORT}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bold}Environment Validation Report${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`Environment: ${colors.blue}${this.env}${colors.reset}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('All validations passed!', 'success');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n${colors.red}${colors.bold}ERRORS (${this.errors.length}):${colors.reset}`);
        this.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}${colors.bold}WARNINGS (${this.warnings.length}):${colors.reset}`);
        this.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    return this.errors.length === 0;
  }

  async validate() {
    this.log('Starting environment validation...', 'info');
    
    // Load environment-specific file
    const envFile = path.join(process.cwd(), `.env.${this.env}`);
    this.loadEnvFile(envFile);
    
    // Load default .env file as fallback
    this.loadEnvFile(path.join(process.cwd(), '.env'));
    
    // Run all validations
    this.validateRequired();
    this.validateFormats();
    this.validateSecurity();
    this.validateConnectivity();
    
    // Test connections if in CI/CD or if explicitly requested
    if (process.env.CI || process.argv.includes('--test-connections')) {
      await this.testConnections();
    }
    
    // Generate and display report
    const isValid = this.generateReport();
    
    // Exit with appropriate code
    process.exit(isValid ? 0 : 1);
  }
}

// CLI handling
if (require.main === module) {
  const validator = new EnvValidator();
  validator.validate().catch(error => {
    console.error(`${colors.red}Validation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = EnvValidator;
