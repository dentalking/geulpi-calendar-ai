'use client';

import React from 'react';
import Image from 'next/image';
import { ChatMessage } from './ChatInterface';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex items-end space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : isSystem
                ? 'bg-gray-400 text-white'
                : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
          }`}>
            {isUser ? (
              <span className="text-sm font-semibold">나</span>
            ) : isSystem ? (
              <span className="text-xs">💡</span>
            ) : (
              <span className="text-sm font-bold">AI</span>
            )}
          </div>
          
          {/* Message Content */}
          <div className={`space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Message Bubble */}
            <div className={`px-4 py-2 rounded-2xl max-w-md break-words ${
              isUser
                ? 'bg-blue-500 text-white rounded-br-sm'
                : isSystem
                  ? 'bg-gray-100 text-gray-700 rounded-bl-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {/* Image Display */}
              {message.imageUrl && (
                <div className="mb-2">
                  <Image
                    src={message.imageUrl}
                    alt="Uploaded image"
                    width={300}
                    height={200}
                    className="max-w-full h-auto rounded-lg border"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}
              
              {/* Text Content */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              
              {/* Confidence Score for AI messages */}
              {!isUser && message.confidence && (
                <div className="mt-2 text-xs opacity-75">
                  신뢰도: {Math.round(message.confidence * 100)}%
                </div>
              )}
            </div>
            
            {/* Events Preview */}
            {message.events && message.events.length > 0 && (
              <div className="mt-2 space-y-2 w-full">
                {message.events.map((event, index) => (
                  <EventCard key={index} event={event} />
                ))}
              </div>
            )}
            
            {/* Timestamp */}
            <div className={`text-xs text-gray-500 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {format(message.timestamp, 'HH:mm', { locale: ko })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {event.title}
          </h4>
          
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-600">
              📅 {format(startTime, 'M월 d일 (E)', { locale: ko })}
            </p>
            <p className="text-xs text-gray-600">
              🕐 {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </p>
            {event.location && (
              <p className="text-xs text-gray-600">
                📍 {event.location}
              </p>
            )}
          </div>
          
          {event.description && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}