import type { Reporter, FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { FailureAnalyzer, DetailedAnalysis } from '../analyzers/failure-analyzer';

interface FailureAnalysis extends DetailedAnalysis {
  error: string;
  testFile: string;
  testTitle: string;
}

class PromptGeneratorReporter implements Reporter {
  private failures: FailureAnalysis[] = [];
  private rootDir: string;
  private analyzer: FailureAnalyzer;

  constructor(options: { outputDir?: string } = {}) {
    this.rootDir = path.resolve(__dirname, '../..');
    this.analyzer = new FailureAnalyzer();
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`🚀 Starting test run with ${suite.allTests().length} tests`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      const analysis = this.analyzeFailure(test, result);
      if (analysis) {
        this.failures.push(analysis);
      }
    }
  }

  onEnd() {
    if (this.failures.length === 0) {
      console.log('✅ All tests passed! No prompts needed.');
      return;
    }

    console.log(`\n❌ ${this.failures.length} test(s) failed. Generating prompts...`);
    
    // Group failures by service
    const failuresByService = this.groupFailuresByService();
    
    // Generate prompts for each service
    for (const [service, failures] of Object.entries(failuresByService)) {
      this.generatePromptForService(service as any, failures);
    }

    // Generate orchestrator prompt
    this.generateOrchestratorPrompt();
  }

  private analyzeFailure(test: TestCase, result: TestResult): FailureAnalysis | null {
    if (!result.errors || result.errors.length === 0) {
      return null;
    }

    const error = result.errors[0]?.message || 'Unknown error';
    const testFile = test.location.file;
    const testTitle = test.title;

    // Use the detailed failure analyzer
    const analysis = this.analyzer.analyzeError(result.errors[0], testTitle, testFile);

    return {
      ...analysis,
      error,
      testFile,
      testTitle
    };
  }


  private groupFailuresByService(): Record<string, FailureAnalysis[]> {
    const grouped: Record<string, FailureAnalysis[]> = {};
    
    for (const failure of this.failures) {
      if (!grouped[failure.service]) {
        grouped[failure.service] = [];
      }
      grouped[failure.service].push(failure);
    }
    
    return grouped;
  }

  private generatePromptForService(service: string, failures: FailureAnalysis[]) {
    const promptFile = path.join(this.rootDir, service, 'PROMPT.md');
    
    // Generate compact, service-specific prompts
    const prompt = this.generateCompactPrompt(service, failures);

    fs.writeFileSync(promptFile, prompt);
    console.log(`📝 Generated detailed prompt for ${service}: ${promptFile}`);
  }

  private generateCompactPrompt(service: string, failures: FailureAnalysis[]): string {
    const serviceName = service.toUpperCase();
    const testCommand = this.getTestCommand(service);
    const buildCommand = this.getBuildCommand(service);

    return `# 🔧 ${serviceName} Service - Fix Required

## Issues Found
${failures.map((failure, index) => `
${index + 1}. **${failure.component}** - ${failure.errorType}
   - Error: \`${failure.error.split('\n')[0]}\`
   - Fix: ${failure.specificFix}
   - Files: ${failure.relatedFiles?.[0] || `Check ${failure.component} related files`}
`).join('')}

## Quick Fix Commands
\`\`\`bash
${testCommand}    # Run tests
${buildCommand}   # Build & verify
\`\`\`

## Implementation
${failures.map((failure, index) => `
**${index + 1}. ${failure.component}**
\`\`\`${this.getFileExtension(service)}
${failure.codeSnippet || this.getDefaultCodeExample(service, failure)}
\`\`\`
`).join('')}

---
*Auto-generated fix prompt - Delete when complete*
`;
  }

  private getTestCommand(service: string): string {
    switch (service) {
      case 'backend':
        return './gradlew test                 ';
      case 'frontend':
        return 'npm test                      ';
      case 'ml-server':
        return 'pytest tests/                 ';
      default:
        return 'npm test                      ';
    }
  }

  private getBuildCommand(service: string): string {
    switch (service) {
      case 'backend':
        return './gradlew build               ';
      case 'frontend':
        return 'npm run build                ';
      case 'ml-server':
        return 'python -m pytest --cov=.     ';
      default:
        return 'npm run build                ';
    }
  }

  private getDefaultCodeExample(service: string, failure: FailureAnalysis): string {
    switch (service) {
      case 'backend':
        return `// Fix ${failure.component} in Spring Boot
@RestController
public class ${failure.component}Controller {
    // Implement ${failure.specificFix}
}`;
      case 'frontend':
        return `// Fix ${failure.component} in React/Next.js
export default function ${failure.component}() {
  // Implement ${failure.specificFix}
}`;
      case 'ml-server':
        return `# Fix ${failure.component} in Python
def fix_${String(failure.component).toLowerCase()}():
    # Implement ${failure.specificFix}
    pass`;
      default:
        return `// Fix needed for ${failure.component}`;
    }
  }
  
  private getFileExtension(service: string): string {
    switch (service) {
      case 'frontend': return 'tsx';
      case 'backend': return 'java';
      case 'ml-server': return 'python';
      default: return '';
    }
  }

  private generateOrchestratorPrompt() {
    const summaryFile = path.join(this.rootDir, 'E2E_TEST_SUMMARY.md');
    
    const serviceCount = Object.keys(this.groupFailuresByService()).length;
    const failuresByService = this.groupFailuresByService();
    
    const summary = `# 🎯 E2E Test Orchestration - Root Management

## 📊 Overall Status: ❌ FAILED

- **Total Failures**: ${this.failures.length}
- **Affected Services**: ${serviceCount}
- **Timestamp**: ${new Date().toISOString()}
- **Test Environment**: All services running on Docker Compose

## 🚀 Service Status & Actions

${Object.entries(failuresByService).map(([service, failures]) => {
  const serviceName = service.toUpperCase();
  const testCommand = this.getTestCommand(service);
  const buildCommand = this.getBuildCommand(service);
  
  return `### ${serviceName} Service
- **Failures**: ${failures.length}
- **Issues**: ${failures.map(f => f.component).join(', ')}
- **PROMPT.md**: ✅ Generated in \`${service}/PROMPT.md\`
- **Commands**: 
  \`\`\`bash
  cd ${service}
  ${testCommand}    # Test
  ${buildCommand}   # Build
  \`\`\`
`;
}).join('\n')}

## 🔄 Coordination Strategy

### Phase 1: Individual Service Fixes
${Object.keys(failuresByService).map(service => 
  `- [ ] **${service.toUpperCase()}**: Check \`${service}/PROMPT.md\` and implement fixes`
).join('\n')}

### Phase 2: Integration Verification
- [ ] **All Services**: Wait for individual fixes completion
- [ ] **Root Orchestrator**: Run full E2E test suite
- [ ] **Validation**: Ensure cross-service communication works

## 🧪 Master Test Commands

After all services report fixes complete:
\`\`\`bash
# Full E2E test with MCP servers
npm run test:e2e:super

# Standard E2E test
npm run test:e2e

# Check individual service health
docker ps | grep geulpi
\`\`\`

## 📋 Failed Test Analysis

${this.failures.map(f => `
**[${f.service.toUpperCase()}]** ${f.testTitle}
- Component: ${f.component} (${f.errorType})  
- Error: \`${f.error.split('\n')[0]}\`
- Fix Required: ${f.specificFix}
`).join('')}

## 🎯 Completion Checklist

- [ ] All services have processed their PROMPT.md files
- [ ] Individual service tests passing  
- [ ] All PROMPT.md files deleted (indicates completion)
- [ ] Full E2E test suite passes
- [ ] Cross-service integration verified

## 🔧 Troubleshooting

If issues persist after individual fixes:
1. Check service health: \`docker ps\`
2. Check service logs: \`docker logs geulpi_[service]\`
3. Verify MCP servers: \`ps aux | grep mcp-server\`
4. Restart if needed: \`docker-compose restart [service]\`

---
*Root orchestration summary - Manage overall coordination from here*
`;

    fs.writeFileSync(summaryFile, summary);
    console.log(`📊 Generated test summary: ${summaryFile}`);
  }
}

export default PromptGeneratorReporter;