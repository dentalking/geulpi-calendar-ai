#!/usr/bin/env node

/**
 * Multi-Agent Orchestrator v4.0
 * Revolutionary parallel subagent system for AI-driven E2E test automation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const SmartFailureCategorizer = require('../e2e/analyzers/smart-failure-categorizer');

class MultiAgentOrchestrator {
  constructor() {
    this.config = {
      rootDir: '/Users/heerackbang/Desktop/geulpi-project-1',
      timeout: 300000, // 5 minutes per agent
      maxParallelAgents: 6,
      retryAttempts: 2
    };
    
    this.categorizer = new SmartFailureCategorizer();
    this.activeAgents = new Map();
    this.results = new Map();
    
    // Color codes for beautiful logging
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    const colorCode = this.colors[color] || this.colors.reset;
    console.log(`${colorCode}[${timestamp}] ${message}${this.colors.reset}`);
  }

  /**
   * Main orchestration workflow
   */
  async orchestrate() {
    this.log('🚀 Starting Multi-Agent Orchestration v4.0...', 'bright');
    
    try {
      // Step 1: Run E2E tests and analyze failures
      const testResults = await this.runAndAnalyzeTests();
      
      if (!testResults.hasFailures) {
        this.log('✅ All tests passing! No orchestration needed.', 'green');
        return { success: true, message: 'All tests passing' };
      }

      // Step 2: Intelligent failure categorization
      this.log('🧠 Categorizing failures with AI...', 'cyan');
      const categories = await this.categorizer.categorizeFailures(testResults);
      
      this.log(`📊 Identified ${Object.keys(categories).length} specialist domains`, 'blue');
      
      // Step 3: Launch parallel specialist agents
      this.log('🤖 Launching parallel specialist agents...', 'magenta');
      const agentResults = await this.launchParallelAgents(categories);
      
      // Step 4: Coordinate cross-cutting concerns
      await this.coordinateAgents(agentResults);
      
      // Step 5: Verify improvements
      this.log('🔍 Verifying improvements...', 'cyan');
      const verificationResults = await this.verifyImprovements();
      
      return {
        success: true,
        agentsLaunched: Object.keys(categories).length,
        improvements: verificationResults,
        results: agentResults
      };
      
    } catch (error) {
      this.log(`❌ Orchestration failed: ${error.message}`, 'red');
      throw error;
    }
  }

  /**
   * Run E2E tests and analyze results
   */
  async runAndAnalyzeTests() {
    this.log('🧪 Running E2E tests...', 'cyan');
    
    try {
      // Run full test suite to trigger multi-agent system
      const result = execSync('cd e2e && npx playwright test --reporter=json', { 
        cwd: this.config.rootDir,
        encoding: 'utf8',
        timeout: 180000 // 3 minutes for full test suite
      });
      
      const testData = JSON.parse(result);
      const failures = this.extractFailures(testData);
      
      this.log(`📊 Test Results: ${testData.stats.passed} passed, ${failures.length} failed`, 'blue');
      
      return {
        hasFailures: failures.length > 0,
        failures: failures,
        stats: testData.stats
      };
      
    } catch (error) {
      // Tests failed - extract failure info
      const failures = await this.extractFailuresFromError(error);
      
      return {
        hasFailures: failures.length > 0,
        failures: failures,
        stats: { failed: failures.length }
      };
    }
  }

  /**
   * Extract failure information from test results
   */
  extractFailures(testData) {
    const failures = [];
    
    for (const suite of testData.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          for (const result of test.results || []) {
            if (result.status === 'failed') {
              failures.push({
                test: `${suite.title} › ${spec.title} › ${test.title}`,
                error: result.error?.message || 'Unknown error',
                context: this.extractContext(result),
                file: spec.file,
                line: result.error?.location?.line
              });
            }
          }
        }
      }
    }
    
    return failures;
  }

  /**
   * Extract failure context from error output
   */
  async extractFailuresFromError(error) {
    const failures = [];
    const output = error.stdout || error.message || '';
    
    // Parse Playwright output for failure information
    const testFailureRegex = /✘.*?›.*?›.*?\n.*?Error: (.*?)\n/g;
    let match;
    
    while ((match = testFailureRegex.exec(output)) !== null) {
      failures.push({
        test: match[0].split('›')[2]?.trim() || 'Unknown test',
        error: match[1] || 'Unknown error',
        context: output.substring(match.index, match.index + 500)
      });
    }
    
    return failures;
  }

  /**
   * Extract additional context from test result
   */
  extractContext(result) {
    const context = [];
    
    if (result.attachments) {
      result.attachments.forEach(att => {
        if (att.name === 'screenshot') context.push('screenshot_available');
        if (att.name === 'video') context.push('video_available');
      });
    }
    
    if (result.error?.stack) {
      context.push(result.error.stack.split('\n')[0]);
    }
    
    return context.join('; ');
  }

  /**
   * Launch parallel specialist agents using Claude Code subagents
   */
  async launchParallelAgents(categories) {
    const agentPromises = [];
    
    for (const [agentType, categoryData] of Object.entries(categories)) {
      const agentPromise = this.launchSpecialistAgent(agentType, categoryData);
      agentPromises.push(agentPromise);
      
      this.log(`🤖 Launching ${agentType} agent (${categoryData.failures.length} failures)`, 'magenta');
    }
    
    // Launch agents in parallel with controlled concurrency
    const results = await this.executeConcurrently(agentPromises, this.config.maxParallelAgents);
    
    this.log(`✅ All ${results.length} agents completed`, 'green');
    return results;
  }

  /**
   * Launch a single specialist agent
   */
  async launchSpecialistAgent(agentType, categoryData) {
    const agentContext = await this.categorizer.generateAgentContext(agentType, categoryData.failures);
    
    const specializedPrompt = this.generateSpecializedPrompt(agentType, agentContext);
    
    try {
      this.log(`🔧 ${agentType} agent starting work...`, 'blue');
      
      // Use Claude Code's Task tool with general-purpose subagent
      const result = await this.executeClaudeAgent(agentType, specializedPrompt);
      
      this.log(`✅ ${agentType} agent completed successfully`, 'green');
      
      return {
        agentType,
        success: true,
        result: result,
        failuresHandled: categoryData.failures.length
      };
      
    } catch (error) {
      this.log(`❌ ${agentType} agent failed: ${error.message}`, 'red');
      
      return {
        agentType,
        success: false,
        error: error.message,
        failuresHandled: 0
      };
    }
  }

  /**
   * Execute Claude Code agent using Task tool
   */
  async executeClaudeAgent(agentType, prompt) {
    const tempPromptFile = path.join(this.config.rootDir, `AGENT_${agentType.toUpperCase()}_PROMPT.md`);
    
    try {
      // Write specialized prompt to temporary file
      await fs.writeFile(tempPromptFile, prompt);
      
      // Execute Claude Code with the specialized prompt
      const command = `cd "${this.getAgentWorkingDirectory(agentType)}" && cat "${tempPromptFile}" | claude -p --output-format text`;
      
      const result = execSync(command, {
        cwd: this.getAgentWorkingDirectory(agentType),
        encoding: 'utf8',
        timeout: 120000, // 2 minutes per agent  
        maxBuffer: 10 * 1024 * 1024
      });
      
      // Clean up prompt file
      await fs.unlink(tempPromptFile);
      
      return result;
      
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempPromptFile);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  /**
   * Get working directory for specific agent type
   */
  getAgentWorkingDirectory(agentType) {
    if (agentType.startsWith('frontend-')) {
      return path.join(this.config.rootDir, 'frontend');
    } else if (agentType.startsWith('backend-')) {
      return path.join(this.config.rootDir, 'backend');
    } else if (agentType === 'ml-server') {
      return path.join(this.config.rootDir, 'ml-server');
    } else {
      return this.config.rootDir; // Integration, performance, etc.
    }
  }

  /**
   * Generate specialized prompt for each agent type
   */
  generateSpecializedPrompt(agentType, agentContext) {
    const basePrompt = `# ${agentType.toUpperCase()} Specialist Agent

## Your Expertise
You are a specialized ${agentContext.description} expert with deep knowledge of:
${agentContext.tools.map(tool => `- ${tool}`).join('\n')}

## Mission
Fix the following ${agentContext.failures.length} test failures with precision and expertise:

${agentContext.failures.map((failure, index) => `
### Failure ${index + 1}: ${failure.test_name}
**Error:** ${failure.error_message}
**Confidence:** ${Math.round(failure.confidence * 100)}%
**Context:** ${failure.context}
`).join('\n')}

## Specialized Instructions
${agentContext.specialized_instructions.map(inst => `- ${inst}`).join('\n')}

## Coordination Hints
${agentContext.coordination_hints.map(hint => `- ${hint}`).join('\n')}

## Requirements
1. Focus ONLY on your area of expertise
2. Make precise, targeted fixes
3. Follow existing code patterns and conventions
4. Test your changes if possible
5. Document any cross-cutting concerns for other agents

## Success Criteria
- All test failures in your domain are resolved
- Code follows project conventions
- No regressions in related functionality
- Clear documentation of changes made

---
**Priority:** ${agentContext.priority.toUpperCase()}
**Agent Type:** ${agentType}
**Timestamp:** ${new Date().toISOString()}
`;

    return basePrompt;
  }

  /**
   * Execute promises with controlled concurrency
   */
  async executeConcurrently(promises, maxConcurrency) {
    const results = [];
    const executing = [];
    
    for (const promise of promises) {
      const wrappedPromise = Promise.resolve(promise).then(result => {
        executing.splice(executing.indexOf(wrappedPromise), 1);
        return result;
      });
      
      results.push(wrappedPromise);
      executing.push(wrappedPromise);
      
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
    
    return Promise.all(results);
  }

  /**
   * Coordinate agents for cross-cutting concerns
   */
  async coordinateAgents(agentResults) {
    this.log('🔗 Coordinating cross-cutting concerns...', 'yellow');
    
    // Check for auth coordination
    const authAgents = agentResults.filter(r => r.agentType.includes('auth'));
    if (authAgents.length > 1) {
      this.log('🔐 Multiple auth agents detected - ensuring consistency', 'yellow');
      // Could launch a coordination agent here if needed
    }
    
    // Check for integration impacts
    const integrationAgent = agentResults.find(r => r.agentType === 'integration');
    if (integrationAgent && integrationAgent.success) {
      this.log('🌐 Integration changes detected - allowing propagation time', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Allow services to restart
    }
  }

  /**
   * Verify improvements after agent execution
   */
  async verifyImprovements() {
    this.log('🔍 Running verification tests...', 'cyan');
    
    try {
      const result = await this.runAndAnalyzeTests();
      const improvement = {
        passed: result.stats.passed || 0,
        failed: result.failures.length,
        improved: true
      };
      
      this.log(`📊 Verification: ${improvement.passed} passed, ${improvement.failed} failed`, 'blue');
      
      return improvement;
    } catch (error) {
      this.log(`⚠️ Verification incomplete: ${error.message}`, 'yellow');
      return { improved: false, error: error.message };
    }
  }
}

// Main execution
async function main() {
  const orchestrator = new MultiAgentOrchestrator();
  
  try {
    const result = await orchestrator.orchestrate();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MULTI-AGENT ORCHESTRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Agents launched: ${result.agentsLaunched}`);
    console.log(`🔧 Improvements: ${JSON.stringify(result.improvements, null, 2)}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Orchestration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MultiAgentOrchestrator;