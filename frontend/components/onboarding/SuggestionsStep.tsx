'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Calendar, Sparkles } from 'lucide-react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const GET_SUGGESTIONS = gql`
  query GetSuggestions($context: SuggestionContext) {
    suggestions(context: $context) {
      id
      type
      title
      description
      impact {
        area
        change
        severity
      }
      suggestedEvent {
        title
        description
        start
        end
        area {
          name
          color
        }
      }
      createdAt
    }
  }
`

const ACCEPT_SUGGESTION = gql`
  mutation AcceptSuggestion($id: ID!) {
    acceptSuggestion(id: $id) {
      id
      title
      start
      end
    }
  }
`

const BATCH_ACCEPT_SUGGESTIONS = gql`
  mutation BatchAcceptSuggestions($ids: [ID!]!) {
    batchAcceptSuggestions(ids: $ids) {
      id
      title
      start
      end
    }
  }
`

interface SuggestionsStepProps {
  onComplete: () => void
}

export default function SuggestionsStep({ onComplete }: SuggestionsStepProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set())
  const [isAccepting, setIsAccepting] = useState(false)
  const { data, loading, error } = useQuery(GET_SUGGESTIONS, {
    variables: {
      context: {
        timeframe: 'WEEK',
      },
    },
  })
  const [acceptSuggestion] = useMutation(ACCEPT_SUGGESTION)
  const [batchAcceptSuggestions] = useMutation(BATCH_ACCEPT_SUGGESTIONS)

  const suggestions = data?.suggestions || []

  const handleToggleSuggestion = (id: string) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSuggestions(newSelected)
  }

  const handleAcceptSelected = async () => {
    if (selectedSuggestions.size === 0) return

    setIsAccepting(true)
    try {
      const selectedIds = Array.from(selectedSuggestions)
      
      // Add animation delay for visual feedback
      for (const id of selectedIds) {
        setAcceptedSuggestions(prev => new Set([...Array.from(prev), id]))
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      if (selectedSuggestions.size === 1) {
        await acceptSuggestion({
          variables: { id: selectedIds[0] },
        })
      } else {
        await batchAcceptSuggestions({
          variables: { ids: selectedIds },
        })
      }
      
      // Wait a bit before completing
      await new Promise(resolve => setTimeout(resolve, 500))
      onComplete()
    } catch (error) {
      console.error('Failed to accept suggestions:', error)
      setAcceptedSuggestions(new Set())
    } finally {
      setIsAccepting(false)
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'OPTIMIZE_SCHEDULE':
        return <Clock className="w-5 h-5" />
      case 'BALANCE_IMPROVEMENT':
        return <Sparkles className="w-5 h-5" />
      default:
        return <Calendar className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-600 bg-red-50'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-green-600 bg-green-50'
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">설정이 완료되었어요! 🎉</h2>
        <p className="text-gray-600">
          AI가 당신을 위한 첫 제안을 준비했어요. 원하는 항목을 선택해주세요.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600">제안을 불러오는데 실패했습니다.</p>
        </div>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <>
          <div className="space-y-4 mb-6">
            {suggestions.map((suggestion: any) => (
              <div
                key={suggestion.id}
                onClick={() => !acceptedSuggestions.has(suggestion.id) && handleToggleSuggestion(suggestion.id)}
                className={`p-4 border rounded-lg transition-all ${
                  acceptedSuggestions.has(suggestion.id)
                    ? 'border-green-500 bg-green-50 scale-98 opacity-80'
                    : selectedSuggestions.has(suggestion.id)
                    ? 'border-blue-500 bg-blue-50 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                } ${acceptedSuggestions.has(suggestion.id) ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{suggestion.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    
                    {suggestion.suggestedEvent && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: suggestion.suggestedEvent.area.color }}
                          />
                          <span className="text-sm font-medium">
                            {suggestion.suggestedEvent.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {format(new Date(suggestion.suggestedEvent.start), 'M월 d일 (E) HH:mm', { locale: ko })} - 
                          {format(new Date(suggestion.suggestedEvent.end), 'HH:mm', { locale: ko })}
                        </p>
                      </div>
                    )}
                    
                    {suggestion.impact && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(suggestion.impact.severity)}`}>
                          {suggestion.impact.severity === 'HIGH' ? '높은 영향' : 
                           suggestion.impact.severity === 'MEDIUM' ? '중간 영향' : '낮은 영향'}
                        </span>
                      </div>
                    )}
                  </div>
                  {acceptedSuggestions.has(suggestion.id) ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(suggestion.id)}
                      onChange={() => {}}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAcceptSelected}
              disabled={selectedSuggestions.size === 0 || isAccepting}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isAccepting ? '적용 중...' : `선택한 ${selectedSuggestions.size}개 적용하기`}
            </button>
            <button
              onClick={onComplete}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 font-medium"
            >
              나중에 하기
            </button>
          </div>
        </>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">현재 제안할 내용이 없어요.</p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            캘린더로 이동하기
          </button>
        </div>
      )}
    </div>
  )
}