import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { Lock, TrendingUp, LogOut } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const STARTUPS = [
  { hash: 'Startup #7A3F', sector: { fr: 'Agroalimentaire', ar: 'الصناعات الغذائية' }, scores: { market: 78, commercial: 65, innovation: 54, scalability: 70, green: 82 } },
  { hash: 'Startup #B2E1', sector: { fr: 'Tech', ar: 'التكنولوجيا' }, scores: { market: 60, commercial: 88, innovation: 91, scalability: 75, green: 40 } },
  { hash: 'Startup #4D9C', sector: { fr: 'Artisanat', ar: 'الصناعات التقليدية' }, scores: { market: 45, commercial: 72, innovation: 38, scalability: 30, green: 90 } },
  { hash: 'Startup #E61A', sector: { fr: 'Santé', ar: 'الصحة' }, scores: { market: 82, commercial: 70, innovation: 85, scalability: 60, green: 55 } },
  { hash: 'Startup #C038', sector: { fr: 'Énergie', ar: 'الطاقة' }, scores: { market: 55, commercial: 48, innovation: 73, scalability: 65, green: 95 } },
  { hash: 'Startup #9F2D', sector: { fr: 'Fintech', ar: 'التكنولوجيا المالية' }, scores: { market: 71, commercial: 80, innovation: 68, scalability: 84, green: 50 } },
  { hash: 'Startup #1C77', sector: { fr: 'Éducation', ar: 'التعليم' }, scores: { market: 64, commercial: 58, innovation: 77, scalability: 72, green: 66 } },
  { hash: 'Startup #5B90', sector: { fr: 'Agritech', ar: 'تكنولوجيا الفلاحة' }, scores: { market: 69, commercial: 61, innovation: 59, scalability: 55, green: 88 } },
  { hash: 'Startup #A4E2', sector: { fr: 'Logistique', ar: 'اللوجستيك' }, scores: { market: 76, commercial: 66, innovation: 49, scalability: 80, green: 44 } },
  { hash: 'Startup #D813', sector: { fr: 'Tourisme', ar: 'السياحة' }, scores: { market: 58, commercial: 74, innovation: 52, scalability: 47, green: 72 } },
]

const SCORE_LABELS = {
  market: { fr: 'Marché', ar: 'السوق' },
  commercial: { fr: 'Commercial', ar: 'تجاري' },
  innovation: { fr: 'Innovation', ar: 'ابتكار' },
  scalability: { fr: 'Scalabilité', ar: 'توسع' },
  green: { fr: 'Vert', ar: 'بيئي' },
}

function barColor(v) {
  if (v >= 70) return '#3DA35D'
  if (v >= 50) return '#3346AC'
  return '#E07A1F'
}

export default function InvestorDashboardPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionStorage.getItem('investor_authed') !== '1') {
      navigate('/investor/login', { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    sessionStorage.removeItem('investor_authed')
    navigate('/')
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="flex items-center justify-between px-6 sm:px-12 py-5" style={{ borderBottom: '1px solid rgba(112,150,209,0.1)' }}>
        <Link to="/" className="text-xl font-black tracking-tight" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? 'مسار' : 'Massar'}
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-blue-700"
          style={{ ...INTER, color: '#7096D1' }}
        >
          <LogOut size={16} style={isAr ? { transform: 'scaleX(-1)' } : {}} />
          {isAr ? 'تسجيل الخروج' : 'Déconnexion'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <h1 className="font-black text-2xl" style={{ ...SORA, color: '#081F5C' }}>
            {isAr ? 'مرحبا، مستثمر' : 'Bienvenue, Investisseur'}
          </h1>
          <span className="text-xs font-bold px-4 py-2 rounded-full" style={{ ...INTER, backgroundColor: '#EEF1FF', color: '#3346AC' }}>
            {isAr ? 'باقة فضية — 10 ملفات/شهر' : 'Pack Silver — 10 profils/mois'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {STARTUPS.map((s, i) => (
            <div key={i} className="relative rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(112,150,209,0.12)', boxShadow: '0 2px 20px rgba(51,70,172,0.06)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm" style={{ ...SORA, color: '#081F5C' }}>{s.hash}</h3>
                  <span className="text-xs" style={{ ...INTER, color: '#7096D1' }}>{isAr ? s.sector.ar : s.sector.fr}</span>
                </div>
                <Lock size={16} color="#7096D1" />
              </div>

              <div className="space-y-2 mb-4">
                {Object.entries(s.scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] mb-0.5" style={{ ...INTER, color: '#7096D1' }}>
                      <span>{isAr ? SCORE_LABELS[key].ar : SCORE_LABELS[key].fr}</span>
                      <span style={{ color: '#081F5C', fontWeight: 600 }}>{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(112,150,209,0.12)' }}>
                      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: barColor(value) }} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg" style={{ ...INTER, border: '1.5px solid #3346AC', color: '#3346AC' }}>
                <Lock size={12} />
                {isAr ? 'فتح هذا الملف' : 'Débloquer ce profil'}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ backgroundColor: '#081F5C' }}>
          <div className="flex items-center gap-3">
            <TrendingUp size={20} color="#3DA35D" />
            <p className="text-sm font-medium text-white">
              {isAr ? 'افتح وصولا غير محدود مع باقة الذهب' : 'Débloquez un accès illimité avec le Pack Gold'}
            </p>
          </div>
          <button className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ ...INTER, backgroundColor: '#3DA35D', color: '#fff' }}>
            {isAr ? 'الترقية إلى الذهب' : 'Passer au Pack Gold'}
          </button>
        </div>
      </main>
    </div>
  )
}
