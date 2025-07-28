'use client';

import React, { useState } from 'react';
import { format, addMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CheckIcon, 
  XMarkIcon, 
  PencilIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon
} from '@/components/ui/icons';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
}

interface EventPreviewProps {
  events: Event[];
  onConfirm: (events: Event[]) => void;
  onEdit: (eventId: string, updates: Partial<Event>) => void;
  onCancel: () => void;
}

export function EventPreview({ events, onConfirm, onEdit, onCancel }: EventPreviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Event>>({});

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setEditForm({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      description: event.description
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      onEdit(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const detectConflicts = () => {
    const conflicts: string[] = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        const start1 = new Date(event1.startTime);
        const end1 = new Date(event1.endTime);
        const start2 = new Date(event2.startTime);
        const end2 = new Date(event2.endTime);
        
        if ((start1 < end2 && end1 > start2)) {
          conflicts.push(`"${event1.title}"와 "${event2.title}" 시간이 겹칩니다.`);
        }
      }
    }
    return conflicts;
  };

  const conflicts = detectConflicts();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            생성된 일정 ({events.length}개)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onConfirm(events)}
            disabled={conflicts.length > 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-4 h-4" />
            <span>모두 추가</span>
          </button>
          <button
            onClick={onCancel}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            <span>취소</span>
          </button>
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="font-medium text-red-800">시간 충돌 발견</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {conflicts.map((conflict, index) => (
              <li key={index}>• {conflict}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            isEditing={editingId === event.id}
            editForm={editForm}
            onEdit={() => handleEdit(event)}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            onFormChange={setEditForm}
            onConfirmSingle={() => onConfirm([event])}
          />
        ))}
      </div>

      {/* Quick Actions */}
      {events.length > 1 && (
        <div className="pt-3 border-t border-blue-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                // Adjust all events to avoid conflicts
                const adjustedEvents = adjustForConflicts(events);
                adjustedEvents.forEach((adjustedEvent, index) => {
                  onEdit(events[index].id, adjustedEvent);
                });
              }}
              className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
            >
              자동 시간 조정
            </button>
            <button
              onClick={() => {
                // Add buffer time between events
                const bufferedEvents = addBufferTime(events);
                bufferedEvents.forEach((bufferedEvent, index) => {
                  onEdit(events[index].id, bufferedEvent);
                });
              }}
              className="px-3 py-1 text-sm text-purple-600 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors"
            >
              이동 시간 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  index,
  isEditing,
  editForm,
  onEdit,
  onSave,
  onCancel,
  onFormChange,
  onConfirmSingle
}: {
  event: Event;
  index: number;
  isEditing: boolean;
  editForm: Partial<Event>;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onFormChange: (form: Partial<Event>) => void;
  onConfirmSingle: () => void;
}) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-3">
          <input
            type="text"
            value={editForm.title || ''}
            onChange={(e) => onFormChange({ ...editForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="일정 제목"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
              <input
                type="datetime-local"
                value={editForm.startTime?.slice(0, 16) || ''}
                onChange={(e) => onFormChange({ ...editForm, startTime: e.target.value + ':00' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
              <input
                type="datetime-local"
                value={editForm.endTime?.slice(0, 16) || ''}
                onChange={(e) => onFormChange({ ...editForm, endTime: e.target.value + ':00' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <input
            type="text"
            value={editForm.location || ''}
            onChange={(e) => onFormChange({ ...editForm, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="장소 (선택사항)"
          />
          
          <textarea
            value={editForm.description || ''}
            onChange={(e) => onFormChange({ ...editForm, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="설명 (선택사항)"
            rows={2}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1.5 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 className="font-semibold text-gray-900">{event.title}</h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              #{index + 1}
            </span>
          </div>
          
          {/* Time Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4" />
              <span>
                {format(startTime, 'M월 d일 (E) HH:mm', { locale: ko })} - 
                {format(endTime, 'HH:mm')}
              </span>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {duration}분
            </span>
          </div>
          
          {/* Location */}
          {event.location && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPinIcon className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          )}
          
          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              {event.description}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1 ml-4">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="편집"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onConfirmSingle}
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="이 일정만 추가"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions for automatic adjustments
function adjustForConflicts(events: Event[]): Partial<Event>[] {
  const sorted = [...events].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  const adjusted: Partial<Event>[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const duration = eventEnd.getTime() - eventStart.getTime();
    
    if (i === 0) {
      adjusted.push({});
    } else {
      const previousEvent = sorted[i - 1];
      const previousEnd = new Date(previousEvent.endTime);
      
      if (eventStart < previousEnd) {
        // Conflict detected, move this event
        const newStart = new Date(previousEnd.getTime());
        const newEnd = new Date(newStart.getTime() + duration);
        
        adjusted.push({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString()
        });
      } else {
        adjusted.push({});
      }
    }
  }
  
  return adjusted;
}

function addBufferTime(events: Event[]): Partial<Event>[] {
  const BUFFER_MINUTES = 30; // 30 minutes buffer
  
  return events.map((event, index) => {
    if (index === events.length - 1) return {}; // Last event doesn't need buffer
    
    const currentEnd = new Date(event.endTime);
    const nextEvent = events[index + 1];
    const nextStart = new Date(nextEvent.startTime);
    
    const timeDiff = nextStart.getTime() - currentEnd.getTime();
    const bufferNeeded = BUFFER_MINUTES * 60 * 1000;
    
    if (timeDiff < bufferNeeded) {
      // Add buffer time
      const newEnd = new Date(currentEnd.getTime() + bufferNeeded);
      return {
        endTime: newEnd.toISOString()
      };
    }
    
    return {};
  });
}