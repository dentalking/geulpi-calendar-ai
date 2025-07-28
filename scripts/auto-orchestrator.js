#!/usr/bin/env node

/**
 * 🤖 Auto-Orchestrator v3.0 - Complete Automation System
 * 
 * This script automates the entire E2E test fix cycle:
 * 1. Runs E2E tests
 * 2. Detects failures and PROMPT.md files
 * 3. Automatically launches Claude Code instances
 * 4. Waits for fixes to complete
 * 5. Re-runs tests for verification
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  services: ['frontend', 'backend', 'ml-server'],
  timeout: 300000, // 5 minutes per service
  retryCount: 3,
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  }
};

class AutoOrchestrator {
  constructor() {
    this.activeProcesses = [];
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${CONFIG.colors[color]}[${timestamp}] ${message}${CONFIG.colors.reset}`);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async runE2ETests() {
    this.log('🧪 Running E2E tests...', 'cyan');
    try {
      const { stdout, stderr } = await execAsync('npm run test:e2e:super', {
        cwd: CONFIG.rootDir,
        timeout: 600000 // 10 minutes for tests
      });
      
      if (stderr && stderr.includes('failed')) {
        this.log('❌ E2E tests failed - proceeding with orchestration', 'red');
        return false;
      }
      
      this.log('✅ E2E tests passed!', 'green');
      return true;
    } catch (error) {
      this.log('❌ E2E tests failed - proceeding with orchestration', 'red');
      return false;
    }
  }

  async checkPromptFiles() {
    this.log(`🔍 Checking for PROMPT.md files in: ${CONFIG.rootDir}`, 'blue');
    const promptFiles = [];

    for (const service of CONFIG.services) {
      const promptPath = path.join(CONFIG.rootDir, service, 'PROMPT.md');
      if (await this.fileExists(promptPath)) {
        this.log(`📝 Found PROMPT.md for ${service}`, 'yellow');
        promptFiles.push({ service, path: promptPath });
      }
    }

    return promptFiles;
  }

  async startClaudeForService(service, promptPath) {
    const servicePath = path.join(CONFIG.rootDir, service);
    this.log(`🤖 Starting Claude Code for ${service}...`, 'blue');

    try {
      // Read the prompt content first
      const promptContent = await fs.readFile(promptPath, 'utf8');
      
      // Use Claude CLI in non-interactive mode with pipe
      const command = `cd "${servicePath}" && cat PROMPT.md | claude -p --output-format text`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: servicePath,
        timeout: CONFIG.timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr) {
        this.log(`⚠️ Warning for ${service}: ${stderr}`, 'yellow');
      }

      this.log(`✅ Claude Code completed for ${service}`, 'green');
      
      // Show preview of response
      const preview = stdout.substring(0, 100).replace(/\n/g, ' ');
      this.log(`📄 Response preview: ${preview}...`, 'cyan');

      // Delete PROMPT.md to signal completion
      await fs.unlink(promptPath);
      this.log(`🗑️ Deleted PROMPT.md for ${service} (completion signal)`, 'green');

      return { success: true, service };
    } catch (error) {
      this.log(`❌ Error with ${service}: ${error.message}`, 'red');
      return { success: false, service, error: error.message };
    }
  }

  async startClaudeInstances(promptFiles) {
    if (promptFiles.length === 0) {
      this.log('✅ No PROMPT.md files found - all services are healthy!', 'green');
      return;
    }

    this.log('🤖 Starting automated Claude Code instances...', 'bright');

    // Start all Claude instances in parallel
    const promises = promptFiles.map(({ service, path }) => 
      this.startClaudeForService(service, path)
    );

    // Wait for all to complete
    const results = await Promise.all(promises);
    
    // Check results
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      this.log(`⚠️ ${failures.length} services had issues:`, 'yellow');
      failures.forEach(f => this.log(`  - ${f.service}: ${f.error}`, 'red'));
    }

    this.log('⏳ All services completed their fixes!', 'green');
  }

  async waitForCompletion() {
    this.log('🔄 Running integration verification...', 'cyan');
    
    // Give services a moment to restart/rebuild
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async cleanup() {
    this.log('🧹 Cleaning up...', 'blue');
    
    // Kill any remaining processes
    for (const proc of this.activeProcesses) {
      try {
        process.kill(proc.pid);
      } catch (e) {
        // Process might already be dead
      }
    }
  }

  async run() {
    this.log('🚀 Starting Auto-Orchestration v3.0...', 'bright');
    
    try {
      // Step 1: Run E2E tests
      const testsPassed = await this.runE2ETests();
      
      if (testsPassed) {
        this.log('🎉 All tests passed! No fixes needed.', 'green');
        return;
      }

      // Step 2: Check for PROMPT.md files
      let promptFiles = await this.checkPromptFiles();
      
      if (promptFiles.length === 0) {
        this.log('⚠️ Tests failed but no PROMPT.md files found. Waiting for generation...', 'yellow');
        
        // Wait a bit for prompt generation
        await new Promise(resolve => setTimeout(resolve, 10000));
        promptFiles = await this.checkPromptFiles();
        
        if (promptFiles.length === 0) {
          this.log('❌ No PROMPT.md files generated. Please check the test analyzer.', 'red');
          return;
        }
      }

      // Step 3: Start Claude instances
      await this.startClaudeInstances(promptFiles);

      // Step 4: Wait for completion
      await this.waitForCompletion();

      // Step 5: Re-run tests
      this.log('🔄 Running final verification...', 'cyan');
      const finalTestsPassed = await this.runE2ETests();

      if (finalTestsPassed) {
        this.log('🎉 Auto-orchestration completed successfully!', 'green');
        this.log('✨ All tests are now passing!', 'bright');
      } else {
        this.log('⚠️ Some tests still failing. You may need to run another cycle.', 'yellow');
        this.log('💡 Tip: Run `npm run test:e2e:auto` again or check the logs.', 'cyan');
      }

    } catch (error) {
      this.log(`❌ Fatal error: ${error.message}`, 'red');
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Orchestration interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Orchestration terminated');
  process.exit(0);
});

// Main execution
(async () => {
  const orchestrator = new AutoOrchestrator();
  await orchestrator.run();
})().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});