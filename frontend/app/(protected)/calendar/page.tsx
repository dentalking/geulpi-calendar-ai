'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Calendar, { CalendarEvent } from '@/components/Calendar'
import ChatWithOCR from '@/components/ChatWithOCR'
import EventModal from '@/components/EventModal'
import { ToastContainer, useToast } from '@/components/Toast'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { SlotInfo } from 'react-big-calendar'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { LogOut, User, Menu } from 'lucide-react'
import Link from 'next/link'
import { CalendarSkeleton } from '@/components/LoadingStates'
import { NetworkErrorState } from '@/components/ErrorStates'
import ErrorBoundary from '@/components/ErrorBoundary'
import { OfflineBanner, ConnectionStatus } from '@/components/OfflineIndicator'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useProcessNaturalLanguageMutation,
  useEventUpdatesSubscription,
  EventFilter,
  Intent
} from '@/generated/graphql'


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

function CalendarPageContent() {
  const { user, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null)
  const [isAITyping, setIsAITyping] = useState(false)
  const [previewEvents, setPreviewEvents] = useState<PreviewEvent[]>([])
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: `안녕하세요 ${user?.name || ''}님! 👋\n\n일정 관리 도우미입니다. 다음과 같은 명령어를 사용할 수 있어요:\n\n📅 "내일 오후 3시에 회의 추가해줘"\n✏️ "오늘 일정 모두 보여줘"\n🗑️ "선택한 일정 삭제해줘"\n\n자연스럽게 말씀해주세요!`,
      role: 'assistant',
      timestamp: new Date(),
    }
  ])

  // Event filter for the current month
  const eventFilter: EventFilter = {
    startDate: startOfMonth(currentDate).toISOString(),
    endDate: endOfMonth(currentDate).toISOString(),
  }

  // GraphQL Query for events
  const { data, loading, error, refetch } = useGetEventsQuery({
    variables: { filter: eventFilter },
    skip: !user?.id,
    errorPolicy: 'all'
  })

  // GraphQL Mutations
  const [createEvent] = useCreateEventMutation()
  const [updateEvent] = useUpdateEventMutation()
  const [deleteEvent] = useDeleteEventMutation()
  const [processNaturalLanguage] = useProcessNaturalLanguageMutation()

  // GraphQL Subscription for real-time updates
  useEventUpdatesSubscription({
    variables: { userId: user?.id || '' },
    skip: !user?.id,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData?.data?.eventUpdated) {
        const event = subscriptionData.data.eventUpdated
        
        // Show notification in chat
        const newMessage: Message = {
          id: Date.now().toString(),
          content: `일정이 업데이트되었습니다: "${event.title}"`,
          role: 'assistant',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, newMessage])
        
        // Refetch events to update calendar
        refetch()
      }
    },
  })

  // TODO: Implement streaming AI responses with GraphQL Subscription

  // Convert GraphQL data to CalendarEvent format and include preview events
  const events: CalendarEvent[] = useMemo(() => {
    const realEvents = data?.events ? data.events.map((event: any, index: number) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      description: event.description,
      allDay: event.isAllDay,
      resource: { 
        testId: `event-${event.id}`,
        originalIndex: index + 1 // For backward compatibility with event-1, event-2, etc.
      },
    })) : []
    
    // Add preview events with different styling
    const previewCalendarEvents = previewEvents.map((event: PreviewEvent) => ({
      id: event.id,
      title: `📝 ${event.title}`,
      start: event.start,
      end: event.end,
      description: event.description,
      allDay: false,
      resource: { 
        isPreview: true,
        testId: `preview-event-${event.id}`
      },
    }))
    
    return [...realEvents, ...previewCalendarEvents]
  }, [data, previewEvents])

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Open modal for new event
    setModalEvent(null)
    setIsModalOpen(true)
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: `${format(slotInfo.start, 'M월 d일 HH:mm')}에 새 일정을 추가합니다.`,
      role: 'assistant',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setModalEvent(event)
    setIsModalOpen(true)
    
    // Show event details in chat
    const eventDetails = `
**${event.title}**
📅 ${format(event.start, 'yyyy년 M월 d일')}
⏰ ${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}
${event.description ? `📝 ${event.description}` : ''}

일정 상세 정보를 표시합니다.
    `.trim()
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: eventDetails,
      role: 'assistant',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleSendMessage = async (message: string) => {
    // Check if offline
    if (!isOnline) {
      const offlineMessage: Message = {
        id: Date.now().toString(),
        content: '인터넷 연결이 필요합니다. 연결을 확인하고 다시 시도해주세요.',
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, offlineMessage])
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Show typing indicator
    setIsAITyping(true)

    try {
      // Process natural language command
      const { data } = await processNaturalLanguage({
        variables: {
          input: message,
        },
      })

      if (data?.processNaturalLanguage) {
        const { understood, intent, events, message: aiMessage, clarificationNeeded } = data.processNaturalLanguage
        
        if (!understood || clarificationNeeded) {
          // Need clarification
          const clarificationMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiMessage || '죄송합니다. 무엇을 원하시는지 정확히 이해하지 못했습니다. 다시 한 번 말씀해주시겠어요?',
            role: 'assistant',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, clarificationMessage])
        } else if (events && events.length > 0) {
          // Convert events to preview format
          const previews: PreviewEvent[] = events.map((event: any) => ({
            id: `preview-${event.id}`,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            description: event.description,
            isPreview: true,
          }))
          
          setPreviewEvents(previews)
          
          // Show confirmation message with preview info
          const previewMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `${aiMessage || '다음 일정을 추가하시겠어요?'}\n\n📝 **제안된 일정:**\n${previews.map(p => `• ${p.title} (${format(p.start, 'M월 d일 HH:mm')} - ${format(p.end, 'HH:mm')})`).join('\n')}\n\n✅ 확인하시겠어요? 아니면 ❌ 취소하시겠어요?`,
            role: 'assistant',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, previewMessage])
        } else {
          // Handle other intents (show, update, delete)
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: aiMessage || '처리가 완료되었습니다.',
            role: 'assistant',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
          
          // If intent is to query schedule, the AI message should contain the event list
          if (intent === Intent.QuerySchedule) {
            // Calendar will show all events by default
            // The AI response should contain the formatted event list
          }
        }
      }
      
      setIsAITyping(false)
    } catch (error) {
      console.error('Failed to process natural language:', error)
      setIsAITyping(false)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
  }
  
  // Refetch events when month changes
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const userId = user?.id
  
  useEffect(() => {
    if (userId) {
      refetch()
    }
  }, [currentMonth, currentYear, userId, refetch])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Modal handlers
  const handleModalSave = async (eventData: {
    title: string
    location?: string
    description?: string
    startDate: string
    startTime: string
    endTime: string
  }) => {
    try {
      if (modalEvent?.id) {
        // Update existing event
        await updateEvent({
          variables: {
            id: modalEvent.id,
            input: {
              title: eventData.title,
              startTime: new Date(`${eventData.startDate}T${eventData.startTime}`).toISOString(),
              endTime: new Date(`${eventData.startDate}T${eventData.endTime}`).toISOString(),
              description: eventData.description,
              location: eventData.location,
            },
          },
        })
        showSuccess('일정이 수정되었습니다')
      } else {
        // Create new event
        await createEvent({
          variables: {
            input: {
              title: eventData.title,
              startTime: new Date(`${eventData.startDate}T${eventData.startTime}`).toISOString(),
              endTime: new Date(`${eventData.startDate}T${eventData.endTime}`).toISOString(),
              description: eventData.description,
              location: eventData.location,
              allDay: false,
            },
          },
        })
        showSuccess('일정이 추가되었습니다')
      }
      refetch()
    } catch (error) {
      console.error('Failed to save event:', error)
      showError('일정 저장 중 오류가 발생했습니다')
    }
  }

  const handleModalDelete = async () => {
    if (!modalEvent?.id) return
    
    try {
      await deleteEvent({
        variables: { id: modalEvent.id },
      })
      showSuccess('일정이 삭제되었습니다')
      refetch()
    } catch (error) {
      console.error('Failed to delete event:', error)
      showError('일정 삭제 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <OfflineBanner />
      {/* Header */}
      <header className="border-b bg-white px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              data-testid="mobile-menu-button"
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 mr-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold">Geulpi Calendar</h1>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">대시보드</Link>
            <Link href="/calendar" className="text-gray-900 font-medium">캘린더</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <ConnectionStatus />
            <div className="hidden sm:flex items-center gap-2">
              {user?.picture ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={user.picture}
                    alt={user.name || 'User avatar'}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
              <span data-testid="user-email" className="text-sm font-medium hidden md:inline">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              disabled={!isOnline}
              title={!isOnline ? 'Cannot logout while offline' : 'Logout'}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-3 border-t pt-3">
            <nav className="space-y-2">
              <Link 
                href="/dashboard" 
                className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                대시보드
              </Link>
              <Link 
                href="/calendar" 
                className="block px-3 py-2 rounded-md text-gray-900 font-medium bg-gray-100"
              >
                캘린더
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div 
          data-testid="calendar-view"
          className="flex-1 p-2 sm:p-4"
          onTouchStart={(e) => {
            // Store touch start position for swipe detection
            const touch = e.touches[0]
            const startX = touch.clientX
            ;(e.currentTarget as any).startX = startX
          }}
          onTouchEnd={(e) => {
            // Detect swipe gesture
            const touch = e.changedTouches[0]
            const endX = touch.clientX
            const startX = (e.currentTarget as any).startX
            const diffX = endX - startX
            
            // Swipe threshold of 50px
            if (Math.abs(diffX) > 50) {
              if (diffX > 0) {
                // Swipe right - go to previous month
                handleNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
              } else {
                // Swipe left - go to next month
                handleNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
              }
            }
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">일정을 불러오는 중...</p>
              </div>
            </div>
          ) : error ? (
            <NetworkErrorState onRetry={() => refetch()} />
          ) : (
            <Calendar
              events={events}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              date={currentDate}
              onNavigate={handleNavigate}
              onAddEvent={() => {
                setModalEvent(null)
                setIsModalOpen(true)
              }}
              onEventDrop={async ({ event, start, end }) => {
                try {
                  await updateEvent({
                    variables: {
                      id: event.id,
                      input: {
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                      },
                    },
                  })
                  refetch()
                  
                  showSuccess(`"${event.title}" 일정이 ${format(start, 'M월 d일 HH:mm')}로 이동되었습니다.`)
                } catch (error) {
                  console.error('Failed to update event:', error)
                  showError('일정 이동 중 오류가 발생했습니다.')
                }
              }}
              onEventResize={async ({ event, start, end }) => {
                try {
                  await updateEvent({
                    variables: {
                      id: event.id,
                      input: {
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                      },
                    },
                  })
                  refetch()
                  
                  showSuccess(`"${event.title}" 일정의 시간이 변경되었습니다.`)
                } catch (error) {
                  console.error('Failed to resize event:', error)
                  showError('일정 시간 변경 중 오류가 발생했습니다.')
                }
              }}
            />
          )}
        </div>
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-white flex flex-col h-96 lg:h-auto">
          {/* Add AI Chat Button for E2E tests */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <button 
              data-testid="ai-chat-button"
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
              onClick={() => {
                // Chat is always active, this is just for test compatibility
                const chatInput = document.querySelector('[data-testid="chat-input"]') as HTMLElement;
                chatInput?.focus();
              }}
            >
              🤖 GEULPI AI Assistant
            </button>
          </div>
          <ChatWithOCR 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isTyping={isAITyping}
            previewEvents={previewEvents}
            onCreateEvent={async (eventData) => {
              try {
                await createEvent({
                  variables: {
                    input: {
                      title: eventData.title,
                      startTime: eventData.startTime,
                      endTime: eventData.endTime,
                      description: eventData.description,
                      areaId: eventData.area?.id,
                      allDay: false,
                    },
                  },
                })
                refetch()
              } catch (error) {
                console.error('Failed to create event:', error)
                throw error
              }
            }}
            onConfirmPreview={async () => {
              // Execute the preview events
              try {
                for (const previewEvent of previewEvents) {
                  await createEvent({
                    variables: {
                      input: {
                        title: previewEvent.title,
                        startTime: previewEvent.start.toISOString(),
                        endTime: previewEvent.end.toISOString(),
                        description: previewEvent.description,
                        allDay: false,
                      },
                    },
                  })
                }
                
                await refetch()
                setPreviewEvents([])
                
                const confirmMessage: Message = {
                  id: Date.now().toString(),
                  content: `✅ ${previewEvents.length}개의 일정이 추가되었습니다!`,
                  role: 'assistant',
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, confirmMessage])
              } catch (error) {
                console.error('Failed to create events:', error)
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  content: '❌ 일정 추가 중 오류가 발생했습니다. 다시 시도해주세요.',
                  role: 'assistant',
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, errorMessage])
              }
            }}
            onCancelPreview={() => {
              setPreviewEvents([])
              
              const cancelMessage: Message = {
                id: Date.now().toString(),
                content: '❌ 일정 추가가 취소되었습니다.',
                role: 'assistant',
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, cancelMessage])
            }}
          />
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setModalEvent(null)
          }}
          onSave={handleModalSave}
          onDelete={modalEvent?.id ? handleModalDelete : undefined}
          initialData={modalEvent ? {
            id: modalEvent.id,
            title: modalEvent.title,
            location: modalEvent.resource?.location,
            description: modalEvent.description,
            start: modalEvent.start,
            end: modalEvent.end,
          } : undefined}
        />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <CalendarPageContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}