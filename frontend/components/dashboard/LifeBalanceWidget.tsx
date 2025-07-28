'use client'

import { PieChart, Activity } from 'lucide-react'

interface LifeArea {
  name: string
  color: string
  percentage: number
  hours: number
}

export function LifeBalanceWidget() {
  // Mock data - in real app, this would come from GraphQL query
  const lifeAreas: LifeArea[] = [
    { name: '일/경력', color: '#3B82F6', percentage: 40, hours: 32 },
    { name: '건강', color: '#10B981', percentage: 25, hours: 20 },
    { name: '관계', color: '#F59E0B', percentage: 20, hours: 16 },
    { name: '취미', color: '#8B5CF6', percentage: 15, hours: 12 },
  ]

  const total = lifeAreas.reduce((sum, area) => sum + area.percentage, 0)

  return (
    <div data-testid="life-balance-widget" className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-green-500" />
        라이프 밸런스
      </h3>

      <div className="relative h-40 mb-6">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Semi-circle background */}
          <path
            d="M 10 90 A 80 80 0 0 1 190 90"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="20"
          />
          
          {/* Colored segments */}
          {(() => {
            let currentAngle = 0
            return lifeAreas.map((area, index) => {
              const startAngle = currentAngle
              const endAngle = currentAngle + (area.percentage / 100) * 180
              const startRad = (startAngle * Math.PI) / 180
              const endRad = (endAngle * Math.PI) / 180
              
              const x1 = 100 - 80 * Math.cos(startRad)
              const y1 = 90 - 80 * Math.sin(startRad)
              const x2 = 100 - 80 * Math.cos(endRad)
              const y2 = 90 - 80 * Math.sin(endRad)
              
              const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
              
              currentAngle = endAngle
              
              return (
                <g key={area.name}>
                  <path
                    d={`M ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={area.color}
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                </g>
              )
            })
          })()}
          
          {/* Center text */}
          <text x="100" y="85" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
            균형잡힌
          </text>
          <text x="100" y="100" textAnchor="middle" className="text-sm fill-gray-600">
            라이프스타일
          </text>
        </svg>
      </div>

      <div className="space-y-3">
        {lifeAreas.map((area) => (
          <div key={area.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: area.color }}
              />
              <span className="text-sm font-medium text-gray-700">{area.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{area.percentage}%</span>
              <span className="text-xs text-gray-500 ml-2">({area.hours}시간)</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600 text-center">
          이번 주 총 <span className="font-semibold">80시간</span> 활동
        </p>
      </div>
    </div>
  )
}