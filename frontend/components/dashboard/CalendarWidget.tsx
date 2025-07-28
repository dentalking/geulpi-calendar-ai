'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useGetEventsQuery } from '@/generated/graphql'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export function CalendarWidget() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  const { data, loading } = useGetEventsQuery({
    variables: {
      filter: {
        startDate: startOfMonth(currentDate).toISOString(),
        endDate: endOfMonth(currentDate).toISOString(),
      }
    },
    skip: !user?.id,
  })

  const events = data?.events || []

  // Create calendar grid for month view
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    const days = []
    let day = start

    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [currentDate])

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return isSameDay(eventDate, day)
    })
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  if (loading) {
    return (
      <div data-testid="calendar-container" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div data-testid="calendar-header" className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            미니 캘린더
          </h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="calendar-container" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div data-testid="calendar-header" className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-500" />
          미니 캘린더
        </h2>
        <Link 
          href="/calendar"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          전체 보기
        </Link>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            data-testid="prev-month-button"
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span data-testid="current-month" className="font-medium text-gray-900 min-w-[100px] text-center">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </span>
          <button
            data-testid="next-month-button"
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="today-button"
            onClick={goToToday}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            오늘
          </button>
          <div data-testid="view-selector" className="relative">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as 'month' | 'week' | 'day')}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option data-testid="view-option-month" value="month">월</option>
              <option data-testid="view-option-week" value="week">주</option>
              <option data-testid="view-option-day" value="day">일</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div data-testid="calendar-month-view">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentDate)

              return (
                <div
                  key={day.toString()}
                  data-testid={isToday ? "today-cell" : "calendar-cell"}
                  className={`
                    relative p-1 text-xs text-center cursor-pointer rounded
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isToday ? 'bg-blue-100 text-blue-700 font-medium today' : 'hover:bg-gray-50'}
                    min-h-[28px] flex flex-col items-center
                  `}
                  onClick={() => {
                    // Navigate to full calendar with this date
                    window.location.href = `/calendar?date=${day.toISOString().split('T')[0]}`
                  }}
                >
                  <span>{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 2).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div data-testid="calendar-week-view" className="space-y-2">
          <p className="text-sm text-gray-600 text-center">주 보기 - 전체 캘린더에서 확인하세요</p>
          <Link 
            href="/calendar"
            className="block w-full py-2 bg-blue-50 text-blue-700 text-center rounded hover:bg-blue-100"
          >
            전체 캘린더로 이동
          </Link>
        </div>
      )}

      {view === 'day' && (
        <div data-testid="calendar-day-view" className="space-y-2">
          <p className="text-sm text-gray-600 text-center">일 보기 - 전체 캘린더에서 확인하세요</p>
          <Link 
            href="/calendar"
            className="block w-full py-2 bg-blue-50 text-blue-700 text-center rounded hover:bg-blue-100"
          >
            전체 캘린더로 이동
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            data-testid="add-event-button"
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={() => {
              window.location.href = '/calendar'
            }}
          >
            일정 추가
          </button>
          <Link
            href="/calendar"
            className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 text-center"
          >
            캘린더 열기
          </Link>
        </div>
      </div>
    </div>
  )
}