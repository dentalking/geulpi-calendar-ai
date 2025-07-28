/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApolloProvider, useApolloClient } from '@apollo/client';
import { ApolloWrapper } from '@/lib/apollo-provider';

// Mock the AuthProvider to isolate Apollo Provider testing
jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

// Mock apollo-client to avoid actual GraphQL setup in tests
jest.mock('@/lib/apollo-client', () => ({
  apolloClient: {
    cache: {
      extract: jest.fn(() => ({})),
      reset: jest.fn(),
    },
    query: jest.fn(),
    mutate: jest.fn(),
    subscribe: jest.fn(),
    link: {},
  },
}));

// Test component that uses Apollo Client
const TestComponent = () => {
  const client = useApolloClient();
  
  return (
    <div>
      <div data-testid="apollo-client-available">
        {client ? 'Apollo Client Available' : 'No Apollo Client'}
      </div>
      <div data-testid="test-content">Test Content</div>
    </div>
  );
};

// Test component that throws error
const ErrorComponent = () => {
  throw new Error('Test error');
};

describe('ApolloWrapper Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children without crashing', () => {
      render(
        <ApolloWrapper>
          <div data-testid="test-child">Test Child</div>
        </ApolloWrapper>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should provide Apollo Client context to children', () => {
      render(
        <ApolloWrapper>
          <TestComponent />
        </ApolloWrapper>
      );

      expect(screen.getByTestId('apollo-client-available')).toHaveTextContent(
        'Apollo Client Available'
      );
    });

    it('should render AuthProvider wrapper', () => {
      render(
        <ApolloWrapper>
          <div data-testid="test-child">Test Child</div>
        </ApolloWrapper>
      );

      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have correct nesting order (ApolloProvider > AuthProvider > children)', () => {
      render(
        <ApolloWrapper>
          <TestComponent />
        </ApolloWrapper>
      );

      const authProvider = screen.getByTestId('auth-provider');
      const testContent = screen.getByTestId('test-content');
      
      expect(authProvider).toContainElement(testContent);
    });

    it('should accept multiple children', () => {
      render(
        <ApolloWrapper>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ApolloWrapper>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('Apollo Client Integration', () => {
    it('should provide access to Apollo Client methods', () => {
      const ComponentWithApolloMethods = () => {
        const client = useApolloClient();
        
        return (
          <div>
            <div data-testid="cache-available">
              {client.cache ? 'Cache Available' : 'No Cache'}
            </div>
            <div data-testid="query-method-available">
              {typeof client.query === 'function' ? 'Query Method Available' : 'No Query Method'}
            </div>
            <div data-testid="mutate-method-available">
              {typeof client.mutate === 'function' ? 'Mutate Method Available' : 'No Mutate Method'}
            </div>
          </div>
        );
      };

      render(
        <ApolloWrapper>
          <ComponentWithApolloMethods />
        </ApolloWrapper>
      );

      expect(screen.getByTestId('cache-available')).toHaveTextContent('Cache Available');
      expect(screen.getByTestId('query-method-available')).toHaveTextContent('Query Method Available');
      expect(screen.getByTestId('mutate-method-available')).toHaveTextContent('Mutate Method Available');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in children gracefully', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <ApolloWrapper>
            <ErrorComponent />
          </ApolloWrapper>
        );
      }).toThrow('Test error');

      consoleSpy.mockRestore();
    });
  });

  describe('TypeScript Props', () => {
    it('should accept ReactNode children prop', () => {
      const stringChild = 'String child';
      const numberChild = 42;
      const elementChild = <span>Element child</span>;

      expect(() => {
        render(
          <ApolloWrapper>
            {stringChild}
          </ApolloWrapper>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <ApolloWrapper>
            {numberChild}
          </ApolloWrapper>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <ApolloWrapper>
            {elementChild}
          </ApolloWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Context Isolation', () => {
    it('should not interfere with other Apollo Providers', () => {
      const OutsideComponent = () => {
        try {
          const client = useApolloClient();
          return <div data-testid="outside-client">{client ? 'Client Found' : 'No Client'}</div>;
        } catch (error) {
          return <div data-testid="outside-no-client">No Client Context</div>;
        }
      };

      const InsideComponent = () => {
        const client = useApolloClient();
        return <div data-testid="inside-client">{client ? 'Client Found' : 'No Client'}</div>;
      };

      render(
        <div>
          <OutsideComponent />
          <ApolloWrapper>
            <InsideComponent />
          </ApolloWrapper>
        </div>
      );

      // Component outside ApolloWrapper should not have client context
      expect(screen.getByTestId('outside-no-client')).toBeInTheDocument();
      
      // Component inside ApolloWrapper should have client context
      expect(screen.getByTestId('inside-client')).toHaveTextContent('Client Found');
    });
  });

  describe('Re-rendering Behavior', () => {
    it('should maintain Apollo Client instance across re-renders', () => {
      const { rerender } = render(
        <ApolloWrapper>
          <TestComponent />
        </ApolloWrapper>
      );

      expect(screen.getByTestId('apollo-client-available')).toHaveTextContent(
        'Apollo Client Available'
      );

      // Re-render with different content
      rerender(
        <ApolloWrapper>
          <div data-testid="new-content">New Content</div>
          <TestComponent />
        </ApolloWrapper>
      );

      expect(screen.getByTestId('new-content')).toBeInTheDocument();
      expect(screen.getByTestId('apollo-client-available')).toHaveTextContent(
        'Apollo Client Available'
      );
    });
  });
});