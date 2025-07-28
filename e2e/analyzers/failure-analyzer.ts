import { TestError } from '@playwright/test/reporter';

export interface DetailedAnalysis {
  service: 'frontend' | 'backend' | 'ml-server' | 'infrastructure';
  component: string;
  errorType: string;
  specificFix: string;
  codeSnippet?: string;
  relatedFiles: string[];
  dependencies?: string[];
}

export class FailureAnalyzer {
  
  analyzeError(error: TestError, testTitle: string, testFile: string): DetailedAnalysis {
    const errorMessage = error.message || '';
    const stackTrace = error.stack || '';
    
    // Analyze based on error patterns
    if (this.isGraphQLError(errorMessage)) {
      return this.analyzeGraphQLError(errorMessage, stackTrace);
    } else if (this.isUIError(errorMessage)) {
      return this.analyzeUIError(errorMessage, testTitle);
    } else if (this.isMLError(errorMessage)) {
      return this.analyzeMLError(errorMessage);
    } else if (this.isAuthError(errorMessage)) {
      return this.analyzeAuthError(errorMessage);
    } else if (this.isNetworkError(errorMessage)) {
      return this.analyzeNetworkError(errorMessage);
    }
    
    // Default analysis
    return {
      service: 'infrastructure',
      component: 'Unknown',
      errorType: 'General',
      specificFix: 'Review error message and stack trace for details',
      relatedFiles: [],
    };
  }
  
  private isGraphQLError(error: string): boolean {
    return error.includes('GraphQL') || 
           error.includes('mutation') || 
           error.includes('query') ||
           error.includes('resolver');
  }
  
  private isUIError(error: string): boolean {
    return error.includes('locator') || 
           error.includes('toBeVisible') || 
           error.includes('click') ||
           error.includes('data-testid');
  }
  
  private isMLError(error: string): boolean {
    return error.includes('ML') || 
           error.includes('voice') || 
           error.includes('processing') ||
           error.includes('kafka');
  }
  
  private isAuthError(error: string): boolean {
    return error.includes('auth') || 
           error.includes('login') || 
           error.includes('OAuth') ||
           error.includes('JWT');
  }
  
  private isNetworkError(error: string): boolean {
    return error.includes('timeout') || 
           error.includes('connection') || 
           error.includes('ECONNREFUSED');
  }
  
  private analyzeGraphQLError(error: string, stack: string): DetailedAnalysis {
    // Extract operation name
    const operationMatch = error.match(/operationName["\s:]+(\w+)/);
    const operation = operationMatch ? operationMatch[1] : 'Unknown';
    
    // Determine if it's a mutation or query
    const isMutation = error.includes('mutation') || operation.toLowerCase().includes('create') || 
                      operation.toLowerCase().includes('update') || operation.toLowerCase().includes('delete');
    
    const component = isMutation ? 'GraphQL Mutation' : 'GraphQL Query';
    
    return {
      service: 'backend',
      component,
      errorType: 'GraphQL Resolver Missing/Broken',
      specificFix: `Implement or fix the ${operation} ${isMutation ? 'mutation' : 'query'} resolver`,
      codeSnippet: `
// In your GraphQL resolver file:
@${isMutation ? 'Mutation' : 'Query'}Mapping
public ${this.getReturnType(operation)} ${this.toCamelCase(operation)}(${this.getArgs(operation)}) {
    // TODO: Implement ${operation} logic
    return ${this.getDefaultReturn(operation)};
}`,
      relatedFiles: [
        'src/main/java/com/geulpi/resolver/*Resolver.java',
        'src/main/resources/graphql/schema.graphqls',
        'src/main/java/com/geulpi/service/*Service.java'
      ],
      dependencies: ['Spring GraphQL', 'GraphQL Java']
    };
  }
  
  private analyzeUIError(error: string, testTitle: string): DetailedAnalysis {
    // Extract missing element
    const testIdMatch = error.match(/data-testid="([^"]+)"/);
    const testId = testIdMatch ? testIdMatch[1] : 'unknown-element';
    
    // Determine component type
    let component = 'Unknown Component';
    let specificFix = 'Add missing UI element';
    let codeSnippet = '';
    
    if (testTitle.includes('auth') || testTitle.includes('login')) {
      component = 'Authentication Component';
      specificFix = `Add ${testId} element to login/auth component`;
      codeSnippet = `
// In your auth component:
<button data-testid="${testId}" onClick={handleAuth}>
  Google로 로그인
</button>`;
    } else if (testTitle.includes('calendar')) {
      component = 'Calendar Component';
      specificFix = `Add ${testId} element to calendar component`;
      codeSnippet = `
// In your calendar component:
<div data-testid="${testId}" className="calendar-element">
  {/* Calendar content */}
</div>`;
    } else if (testTitle.includes('notification')) {
      component = 'Notification Component';
      specificFix = `Add ${testId} element to notification component`;
    }
    
    return {
      service: 'frontend',
      component,
      errorType: 'Missing UI Element',
      specificFix,
      codeSnippet,
      relatedFiles: [
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
        'src/app/**/*.tsx'
      ],
      dependencies: ['React', 'Next.js']
    };
  }
  
  private analyzeMLError(error: string): DetailedAnalysis {
    let component = 'ML Service';
    let specificFix = 'Implement ML processing endpoint';
    let codeSnippet = '';
    
    if (error.includes('voice')) {
      component = 'Voice Processing';
      specificFix = 'Implement voice processing endpoint';
      codeSnippet = `
# In your FastAPI app:
@app.post("/ml/process-voice")
async def process_voice(audio_data: bytes):
    # TODO: Implement voice processing
    parsed_event = {
        "title": "Parsed event title",
        "start": datetime.now().isoformat(),
        "end": (datetime.now() + timedelta(hours=1)).isoformat(),
        "allDay": False
    }
    return {"parsed_event": parsed_event}`;
    }
    
    return {
      service: 'ml-server',
      component,
      errorType: 'Missing ML Endpoint',
      specificFix,
      codeSnippet,
      relatedFiles: [
        'main.py',
        'app/routes/*.py',
        'app/services/*.py'
      ],
      dependencies: ['FastAPI', 'Kafka', 'ML Models']
    };
  }
  
  private analyzeAuthError(error: string): DetailedAnalysis {
    return {
      service: 'backend',
      component: 'Authentication',
      errorType: 'OAuth2/JWT Configuration',
      specificFix: 'Configure OAuth2 and JWT token generation',
      codeSnippet: `
// In SecurityConfig.java:
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler())
            )
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}`,
      relatedFiles: [
        'src/main/java/com/geulpi/config/SecurityConfig.java',
        'src/main/java/com/geulpi/security/*.java',
        'src/main/resources/application.yml'
      ],
      dependencies: ['Spring Security', 'OAuth2 Client', 'JWT']
    };
  }
  
  private analyzeNetworkError(error: string): DetailedAnalysis {
    return {
      service: 'infrastructure',
      component: 'Docker/Network',
      errorType: 'Service Connectivity',
      specificFix: 'Check Docker Compose configuration and service health',
      relatedFiles: [
        'docker-compose.yml',
        'docker-compose.test.yml',
        'nginx/nginx.conf'
      ]
    };
  }
  
  // Helper methods
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
  
  private getReturnType(operation: string): string {
    if (operation.includes('Create')) return 'Event';
    if (operation.includes('Update')) return 'Event';
    if (operation.includes('Delete')) return 'Boolean';
    if (operation.includes('Get')) return 'Event';
    return 'Object';
  }
  
  private getArgs(operation: string): string {
    if (operation.includes('Create')) return 'CreateEventInput input';
    if (operation.includes('Update')) return 'String id, UpdateEventInput input';
    if (operation.includes('Delete')) return 'String id';
    if (operation.includes('Get')) return 'String id';
    return '';
  }
  
  private getDefaultReturn(operation: string): string {
    if (operation.includes('Delete')) return 'true';
    return 'new Event()';
  }
}