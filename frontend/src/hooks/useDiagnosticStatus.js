import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { profilesApi } from '../api/profiles'

/**
 * Resolves the current user's diagnostic completion status from the active
 * project. Backend GET /profiles already returns a per-project `status`
 * ('pending' | 'diagnostic_complete' | 'scored'), so we derive everything
 * from it — no schema change required.
 *
 *   done   = diagnostic answers submitted (status !== 'pending')
 *   scored = MS2 scores computed (status === 'scored')
 */
export function useDiagnosticStatus() {
  const { token } = useAuth()
  const [state, setState] = useState({ loading: true, done: false, scored: false, profileId: null })

  useEffect(() => {
    let alive = true
    if (!token) {
      setState({ loading: false, done: false, scored: false, profileId: null })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    profilesApi.list(token)
      .then((list) => {
        if (!alive) return
        const p = list && list.length > 0 ? list[0] : null
        const status = p?.status
        setState({
          loading: false,
          done: status === 'diagnostic_complete' || status === 'scored',
          scored: status === 'scored',
          profileId: p?.id ?? null,
        })
      })
      .catch(() => {
        if (alive) setState({ loading: false, done: false, scored: false, profileId: null })
      })
    return () => { alive = false }
  }, [token])

  return state
}
