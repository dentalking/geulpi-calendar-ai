'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LifeAreasStep from '@/components/onboarding/LifeAreasStep'
import BalanceStep from '@/components/onboarding/BalanceStep'
import SuggestionsStep from '@/components/onboarding/SuggestionsStep'
import ProtectedRoute from '@/components/ProtectedRoute'
import { gql, useMutation } from '@apollo/client'

const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding($input: OnboardingInput!) {
    completeOnboarding(input: $input) {
      id
      name
      email
      onboardingCompleted
      lifePhilosophy {
        areas {
          id
          name
          color
          icon
          targetPercentage
        }
        idealBalance
      }
    }
  }
`

interface LifeArea {
  name: string
  color: string
  icon: string
  targetPercentage: number
}

function OnboardingContent() {
  const router = useRouter()
  const { user, refetchUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([])
  const [completeOnboarding, { loading }] = useMutation(COMPLETE_ONBOARDING)

  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push('/calendar')
    }
  }, [user, router])

  const handleLifeAreasSubmit = (areas: LifeArea[]) => {
    setLifeAreas(areas)
    setCurrentStep(2)
  }

  const handleBalanceSubmit = async (idealBalance: Record<string, number>) => {
    try {
      const { data } = await completeOnboarding({
        variables: {
          input: {
            googleTokens: {
              accessToken: localStorage.getItem('google_access_token') || '',
              refreshToken: localStorage.getItem('google_refresh_token') || '',
              idToken: localStorage.getItem('google_id_token') || '',
            },
            lifePhilosophy: {
              areas: lifeAreas.map(area => ({
                name: area.name,
                color: area.color,
                icon: area.icon,
                targetPercentage: area.targetPercentage,
              })),
              idealBalance,
              rules: [],
            },
            preferences: {
              workingHours: {
                start: '09:00',
                end: '18:00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
              },
              notifications: {
                suggestions: true,
                insights: true,
                reminders: true,
                reminderMinutesBefore: 10,
              },
              aiAssistance: {
                proactivityLevel: 'MEDIUM',
                autoScheduling: true,
                autoClassification: true,
              },
              defaultEventDuration: 60,
              bufferTime: 15,
            },
          },
        },
      })

      if (data?.completeOnboarding) {
        await refetchUser()
        setCurrentStep(3)
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    }
  }

  const handleSuggestionsComplete = () => {
    router.push('/calendar')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700">환영합니다! 시작하기 전에 몇 가지 설정이 필요해요</h2>
            <span className="text-sm text-gray-500">{currentStep} / 3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${(currentStep - 1) * 100}%)` }}
          >
            <div className="w-full flex-shrink-0">
              <LifeAreasStep onSubmit={handleLifeAreasSubmit} />
            </div>
            <div className="w-full flex-shrink-0">
              <BalanceStep 
                lifeAreas={lifeAreas} 
                onSubmit={handleBalanceSubmit}
                loading={loading}
              />
            </div>
            <div className="w-full flex-shrink-0">
              <SuggestionsStep onComplete={handleSuggestionsComplete} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute requireOnboarding={false}>
      <OnboardingContent />
    </ProtectedRoute>
  )
}