import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { Shield } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const VALID_EMAIL = 'collab@massar.tn'
const VALID_PASSWORD = 'demo2026'

export default function CollaboratorLoginPage() {
  const { lang, toggleLang } = useLang()
  const isAr = lang === 'ar'
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [emailFocus, setEmailFocus] = useState(false)
  const [passFocus, setPassFocus] = useState(false)

  const inputStyle = (focused) => ({
    ...INTER,
    width: '100%',
    border: 'none',
    outline: 'none',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '0.9rem',
    color: '#081F5C',
    backgroundColor: '#FAFBFF',
    boxShadow: focused ? '0 0 0 2px #3346AC, 0 0 16px rgba(61,163,93,0.12)' : '0 0 0 1.5px rgba(112,150,209,0.25)',
    transition: 'box-shadow 0.2s ease',
  })

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    if (email.trim() === VALID_EMAIL && password === VALID_PASSWORD) {
      sessionStorage.setItem('collaborator_authed', '1')
      navigate('/collaborator/dashboard')
    } else {
      setError(isAr ? 'بيانات الدخول غير صحيحة' : 'Identifiants incorrects')
    }
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="flex items-center justify-between px-6 sm:px-12 py-5" style={{ borderBottom: '1px solid rgba(112,150,209,0.1)' }}>
        <Link to="/" className="text-xl font-black tracking-tight" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? 'مسار' : 'Massar'}
        </Link>
        <div className="flex items-center p-1 rounded-full" style={{ backgroundColor: '#F5F7FF', border: '1px solid rgba(112,150,209,0.18)' }}>
          <button onClick={() => isAr && toggleLang()} className="w-11 py-1 rounded-full text-xs font-semibold text-center" style={!isAr ? { backgroundColor: '#3346AC', color: '#fff' } : { color: '#7096D1' }}>FR</button>
          <button onClick={() => !isAr && toggleLang()} className="w-11 py-1 rounded-full text-xs font-semibold text-center" style={isAr ? { backgroundColor: '#3346AC', color: '#fff' } : { color: '#7096D1' }}>AR</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#F0FBF4' }}>
              <Shield size={22} color="#3DA35D" />
            </div>
            <h1 className="font-black text-2xl" style={{ ...SORA, color: '#081F5C' }}>
              {isAr ? 'فضاء المتعاون' : 'Espace Collaborateur'}
            </h1>
          </div>

          <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 8px 40px rgba(51,70,172,0.08), 0 1px 4px rgba(51,70,172,0.05)', border: '1px solid rgba(112,150,209,0.12)', borderTop: '3px solid #3DA35D' }}>
            <form onSubmit={submit} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ ...INTER, color: '#7096D1' }}>{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)} required placeholder="collab@massar.tn" style={inputStyle(emailFocus)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ ...INTER, color: '#7096D1' }}>{isAr ? 'كلمة المرور' : 'Mot de passe'}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)} required placeholder="••••••••" style={inputStyle(passFocus)} />
              </div>
              {error && (
                <div className="text-sm px-4 py-2.5 rounded-xl" style={{ ...INTER, color: '#c0392b', backgroundColor: '#FFF5F5', border: '1px solid rgba(192,57,43,0.15)' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={{ ...INTER, backgroundColor: '#3DA35D' }}>
                {isAr ? 'دخول' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
