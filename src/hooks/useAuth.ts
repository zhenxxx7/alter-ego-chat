import { useEffect, useState } from 'react'
import { blink } from '../blink/client'

type AuthUser = {
  id: string
  email?: string | null
  displayName?: string | null
} | null

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user as AuthUser)
      if (!state.isLoading) setIsLoading(false)
    })

    return unsubscribe
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
  }
}
