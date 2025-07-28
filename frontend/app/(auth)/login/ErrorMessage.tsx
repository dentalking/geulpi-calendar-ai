'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorMessage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  if (!error) return null

  return (
    <div data-testid="error-message" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {error === 'no_token' && '로그인에 실패했습니다. 다시 시도해주세요.'}
      {error === 'unauthorized' && '접근 권한이 없습니다. 로그인해주세요.'}
      {error !== 'no_token' && error !== 'unauthorized' && `오류: ${error}`}
    </div>
  )
}