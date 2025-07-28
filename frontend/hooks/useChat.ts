import { useState, useCallback, useRef } from 'react';
import { useChatWithEventManagementMutation } from '@/generated/graphql';
import { useStreamingMessage } from './useStreamingMessage';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  events?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messageIdCounter = useRef(0);
  
  const { streamingMessage, startStreaming, stopStreaming } = useStreamingMessage();
  
  const [sendChatMessage] = useChatWithEventManagementMutation({
    refetchQueries: ['GetEvents'],
  });

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage = addMessage({
      content,
      role: 'user',
    });

    setIsLoading(true);
    startStreaming();

    try {
      const response = await sendChatMessage({
        variables: {
          input: content,
        },
      });

      if (response.data?.chatWithEventManagement) {
        stopStreaming();
        
        const assistantMessage = addMessage({
          content: response.data.chatWithEventManagement.message,
          role: 'assistant',
          events: response.data.chatWithEventManagement.events || undefined,
        });

        return assistantMessage;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      stopStreaming();
      
      addMessage({
        content: '죄송합니다. 메시지를 처리하는 중 오류가 발생했습니다.',
        role: 'assistant',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, sendChatMessage, startStreaming, stopStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messageIdCounter.current = 0;
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    clearMessages,
    deleteMessage,
    addMessage,
  };
};