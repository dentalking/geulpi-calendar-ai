import { DetailedAnalysis } from './failure-analyzer';
import { SmartAnalysis } from './smart-analyzer';
import { MCPClient } from '../utils/mcp-client';

export class SuperEnhancedAnalyzer {
  private mcpClients: MCPClient;

  constructor(mcpClients: MCPClient) {
    this.mcpClients = mcpClients;
  }

  async analyzeWithAllMCPs(basicAnalysis: DetailedAnalysis): Promise<SmartAnalysis> {
    console.log(`🚀 Starting MCP-enhanced analysis with available servers...`);
    
    try {
      // Step 1: Memory MCP로 지식 그래프 구축 및 패턴 분석
      const memoryEnhanced = await this.enhanceWithMemoryMCP(basicAnalysis);
      
      // Step 2: Context7으로 최신 문서 조회
      const documentationEnhanced = await this.enhanceWithContext7(memoryEnhanced);
      
      // Step 3: Filesystem MCP로 관련 파일 분석
      const filesystemAnalyzed = await this.analyzeWithFilesystemMCP(documentationEnhanced);
      
      // Step 4: Playwright MCP로 브라우저 자동화 테스트
      const browserValidated = await this.validateWithPlaywrightMCP(filesystemAnalyzed);
      
      return browserValidated;
    } catch (error) {
      console.warn(`⚠️ MCP-enhanced analysis failed: ${error}. Falling back to basic analysis.`);
      return basicAnalysis;
    }
  }

  private async enhanceWithMemoryMCP(analysis: DetailedAnalysis): Promise<SmartAnalysis> {
    console.log(`🧠 Building knowledge graph with Memory MCP...`);
    
    try {
      // Store analysis in memory for pattern recognition
      await this.mcpClients.memoryMCP.createEntity({
        name: `TestFailure_${analysis.component}_${Date.now()}`,
        entityType: 'test_failure',
        content: `E2E 테스트 실패: ${analysis.errorType} in ${analysis.service}/${analysis.component}`,
        observations: [
          `Error: ${analysis.specificFix}`,
          `Service: ${analysis.service}`,
          `Component: ${analysis.component}`,
          `Pattern: ${analysis.errorType}`
        ]
      });

      // Query for similar past failures
      const similarFailures = await this.mcpClients.memoryMCP.searchEntities({
        query: `${analysis.errorType} ${analysis.service}`,
        entityType: 'test_failure'
      });

      // Derive insights from patterns
      const insights = this.deriveInsightsFromMemory(similarFailures);

      return {
        ...analysis,
        structuredThinking: `Memory-based pattern analysis completed for ${analysis.component}`,
        researchInsights: insights.join('; '),
        analysisDepth: `Found ${similarFailures.length} similar failures in memory`,
        solutionStrategy: this.generateMemoryBasedStrategy(analysis, similarFailures)
      };
    } catch (error) {
      console.warn(`Memory MCP failed: ${error}`);
      return {
        ...analysis,
        structuredThinking: 'Basic analysis without memory enhancement',
        researchInsights: 'Memory service unavailable',
        analysisDepth: 'Shallow analysis',
        solutionStrategy: 'Standard troubleshooting approach'
      };
    }
  }

  private async enhanceWithContext7(analysis: SmartAnalysis): Promise<SmartAnalysis> {
    console.log(`📚 Enhancing with Context7 MCP documentation...`);
    
    const libraryQueries = this.getLibraryQueries(analysis);
    let combinedDocs = '';
    let documentationLinks: string[] = [];

    for (const query of libraryQueries) {
      try {
        const libraryId = await this.mcpClients.context7MCP.resolveLibraryId(query.library);
        if (libraryId) {
          const docs = await this.mcpClients.context7MCP.getLibraryDocs(libraryId, query.topic, 2000);
          combinedDocs += docs + '\n\n';
          documentationLinks.push(this.getDocumentationUrl(libraryId));
        }
      } catch (error) {
        console.warn(`Failed to fetch docs for ${query.library}: ${error}`);
      }
    }

    // Extract best practices and code examples from documentation
    const bestPractices = this.extractBestPracticesFromDocs(combinedDocs, analysis);
    const codeExamples = this.extractCodeExamplesFromDocs(combinedDocs, analysis);

    return {
      ...analysis,
      documentationLinks,
      bestPractices,
      codeExamples,
      enhancedDocumentation: combinedDocs
    };
  }

  private async analyzeWithFilesystemMCP(analysis: SmartAnalysis): Promise<SmartAnalysis> {
    console.log(`📁 Analyzing files with Filesystem MCP...`);
    
    try {
      // Find related files based on component and service
      const relatedFiles = await this.mcpClients.filesystemMCP.searchFiles({
        pattern: `*${analysis.component}*`,
        directory: analysis.service
      });

      // Read configuration files that might be relevant
      const configFiles = await this.mcpClients.filesystemMCP.listDirectory({
        path: `${analysis.service}/`,
        filter: '*.json,*.yml,*.config.*'
      });

      // Analyze package.json for dependencies
      let dependencies = [];
      try {
        const packageJson = await this.mcpClients.filesystemMCP.readFile({
          path: `${analysis.service}/package.json`
        });
        const pkg = JSON.parse(packageJson);
        dependencies = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
      } catch {
        // Package.json might not exist or be readable
      }

      return {
        ...analysis,
        relatedFiles: relatedFiles.map(f => f.path),
        dependencies,
        generatedTestCode: this.generateBasicTestCode(analysis),
        testGenerationSuccess: true
      };
    } catch (error) {
      console.warn(`Filesystem MCP failed: ${error}`);
      return {
        ...analysis,
        relatedFiles: [`${analysis.service}/**`],
        dependencies: ['Check package.json manually'],
        testGenerationSuccess: false,
        testGenerationError: error.message
      };
    }
  }

  private async validateWithPlaywrightMCP(analysis: SmartAnalysis): Promise<SmartAnalysis> {
    console.log(`🎭 Validating with Playwright MCP...`);
    
    try {
      // Navigate to the problematic page using Playwright MCP
      const pageUrl = this.getPageUrl(analysis);
      await this.mcpClients.playwrightMCP.navigateToPage({ 
        url: pageUrl,
        waitUntil: 'domcontentloaded'
      });

      // Take screenshot for visual debugging
      const screenshotResult = await this.mcpClients.playwrightMCP.takeScreenshot({
        fullPage: true,
        path: `test-failure-${analysis.component}-${Date.now()}.png`
      });

      // Get page accessibility snapshot
      const accessibilitySnapshot = await this.mcpClients.playwrightMCP.getAccessibilitySnapshot();

      // Try to locate the problematic component
      let componentAnalysis = null;
      if (analysis.service === 'frontend') {
        try {
          const selector = this.getComponentSelector(analysis);
          componentAnalysis = await this.mcpClients.playwrightMCP.locateElement({
            selector,
            timeout: 5000
          });
        } catch {
          componentAnalysis = { found: false, message: 'Component not found in accessibility tree' };
        }
      }

      // Extract console messages
      const consoleMessages = await this.mcpClients.playwrightMCP.getConsoleMessages();
      const errorMessages = consoleMessages.filter(msg => msg.type === 'error');

      // Generate automated test code based on findings
      const generatedTestCode = await this.generatePlaywrightTestCode(analysis, componentAnalysis);

      // Generate accessibility test
      const accessibilityTest = this.generateAccessibilityTest(analysis);

      return {
        ...analysis,
        screenshot: screenshotResult.path || 'screenshot-captured',
        consoleAnalysis: `Found ${errorMessages.length} console errors: ${errorMessages.map(e => e.text).join('; ')}`,
        liveTestResult: componentAnalysis,
        generatedTestCode,
        accessibilityTest,
        browserValidationSuccess: true
      };
    } catch (error) {
      console.warn(`Playwright MCP failed: ${error}`);
      return {
        ...analysis,
        browserValidationSuccess: false,
        browserValidationError: error.message,
        generatedTestCode: this.generateBasicTestCode(analysis),
        accessibilityTest: this.generateAccessibilityTest(analysis)
      };
    }
  }

  // Helper methods
  private getLibraryQueries(analysis: SmartAnalysis): Array<{ library: string; topic: string }> {
    const queries: Array<{ library: string; topic: string }> = [];

    switch (analysis.service) {
      case 'frontend':
        queries.push({ library: 'react testing library', topic: 'testing components' });
        queries.push({ library: 'playwright', topic: 'selectors best practices' });
        queries.push({ library: 'next.js', topic: 'testing' });
        break;
      case 'backend':
        queries.push({ library: 'spring graphql', topic: 'resolvers' });
        queries.push({ library: 'spring security', topic: 'oauth2' });
        queries.push({ library: 'spring boot', topic: 'testing' });
        break;
      case 'ml-server':
        queries.push({ library: 'fastapi', topic: 'testing async endpoints' });
        queries.push({ library: 'python', topic: 'async testing' });
        break;
    }

    return queries;
  }

  private extractTestIdFromError(error: string): string {
    const testIdMatch = error.match(/data-testid="([^"]+)"/);
    return testIdMatch ? testIdMatch[1] : 'unknown-element';
  }

  private generateTestScenario(analysis: SmartAnalysis): string {
    return `Test scenario for ${analysis.component}: ${analysis.specificFix}`;
  }

  private getPageUrl(analysis: SmartAnalysis): string {
    // Determine appropriate page URL based on analysis context
    if (analysis.component.includes('Authentication')) {
      return 'http://localhost:3000/login';
    } else if (analysis.component.includes('Calendar')) {
      return 'http://localhost:3000/dashboard';
    }
    return 'http://localhost:3000';
  }

  private getComponentSelector(analysis: SmartAnalysis): string {
    const testId = this.extractTestIdFromError(analysis.error || '');
    return `[data-testid="${testId}"]`;
  }

  private extractBestPracticesFromDocs(docs: string, analysis: SmartAnalysis): string[] {
    // Extract best practices from documentation
    const practices: string[] = [];
    
    if (docs.includes('data-testid')) {
      practices.push('Always use data-testid attributes for stable test selectors');
    }
    if (docs.includes('accessibility')) {
      practices.push('Ensure proper accessibility practices in component design');
    }
    if (docs.includes('@QueryMapping') || docs.includes('@MutationMapping')) {
      practices.push('Use appropriate Spring GraphQL annotations for resolvers');
    }

    return practices;
  }

  private extractCodeExamplesFromDocs(docs: string, analysis: SmartAnalysis): string[] {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const examples: string[] = [];
    let match;

    while ((match = codeBlockRegex.exec(docs)) !== null) {
      examples.push(match[1]);
    }

    // Return most relevant examples (limit to 3)
    return examples.slice(0, 3);
  }

  private getDocumentationUrl(libraryId: string): string {
    const urlMappings: Record<string, string> = {
      '/testing-library/react-testing-library': 'https://testing-library.com/docs/react-testing-library/intro/',
      '/spring-projects/spring-graphql': 'https://docs.spring.io/spring-graphql/docs/current/reference/html/',
      '/microsoft/playwright': 'https://playwright.dev/docs/intro'
    };
    return urlMappings[libraryId] || `https://github.com${libraryId}`;
  }

  private extractEndpointFromError(error: string): string {
    // Extract GraphQL operation or REST endpoint from error
    const operationMatch = error.match(/(\w+Query|\w+Mutation)/);
    return operationMatch ? operationMatch[1] : 'unknown-operation';
  }

  private getExpectedResponse(analysis: SmartAnalysis): any {
    // Generate expected response based on component type
    if (analysis.component.includes('Event')) {
      return { id: 'string', title: 'string', start: 'datetime' };
    }
    return {};
  }

  // New helper methods for MCP integration
  private deriveInsightsFromMemory(similarFailures: any[]): string[] {
    const insights = [];
    if (similarFailures.length > 0) {
      insights.push(`Found ${similarFailures.length} similar failures in the past`);
      insights.push('Pattern suggests systematic issue rather than isolated bug');
    } else {
      insights.push('This appears to be a new type of failure');
      insights.push('No historical patterns available for reference');
    }
    return insights;
  }

  private generateMemoryBasedStrategy(analysis: DetailedAnalysis, similarFailures: any[]): string {
    if (similarFailures.length > 0) {
      return `Based on ${similarFailures.length} similar past failures, focus on ${analysis.component} configuration and dependencies`;
    }
    return `New failure pattern - investigate ${analysis.component} implementation and test setup`;
  }

  private generateBasicTestCode(analysis: SmartAnalysis): string {
    const serviceType = analysis.service;
    if (serviceType === 'frontend') {
      return `// Auto-generated test for ${analysis.component}
test('${analysis.component} should work correctly', async ({ page }) => {
  await page.goto('${this.getPageUrl(analysis)}');
  await page.waitForSelector('[data-testid="${this.extractTestIdFromError(analysis.error || '')}"]');
  // Add specific test assertions here
});`;
    } else if (serviceType === 'backend') {
      return `// Auto-generated API test for ${analysis.component}
test('${analysis.component} API should respond correctly', async () => {
  const response = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ ${analysis.component.toLowerCase()} }' })
  });
  expect(response.status).toBe(200);
});`;
    }
    return `// Test code for ${analysis.component} - service: ${serviceType}`;
  }

  private generateAccessibilityTest(analysis: SmartAnalysis): string {
    return `// Accessibility test for ${analysis.component}
test('${analysis.component} accessibility', async ({ page }) => {
  await page.goto('${this.getPageUrl(analysis)}');
  const axeResults = await page.evaluate(() => {
    // Run axe-core accessibility testing
    return window.axe?.run() || { violations: [] };
  });
  expect(axeResults.violations).toHaveLength(0);
});`;
  }

  private async generatePlaywrightTestCode(analysis: SmartAnalysis, componentAnalysis: any): Promise<string> {
    const serviceType = analysis.service;
    const component = analysis.component;
    const pageUrl = this.getPageUrl(analysis);
    
    if (serviceType === 'frontend' && componentAnalysis?.found) {
      return `// AI-generated Playwright test for ${component}
test('${component} should work correctly', async ({ page }) => {
  // Navigate to the page
  await page.goto('${pageUrl}');
  
  // Wait for the component to be visible
  const selector = '${this.getComponentSelector(analysis)}';
  await page.waitForSelector(selector, { state: 'visible' });
  
  // Interact with the component
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  
  // Check for specific functionality based on error type
  ${this.generateSpecificInteractions(analysis)}
  
  // Verify no console errors
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(msg.text());
  });
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'test-${component.toLowerCase()}-${Date.now()}.png' });
  
  // Assert no critical errors
  expect(consoleLogs.filter(log => !log.includes('Warning'))).toHaveLength(0);
});`;
    } else if (serviceType === 'backend') {
      return `// AI-generated API test for ${component}
test('${component} API should respond correctly', async ({ request }) => {
  // Test GraphQL endpoint
  const response = await request.post('http://localhost:8080/graphql', {
    data: {
      query: \`query { ${component.toLowerCase()} { id } }\`
    }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.errors).toBeUndefined();
  expect(data.data).toBeDefined();
});`;
    }
    
    return this.generateBasicTestCode(analysis);
  }

  private generateSpecificInteractions(analysis: SmartAnalysis): string {
    if (analysis.errorType.includes('click') || analysis.errorType.includes('button')) {
      return `  // Test click interaction
  await element.click();
  await page.waitForTimeout(500); // Wait for any animations`;
    } else if (analysis.errorType.includes('input') || analysis.errorType.includes('form')) {
      return `  // Test input interaction
  await element.fill('test value');
  await expect(element).toHaveValue('test value');`;
    } else if (analysis.errorType.includes('navigation') || analysis.errorType.includes('route')) {
      return `  // Test navigation
  await element.click();
  await page.waitForURL(/.*${analysis.component.toLowerCase()}.*/);`;
    }
    return `  // Basic interaction test
  await element.hover();
  await expect(element).toBeEnabled();`;
  }
}