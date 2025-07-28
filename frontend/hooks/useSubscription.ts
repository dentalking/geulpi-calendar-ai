import { useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { DocumentNode } from 'graphql';

interface UseSubscriptionOptions<TData, TVariables> {
  subscription: DocumentNode;
  variables?: TVariables;
  onData?: (data: TData) => void;
  onError?: (error: Error) => void;
  skip?: boolean;
}

export function useSubscription<TData = any, TVariables = any>({
  subscription,
  variables,
  onData,
  onError,
  skip = false,
}: UseSubscriptionOptions<TData, TVariables>) {
  const client = useApolloClient();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (skip) return;

    const subscribe = () => {
      try {
        const observable = client.subscribe({
          query: subscription,
          variables,
        });

        subscriptionRef.current = observable.subscribe({
          next: ({ data }) => {
            if (data && onData) {
              onData(data);
            }
          },
          error: (error) => {
            console.error('Subscription error:', error);
            if (onError) {
              onError(error);
            }
          },
          complete: () => {
            console.log('Subscription completed');
          },
        });
      } catch (error) {
        console.error('Failed to create subscription:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [client, subscription, variables, onData, onError, skip]);

  return {
    unsubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    },
  };
}

export function useEventSubscription(userId: string, onEventUpdate?: (event: any) => void) {
  return useSubscription({
    subscription: gql`
      subscription OnEventUpdate($userId: ID!) {
        eventUpdated(userId: $userId) {
          id
          title
          startTime
          endTime
          category
          description
          location
          status
        }
      }
    `,
    variables: { userId },
    onData: (data) => {
      if (data?.eventUpdated && onEventUpdate) {
        onEventUpdate(data.eventUpdated);
      }
    },
  });
}

export function useChatSubscription(conversationId: string, onNewMessage?: (message: any) => void) {
  return useSubscription({
    subscription: gql`
      subscription OnNewMessage($conversationId: ID!) {
        messageReceived(conversationId: $conversationId) {
          id
          content
          role
          timestamp
          events {
            id
            title
            startTime
            endTime
          }
        }
      }
    `,
    variables: { conversationId },
    onData: (data) => {
      if (data?.messageReceived && onNewMessage) {
        onNewMessage(data.messageReceived);
      }
    },
  });
}

import { gql } from '@apollo/client';