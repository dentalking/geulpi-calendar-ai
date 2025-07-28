'use client'

import { format, addDays, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { useGetEventsQuery } from '@/generated/graphql'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export function UpcomingEvents() {
  const { user } = useAuth()
  const today = new Date()
  
  const { data, loading } = useGetEventsQuery({
    variables: {
      filter: {
        startDate: startOfDay(today).toISOString(),
        endDate: addDays(today, 7).toISOString(),
      }
    },
    skip: !user?.id,
  })

  if (loading) {
    return (
      <div data-testid="upcoming-events" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-500" />
          다가오는 일정
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  const events = data?.events || []
  const sortedEvents = [...events]
    .filter(event => new Date(event.startTime) > today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5)

  return (
    <div data-testid="upcoming-events" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-500" />
          다가오는 일정
        </h3>
        <Link 
          href="/calendar" 
          className="text-sm text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {sortedEvents.length === 0 ? (
        <p className="text-gray-500 text-center py-8">다음 7일간 예정된 일정이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {sortedEvents.map((event) => {
            const eventDate = new Date(event.startTime)
            const isToday = format(eventDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            const isTomorrow = format(eventDate, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')
            
            return (
              <div
                key={event.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {isToday ? '오늘' : isTomorrow ? '내일' : format(eventDate, 'M월 d일 (EEE)', { locale: ko })}
                      {' • '}
                      {format(eventDate, 'HH:mm')}
                    </p>
                  </div>
                  {isToday && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                      오늘
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}