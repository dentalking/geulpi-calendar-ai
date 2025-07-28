'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const idToken = searchParams.get('id_token')

      if (error) {
        console.error('Authentication error:', error)
        // Redirect to login page with error
        router.push(`/login?error=${encodeURIComponent(error)}`)
        return
      }

      if (token) {
        // Store JWT token
        localStorage.setItem('token', token)
        
        // Also set cookie for middleware
        document.cookie = `auth_token=${token}; Path=/; SameSite=Lax`
        
        // Store Google tokens if provided
        if (accessToken) localStorage.setItem('google_access_token', accessToken)
        if (refreshToken) localStorage.setItem('google_refresh_token', refreshToken)
        if (idToken) localStorage.setItem('google_id_token', idToken)
        
        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'))
        
        // Wait a bit for cookie to be set, then redirect to dashboard (less protected than calendar)
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      } else {
        console.error('No token received')
        router.push('/login?error=no_token')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  )
}