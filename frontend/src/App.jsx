import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RequireDiagnostic from './components/RequireDiagnostic'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DiagnosticPage from './pages/DiagnosticPage'
import RoadmapPage from './pages/RoadmapPage'
import AssistantPage from './pages/AssistantPage'
import InvestorLoginPage from './pages/InvestorLoginPage'
import InvestorDashboardPage from './pages/InvestorDashboardPage'
import CollaboratorLoginPage from './pages/CollaboratorLoginPage'
import CollaboratorDashboardPage from './pages/CollaboratorDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Investor / Collaborator — own hardcoded auth, independent of AuthProvider */}
      <Route path="/investor/login" element={<InvestorLoginPage />} />
      <Route path="/investor/dashboard" element={<InvestorDashboardPage />} />
      <Route path="/collaborator/login" element={<CollaboratorLoginPage />} />
      <Route path="/collaborator/dashboard" element={<CollaboratorDashboardPage />} />

      {/* Main entrepreneur flow — self-contained pages (own header/footer) */}
      <Route element={<ProtectedRoute />}>
        {/* Diagnostic is always reachable once authenticated */}
        <Route path="/diagnostic" element={<DiagnosticPage />} />

        {/* Everything past the diagnostic is gated until it's completed */}
        <Route element={<RequireDiagnostic />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route element={<Layout />}>
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
