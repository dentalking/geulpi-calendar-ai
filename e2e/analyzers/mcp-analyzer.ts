import { DetailedAnalysis } from './failure-analyzer';
import { SmartAnalysis } from './smart-analyzer';

interface MCPService {
  resolveLibraryId(libraryName: string): Promise<string>;
  getLibraryDocs(libraryId: string, topic: string, tokens?: number): Promise<string>;
}

export class MCPAnalyzer {
  private mcpService: MCPService;

  constructor() {
    // In a real implementation, this would inject the actual MCP service
    this.mcpService = {
      resolveLibraryId: async (libraryName: string) => {
        // This would call the actual Context7 MCP resolve-library-id
        const libraryMappings = {
          'react testing library': '/testing-library/react-testing-library',
          'spring graphql': '/spring-projects/spring-graphql',
          'fastapi': '/tiangolo/fastapi',
          'playwright': '/microsoft/playwright'
        };
        return libraryMappings[libraryName.toLowerCase()] || '';
      },

      getLibraryDocs: async (libraryId: string, topic: string, tokens = 3000) => {
        // This would call the actual Context7 MCP get-library-docs
        // For now, return simulated docs based on the data we already fetched
        if (libraryId === '/testing-library/react-testing-library') {
          return this.getReactTestingLibraryDocs(topic);
        } else if (libraryId === '/spring-projects/spring-graphql') {
          return this.getSpringGraphQLDocs(topic);
        }
        return `Documentation for ${libraryId} with topic ${topic}`;
      }
    };
  }

  async enhanceAnalysisWithMCP(basicAnalysis: DetailedAnalysis): Promise<SmartAnalysis> {
    console.log(`🧠 Enhancing analysis with MCP for ${basicAnalysis.service}/${basicAnalysis.component}...`);
    
    try {
      // Get relevant library documentation
      const libraryQueries = this.getLibraryQueries(basicAnalysis);
      let combinedDocs = '';
      let documentationLinks: string[] = [];

      for (const query of libraryQueries) {
        try {
          const libraryId = await this.mcpService.resolveLibraryId(query.library);
          if (libraryId) {
            const docs = await this.mcpService.getLibraryDocs(libraryId, query.topic);
            combinedDocs += docs + '\n\n';
            documentationLinks.push(this.getDocumentationUrl(libraryId));
          }
        } catch (error) {
          console.warn(`Failed to fetch docs for ${query.library}: ${error}`);
        }
      }

      // Enhance the analysis with MCP-fetched documentation
      const enhancedFix = this.generateEnhancedFix(basicAnalysis, combinedDocs);
      const codeSnippet = this.extractRelevantCodeSnippet(basicAnalysis, combinedDocs);
      const bestPractices = this.extractBestPractices(combinedDocs, basicAnalysis);
      const commonMistakes = this.extractCommonMistakes(basicAnalysis);

      return {
        ...basicAnalysis,
        specificFix: enhancedFix,
        codeSnippet: codeSnippet || basicAnalysis.codeSnippet,
        documentationLinks,
        bestPractices,
        commonMistakes,
        relatedIssues: this.findRelatedIssues(basicAnalysis)
      };
    } catch (error) {
      console.warn(`⚠️ MCP enhancement failed: ${error}. Using basic analysis.`);
      return basicAnalysis;
    }
  }

  private getLibraryQueries(analysis: DetailedAnalysis): Array<{ library: string; topic: string }> {
    const queries: Array<{ library: string; topic: string }> = [];

    switch (analysis.service) {
      case 'frontend':
        if (analysis.errorType === 'Missing UI Element') {
          queries.push({ library: 'react testing library', topic: 'testing components' });
          queries.push({ library: 'playwright', topic: 'selectors' });
        }
        break;

      case 'backend':
        if (analysis.errorType === 'GraphQL Resolver Missing/Broken') {
          queries.push({ library: 'spring graphql', topic: 'resolvers' });
        } else if (analysis.errorType === 'OAuth2/JWT Configuration') {
          queries.push({ library: 'spring security', topic: 'oauth2' });
        }
        break;

      case 'ml-server':
        if (analysis.errorType === 'Missing ML Endpoint') {
          queries.push({ library: 'fastapi', topic: 'testing' });
        }
        break;
    }

    return queries;
  }

  private generateEnhancedFix(analysis: DetailedAnalysis, docs: string): string {
    // Use the documentation to provide more specific and accurate fixes
    let enhancedFix = analysis.specificFix;

    if (analysis.service === 'frontend' && docs.includes('data-testid')) {
      enhancedFix = `Add the missing UI element with a proper data-testid attribute. Based on React Testing Library best practices: "The more your tests resemble the way your software is used, the more confidence they can give you." Ensure the element is accessible and follows semantic HTML patterns.`;
    } else if (analysis.service === 'backend' && docs.includes('@QueryMapping')) {
      enhancedFix = `Implement the GraphQL resolver using Spring GraphQL annotations. Use @QueryMapping for queries, @MutationMapping for mutations. Include proper input validation, error handling, and return the expected type as defined in your GraphQL schema.`;
    } else if (analysis.service === 'backend' && docs.includes('@SchemaMapping')) {
      enhancedFix = `Create the resolver method using @SchemaMapping annotation. This method will be called to resolve the field for the parent type. Ensure proper data fetching and consider using @BatchMapping for efficient N+1 problem resolution.`;
    }

    return enhancedFix;
  }

  private extractRelevantCodeSnippet(analysis: DetailedAnalysis, docs: string): string | undefined {
    // Extract the most relevant code snippet from documentation
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const matches = [];
    let match;

    while ((match = codeBlockRegex.exec(docs)) !== null) {
      matches.push(match[1]);
    }

    if (matches.length === 0) return undefined;

    // Find the most relevant snippet based on analysis context
    for (const snippet of matches) {
      if (analysis.service === 'frontend' && snippet.includes('data-testid')) {
        return this.adaptSnippetForAnalysis(snippet, analysis);
      } else if (analysis.service === 'backend' && snippet.includes('@QueryMapping')) {
        return this.adaptSnippetForAnalysis(snippet, analysis);
      } else if (analysis.service === 'backend' && snippet.includes('@SchemaMapping')) {
        return this.adaptSnippetForAnalysis(snippet, analysis);
      }
    }

    // Return the first relevant snippet if no perfect match
    return this.adaptSnippetForAnalysis(matches[0], analysis);
  }

  private adaptSnippetForAnalysis(snippet: string, analysis: DetailedAnalysis): string {
    // Adapt the code snippet to match the specific error context
    if (analysis.service === 'frontend') {
      // Extract test ID from error and adapt React Testing Library example
      const testIdMatch = analysis.error.match(/data-testid="([^"]+)"/);
      if (testIdMatch) {
        const testId = testIdMatch[1];
        return `
// Add the missing element to your component
<button data-testid="${testId}" onClick={handleClick}>
  {/* Your button content */}
</button>

// Test it with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';

test('should handle ${testId} interaction', () => {
  render(<YourComponent />);
  
  const element = screen.getByTestId('${testId}');
  expect(element).toBeInTheDocument();
  
  fireEvent.click(element);
  // Add your assertions here
});`;
      }
    } else if (analysis.service === 'backend') {
      // Adapt Spring GraphQL examples for the specific operation
      const operationMatch = analysis.error.match(/(\w+)/);
      if (operationMatch) {
        const operation = operationMatch[1];
        return `
@Controller
public class ${analysis.component.replace(' ', '')}Controller {

    @QueryMapping
    public ${this.getReturnType(operation)} ${this.toCamelCase(operation)}(${this.getArgs(operation)}) {
        // TODO: Implement ${operation} logic
        // Add input validation
        // Handle business logic
        // Return appropriate response
        return ${this.getDefaultReturn(operation)};
    }
}`;
      }
    }

    return snippet;
  }

  private extractBestPractices(docs: string, analysis: DetailedAnalysis): string[] {
    const practices: string[] = [];

    // Extract best practices from the documentation
    if (docs.includes('data-testid')) {
      practices.push('Always use data-testid attributes for stable test selectors');
      practices.push('Write tests that resemble how users interact with your software');
    }

    if (docs.includes('fireEvent') && docs.includes('userEvent')) {
      practices.push('Prefer userEvent over fireEvent for more realistic user interactions');
    }

    if (docs.includes('@QueryMapping')) {
      practices.push('Use @QueryMapping for GraphQL queries and @MutationMapping for mutations');
      practices.push('Implement proper input validation in all resolvers');
    }

    if (docs.includes('@SchemaMapping')) {
      practices.push('Use @SchemaMapping to resolve fields for specific types');
      practices.push('Consider @BatchMapping for N+1 problem resolution');
    }

    if (docs.includes('BatchLoader')) {
      practices.push('Register BatchLoaders to prevent N+1 query problems');
      practices.push('Use DataLoader for efficient batch loading of related entities');
    }

    return practices.length > 0 ? practices : [
      'Follow the framework-specific best practices',
      'Write maintainable and testable code',
      'Add proper error handling and validation'
    ];
  }

  private extractCommonMistakes(analysis: DetailedAnalysis): string[] {
    const mistakes: string[] = [];

    switch (analysis.service) {
      case 'frontend':
        mistakes.push('Forgetting to add data-testid attributes to interactive elements');
        mistakes.push('Testing implementation details instead of user behavior');
        mistakes.push('Not using proper accessibility roles and labels');
        break;

      case 'backend':
        mistakes.push('Not handling null/undefined values in GraphQL resolvers');
        mistakes.push('Missing input validation and error handling');
        mistakes.push('Creating N+1 query problems without batch loading');
        mistakes.push('Not implementing proper authorization checks');
        break;

      case 'ml-server':
        mistakes.push('Not handling async operations properly in FastAPI');
        mistakes.push('Missing error handling for ML model failures');
        mistakes.push('Not implementing proper request/response validation');
        break;
    }

    return mistakes;
  }

  private findRelatedIssues(analysis: DetailedAnalysis): string[] {
    const issues: string[] = [];

    if (analysis.component.includes('Authentication')) {
      issues.push('Ensure OAuth2 callback URLs match configuration');
      issues.push('Check CORS settings for cross-origin requests');
      issues.push('Verify JWT token generation and validation');
    } else if (analysis.component.includes('Calendar')) {
      issues.push('Check timezone handling consistency');
      issues.push('Ensure date formatting matches expectations');
      issues.push('Verify event data validation rules');
    } else if (analysis.component.includes('GraphQL')) {
      issues.push('Ensure schema synchronization between services');
      issues.push('Check database transaction boundaries');
      issues.push('Verify input type definitions match schema');
    }

    return issues;
  }

  private getDocumentationUrl(libraryId: string): string {
    const urlMappings = {
      '/testing-library/react-testing-library': 'https://testing-library.com/docs/react-testing-library/intro/',
      '/spring-projects/spring-graphql': 'https://docs.spring.io/spring-graphql/docs/current/reference/html/',
      '/tiangolo/fastapi': 'https://fastapi.tiangolo.com/',
      '/microsoft/playwright': 'https://playwright.dev/docs/intro'
    };
    return urlMappings[libraryId] || `https://github.com${libraryId}`;
  }

  // Helper methods
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private getReturnType(operation: string): string {
    if (operation.toLowerCase().includes('create')) return 'Event';
    if (operation.toLowerCase().includes('update')) return 'Event';
    if (operation.toLowerCase().includes('delete')) return 'Boolean';
    if (operation.toLowerCase().includes('get')) return 'Event';
    return 'Object';
  }

  private getArgs(operation: string): string {
    if (operation.toLowerCase().includes('create')) return '@Argument CreateEventInput input';
    if (operation.toLowerCase().includes('update')) return '@Argument String id, @Argument UpdateEventInput input';
    if (operation.toLowerCase().includes('delete')) return '@Argument String id';
    if (operation.toLowerCase().includes('get')) return '@Argument String id';
    return '';
  }

  private getDefaultReturn(operation: string): string {
    if (operation.toLowerCase().includes('delete')) return 'true';
    return 'new Event()';
  }

  // Simulated documentation data (would be replaced by actual MCP calls)
  private getReactTestingLibraryDocs(topic: string): string {
    return `
# React Testing Library Best Practices

## Component Testing
- Always use data-testid attributes for stable selectors
- Write tests that resemble how your software is used
- Use userEvent for realistic user interactions

## Example:
\`\`\`tsx
import { render, screen, fireEvent } from '@testing-library/react';

const Button = ({ onClick, children }) => (
  <button data-testid="submit-button" onClick={onClick}>
    {children}
  </button>
);

test('should handle click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Submit</Button>);
  
  fireEvent.click(screen.getByTestId('submit-button'));
  expect(handleClick).toHaveBeenCalled();
});
\`\`\`

The guiding principle: "The more your tests resemble the way your software is used, the more confidence they can give you."
`;
  }

  private getSpringGraphQLDocs(topic: string): string {
    return `
# Spring GraphQL Resolvers

## Creating Resolvers
- Use @QueryMapping for queries, @MutationMapping for mutations
- Use @SchemaMapping for type-based resolvers
- Implement proper error handling and validation

## Example:
\`\`\`java
@Controller
public class EventController {
    
    @MutationMapping
    public Event createEvent(@Argument CreateEventInput input) {
        // Validate input
        if (input.getTitle() == null || input.getTitle().isEmpty()) {
            throw new GraphQLException("Title is required");
        }
        
        // Create event
        Event event = new Event();
        event.setTitle(input.getTitle());
        event.setStart(input.getStart());
        event.setEnd(input.getEnd());
        
        return eventService.save(event);
    }
    
    @SchemaMapping
    public User owner(Event event) {
        return userService.findById(event.getOwnerId());
    }
}
\`\`\`

Use @BatchMapping to solve N+1 problems:
\`\`\`java
@BatchMapping
public Map<Event, User> owner(List<Event> events) {
    // Batch load owners for multiple events
    return ownerService.findByEvents(events);
}
\`\`\`
`;
  }
}