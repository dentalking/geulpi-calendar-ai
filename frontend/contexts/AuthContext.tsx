'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useApolloClient, gql } from '@apollo/client'

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      name
      picture
      onboardingCompleted
    }
  }
`

interface User {
  id: string
  email: string
  name: string
  picture?: string
  onboardingCompleted?: boolean
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  logout: () => void
  isAuthenticated: boolean
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const client = useApolloClient()

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const { data } = await client.query({
        query: GET_CURRENT_USER,
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      })

      if (data?.me) {
        setUser(data.me)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // Token might be invalid, clear it
      localStorage.removeItem('token')
      document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax'
    } finally {
      setLoading(false)
    }
  }

  const refetchUser = async () => {
    setLoading(true)
    await checkAuth()
  }

  useEffect(() => {
    checkAuth()

    // Listen for storage events (login/logout in other tabs)
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [client])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_refresh_token')
    localStorage.removeItem('google_id_token')
    document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax'
    setUser(null)
    client.clearStore()
    router.push('/login')
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        isAuthenticated: !!user,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}