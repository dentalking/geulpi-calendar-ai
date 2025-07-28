'use client'

import { Sparkles, TrendingUp, AlertCircle, Coffee } from 'lucide-react'

interface Insight {
  id: string
  type: 'tip' | 'warning' | 'achievement'
  message: string
  icon: React.ReactNode
}

export function AIInsights() {
  // Mock insights - in real app, these would come from AI analysis
  const insights: Insight[] = [
    {
      id: '1',
      type: 'tip',
      message: '이번 주 건강 관련 활동이 20% 감소했어요. 내일 아침 30분 운동을 추천드려요!',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: '2',
      type: 'warning',
      message: '다음 주 목요일에 3개의 중요 일정이 겹쳐있어요. 일정 조정이 필요할 수 있습니다.',
      icon: <AlertCircle className="w-4 h-4" />
    },
    {
      id: '3',
      type: 'achievement',
      message: '이번 달 목표 달성률이 85%예요! 조금만 더 힘내면 100% 달성할 수 있어요.',
      icon: <Coffee className="w-4 h-4" />
    }
  ]

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'tip':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'achievement':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        AI 인사이트
      </h3>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            data-testid="insight-message"
            className={`p-4 rounded-lg border flex items-start gap-3 ${getInsightStyle(insight.type)}`}
          >
            <div className="mt-0.5">{insight.icon}</div>
            <p className="text-sm leading-relaxed flex-1">{insight.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          AI가 당신의 일정 패턴을 분석하여 맞춤형 조언을 제공합니다
        </p>
      </div>
    </div>
  )
}