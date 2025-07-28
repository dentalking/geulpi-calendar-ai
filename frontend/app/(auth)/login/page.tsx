'use client'

import { useSearchParams } from 'next/navigation'
import GoogleLoginButton from '@/components/GoogleLoginButton'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">로그인</h1>
          <p className="text-gray-600">AI 기반 스마트 일정 관리 서비스</p>
        </div>

        {error && (
          <div data-testid="error-message" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error === 'no_token' && '로그인에 실패했습니다. 다시 시도해주세요.'}
            {error === 'unauthorized' && '접근 권한이 없습니다. 로그인해주세요.'}
            {error !== 'no_token' && error !== 'unauthorized' && `오류: ${error}`}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">로그인</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLoginButton className="w-full justify-center" />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            로그인하면{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              서비스 이용약관
            </a>
            과{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}