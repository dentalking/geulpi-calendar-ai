'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface LifeArea {
  name: string
  color: string
  icon: string
  targetPercentage: number
}

interface BalanceStepProps {
  lifeAreas: LifeArea[]
  onSubmit: (idealBalance: Record<string, number>) => void
  loading?: boolean
}

export default function BalanceStep({ lifeAreas, onSubmit, loading }: BalanceStepProps) {
  const [balance, setBalance] = useState<Record<string, number>>({})

  useEffect(() => {
    const initialBalance: Record<string, number> = {}
    lifeAreas.forEach(area => {
      initialBalance[area.name.toLowerCase()] = area.targetPercentage
    })
    setBalance(initialBalance)
  }, [lifeAreas])

  const handleSliderChange = (areaName: string, value: number) => {
    const newBalance = { ...balance }
    const key = areaName.toLowerCase()
    const oldValue = newBalance[key] || 0
    const diff = value - oldValue
    
    newBalance[key] = value

    // Adjust other values proportionally
    const otherKeys = Object.keys(newBalance).filter(k => k !== key)
    const totalOthers = otherKeys.reduce((sum, k) => sum + newBalance[k], 0)
    
    if (totalOthers > 0 && diff !== 0) {
      otherKeys.forEach(k => {
        const proportion = newBalance[k] / totalOthers
        newBalance[k] = Math.max(0, Math.round(newBalance[k] - diff * proportion))
      })
    }

    // Ensure total is 100%
    const total = Object.values(newBalance).reduce((sum, val) => sum + val, 0)
    if (total !== 100) {
      const adjustment = 100 - total
      const largestKey = Object.keys(newBalance).reduce((a, b) => 
        newBalance[a] > newBalance[b] ? a : b
      )
      newBalance[largestKey] += adjustment
    }

    setBalance(newBalance)
  }

  const chartData = lifeAreas.map(area => ({
    name: area.name,
    value: balance[area.name.toLowerCase()] || 0,
    color: area.color,
  }))

  const totalPercentage = Object.values(balance).reduce((sum, val) => sum + val, 0)
  const isValid = totalPercentage === 100

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">이상적인 균형 설정</h2>
      <p className="text-gray-600 mb-6">
        각 영역에 할애하고 싶은 시간의 비율을 조정해보세요. AI가 이 균형을 유지할 수 있도록 도와드릴게요.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-6">
          {lifeAreas.map((area) => {
            const value = balance[area.name.toLowerCase()] || 0
            return (
              <div key={area.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: area.color }}
                    >
                      {area.name.charAt(0)}
                    </div>
                    <span className="font-medium">{area.name}</span>
                  </div>
                  <span className="font-bold text-lg">{value}%</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleSliderChange(area.name, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, ${area.color} 0%, ${area.color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Chart */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => value > 0 ? `${value}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              이 균형은 언제든지 수정할 수 있어요
            </p>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div className={`mt-6 p-4 rounded-lg ${isValid ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {isValid ? '✅ 완벽한 균형이에요!' : '⚠️ 합계가 100%가 되어야 해요'}
          </span>
          <span className={`font-bold ${isValid ? 'text-green-600' : 'text-yellow-600'}`}>
            합계: {totalPercentage}%
          </span>
        </div>
      </div>

      <button
        onClick={() => onSubmit(balance)}
        disabled={!isValid || loading}
        className="w-full mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? '설정 중...' : '완료하기'}
      </button>
    </div>
  )
}