import { useState, useCallback, useRef } from 'react'

interface StreamingMessageOptions {
  onComplete?: (fullMessage: string) => void
  delay?: number // milliseconds between characters
}

export function useStreamingMessage({ onComplete, delay = 50 }: StreamingMessageOptions = {}) {
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageRef = useRef<string>('')

  const startStreaming = useCallback((fullMessage: string) => {
    // Clear any existing streaming
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsStreaming(true)
    setStreamingMessage('')
    messageRef.current = ''
    
    let currentIndex = 0
    const chars = fullMessage.split('')
    
    intervalRef.current = setInterval(() => {
      if (currentIndex < chars.length) {
        const nextChar = chars[currentIndex]
        messageRef.current += nextChar
        setStreamingMessage(messageRef.current)
        currentIndex++
      } else {
        // Streaming complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsStreaming(false)
        onComplete?.(fullMessage)
      }
    }, delay)
  }, [delay, onComplete])

  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  return {
    streamingMessage,
    isStreaming,
    startStreaming,
    stopStreaming,
    cleanup
  }
}