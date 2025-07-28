'use client';

import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end space-x-2">
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">AI</span>
        </div>
        
        {/* Typing Animation */}
        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-500 ml-2" data-testid="ai-typing-indicator">
              AI가 분석 중입니다...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}