'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ImageIcon, Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';
import MessageContent from './MessageContent';
import ImageDropzone from './ImageDropzone';
import EventPreview from './EventPreview';
import { useProcessOcrMutation } from '@/generated/graphql';
import { handleKeyboardNavigation, KEYS, announceToScreenReader, generateAriaId } from '@/utils/accessibility';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface PreviewEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  isPreview: boolean;
}

interface ExtractedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  area?: {
    id: string;
    name: string;
    color: string;
  };
}

interface ChatWithOCRProps {
  onSendMessage?: (message: string) => void;
  onCreateEvent?: (event: any) => Promise<void>;
  messages?: Message[];
  isTyping?: boolean;
  previewEvents?: PreviewEvent[];
  onConfirmPreview?: () => void;
  onCancelPreview?: () => void;
}

export default function ChatWithOCR({
  onSendMessage,
  onCreateEvent,
  messages = [],
  isTyping = false,
  previewEvents = [],
  onConfirmPreview,
  onCancelPreview,
}: ChatWithOCRProps) {
  const [input, setInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [isCreatingEvents, setIsCreatingEvents] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatId = generateAriaId('chat');
  const messagesId = generateAriaId('messages');

  const [processOCR, { loading: isProcessingOCR }] = useProcessOcrMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, extractedEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim());
      setInput('');
      announceToScreenReader('메시지를 전송했습니다', 'polite');
    }
  };

  const handleQuickAction = (action: string) => {
    onSendMessage?.(action);
    announceToScreenReader(`빠른 액션: ${action}`, 'polite');
  };

  const handleImageUploadToggle = () => {
    const newState = !showImageUpload;
    setShowImageUpload(newState);
    announceToScreenReader(
      newState ? '이미지 업로드 영역이 열렸습니다' : '이미지 업로드 영역이 닫혔습니다', 
      'polite'
    );
  };

  const handleImageAccepted = async (file: File, base64: string) => {
    try {
      const { data } = await processOCR({
        variables: { imageBase64: base64 },
      });

      if (data?.processOCR) {
        const { message, events } = data.processOCR;

        // Add AI response message
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: message || 'I processed the image and found the following events:',
          role: 'assistant',
          timestamp: new Date(),
        };

        // Convert events to preview format
        const convertedEvents: ExtractedEvent[] = events.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          area: event.area,
        }));

        setExtractedEvents(convertedEvents);

        // Add user message showing they uploaded an image
        const userMessage: Message = {
          id: (Date.now() - 1).toString(),
          content: `📷 Uploaded image: ${file.name}`,
          role: 'user',
          timestamp: new Date(),
        };

        // Simulate adding messages (in real app, this would be handled by parent)
        if (onSendMessage) {
          onSendMessage(`Uploaded image for OCR processing: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to process OCR:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I failed to process the image. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
    }
  };

  const handleConfirmEvents = async () => {
    if (!onCreateEvent || extractedEvents.length === 0) return;

    setIsCreatingEvents(true);

    try {
      for (const event of extractedEvents) {
        await onCreateEvent({
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
          area: event.area,
        });
      }

      setExtractedEvents([]);

      // Add confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Successfully added ${extractedEvents.length} event${
          extractedEvents.length > 1 ? 's' : ''
        } to your calendar!`,
        role: 'assistant',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to create events:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ Failed to add events to calendar. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
    } finally {
      setIsCreatingEvents(false);
    }
  };

  const handleCancelEvents = () => {
    setExtractedEvents([]);
    
    const cancelMessage: Message = {
      id: Date.now().toString(),
      content: '❌ Cancelled adding events from the image.',
      role: 'assistant',
      timestamp: new Date(),
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // In a real app, you would send this to a speech-to-text API
        // For now, we'll just simulate it
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        
        // Simulate transcription
        announceToScreenReader('음성 녹음이 완료되었습니다', 'polite');
        // In real app: const transcription = await transcribeAudio(audioBlob);
        // onSendMessage?.(transcription);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      announceToScreenReader('음성 녹음을 시작합니다', 'polite');
    } catch (error) {
      console.error('Failed to start recording:', error);
      announceToScreenReader('마이크 접근 권한이 필요합니다', 'assertive');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-full" 
      role="region" 
      aria-label="채팅 인터페이스"
      id={chatId}
    >
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite" 
        aria-label="대화 내용"
        id={messagesId}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8" role="status">
            <p className="text-lg font-medium mb-2">일정 관리 도우미</p>
            <p className="text-sm">
              일정을 추가하거나 변경하고 싶으신가요?
              <br />
              자연스럽게 말씀해주시거나 이미지를 업로드해주세요.
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
                role="article"
                aria-label={`${message.role === 'user' ? '사용자' : '어시스턴트'} 메시지`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isStreaming
                      ? 'bg-blue-50 text-gray-900 border border-blue-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  data-testid={message.role === 'assistant' ? 'ai-response' : 'user-message'}
                >
                  <MessageContent content={message.content} />
                  <p className="text-xs opacity-70 mt-1" aria-label={`전송 시간: ${format(message.timestamp, 'HH:mm')}`}>
                    {format(message.timestamp, 'HH:mm')}
                    {message.isStreaming && (
                      <span className="ml-1 animate-pulse" aria-label="메시지 전송 중">•••</span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {(isTyping || isProcessingOCR || isRecording) && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2" data-testid={isRecording ? "voice-processing" : "ai-typing-indicator"}>
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {isRecording ? '음성 녹음 중...' : isProcessingOCR ? '이미지 분석 중...' : '생각 중...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Image upload area */}
            {showImageUpload && (
              <div className="mt-4">
                <ImageDropzone
                  onImageAccepted={handleImageAccepted}
                  isProcessing={isProcessingOCR}
                />
              </div>
            )}

            {/* Event preview */}
            {extractedEvents.length > 0 && (
              <EventPreview
                events={extractedEvents}
                onConfirm={handleConfirmEvents}
                onCancel={handleCancelEvents}
                isLoading={isCreatingEvents}
              />
            )}

            {/* Preview confirmation buttons for existing events */}
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
      <div className="px-4 py-2 border-t bg-gray-50" role="toolbar" aria-label="빠른 액션">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAction('오늘 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="오늘 일정 조회하기"
            type="button"
          >
            📅 오늘 일정
          </button>
          <button
            onClick={() => handleQuickAction('내일 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="내일 일정 조회하기"
            type="button"
          >
            📅 내일 일정
          </button>
          <button
            onClick={() => handleQuickAction('이번주 일정 보여줘')}
            className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="이번주 일정 조회하기"
            type="button"
          >
            📅 이번주 일정
          </button>
          <button
            data-testid="voice-input-button"
            onClick={startRecording}
            className="px-3 py-1 text-xs border rounded-full transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-100"
            aria-label="음성으로 일정 추가하기"
            type="button"
          >
            <Mic className="w-3 h-3" aria-hidden="true" />
            🎤 음성 입력
          </button>
          <button
            onClick={handleImageUploadToggle}
            className={`px-3 py-1 text-xs border rounded-full transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showImageUpload
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white hover:bg-gray-100'
            }`}
            aria-label={showImageUpload ? '이미지 업로드 닫기' : '이미지 업로드 열기'}
            aria-expanded={showImageUpload}
            type="button"
          >
            <ImageIcon className="w-3 h-3" aria-hidden="true" />
            📷 이미지 업로드
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t" role="search" aria-label="메시지 입력">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="일정을 말씀해주세요..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping || isProcessingOCR || isRecording}
            aria-label="메시지 입력"
            aria-describedby="input-help"
            aria-busy={isTyping || isProcessingOCR}
            data-testid="chat-input"
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isRecording 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={isRecording ? '음성 녹음 중지' : '음성 녹음 시작'}
            data-testid="voice-record-button"
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Mic className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isTyping || isProcessingOCR || isRecording}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="메시지 전송"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Suggested input examples */}
        <div id="input-help" className="mt-2 text-xs text-gray-500" role="note">
          예시: &quot;내일 오후 3시에 회의 추가해줘&quot;, &quot;오늘 일정 모두 보여줘&quot;, 또는 일정이 포함된 이미지를 업로드하세요
        </div>
      </form>
    </div>
  );
}