'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Trash2, Save } from 'lucide-react'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (eventData: {
    title: string
    location?: string
    description?: string
    startDate: string
    startTime: string
    endTime: string
  }) => void
  onDelete?: () => void
  initialData?: {
    id?: string
    title?: string
    location?: string
    description?: string
    start?: Date
    end?: Date
  }
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '')
        setLocation(initialData.location || '')
        setDescription(initialData.description || '')
        
        if (initialData.start) {
          setStartDate(format(initialData.start, 'yyyy-MM-dd'))
          setStartTime(format(initialData.start, 'HH:mm'))
        }
        
        if (initialData.end) {
          setEndTime(format(initialData.end, 'HH:mm'))
        }
      } else {
        // Reset form for new event
        const now = new Date()
        setTitle('')
        setLocation('')
        setDescription('')
        setStartDate(format(now, 'yyyy-MM-dd'))
        setStartTime(format(now, 'HH:mm'))
        setEndTime(format(new Date(now.getTime() + 60 * 60 * 1000), 'HH:mm'))
      }
      setShowDeleteConfirm(false)
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) return
    
    setIsSaving(true)
    
    try {
      await onSave({
        title: title.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        startDate,
        startTime,
        endTime
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to save event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete()
        onClose()
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
    setShowDeleteConfirm(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        data-testid="event-modal"
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {initialData?.id ? '일정 수정' : '새 일정 추가'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-2">
              일정 제목 *
            </label>
            <input
              id="event-title"
              data-testid="event-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-2">
              장소
            </label>
            <input
              id="event-location"
              data-testid="event-location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="장소를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              id="event-description"
              data-testid="event-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정에 대한 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-gray-700 mb-2">
                날짜 *
              </label>
              <input
                id="event-start-date"
                data-testid="event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-start-time" className="block text-sm font-medium text-gray-700 mb-2">
                시작 시간 *
              </label>
              <input
                id="event-start-time"
                data-testid="event-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-end-time" className="block text-sm font-medium text-gray-700 mb-2">
                종료 시간 *
              </label>
              <input
                id="event-end-time"
                data-testid="event-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            {initialData?.id && onDelete && (
              <button
                type="button"
                data-testid="delete-event-button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            )}
            
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="submit"
                data-testid="save-event-button"
                disabled={!title.trim() || isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {initialData?.id ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">일정 삭제</h3>
              <p className="text-gray-600 mb-6">
                &ldquo;{title}&rdquo; 일정을 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  data-testid="confirm-delete-button"
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}