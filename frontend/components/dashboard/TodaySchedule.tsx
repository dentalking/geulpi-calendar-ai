'use client'

import { format, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Calendar } from 'lucide-react'
import { useGetEventsQuery } from '@/generated/graphql'
import { useAuth } from '@/contexts/AuthContext'

export function TodaySchedule() {
  const { user } = useAuth()
  const today = new Date()
  
  const { data, loading } = useGetEventsQuery({
    variables: {
      filter: {
        startDate: startOfDay(today).toISOString(),
        endDate: endOfDay(today).toISOString(),
      }
    },
    skip: !user?.id,
  })

  if (loading) {
    return (
      <div data-testid="today-schedule" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          오늘의 일정
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const events = data?.events || []
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return (
    <div data-testid="today-schedule" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        오늘의 일정
      </h2>
      
      {sortedEvents.length === 0 ? (
        <p className="text-gray-500 text-center py-8">오늘은 일정이 없습니다</p>
      ) : (
        <div className="space-y-3" data-testid="schedule-items">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              data-testid="schedule-item"
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900">{event.title}</h3>
                  <span className="text-sm text-gray-500">
                    {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                  </span>
                </div>
                {event.description && (
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}