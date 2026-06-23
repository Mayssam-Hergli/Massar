import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { profilesApi } from '../api/profiles'

/**
 * Resolves the single "active" project profile for the current user,
 * creating one transparently if none exists yet. Lets the simplified
 * /diagnostic, /dashboard, /roadmap routes work without a :profileId
 * param while still satisfying the backend's per-profile contract.
 */
export function useActiveProfile() {
  const { token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const resolve = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await profilesApi.list(token)
      if (list && list.length > 0) {
        setProfile(list[0])
      } else {
        const created = await profilesApi.create(token, 'Mon Projet')
        setProfile(created)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) resolve()
  }, [token, resolve])

  return { profile, loading, error, refresh: resolve }
}
