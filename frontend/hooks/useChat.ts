import { useState, useCallback, useRef } from 'react';
import { useProcessNaturalLanguageMutation } from '@/generated/graphql';
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
  const [error, setError] = useState<string | null>(null);
  const messageIdCounter = useRef(0);
  
  const { streamingMessage, startStreaming, stopStreaming } = useStreamingMessage();
  
  const [sendChatMessage] = useProcessNaturalLanguageMutation({
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
    setError(null);
    startStreaming('');

    try {
      const response = await sendChatMessage({
        variables: {
          input: content,
        },
      });

      if (response.data?.processNaturalLanguage) {
        stopStreaming();
        
        const assistantMessage = addMessage({
          content: response.data.processNaturalLanguage.message,
          role: 'assistant',
          events: response.data.processNaturalLanguage.events?.map(event => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
          })) || undefined,
        });

        return assistantMessage;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      stopStreaming();
      setError('메시지를 처리하는 중 오류가 발생했습니다.');
      
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

  const sendImage = useCallback(async (imageBase64: string) => {
    // TODO: Implement OCR functionality
    console.log('sendImage not yet implemented');
    setError('이미지 업로드 기능은 아직 구현되지 않았습니다.');
  }, []);

  const sendVoice = useCallback(async (audioBlob: Blob) => {
    // TODO: Implement voice recognition functionality
    console.log('sendVoice not yet implemented');
    setError('음성 인식 기능은 아직 구현되지 않았습니다.');
  }, []);

  return {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    sendImage,
    sendVoice,
    clearMessages,
    deleteMessage,
    addMessage,
    error,
  };
};