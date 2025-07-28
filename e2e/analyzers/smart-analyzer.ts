import { DetailedAnalysis } from './failure-analyzer';

export interface SmartAnalysis extends DetailedAnalysis {
  documentationLinks?: string[];
  bestPractices?: string[];
  commonMistakes?: string[];
  relatedIssues?: string[];
}

export class SmartAnalyzer {
  
  async enhanceAnalysis(basicAnalysis: DetailedAnalysis): Promise<SmartAnalysis> {
    // For now, we'll provide enhanced analysis without MCP
    // In the future, this could use Context7 MCP to fetch library docs
    
    const enhanced: SmartAnalysis = {
      ...basicAnalysis,
      documentationLinks: await this.getDocumentationLinks(basicAnalysis),
      bestPractices: await this.getBestPractices(basicAnalysis),
      commonMistakes: await this.getCommonMistakes(basicAnalysis),
      relatedIssues: await this.getRelatedIssues(basicAnalysis)
    };

    return enhanced;
  }

  private async getDocumentationLinks(analysis: DetailedAnalysis): Promise<string[]> {
    const links: string[] = [];

    switch (analysis.service) {
      case 'frontend':
        if (analysis.dependencies?.includes('React')) {
          links.push('https://react.dev/learn/testing-ui');
          links.push('https://testing-library.com/docs/react-testing-library/intro/');
        }
        if (analysis.dependencies?.includes('Next.js')) {
          links.push('https://nextjs.org/docs/testing');
        }
        break;

      case 'backend':
        if (analysis.dependencies?.includes('Spring GraphQL')) {
          links.push('https://docs.spring.io/spring-graphql/docs/current/reference/html/');
          links.push('https://spring.io/guides/gs/graphql-server/');
        }
        if (analysis.dependencies?.includes('Spring Security')) {
          links.push('https://docs.spring.io/spring-security/reference/servlet/oauth2/login/index.html');
        }
        break;

      case 'ml-server':
        if (analysis.dependencies?.includes('FastAPI')) {
          links.push('https://fastapi.tiangolo.com/tutorial/testing/');
        }
        if (analysis.dependencies?.includes('Kafka')) {
          links.push('https://kafka.apache.org/documentation/');
        }
        break;
    }

    return links;
  }

  private async getBestPractices(analysis: DetailedAnalysis): Promise<string[]> {
    const practices: string[] = [];

    if (analysis.errorType === 'Missing UI Element') {
      practices.push('Always use data-testid attributes for test stability');
      practices.push('Follow semantic HTML patterns for accessibility');
      practices.push('Use consistent naming conventions for test IDs');
    } else if (analysis.errorType === 'GraphQL Resolver Missing/Broken') {
      practices.push('Implement input validation in all resolvers');
      practices.push('Use proper error handling and meaningful error messages');
      practices.push('Add authorization checks before data operations');
      practices.push('Consider pagination for list queries');
    } else if (analysis.errorType === 'OAuth2/JWT Configuration') {
      practices.push('Store JWT secrets in environment variables');
      practices.push('Implement proper token expiration and refresh');
      practices.push('Use HTTPS for all OAuth2 redirects');
      practices.push('Validate JWT tokens on every request');
    }

    return practices;
  }

  private async getCommonMistakes(analysis: DetailedAnalysis): Promise<string[]> {
    const mistakes: string[] = [];

    switch (analysis.service) {
      case 'frontend':
        mistakes.push('Forgetting to add data-testid attributes to new components');
        mistakes.push('Not wrapping async operations in act() for testing');
        mistakes.push('Using hardcoded IDs instead of dynamic test selectors');
        break;

      case 'backend':
        mistakes.push('Not handling null/undefined values in GraphQL resolvers');
        mistakes.push('Missing @Transactional annotations for database operations');
        mistakes.push('Forgetting to configure CORS for frontend integration');
        mistakes.push('Not implementing proper exception handling');
        break;

      case 'ml-server':
        mistakes.push('Not handling async operations properly in FastAPI');
        mistakes.push('Missing error handling for ML model failures');
        mistakes.push('Not implementing proper request validation');
        break;
    }

    return mistakes;
  }

  private async getRelatedIssues(analysis: DetailedAnalysis): Promise<string[]> {
    const issues: string[] = [];

    if (analysis.component === 'Authentication Component') {
      issues.push('Ensure OAuth2 callback URL is properly configured');
      issues.push('Check if CSRF protection is causing issues');
      issues.push('Verify session storage is working correctly');
    } else if (analysis.component === 'Calendar Component') {
      issues.push('Check if date/time formatting is consistent');
      issues.push('Ensure timezone handling is working correctly');
      issues.push('Verify event data validation');
    } else if (analysis.component === 'GraphQL Mutation') {
      issues.push('Check database schema migrations are up to date');
      issues.push('Verify input type definitions match schema');
      issues.push('Ensure proper error propagation to frontend');
    }

    return issues;
  }

  // Future enhancement: Use Context7 MCP to fetch real documentation
  async fetchLibraryDocs(libraryName: string): Promise<string> {
    // This would use the Context7 MCP to get up-to-date documentation
    // For now, return a placeholder
    return `Documentation for ${libraryName} would be fetched here using Context7 MCP`;
  }

  // Generate context-aware prompts
  generateEnhancedPrompt(analysis: SmartAnalysis): string {
    return `
## 🧠 Smart Analysis

### 📚 Documentation References
${analysis.documentationLinks?.map(link => `- [${this.extractDomainName(link)}](${link})`).join('\n') || 'No specific documentation links available'}

### ✅ Best Practices to Follow
${analysis.bestPractices?.map(practice => `- ${practice}`).join('\n') || 'No specific best practices identified'}

### ⚠️ Common Mistakes to Avoid
${analysis.commonMistakes?.map(mistake => `- ${mistake}`).join('\n') || 'No common mistakes identified'}

### 🔗 Related Issues to Consider
${analysis.relatedIssues?.map(issue => `- ${issue}`).join('\n') || 'No related issues identified'}

### 💡 Additional Context
This analysis was enhanced with knowledge of common patterns and issues in ${analysis.service} development.
Consider checking the documentation links above for the most up-to-date implementation patterns.
`;
  }

  private extractDomainName(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Documentation';
    }
  }
}