'use client'

import { useState } from 'react'
import { Target, Plus, Check } from 'lucide-react'

interface Goal {
  id: string
  text: string
  completed: boolean
}

export function DailyGoalWidget() {
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', text: '프로젝트 계획서 작성', completed: false },
    { id: '2', text: '30분 운동하기', completed: true },
  ])
  const [newGoal, setNewGoal] = useState('')
  const [showInput, setShowInput] = useState(false)

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, {
        id: Date.now().toString(),
        text: newGoal,
        completed: false
      }])
      setNewGoal('')
      setShowInput(false)
    }
  }

  const toggleGoal = (id: string) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, completed: !goal.completed } : goal
    ))
  }

  const completedCount = goals.filter(g => g.completed).length

  return (
    <div data-testid="daily-goal-widget" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          오늘의 목표
        </h3>
        <button
          onClick={() => setShowInput(true)}
          className="text-purple-500 hover:text-purple-600 transition-colors"
          title="목표 추가"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>진행률</span>
          <span>{completedCount}/{goals.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${goals.length > 0 ? (completedCount / goals.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
            onClick={() => toggleGoal(goal.id)}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              goal.completed 
                ? 'bg-purple-500 border-purple-500' 
                : 'border-gray-300'
            }`}>
              {goal.completed && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`flex-1 ${goal.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {goal.text}
            </span>
          </div>
        ))}
        
        {showInput && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              placeholder="새로운 목표 입력"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              onClick={addGoal}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              추가
            </button>
            <button
              onClick={() => {
                setShowInput(false)
                setNewGoal('')
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}