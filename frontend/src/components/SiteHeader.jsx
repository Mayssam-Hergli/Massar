import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { ArrowRight } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

export default function SiteHeader() {
  const { user, logout } = useAuth()
  const { lang, toggleLang } = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const isAr = lang === 'ar'

  const NAV = user
    ? [
        { to: '/dashboard', label: isAr ? 'لوحة التحكم' : 'Tableau de bord' },
        { to: '/diagnostic', label: isAr ? 'التشخيص' : 'Diagnostic' },
        { to: '/roadmap', label: isAr ? 'المسار' : 'Roadmap' },
      ]
    : []

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(112,150,209,0.1)',
      }}
    >
      <div className="max-w-container mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <Link
          to={user ? '/dashboard' : '/'}
          className="text-2xl font-black tracking-tight"
          style={{ ...SORA, color: '#081F5C' }}
        >
          {isAr ? 'مسار' : 'Massar'}
        </Link>

        <div className="flex items-center gap-3">
          {NAV.length > 0 && (
            <nav className="hidden md:flex items-center gap-5 mr-2">
              {NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm font-medium transition-colors"
                  style={{
                    ...INTER,
                    color: location.pathname === to ? '#3346AC' : '#7096D1',
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* FR / AR toggle */}
          <div
            className="flex items-center p-1 rounded-full"
            style={{ backgroundColor: '#F5F7FF', border: '1px solid rgba(112,150,209,0.18)' }}
          >
            <button
              onClick={() => isAr && toggleLang()}
              className="w-11 py-1 rounded-full text-xs font-semibold transition-all duration-200 text-center"
              style={!isAr ? { backgroundColor: '#3346AC', color: '#fff' } : { color: '#7096D1' }}
            >
              FR
            </button>
            <button
              onClick={() => !isAr && toggleLang()}
              className="w-11 py-1 rounded-full text-xs font-semibold transition-all duration-200 text-center"
              style={isAr ? { backgroundColor: '#3346AC', color: '#fff' } : { color: '#7096D1' }}
            >
              AR
            </button>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50 active:scale-95"
              style={{ ...INTER, border: '1.5px solid #3346AC', color: '#3346AC' }}
            >
              {isAr ? 'تسجيل الخروج' : 'Déconnexion'}
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50 active:scale-95"
                style={{ ...INTER, border: '1.5px solid #3346AC', color: '#3346AC' }}
              >
                {isAr ? 'تسجيل الدخول' : 'Se connecter'}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{ ...INTER, backgroundColor: '#3346AC' }}
              >
                {isAr ? 'ابدأ' : 'Commencer'}
                <ArrowRight size={14} style={isAr ? { transform: 'scaleX(-1)' } : {}} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
