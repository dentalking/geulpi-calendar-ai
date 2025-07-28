/**
 * Smart Failure Categorizer v4.0
 * AI-powered failure analysis with subagent routing
 */

const fs = require('fs').promises;
const path = require('path');

class SmartFailureCategorizer {
  constructor() {
    this.agentSpecialties = {
      'frontend-ui': {
        description: 'UI components, React, styling, user interactions',
        patterns: [
          /data-testid.*not found/i,
          /element.*not visible/i,
          /button.*not clickable/i,
          /input.*not found/i,
          /component.*render/i,
          /style.*class/i,
          /tailwind/i,
          /css/i
        ],
        tools: ['React', 'Next.js', 'Tailwind', 'DOM manipulation'],
        priority: 'high'
      },
      
      'frontend-auth': {
        description: 'Authentication, OAuth, middleware, session management',
        patterns: [
          /auth.*token/i,
          /login.*flow/i,
          /oauth/i,
          /middleware/i,
          /session/i,
          /cookie/i,
          /localStorage/i,
          /unauthorized/i,
          /redirect.*login/i
        ],
        tools: ['NextAuth', 'JWT', 'OAuth2', 'Middleware'],
        priority: 'critical'
      },
      
      'frontend-state': {
        description: 'State management, context, data flow',
        patterns: [
          /context/i,
          /provider/i,
          /hook.*state/i,
          /apollo.*client/i,
          /graphql.*query/i,
          /cache/i,
          /refetch/i
        ],
        tools: ['React Context', 'Apollo Client', 'State management'],
        priority: 'high'
      },
      
      'backend-api': {
        description: 'GraphQL resolvers, API endpoints, business logic',
        patterns: [
          /graphql.*resolver/i,
          /api.*endpoint/i,
          /query.*mutation/i,
          /database.*query/i,
          /server.*error/i,
          /500.*internal/i
        ],
        tools: ['GraphQL', 'Spring Boot', 'JPA', 'Database'],
        priority: 'critical'
      },
      
      'backend-auth': {
        description: 'Server-side authentication, JWT validation, security',
        patterns: [
          /jwt.*token/i,
          /authorization.*header/i,
          /security.*config/i,
          /spring.*security/i,
          /token.*validation/i
        ],
        tools: ['Spring Security', 'JWT', 'OAuth2'],
        priority: 'critical'
      },
      
      'integration': {
        description: 'Cross-service communication, CORS, networking',
        patterns: [
          /cors/i,
          /network.*error/i,
          /connection.*refused/i,
          /timeout/i,
          /fetch.*failed/i,
          /proxy/i,
          /port.*\d+/i
        ],
        tools: ['Docker', 'Nginx', 'Network configuration'],
        priority: 'high'
      },
      
      'ml-server': {
        description: 'AI/ML endpoints, model integration, data processing',
        patterns: [
          /ml.*server/i,
          /ai.*endpoint/i,
          /model.*prediction/i,
          /ocr/i,
          /voice.*processing/i,
          /8000/i
        ],
        tools: ['FastAPI', 'ML models', 'AI integration'],
        priority: 'medium'
      },
      
      'performance': {
        description: 'Load times, optimization, caching, bundle size',
        patterns: [
          /timeout.*waiting/i,
          /slow.*response/i,
          /performance/i,
          /bundle.*size/i,
          /loading.*time/i,
          /cache/i
        ],
        tools: ['Performance optimization', 'Caching', 'Bundle analysis'],
        priority: 'medium'
      }
    };
  }

  /**
   * Categorize test failures into specialized domains
   */
  async categorizeFailures(testResults) {
    const categories = {};
    
    // Initialize categories
    Object.keys(this.agentSpecialties).forEach(agent => {
      categories[agent] = {
        failures: [],
        priority: this.agentSpecialties[agent].priority,
        description: this.agentSpecialties[agent].description,
        tools: this.agentSpecialties[agent].tools
      };
    });

    // Analyze each failure
    for (const failure of testResults.failures) {
      const categoryScores = await this.scoreFailureCategories(failure);
      const bestCategory = this.selectBestCategory(categoryScores);
      
      categories[bestCategory].failures.push({
        test: failure.test,
        error: failure.error,
        context: failure.context,
        confidence: categoryScores[bestCategory]
      });
    }

    // Filter out empty categories and sort by priority
    const activCategories = Object.entries(categories)
      .filter(([_, cat]) => cat.failures.length > 0)
      .sort((a, b) => this.priorityWeight(a[1].priority) - this.priorityWeight(b[1].priority));

    return Object.fromEntries(activCategories);
  }

  /**
   * Score how well a failure matches each category
   */
  async scoreFailureCategories(failure) {
    const scores = {};
    const errorText = `${failure.test} ${failure.error} ${failure.context}`.toLowerCase();
    
    for (const [agent, spec] of Object.entries(this.agentSpecialties)) {
      let score = 0;
      
      // Pattern matching
      for (const pattern of spec.patterns) {
        if (pattern.test(errorText)) {
          score += 10;
        }
      }
      
      // Keyword density
      const keywords = spec.tools.join(' ').toLowerCase().split(' ');
      for (const keyword of keywords) {
        const occurrences = (errorText.match(new RegExp(keyword, 'g')) || []).length;
        score += occurrences * 2;
      }
      
      // Context clues (file paths, stack traces)
      if (failure.context) {
        if (agent.startsWith('frontend-') && failure.context.includes('/frontend/')) score += 5;
        if (agent.startsWith('backend-') && failure.context.includes('/backend/')) score += 5;
        if (agent === 'ml-server' && failure.context.includes('/ml-server/')) score += 5;
      }
      
      scores[agent] = score;
    }
    
    return scores;
  }

  /**
   * Select the best category for a failure
   */
  selectBestCategory(scores) {
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
      return 'frontend-ui'; // Default fallback
    }
    
    return Object.entries(scores)
      .find(([_, score]) => score === maxScore)[0];
  }

  /**
   * Priority weights for sorting
   */
  priorityWeight(priority) {
    const weights = { critical: 1, high: 2, medium: 3, low: 4 };
    return weights[priority] || 5;
  }

  /**
   * Generate specialized context for each agent category
   */
  async generateAgentContext(category, failures) {
    const spec = this.agentSpecialties[category];
    
    return {
      agent_type: category,
      description: spec.description,
      tools: spec.tools,
      priority: spec.priority,
      failures: failures.map(f => ({
        test_name: f.test,
        error_message: f.error,
        confidence: f.confidence,
        context: f.context
      })),
      specialized_instructions: await this.getSpecializedInstructions(category),
      coordination_hints: await this.getCoordinationHints(category, failures)
    };
  }

  /**
   * Get specialized instructions for each agent type
   */
  async getSpecializedInstructions(category) {
    const instructions = {
      'frontend-ui': [
        'Focus on React components, JSX structure, and UI interactions',
        'Check data-testid attributes for test compatibility',
        'Verify component rendering and prop passing',
        'Ensure Tailwind classes are correctly applied'
      ],
      'frontend-auth': [
        'Handle authentication flows, OAuth, and session management',
        'Check localStorage and cookie synchronization',
        'Verify middleware configuration and protected routes',
        'Ensure proper token handling and error states'
      ],
      'frontend-state': [
        'Manage React Context, Apollo Client, and state updates',
        'Check GraphQL queries, mutations, and cache updates',
        'Verify hook dependencies and effect cleanup',
        'Handle async state and loading indicators'
      ],
      'backend-api': [
        'Implement GraphQL resolvers and schema validation',
        'Handle database queries and business logic',
        'Ensure proper error handling and response formatting',
        'Verify Spring Boot configuration and dependencies'
      ],
      'backend-auth': [
        'Configure Spring Security and JWT token validation',
        'Handle OAuth2 flows and authorization',
        'Implement proper CORS and security headers',
        'Verify user authentication and role management'
      ],
      'integration': [
        'Fix cross-service communication and networking',
        'Configure Docker services and port mappings',
        'Handle CORS, proxies, and service discovery',
        'Ensure proper health checks and monitoring'
      ],
      'ml-server': [
        'Implement AI/ML endpoints and model integration',
        'Handle data processing and feature extraction',
        'Ensure proper error handling for ML operations',
        'Optimize performance for real-time processing'
      ],
      'performance': [
        'Optimize loading times and bundle sizes',
        'Implement caching strategies and lazy loading',
        'Profile and fix performance bottlenecks',
        'Monitor and improve Core Web Vitals'
      ]
    };

    return instructions[category] || [];
  }

  /**
   * Get coordination hints for cross-cutting concerns
   */
  async getCoordinationHints(category, failures) {
    const hints = [];
    
    // Auth coordination
    if (category.includes('auth')) {
      hints.push('Coordinate with other auth agents for token consistency');
      hints.push('Ensure frontend and backend auth flows are synchronized');
    }
    
    // UI coordination
    if (category === 'frontend-ui') {
      hints.push('Check if state management changes affect UI rendering');
      hints.push('Verify auth state changes are reflected in UI');
    }
    
    // Integration coordination
    if (category === 'integration') {
      hints.push('Consider impact on all services when changing network config');
      hints.push('Verify health checks after infrastructure changes');
    }
    
    return hints;
  }
}

module.exports = SmartFailureCategorizer;