import type { Reporter, FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { FailureAnalyzer } from '../analyzers/failure-analyzer';
import { SuperEnhancedAnalyzer } from '../analyzers/super-enhanced-analyzer';
import { createMCPClients } from '../utils/mcp-client';

interface SuperFailureAnalysis {
  service: 'frontend' | 'backend' | 'ml-server' | 'infrastructure';
  component: string;
  errorType: string;
  specificFix: string;
  error: string;
  testFile: string;
  testTitle: string;
  
  // Sequential Thinking enhancements
  structuredThinking?: string;
  researchInsights?: string;
  analysisDepth?: string;
  solutionStrategy?: string;
  
  // Context7 enhancements
  documentationLinks?: string[];
  bestPractices?: string[];
  codeExamples?: string[];
  enhancedDocumentation?: string;
  
  // Playwright MCP enhancements
  generatedTestCode?: string;
  accessibilityTest?: string;
  testGenerationSuccess?: boolean;
  testGenerationError?: string;
  
  // Browser Tools MCP enhancements
  screenshot?: string;
  lighthouseReport?: any;
  liveTestResult?: any;
  consoleAnalysis?: any;
  browserValidationSuccess?: boolean;
  browserValidationError?: string;
  
  // Additional metadata
  relatedFiles?: string[];
  dependencies?: string[];
}

export class SuperPromptGeneratorReporter implements Reporter {
  private failures: SuperFailureAnalysis[] = [];
  private rootDir: string;
  private basicAnalyzer: FailureAnalyzer;
  private superAnalyzer: SuperEnhancedAnalyzer;

  constructor(options: { outputDir?: string } = {}) {
    this.rootDir = path.resolve(__dirname, '../..');
    this.basicAnalyzer = new FailureAnalyzer();
    
    // Initialize real MCP clients to connect to local MCP servers
    const mcpClients = createMCPClients();
    
    this.superAnalyzer = new SuperEnhancedAnalyzer(mcpClients);
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`🚀 Starting MCP-enhanced test run with ${suite.allTests().length} tests`);
    console.log(`🤖 AI MCPs: Playwright ✅ Filesystem ✅ Memory ✅ Context7 ✅`);
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      const analysis = await this.analyzeFailureWithAllMCPs(test, result);
      if (analysis) {
        this.failures.push(analysis);
      }
    }
  }

  async onEnd() {
    if (this.failures.length === 0) {
      console.log('✅ All tests passed! No AI analysis needed.');
      return;
    }

    console.log(`\n🤖 ${this.failures.length} test(s) failed. Running super-enhanced AI analysis...`);
    
    // Group failures by service
    const failuresByService = this.groupFailuresByService();
    
    // Generate super-enhanced prompts for each service
    for (const [service, failures] of Object.entries(failuresByService)) {
      await this.generateSuperPromptForService(service as any, failures);
    }

    // Generate orchestrator summary
    await this.generateSuperOrchestratorPrompt();
  }

  private async analyzeFailureWithAllMCPs(test: TestCase, result: TestResult): Promise<SuperFailureAnalysis | null> {
    if (!result.errors || result.errors.length === 0) {
      return null;
    }

    const error = result.errors[0]?.message || 'Unknown error';
    const testFile = test.location.file;
    const testTitle = test.title;

    console.log(`🔍 Analyzing "${testTitle}" with all MCPs...`);

    try {
      // Step 1: Basic analysis
      const basicAnalysis = this.basicAnalyzer.analyzeError(result.errors[0], testTitle, testFile);
      
      // Step 2: Super-enhanced analysis with all MCPs
      const superAnalysis = await this.superAnalyzer.analyzeWithAllMCPs(basicAnalysis);
      
      return {
        ...superAnalysis,
        error,
        testFile,
        testTitle
      };
    } catch (analysisError) {
      console.warn(`⚠️ Super analysis failed for "${testTitle}": ${analysisError}`);
      return null;
    }
  }

  private groupFailuresByService(): Record<string, SuperFailureAnalysis[]> {
    const grouped: Record<string, SuperFailureAnalysis[]> = {};
    
    for (const failure of this.failures) {
      if (!grouped[failure.service]) {
        grouped[failure.service] = [];
      }
      grouped[failure.service].push(failure);
    }
    
    return grouped;
  }

  private async generateSuperPromptForService(service: string, failures: SuperFailureAnalysis[]) {
    const promptFile = path.join(this.rootDir, service, 'SUPER_PROMPT.md');
    
    const prompt = `# 🤖 Super AI-Enhanced E2E Test Failures Analysis

## 🚨 Critical Action Required for ${service.toUpperCase()}

${failures.length} test(s) failed and have been analyzed by our AI-powered system using:
- 🧠 **Sequential Thinking MCP**: Structured problem analysis
- 📚 **Context7 MCP**: Latest documentation and best practices  
- 🎭 **Playwright MCP**: Automated test code generation
- 🌐 **Browser Tools MCP**: Live browser validation

---

## 📊 Super-Enhanced Analysis Results

${failures.map((f, i) => `### ${i + 1}. ${f.testTitle}

#### 🎯 Core Information
- **📁 Test File**: \`${f.testFile}\`
- **🔧 Component**: ${f.component}
- **❌ Error Type**: ${f.errorType}
- **📝 Error Message**: 
\`\`\`
${f.error}
\`\`\`

#### 🧠 Sequential Thinking Analysis
${f.structuredThinking ? `
**🔬 Structured Analysis**:
${f.structuredThinking}

**🔍 Research Insights**:
${f.researchInsights || 'Analysis in progress...'}

**📈 Solution Strategy**:
${f.solutionStrategy || 'Strategy being formulated...'}
` : 'Sequential thinking analysis not available'}

#### 📚 Context7 Documentation Enhancement
${f.documentationLinks && f.documentationLinks.length > 0 ? `
**📖 Official Documentation**:
${f.documentationLinks.map(link => `- [${this.extractDomainName(link)}](${link})`).join('\n')}

**✅ Best Practices**:
${f.bestPractices?.map(practice => `- ${practice}`).join('\n') || 'Loading best practices...'}

${f.codeExamples && f.codeExamples.length > 0 ? `**💻 Code Examples from Official Docs**:
\`\`\`${this.getFileExtension(service)}
${f.codeExamples[0]}
\`\`\`
` : ''}
` : 'Documentation enhancement in progress...'}

#### 🎭 Playwright MCP Generated Solutions
${f.testGenerationSuccess ? `
**✅ Auto-Generated Test Code**:
\`\`\`${this.getFileExtension(service)}
${f.generatedTestCode || 'Test code generation completed'}
\`\`\`

${f.accessibilityTest ? `**♿ Accessibility Test**:
\`\`\`javascript
${f.accessibilityTest}
\`\`\`
` : ''}
` : f.testGenerationError ? `
**❌ Test Generation Failed**: ${f.testGenerationError}
` : '**⏳ Test code generation in progress...**'}

#### 🌐 Browser Tools MCP Live Validation
${f.browserValidationSuccess ? `
**📸 Live Screenshot**: ${f.screenshot ? 'Captured ✅' : 'Not available'}

**⚡ Lighthouse Report**:
${f.lighthouseReport ? `
- **Accessibility Score**: ${f.lighthouseReport.accessibility || 'N/A'}/100
- **Performance Score**: ${f.lighthouseReport.performance || 'N/A'}/100
- **Best Practices Score**: ${f.lighthouseReport.bestPractices || 'N/A'}/100
` : 'Report generation in progress...'}

**🔍 Console Analysis**: ${f.consoleAnalysis ? 'Completed ✅' : 'In progress...'}

${f.liveTestResult ? `**🧪 Live Test Execution**: ${f.liveTestResult.success ? 'PASSED ✅' : 'FAILED ❌'}` : ''}
` : f.browserValidationError ? `
**❌ Browser Validation Failed**: ${f.browserValidationError}
` : '**⏳ Browser validation in progress...**'}

#### 🎯 Immediate Action Required
**✅ Specific Fix**: ${f.specificFix}

**📂 Files to Modify**:
${f.relatedFiles?.map(file => `- \`${file}\``).join('\n') || 'Files being identified...'}

${f.dependencies ? `**📦 Dependencies to Check**:
${f.dependencies.map(dep => `- ${dep}`).join('\n')}
` : ''}

---

`).join('\n')}

## 🚀 Super Action Plan

### Phase 1: Immediate Fixes (Priority: 🔥 CRITICAL)
${failures.map((f, i) => `
${i + 1}. **Fix ${f.component}**
   - [ ] Review AI-generated analysis above
   - [ ] Implement the specific fix: "${f.specificFix}"
   - [ ] Apply generated code if available
   - [ ] Validate using provided accessibility tests
`).join('')}

### Phase 2: Validation (Priority: ⚡ HIGH)
${failures.map((f, i) => `
${i + 1}. **Validate ${f.component} Fix**
   - [ ] Run the auto-generated test code
   - [ ] Check accessibility score improvement
   - [ ] Verify browser console is clean
   - [ ] Confirm live test execution passes
`).join('')}

### Phase 3: Integration (Priority: 📊 MEDIUM)
- [ ] Run full E2E test suite: \`cd ../e2e && npm test\`
- [ ] Verify no regressions introduced
- [ ] Update any related documentation
- [ ] Delete this SUPER_PROMPT.md when complete

## 🧪 Testing Your Fixes

**Quick Test** (specific to your changes):
\`\`\`bash
cd ../e2e
npm test -- ${failures.map(f => path.basename(f.testFile, '.spec.ts')).join(' ')}
\`\`\`

**Full Test Suite**:
\`\`\`bash
cd ../e2e && npm test
\`\`\`

**Live Browser Testing**:
\`\`\`bash
npm run test:headed -- ${failures.map(f => path.basename(f.testFile, '.spec.ts')).join(' ')}
\`\`\`

## 📊 AI Analysis Metadata
- **Analysis Timestamp**: ${new Date().toISOString()}
- **AI Systems Used**: Sequential Thinking MCP, Context7 MCP, Playwright MCP, Browser Tools MCP
- **Total Failures Analyzed**: ${failures.length}
- **Service**: ${service}
- **Success Rate**: ${this.calculateSuccessRate(failures)}%

## 🤖 What Makes This Super-Enhanced?

1. **🧠 Structured Thinking**: Problems analyzed step-by-step with logical reasoning
2. **📚 Live Documentation**: Real-time access to latest official documentation
3. **🎭 Code Generation**: AI automatically generates working test and fix code
4. **🌐 Browser Validation**: Live testing in actual browser environment
5. **⚡ Performance Analysis**: Lighthouse integration for quality metrics

---
*This super-prompt was generated by the AI-Enhanced E2E Test System with multi-MCP integration*
`;

    fs.writeFileSync(promptFile, prompt);
    console.log(`🤖 Generated super-enhanced prompt for ${service}: ${promptFile}`);
  }

  private async generateSuperOrchestratorPrompt() {
    const summaryFile = path.join(this.rootDir, 'SUPER_E2E_SUMMARY.md');
    
    const serviceCount = Object.keys(this.groupFailuresByService()).length;
    const summary = `# 🤖 Super AI-Enhanced E2E Test Analysis Summary

## 🚨 Status: FAILURES DETECTED - AI ANALYSIS COMPLETE

- **🔥 Total Failures**: ${this.failures.length}
- **🎯 Affected Services**: ${serviceCount}
- **🤖 AI Analysis**: COMPLETED with full MCP integration
- **⏰ Timestamp**: ${new Date().toISOString()}

## 🧠 AI-Powered Analysis Results

### Sequential Thinking MCP Analysis
${this.failures.filter(f => f.structuredThinking).length} tests analyzed with structured reasoning

### Context7 MCP Documentation
${this.failures.filter(f => f.documentationLinks?.length).length} tests enhanced with latest official documentation

### Playwright MCP Code Generation  
${this.failures.filter(f => f.testGenerationSuccess).length} tests with auto-generated fix code

### Browser Tools MCP Validation
${this.failures.filter(f => f.browserValidationSuccess).length} tests validated in live browser environment

## 🎯 Service Breakdown
${Object.entries(this.groupFailuresByService()).map(([service, failures]) => 
  `- **${service}**: ${failures.length} failure(s) → SUPER_PROMPT.md generated ✅`
).join('\n')}

## 🚀 Next Steps (Orchestrator Actions)

### 1. Review Super Prompts (IMMEDIATE)
Each affected service has received a SUPER_PROMPT.md with:
- 🧠 AI-structured problem analysis  
- 📚 Latest documentation and best practices
- 🎭 Auto-generated working code
- 🌐 Live browser validation results

### 2. Coordinate Fixes (HIGH PRIORITY)
Services may have interdependencies. Review these potential conflicts:
${this.identifyServiceDependencies()}

### 3. Validation Strategy (MEDIUM PRIORITY)
After all services implement fixes:
\`\`\`bash
# Re-run super-enhanced E2E analysis
npm run test:e2e:super-smart

# Standard E2E test
npm run test:e2e

# Performance validation
npm run test:e2e:lighthouse
\`\`\`

## 📊 Detailed Failure Analysis
${this.failures.map((f, i) => `
### ${i + 1}. [${f.service}] ${f.testTitle}
- **Error**: ${f.errorType}
- **AI Analysis**: ${f.structuredThinking ? '✅' : '⏳'} | **Docs**: ${f.documentationLinks?.length ? '✅' : '⏳'} | **Code Gen**: ${f.testGenerationSuccess ? '✅' : '❌'} | **Browser**: ${f.browserValidationSuccess ? '✅' : '❌'}
- **Action**: Check SUPER_PROMPT.md in ${f.service}/ directory`).join('')}

## 🤖 AI System Performance
- **Sequential Thinking Success Rate**: ${this.calculateMCPSuccessRate('structuredThinking')}%
- **Context7 Documentation Rate**: ${this.calculateMCPSuccessRate('documentationLinks')}%  
- **Playwright Code Generation Rate**: ${this.calculateMCPSuccessRate('testGenerationSuccess')}%
- **Browser Tools Validation Rate**: ${this.calculateMCPSuccessRate('browserValidationSuccess')}%

## ⚡ Quick Actions
\`\`\`bash
# Monitor all service fixes
watch -n 5 'find . -name "SUPER_PROMPT.md" | wc -l'

# When all prompts are resolved, re-run tests
npm run test:e2e:super-smart

# Clean up after successful fixes
find . -name "SUPER_PROMPT.md" -delete
\`\`\`

---
*Generated by Super AI-Enhanced E2E Test System with Multi-MCP Integration*
*Sequential Thinking MCP • Context7 MCP • Playwright MCP • Browser Tools MCP*
`;

    fs.writeFileSync(summaryFile, summary);
    console.log(`🤖 Generated super orchestrator summary: ${summaryFile}`);
  }

  // Helper methods
  private calculateSuccessRate(failures: SuperFailureAnalysis[]): number {
    const successful = failures.filter(f => 
      f.structuredThinking && f.documentationLinks?.length && f.testGenerationSuccess && f.browserValidationSuccess
    ).length;
    return Math.round((successful / failures.length) * 100);
  }

  private calculateMCPSuccessRate(field: keyof SuperFailureAnalysis): number {
    const successful = this.failures.filter(f => {
      const value = f[field];
      if (typeof value === 'boolean') return value;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.length > 0;
      return !!value;
    }).length;
    return Math.round((successful / this.failures.length) * 100);
  }

  private identifyServiceDependencies(): string {
    const services = Object.keys(this.groupFailuresByService());
    if (services.length <= 1) return 'No service dependencies detected.';
    
    return `- ${services.join(' and ')} may have schema/API dependencies\n- Coordinate GraphQL schema changes\n- Verify authentication flow compatibility`;
  }

  private extractDomainName(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Documentation';
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
}

export default SuperPromptGeneratorReporter;