'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { format } from 'date-fns'
import MessageContent from './MessageContent'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isStreaming?: boolean
}

interface PreviewEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  isPreview: boolean
}

interface ChatProps {
  onSendMessage?: (message: string) => void
  messages?: Message[]
  isTyping?: boolean
  previewEvents?: PreviewEvent[]
  onConfirmPreview?: () => void
  onCancelPreview?: () => void
}

export default function Chat({ 
  onSendMessage, 
  messages = [], 
  isTyping = false,
  previewEvents = [],
  onConfirmPreview,
  onCancelPreview 
}: ChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">일정 관리 도우미</p>
            <p className="text-sm">
              일정을 추가하거나 변경하고 싶으신가요?
              <br />
              자연스럽게 말씀해주세요.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isStreaming
                      ? 'bg-blue-50 text-gray-900 border border-blue-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <MessageContent content={message.content} />
                  <p className="text-xs opacity-70 mt-1">
                    {format(message.timestamp, 'HH:mm')}
                    {message.isStreaming && <span className="ml-1 animate-pulse">•••</span>}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">생각 중...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Preview confirmation buttons */}
            {previewEvents.length > 0 && (
              <div className="flex justify-center space-x-2 mt-2">
                <button
                  onClick={onConfirmPreview}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                >
                  <span>✅</span>
                  <span>확인</span>
                </button>
                <button
                  onClick={onCancelPreview}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                >
                  <span>❌</span>
                  <span>취소</span>
                </button>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Quick action buttons */}
      <div className="px-4 py-2 border-t bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSendMessage?.('오늘 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors"
          >
            📅 오늘 일정
          </button>
          <button
            onClick={() => onSendMessage?.('내일 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors"
          >
            📅 내일 일정
          </button>
          <button
            onClick={() => onSendMessage?.('이번주 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors"
          >
            📅 이번주 일정
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="일정을 말씀해주세요..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Suggested input examples */}
        <div className="mt-2 text-xs text-gray-500">
          예시: &quot;내일 오후 3시에 회의 추가해줘&quot;, &quot;오늘 일정 모두 보여줘&quot;
        </div>
      </form>
    </div>
  )
}