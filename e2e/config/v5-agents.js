module.exports = {
  version: '5.0',
  architecture: 'hierarchical',
  
  services: {
    frontend: {
      metaAgent: {
        name: 'Frontend Meta-Agent',
        model: 'claude-sonnet-4-20250514',
        systemPromptPath: '../templates/frontend-meta-agent.md',
        maxConcurrentSubagents: 4
      },
      subagents: [
        {
          id: 'frontend-ui',
          name: 'UI Specialist',
          icon: '🎨',
          model: 'claude-sonnet-4-20250514',
          skills: ['React', 'Tailwind CSS', 'Responsive Design', 'Accessibility'],
          focusAreas: ['components', 'styling', 'layouts', 'mobile'],
          maxTasks: 5,
          temperature: 0.7
        },
        {
          id: 'frontend-state',
          name: 'State Manager',
          icon: '🔄',
          model: 'claude-sonnet-4-20250514',
          skills: ['Apollo Client', 'GraphQL', 'React Context', 'Hooks'],
          focusAreas: ['state management', 'data flow', 'subscriptions', 'caching'],
          maxTasks: 4,
          temperature: 0.5
        },
        {
          id: 'frontend-test',
          name: 'Test Engineer',
          icon: '🧪',
          model: 'claude-sonnet-4-20250514',
          skills: ['Playwright', 'Testing Library', 'E2E Testing', 'Selectors'],
          focusAreas: ['test selectors', 'test reliability', 'coverage'],
          maxTasks: 3,
          temperature: 0.3
        },
        {
          id: 'frontend-perf',
          name: 'Performance Optimizer',
          icon: '⚡',
          model: 'claude-sonnet-4-20250514',
          skills: ['Next.js', 'Bundle Optimization', 'PWA', 'Performance'],
          focusAreas: ['bundle size', 'load time', 'rendering', 'caching'],
          maxTasks: 2,
          temperature: 0.4,
          optional: true
        }
      ]
    },
    
    backend: {
      metaAgent: {
        name: 'Backend Meta-Agent',
        model: 'claude-sonnet-4-20250514',
        systemPromptPath: '../templates/backend-meta-agent.md',
        maxConcurrentSubagents: 4
      },
      subagents: [
        {
          id: 'backend-api',
          name: 'API Architect',
          icon: '🏗️',
          model: 'claude-sonnet-4-20250514',
          skills: ['Spring Boot', 'GraphQL', 'REST', 'WebSocket'],
          focusAreas: ['resolvers', 'controllers', 'DTOs', 'API design'],
          maxTasks: 5,
          temperature: 0.6
        },
        {
          id: 'backend-db',
          name: 'Database Expert',
          icon: '🗄️',
          model: 'claude-sonnet-4-20250514',
          skills: ['PostgreSQL', 'JPA', 'Redis', 'Query Optimization'],
          focusAreas: ['entities', 'repositories', 'queries', 'caching'],
          maxTasks: 4,
          temperature: 0.5
        },
        {
          id: 'backend-security',
          name: 'Security Auditor',
          icon: '🔒',
          model: 'claude-sonnet-4-20250514',
          skills: ['Spring Security', 'JWT', 'OAuth2', 'Validation'],
          focusAreas: ['authentication', 'authorization', 'validation', 'security'],
          maxTasks: 3,
          temperature: 0.3
        },
        {
          id: 'backend-integration',
          name: 'Integration Specialist',
          icon: '🔌',
          model: 'claude-sonnet-4-20250514',
          skills: ['Kafka', 'External APIs', 'Testing', 'Monitoring'],
          focusAreas: ['messaging', 'integrations', 'health checks'],
          maxTasks: 2,
          temperature: 0.4,
          optional: true
        }
      ]
    },
    
    'ml-server': {
      metaAgent: {
        name: 'ML-Server Meta-Agent',
        model: 'claude-sonnet-4-20250514',
        systemPromptPath: '../templates/ml-server-meta-agent.md',
        maxConcurrentSubagents: 3
      },
      subagents: [
        {
          id: 'ml-engineer',
          name: 'ML Engineer',
          icon: '🧠',
          model: 'claude-sonnet-4-20250514',
          skills: ['PyTorch', 'Transformers', 'Whisper', 'Model Optimization'],
          focusAreas: ['models', 'inference', 'optimization', 'accuracy'],
          maxTasks: 4,
          temperature: 0.6
        },
        {
          id: 'ml-voice',
          name: 'Voice Specialist',
          icon: '🎤',
          model: 'claude-sonnet-4-20250514',
          skills: ['Audio Processing', 'Whisper', 'Speech Recognition', 'Formats'],
          focusAreas: ['transcription', 'audio handling', 'language support'],
          maxTasks: 3,
          temperature: 0.5
        },
        {
          id: 'ml-api',
          name: 'API Integrator',
          icon: '🔗',
          model: 'claude-sonnet-4-20250514',
          skills: ['FastAPI', 'REST', 'Async', 'Error Handling'],
          focusAreas: ['endpoints', 'validation', 'error handling', 'testing'],
          maxTasks: 3,
          temperature: 0.4
        }
      ]
    }
  },
  
  monitoring: {
    dashboardPort: 9999,
    updateInterval: 5000,
    logRetention: 1000,
    metrics: {
      efficiency: {
        target: 0.9,
        calculation: 'activeTime / totalTime'
      },
      quality: {
        target: 0.95,
        calculation: 'passedTests / totalTests'
      },
      speed: {
        target: 7,
        calculation: 'baselineTime / actualTime'
      }
    }
  },
  
  orchestration: {
    maxRetries: 3,
    timeout: 30 * 60 * 1000, // 30 minutes
    checkInterval: 5000,
    completionSignal: 'PROMPT.md deletion',
    errorHandling: {
      subagentFailure: 'reassign',
      metaAgentFailure: 'alert',
      timeout: 'graceful-shutdown'
    }
  },
  
  prompts: {
    analysisDepth: 'comprehensive',
    includeContext: true,
    suggestFixes: true,
    prioritization: 'impact-based'
  }
};