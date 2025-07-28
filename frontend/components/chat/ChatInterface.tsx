'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { EventPreview } from './EventPreview';
import { TypingIndicator } from './TypingIndicator';

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  events?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    description?: string;
  }>;
  imageUrl?: string;
  confidence?: number;
}

interface ChatInterfaceProps {
  onEventCreated?: (events: any[]) => void;
  onImageProcessed?: (result: any) => void;
  className?: string;
}

export function ChatInterface({ 
  onEventCreated, 
  onImageProcessed, 
  className = '' 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '안녕하세요! GEULPI AI 어시스턴트입니다. 자연어로 일정을 말해주시거나, 이미지를 업로드하시면 자동으로 캘린더에 추가해드릴게요! 🗓️✨',
      type: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    sendMessage, 
    sendImage, 
    sendVoice, 
    isLoading, 
    error 
  } = useChat();

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Simulate AI processing with natural language understanding
      const response = await processNaturalLanguage(content);
      
      setIsTyping(false);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        type: 'ai',
        timestamp: new Date(),
        events: response.events,
        confidence: response.confidence
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.events && response.events.length > 0) {
        setPendingEvents(response.events);
      }
      
    } catch (error) {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: '죄송합니다. 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Add user message with image
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '이미지를 업로드했습니다.',
      type: 'user',
      timestamp: new Date(),
      imageUrl: URL.createObjectURL(file)
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Simulate OCR processing
      const response = await processImageOCR(file);
      
      setIsTyping(false);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        type: 'ai',
        timestamp: new Date(),
        events: response.events,
        confidence: response.confidence
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.events && response.events.length > 0) {
        setPendingEvents(response.events);
        onImageProcessed?.(response);
      }
      
    } catch (error) {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: '이미지 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    // Add user message for voice
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '음성 메시지를 보냈습니다.',
      type: 'user', 
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Simulate voice-to-text and processing
      const response = await processVoiceInput(audioBlob);
      
      setIsTyping(false);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        type: 'ai',
        timestamp: new Date(),
        events: response.events,
        confidence: response.confidence
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.events && response.events.length > 0) {
        setPendingEvents(response.events);
      }
      
    } catch (error) {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: '음성 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleConfirmEvents = (events: any[]) => {
    setPendingEvents([]);
    onEventCreated?.(events);
    
    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `✅ ${events.length}개의 일정이 캘린더에 추가되었습니다!`,
      type: 'ai',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleEditEvent = (eventId: string, updates: any) => {
    setPendingEvents(prev => 
      prev.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      )
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">GEULPI AI Assistant</h3>
            <p className="text-sm text-gray-500">자연어 일정 관리의 새로운 경험</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages} />
        
        {isTyping && (
          <TypingIndicator />
        )}
        
        {pendingEvents.length > 0 && (
          <EventPreview
            events={pendingEvents}
            onConfirm={handleConfirmEvents}
            onEdit={handleEditEvent}
            onCancel={() => setPendingEvents([])}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          onImageUpload={handleImageUpload}
          onVoiceRecording={handleVoiceRecording}
          disabled={isLoading}
        />
      </div>
      
      {error && (
        <div className="p-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// Simulate AI processing functions (replace with real API calls)
async function processNaturalLanguage(text: string) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock natural language processing
  const events = [];
  let message = '입력을 분석해보겠습니다.';
  
  if (text.includes('미팅') || text.includes('회의')) {
    events.push({
      id: Date.now().toString(),
      title: '팀 미팅',
      startTime: '2024-07-28T14:00:00',
      endTime: '2024-07-28T15:30:00',
      location: '강남역',
      description: '자연어로 생성된 일정'
    });
    
    if (text.includes('준비')) {
      events.push({
        id: (Date.now() + 1).toString(),
        title: '미팅 준비',
        startTime: '2024-07-28T13:30:00',
        endTime: '2024-07-28T14:00:00',
        description: '미팅 준비 시간'
      });
    }
    
    message = `일정을 분석하여 ${events.length}개의 이벤트를 생성했습니다. 확인 후 캘린더에 추가해주세요!`;
  } else {
    message = '더 구체적인 일정 정보를 알려주시면 캘린더에 추가해드리겠습니다.';
  }
  
  return {
    message,
    events,
    confidence: 0.95
  };
}

async function processImageOCR(file: File) {
  // Simulate OCR processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    message: '이미지에서 일정 정보를 추출했습니다!',
    events: [{
      id: Date.now().toString(),
      title: 'AI Conference 2024',
      startTime: '2024-12-15T09:00:00',
      endTime: '2024-12-15T18:00:00',
      location: 'COEX, Seoul',
      description: '이미지에서 추출된 일정'
    }],
    confidence: 0.88
  };
}

async function processVoiceInput(audioBlob: Blob) {
  // Simulate voice processing
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  return {
    message: '음성을 인식하여 일정을 생성했습니다!',
    events: [{
      id: Date.now().toString(),
      title: '음성으로 생성된 일정',
      startTime: '2024-07-29T10:00:00',
      endTime: '2024-07-29T11:00:00',
      description: '음성 입력으로 생성된 일정'
    }],
    confidence: 0.92
  };
}