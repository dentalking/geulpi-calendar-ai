'use client'

import { useCallback, useMemo, useState, SyntheticEvent } from 'react'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  View,
  Event,
  SlotInfo,
} from 'react-big-calendar'
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '../styles/calendar.css'
import { announceToScreenReader } from '@/utils/accessibility'

const locales = {
  'ko': ko,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop(BigCalendar)

export interface CalendarEvent extends Event {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  allDay?: boolean
  resource?: {
    testId?: string
    originalIndex?: number
    isPreview?: boolean
    location?: string
  }
}

interface CalendarProps {
  events: CalendarEvent[]
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onSelectEvent?: (event: CalendarEvent) => void
  date?: Date
  onNavigate?: (date: Date) => void
  onEventDrop?: (args: EventInteractionArgs<CalendarEvent>) => void
  onEventResize?: (args: EventInteractionArgs<CalendarEvent>) => void
  onAddEvent?: () => void
}

export default function Calendar({
  events,
  onSelectSlot,
  onSelectEvent,
  date: propDate,
  onNavigate: propOnNavigate,
  onEventDrop,
  onEventResize,
  onAddEvent,
}: CalendarProps) {
  const [view, setView] = useState<View>('month')
  const [internalDate, setInternalDate] = useState(new Date())
  
  const date = propDate || internalDate
  const onNavigate = propOnNavigate || setInternalDate

  const messages = useMemo(
    () => ({
      date: '날짜',
      time: '시간',
      event: '일정',
      allDay: '종일',
      week: '주',
      work_week: '근무일',
      day: '일',
      month: '월',
      previous: '이전',
      next: '다음',
      yesterday: '어제',
      tomorrow: '내일',
      today: '오늘',
      agenda: '일정목록',
      noEventsInRange: '이 기간에 일정이 없습니다.',
      showMore: (total: number) => `+${total} 더보기`,
    }),
    []
  )

  const formats = useMemo(
    () => ({
      monthHeaderFormat: 'yyyy년 M월',
      dayHeaderFormat: 'M월 d일 EEE',
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'M월 d일', { locale: ko })} - ${format(
          end,
          'M월 d일',
          { locale: ko }
        )}`,
    }),
    []
  )

  const handleNavigate = useCallback((newDate: Date) => {
    onNavigate(newDate)
    // Announce navigation to screen readers
    const dateStr = format(newDate, 'yyyy년 M월', { locale: ko })
    announceToScreenReader(`${dateStr}로 이동했습니다`, 'polite')
  }, [onNavigate])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
    // Announce view change to screen readers
    const viewNames: Record<View, string> = {
      month: '월 보기',
      week: '주 보기',
      work_week: '근무일 보기',
      day: '일 보기',
      agenda: '일정 목록 보기'
    }
    announceToScreenReader(`${viewNames[newView] || newView}로 변경했습니다`, 'polite')
  }, [])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    onSelectSlot?.(slotInfo)
    // Announce slot selection
    const dateStr = format(slotInfo.start, 'M월 d일 HH:mm', { locale: ko })
    announceToScreenReader(`${dateStr}에 새 일정 추가를 위해 선택했습니다`, 'polite')
  }, [onSelectSlot])

  const handleSelectEvent = useCallback((event: object, e: SyntheticEvent<HTMLElement>) => {
    const calendarEvent = event as CalendarEvent
    onSelectEvent?.(calendarEvent)
    // Announce event selection
    announceToScreenReader(`일정 "${calendarEvent.title}" 선택했습니다`, 'polite')
  }, [onSelectEvent])

  const handleEventDrop = useCallback((args: EventInteractionArgs<CalendarEvent>) => {
    onEventDrop?.(args)
    announceToScreenReader(`일정 "${args.event.title}"이(가) 이동되었습니다`, 'polite')
  }, [onEventDrop])

  const handleEventResize = useCallback((args: EventInteractionArgs<CalendarEvent>) => {
    onEventResize?.(args)
    announceToScreenReader(`일정 "${args.event.title}"의 시간이 변경되었습니다`, 'polite')
  }, [onEventResize])

  const navigateToPrevious = useCallback(() => {
    const newDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    handleNavigate(newDate)
  }, [date, handleNavigate])

  const navigateToNext = useCallback(() => {
    const newDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    handleNavigate(newDate)
  }, [date, handleNavigate])

  const navigateToToday = useCallback(() => {
    handleNavigate(new Date())
  }, [handleNavigate])

  const viewNames: Record<View, string> = {
    month: '월',
    week: '주',
    work_week: '근무일',
    day: '일',
    agenda: '일정목록'
  }

  // Custom event component with data-testid
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const testId = event.resource?.testId || `event-${event.resource?.originalIndex || event.id}`
    return (
      <div 
        data-testid={testId}
        className={`rbc-event-content ${event.resource?.isPreview ? 'opacity-60' : ''}`}
      >
        {event.title}
      </div>
    )
  }

  // Custom date cell wrapper to add today testid
  const DateCellWrapper = ({ children, value }: { children: React.ReactNode; value: Date }) => {
    const isTodayCell = isToday(value)
    return (
      <div 
        data-testid={isTodayCell ? "today-cell" : undefined}
        className={isTodayCell ? "today" : ""}
      >
        {children}
      </div>
    )
  }

  return (
    <div 
      data-testid="calendar-container"
      className="h-full flex flex-col" 
      role="application" 
      aria-label="캘린더"
      aria-describedby="calendar-instructions"
    >
      <div 
        id="calendar-instructions" 
        className="sr-only"
      >
        방향키로 날짜를 탐색하고, 엔터 키로 일정을 선택할 수 있습니다. 
        빈 날짜를 클릭하면 새 일정을 추가할 수 있습니다.
      </div>
      
      {/* Calendar Header */}
      <div 
        data-testid="calendar-header"
        className="flex items-center justify-between p-4 border-b bg-white"
      >
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            data-testid="prev-month-button"
            onClick={navigateToPrevious}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            data-testid="today-button"
            onClick={navigateToToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            오늘
          </button>
          
          <button
            data-testid="next-month-button"
            onClick={navigateToNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Current Month Display */}
        <h2 
          data-testid="current-month"
          className="text-lg font-semibold text-gray-900"
        >
          {format(date, 'yyyy년 M월', { locale: ko })}
        </h2>

        {/* View Selector and Add Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              data-testid="view-selector"
              value={view}
              onChange={(e) => handleViewChange(e.target.value as View)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option data-testid="view-option-month" value="month">{viewNames.month}</option>
              <option data-testid="view-option-week" value="week">{viewNames.week}</option>
              <option data-testid="view-option-day" value="day">{viewNames.day}</option>
              <option data-testid="view-option-agenda" value="agenda">{viewNames.agenda}</option>
            </select>
          </div>
          
          {onAddEvent && (
            <button
              data-testid="add-event-button"
              onClick={onAddEvent}
              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              aria-label="새 일정 추가"
            >
              <Plus className="w-4 h-4" />
              일정 추가
            </button>
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 min-h-0">
        <div 
          data-testid={`calendar-${view}-view`}
          className="h-full"
        >
          <DnDCalendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            draggableAccessor={() => true}
            resizable
            selectable
            popup
            messages={messages}
            formats={formats}
            culture="ko"
            style={{ height: '100%' }}
            components={{
              event: EventComponent,
              dateCellWrapper: DateCellWrapper,
            }}
          />
        </div>
      </div>
    </div>
  )
}