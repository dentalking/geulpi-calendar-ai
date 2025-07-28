'use client'

import { useState } from 'react'
import { Plus, X, Briefcase, Home, GraduationCap, Heart, Gamepad2, Star } from 'lucide-react'

interface LifeArea {
  name: string
  color: string
  icon: string
  targetPercentage: number
}

interface LifeAreasStepProps {
  onSubmit: (areas: LifeArea[]) => void
}

const PRESET_AREAS = [
  { name: '업무', icon: 'briefcase', color: '#3B82F6', emoji: '💼' },
  { name: '가족', icon: 'home', color: '#EF4444', emoji: '🏠' },
  { name: '성장', icon: 'graduation-cap', color: '#10B981', emoji: '📚' },
  { name: '건강', icon: 'heart', color: '#EC4899', emoji: '💪' },
  { name: '취미', icon: 'gamepad', color: '#8B5CF6', emoji: '🎮' },
  { name: '기타', icon: 'star', color: '#F59E0B', emoji: '⭐' },
]

export default function LifeAreasStep({ onSubmit }: LifeAreasStepProps) {
  const [areas, setAreas] = useState<LifeArea[]>([
    { name: '업무', icon: 'briefcase', color: '#3B82F6', targetPercentage: 40 },
    { name: '가족', icon: 'home', color: '#EF4444', targetPercentage: 30 },
    { name: '성장', icon: 'graduation-cap', color: '#10B981', targetPercentage: 20 },
    { name: '기타', icon: 'star', color: '#F59E0B', targetPercentage: 10 },
  ])
  const [showAddArea, setShowAddArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_AREAS[0] | null>(null)

  const handleAddArea = () => {
    if (newAreaName.trim() && selectedPreset) {
      const totalPercentage = areas.reduce((sum, area) => sum + area.targetPercentage, 0)
      const newArea: LifeArea = {
        name: newAreaName.trim(),
        icon: selectedPreset.icon,
        color: selectedPreset.color,
        targetPercentage: Math.max(0, 100 - totalPercentage),
      }
      setAreas([...areas, newArea])
      setNewAreaName('')
      setSelectedPreset(null)
      setShowAddArea(false)
    }
  }

  const handleRemoveArea = (index: number) => {
    const newAreas = areas.filter((_, i) => i !== index)
    setAreas(newAreas)
  }

  const handlePercentageChange = (index: number, value: number) => {
    const newAreas = [...areas]
    newAreas[index].targetPercentage = Math.max(0, Math.min(100, value))
    setAreas(newAreas)
  }

  const totalPercentage = areas.reduce((sum, area) => sum + area.targetPercentage, 0)
  const isValid = totalPercentage === 100 && areas.length >= 2

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'briefcase': return <Briefcase className="w-5 h-5" />
      case 'home': return <Home className="w-5 h-5" />
      case 'graduation-cap': return <GraduationCap className="w-5 h-5" />
      case 'heart': return <Heart className="w-5 h-5" />
      case 'gamepad': return <Gamepad2 className="w-5 h-5" />
      default: return <Star className="w-5 h-5" />
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">삶의 영역 설정</h2>
      <p className="text-gray-600 mb-6">
        당신의 일상을 구성하는 주요 영역들을 설정해주세요. 각 영역의 이상적인 시간 비율도 함께 설정할 수 있어요.
      </p>

      <div className="space-y-4 mb-6">
        {areas.map((area, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: area.color }}
            >
              {getIcon(area.icon)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{area.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={area.targetPercentage}
                onChange={(e) => handlePercentageChange(index, parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 border rounded text-center"
                min="0"
                max="100"
              />
              <span className="text-gray-600">%</span>
            </div>
            {areas.length > 2 && (
              <button
                onClick={() => handleRemoveArea(index)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Total Percentage Display */}
      <div className={`mb-6 p-4 rounded-lg ${totalPercentage === 100 ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {totalPercentage === 100 ? '✅ 완벽해요!' : '⚠️ 합계가 100%가 되어야 해요'}
          </span>
          <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
            {totalPercentage}%
          </span>
        </div>
      </div>

      {/* Add New Area */}
      {!showAddArea && areas.length < 8 && (
        <button
          onClick={() => setShowAddArea(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          영역 추가하기
        </button>
      )}

      {showAddArea && (
        <div className="p-4 border rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">영역 이름</label>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="예: 운동, 독서, 봉사활동"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">아이콘 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AREAS.map((preset) => (
                <button
                  key={preset.icon}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${
                    selectedPreset?.icon === preset.icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{preset.emoji}</span>
                  <span className="text-xs">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddArea}
              disabled={!newAreaName.trim() || !selectedPreset}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
            <button
              onClick={() => {
                setShowAddArea(false)
                setNewAreaName('')
                setSelectedPreset(null)
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit(areas)}
        disabled={!isValid}
        className="w-full mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        다음 단계로
      </button>
    </div>
  )
}