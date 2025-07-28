const fs = require('fs').promises;
const path = require('path');

class V5HierarchicalAnalyzer {
  constructor() {
    this.config = require('../config/v5-agents');
  }

  async analyze(testResults) {
    const prompts = {
      frontend: null,
      backend: null,
      'ml-server': null
    };

    // Group failures by service
    const serviceFailures = this.groupFailuresByService(testResults.failures);
    
    // Generate prompts for each service with failures
    for (const [service, failures] of Object.entries(serviceFailures)) {
      if (failures.length > 0) {
        prompts[service] = await this.generateServicePrompt(service, failures);
      }
    }

    return prompts;
  }

  groupFailuresByService(failures) {
    const grouped = {
      frontend: [],
      backend: [],
      'ml-server': []
    };

    failures.forEach(failure => {
      const service = this.determineService(failure);
      if (service && grouped[service]) {
        grouped[service].push(failure);
      }
    });

    return grouped;
  }

  determineService(failure) {
    const { title, error } = failure;
    const errorStr = error?.toString() || '';
    const titleLower = title.toLowerCase();

    // Frontend indicators
    if (
      titleLower.includes('ui') ||
      titleLower.includes('dashboard') ||
      titleLower.includes('calendar') ||
      titleLower.includes('chat') ||
      errorStr.includes('data-testid') ||
      errorStr.includes('element not found') ||
      errorStr.includes('React') ||
      errorStr.includes('component')
    ) {
      return 'frontend';
    }

    // Backend indicators
    if (
      titleLower.includes('api') ||
      titleLower.includes('graphql') ||
      titleLower.includes('auth') ||
      titleLower.includes('database') ||
      errorStr.includes('401') ||
      errorStr.includes('403') ||
      errorStr.includes('500') ||
      errorStr.includes('resolver')
    ) {
      return 'backend';
    }

    // ML Server indicators
    if (
      titleLower.includes('voice') ||
      titleLower.includes('transcription') ||
      titleLower.includes('ml') ||
      titleLower.includes('ai') ||
      errorStr.includes('model') ||
      errorStr.includes('whisper')
    ) {
      return 'ml-server';
    }

    // Default to frontend for UI-related failures
    return 'frontend';
  }

  async generateServicePrompt(service, failures) {
    const timestamp = new Date().toISOString();
    const serviceConfig = this.config.services[service];
    
    return `# 🎯 E2E Test Failures - ${service.toUpperCase()} Service

**Generated**: ${timestamp}
**Failures**: ${failures.length}
**Meta-Agent**: ${serviceConfig.metaAgent.name}

## 📋 Test Failures Summary

${failures.map((f, i) => this.formatFailure(f, i + 1)).join('\n')}

## 🤖 Your Role as Meta-Agent

You are the ${serviceConfig.metaAgent.name}. Your job is to:

1. **Analyze** these test failures
2. **Categorize** them by subagent expertise
3. **Spawn** 3-4 specialized subagents
4. **Delegate** tasks appropriately
5. **Monitor** their progress
6. **Validate** completion

## 👥 Available Subagents

${serviceConfig.subagents.map(sub => `
### ${sub.icon} ${sub.name}
- **Model**: ${sub.model}
- **Skills**: ${sub.skills.join(', ')}
- **Focus**: ${sub.focusAreas.join(', ')}
- **Max Tasks**: ${sub.maxTasks}
`).join('')}

## 📝 Task Distribution Strategy

Based on the failures above, here's a suggested distribution:

${this.suggestTaskDistribution(service, failures)}

## 🚀 Action Plan

1. **Read** this PROMPT.md carefully
2. **Analyze** each failure's root cause
3. **Create** a delegation plan
4. **Spawn** subagents with specific tasks
5. **Monitor** file changes and progress
6. **Delete** this PROMPT.md when all tasks are complete

## ⚡ Efficiency Tips

- Spawn all subagents simultaneously
- Assign related tasks to the same subagent
- Use git commits as coordination points
- Validate changes before marking complete

## 🎯 Success Criteria

✅ All test failures resolved
✅ No new TypeScript/linting errors
✅ Code follows project conventions
✅ Changes committed
✅ PROMPT.md deleted

---

Remember: You're orchestrating a team. Delegate wisely and ensure quality results!`;
  }

  formatFailure(failure, index) {
    return `
### ${index}. ${failure.title}

**Error**: ${failure.error || 'Unknown error'}
${failure.stack ? `\n**Stack**:\n\`\`\`\n${failure.stack.slice(0, 500)}...\n\`\`\`` : ''}
${failure.expected ? `\n**Expected**: ${failure.expected}` : ''}
${failure.actual ? `\n**Actual**: ${failure.actual}` : ''}
`;
  }

  suggestTaskDistribution(service, failures) {
    const suggestions = {
      frontend: this.suggestFrontendDistribution(failures),
      backend: this.suggestBackendDistribution(failures),
      'ml-server': this.suggestMLServerDistribution(failures)
    };

    return suggestions[service] || 'Analyze failures and distribute based on expertise.';
  }

  suggestFrontendDistribution(failures) {
    const uiFailures = failures.filter(f => 
      f.title.toLowerCase().includes('ui') || 
      f.error?.includes('element') ||
      f.error?.includes('style')
    );
    
    const stateFailures = failures.filter(f => 
      f.error?.includes('GraphQL') || 
      f.error?.includes('state') ||
      f.error?.includes('context')
    );
    
    const testFailures = failures.filter(f => 
      f.error?.includes('data-testid') || 
      f.error?.includes('selector')
    );

    return `
**UI Specialist** (${uiFailures.length} tasks):
- Fix responsive layouts and styling issues
- Update component structure
- Improve accessibility

**State Manager** (${stateFailures.length} tasks):
- Fix GraphQL queries/mutations
- Implement subscriptions
- Handle authentication state

**Test Engineer** (${testFailures.length} tasks):
- Add missing data-testid attributes
- Fix flaky selectors
- Improve test reliability
`;
  }

  suggestBackendDistribution(failures) {
    const apiFailures = failures.filter(f => 
      f.error?.includes('resolver') || 
      f.error?.includes('controller')
    );
    
    const dbFailures = failures.filter(f => 
      f.error?.includes('database') || 
      f.error?.includes('entity')
    );
    
    const authFailures = failures.filter(f => 
      f.error?.includes('401') || 
      f.error?.includes('403') ||
      f.error?.includes('auth')
    );

    return `
**API Architect** (${apiFailures.length} tasks):
- Fix GraphQL resolvers
- Update API endpoints
- Handle edge cases

**Database Expert** (${dbFailures.length} tasks):
- Fix entity relationships
- Optimize queries
- Update repositories

**Security Auditor** (${authFailures.length} tasks):
- Fix authentication issues
- Update authorization rules
- Validate inputs
`;
  }

  suggestMLServerDistribution(failures) {
    return `
**ML Engineer**:
- Load and optimize models
- Improve inference performance
- Handle edge cases

**Voice Specialist**:
- Fix transcription accuracy
- Support multiple formats
- Handle language detection

**API Integrator**:
- Create robust endpoints
- Add proper validation
- Improve error handling
`;
  }
}

module.exports = new V5HierarchicalAnalyzer();