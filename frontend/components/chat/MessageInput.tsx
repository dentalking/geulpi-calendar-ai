'use client';

import React, { useState, useRef } from 'react';
import { PaperPlaneIcon, PhotoIcon, MicrophoneIcon, StopIcon } from '@/components/ui/icons';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onImageUpload: (file: File) => void;
  onVoiceRecording: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  onImageUpload,
  onVoiceRecording,
  disabled = false
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      adjustTextareaHeight();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      // Reset input
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        onVoiceRecording(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-700 font-medium">
            녹음 중... {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="자연어로 일정을 말해보세요... (예: 내일 오후 2시에 강남에서 미팅)"
            disabled={disabled || isRecording}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          
          {/* Character count for long messages */}
          {message.length > 100 && (
            <div className="absolute bottom-1 right-12 text-xs text-gray-400">
              {message.length}/500
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Image Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isRecording}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="이미지 업로드"
          >
            <PhotoIcon className="w-6 h-6" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Voice Recording */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
            }`}
            title={isRecording ? '녹음 중지' : '음성 녹음'}
          >
            {isRecording ? (
              <StopIcon className="w-6 h-6" />
            ) : (
              <MicrophoneIcon className="w-6 h-6" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled || isRecording}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
            title="메시지 전송"
          >
            <PaperPlaneIcon className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Quick Suggestions */}
      {!message && !isRecording && (
        <div className="flex flex-wrap gap-2">
          <QuickSuggestion 
            text="내일 오후 2시 미팅" 
            onClick={setMessage}
            disabled={disabled}
          />
          <QuickSuggestion 
            text="이번 주 운동 일정 추가" 
            onClick={setMessage}
            disabled={disabled}
          />
          <QuickSuggestion 
            text="점심 약속 잡기" 
            onClick={setMessage}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

function QuickSuggestion({ 
  text, 
  onClick, 
  disabled 
}: { 
  text: string; 
  onClick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => onClick(text)}
      disabled={disabled}
      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
}