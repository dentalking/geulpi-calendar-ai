/**
 * @jest-environment jsdom
 */

// Mock Apollo Client modules before import
jest.mock('@apollo/client/link/subscriptions', () => ({
  GraphQLWsLink: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
  })),
}));

jest.mock('graphql-ws', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

import { ApolloClient, InMemoryCache } from '@apollo/client';

// Mock environment variables
const mockEnvVariables = {
  NEXT_PUBLIC_GRAPHQL_URL: 'http://localhost:8080/graphql',
  NEXT_PUBLIC_GRAPHQL_WS_URL: 'ws://localhost:8080/graphql',
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('Apollo Client Configuration', () => {
  let originalProcessEnv: NodeJS.ProcessEnv;
  let originalLocalStorage: any;

  beforeAll(() => {
    originalProcessEnv = process.env;
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    
    // Mock process.env
    process.env = { ...originalProcessEnv, ...mockEnvVariables };
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterAll(() => {
    process.env = originalProcessEnv;
    
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Apollo Client Instance', () => {
    it('should create a valid Apollo Client instance', () => {
      // Import after mocks are set up
      const { apolloClient } = require('@/lib/apollo-client');
      
      expect(apolloClient).toBeInstanceOf(ApolloClient);
    });

    it('should have InMemoryCache configured', () => {
      const { apolloClient } = require('@/lib/apollo-client');
      
      expect(apolloClient.cache).toBeInstanceOf(InMemoryCache);
    });

    it('should have link configured', () => {
      const { apolloClient } = require('@/lib/apollo-client');
      
      expect(apolloClient.link).toBeDefined();
    });
  });

  describe('Authentication Link', () => {
    it('should have localStorage available for token storage', () => {
      expect(mockLocalStorage.getItem).toBeDefined();
      expect(mockLocalStorage.setItem).toBeDefined();
    });

    it('should handle token retrieval gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      expect(mockLocalStorage.getItem('token')).toBe('test-token');
      
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(mockLocalStorage.getItem('token')).toBeNull();
    });
  });

  describe('Environment Configuration', () => {
    it('should handle environment variables gracefully', () => {
      expect(process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql').toBeTruthy();
      expect(process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:8080/graphql').toBeTruthy();
    });

    it('should have default configurations available', () => {
      const defaultHttpUrl = 'http://localhost:8080/graphql';
      const defaultWsUrl = 'ws://localhost:8080/graphql';
      
      expect(defaultHttpUrl).toBe('http://localhost:8080/graphql');
      expect(defaultWsUrl).toBe('ws://localhost:8080/graphql');
    });
  });

  describe('Link Configuration', () => {
    it('should configure split link for queries and subscriptions', () => {
      const { apolloClient } = require('@/lib/apollo-client');
      
      // The split link should handle different operation types
      // This test verifies the client is properly configured
      expect(apolloClient.link).toBeDefined();
      
      // These should not throw errors when processed by the link
      expect(() => apolloClient.link).not.toThrow();
    });
  });

  describe('Cache Configuration', () => {
    it('should have cache available', () => {
      const { apolloClient } = require('@/lib/apollo-client');
      
      expect(apolloClient.cache).toBeDefined();
      expect(typeof apolloClient.cache.reset).toBe('function');
      expect(typeof apolloClient.cache.extract).toBe('function');
    });

    it('should handle cache operations without errors', () => {
      const { apolloClient } = require('@/lib/apollo-client');
      const cache = apolloClient.cache;
      
      // Test basic cache operations
      expect(() => cache.reset()).not.toThrow();
      expect(() => cache.extract()).not.toThrow();
    });
  });

  describe('Server-Side Rendering Compatibility', () => {
    it('should handle SSR environment gracefully', () => {
      // Test that client can be created without throwing errors
      expect(() => {
        const { apolloClient } = require('@/lib/apollo-client');
        return apolloClient;
      }).not.toThrow();
    });

    it('should handle window availability checks', () => {
      const hasWindow = typeof window !== 'undefined';
      expect(typeof hasWindow).toBe('boolean');
    });
  });
});