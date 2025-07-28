import { Suspense } from 'react'
import AuthCallbackHandler from './AuthCallbackHandler'

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <Suspense fallback={<p className="mt-4 text-gray-600">로그인 처리 중...</p>}>
          <AuthCallbackHandler />
        </Suspense>
      </div>
    </div>
  )
}