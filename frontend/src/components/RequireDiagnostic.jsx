import { Navigate, Outlet } from 'react-router-dom'
import { useDiagnosticStatus } from '../hooks/useDiagnosticStatus'
import Spinner from './Spinner'

/**
 * Route guard: blocks /dashboard, /roadmap, /assistant until the active
 * project's diagnostic is complete. Sits inside <ProtectedRoute> (which
 * already enforces auth), so here we only gate on diagnostic completion —
 * an unfinished user is forced back to /diagnostic, even via a direct URL.
 */
export default function RequireDiagnostic() {
  const { loading, done } = useDiagnosticStatus()
  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Spinner /></div>
  }
  return done ? <Outlet /> : <Navigate to="/diagnostic" replace />
}
