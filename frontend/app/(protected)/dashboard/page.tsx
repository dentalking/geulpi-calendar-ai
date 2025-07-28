'use client'

import { useAuth } from '@/contexts/AuthContext'
import { TodaySchedule } from '@/components/dashboard/TodaySchedule'
import { DailyGoalWidget } from '@/components/dashboard/DailyGoalWidget'
import { LifeBalanceWidget } from '@/components/dashboard/LifeBalanceWidget'
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import ProtectedRoute from '@/components/ProtectedRoute'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Menu, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function DashboardContent() {
  const { user, loading, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with mobile menu */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                data-testid="mobile-menu-button"
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-semibold text-gray-900">대시보드</h1>
            </div>
            
            <nav className="hidden lg:flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-900 font-medium">대시보드</Link>
              <Link href="/calendar" className="text-gray-600 hover:text-gray-900">캘린더</Link>
            </nav>

            <div className="flex items-center gap-4">
              {loading ? (
                <span className="text-gray-500">Loading...</span>
              ) : user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2">
                    {user.picture ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={user.picture}
                          alt={user.name || 'User avatar'}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <span data-testid="user-email" className="text-sm text-gray-700">
                      {user.email}
                    </span>
                  </div>
                  <button
                    data-testid="logout-button"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <nav className="px-4 py-3 space-y-2">
              <Link 
                href="/dashboard" 
                className="block px-3 py-2 rounded-md text-gray-900 font-medium bg-gray-100"
              >
                대시보드
              </Link>
              <Link 
                href="/calendar" 
                className="block px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                캘린더
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Today's Schedule - spans 2 columns on xl screens */}
          <div className="xl:col-span-2">
            <TodaySchedule />
          </div>

          {/* Daily Goals */}
          <div>
            <DailyGoalWidget />
          </div>

          {/* Calendar Widget */}
          <div>
            <CalendarWidget />
          </div>

          {/* Life Balance */}
          <div>
            <LifeBalanceWidget />
          </div>

          {/* Upcoming Events */}
          <div>
            <UpcomingEvents />
          </div>

          {/* AI Insights - spans full width on mobile, 2 columns on xl */}
          <div className="lg:col-span-2 xl:col-span-3">
            <AIInsights />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <DashboardContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}