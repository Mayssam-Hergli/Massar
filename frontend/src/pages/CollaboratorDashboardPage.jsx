import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { Users, BarChart3, LogOut, HandHeart, Download } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const STARTUPS = [
  { hash: 'Startup #7A3F', sector: { fr: 'Agroalimentaire', ar: 'الصناعات الغذائية' }, status: { fr: 'Scores calculés', ar: 'تم حساب المؤشرات' }, scores: { market: 78, commercial: 65, innovation: 54, scalability: 70, green: 82 } },
  { hash: 'Startup #B2E1', sector: { fr: 'Tech', ar: 'التكنولوجيا' }, status: { fr: 'Parcours en cours', ar: 'المسار قيد التنفيذ' }, scores: { market: 60, commercial: 88, innovation: 91, scalability: 75, green: 40 } },
  { hash: 'Startup #4D9C', sector: { fr: 'Artisanat', ar: 'الصناعات التقليدية' }, status: { fr: 'En diagnostic', ar: 'قيد التشخيص' }, scores: { market: 45, commercial: 72, innovation: 38, scalability: 30, green: 90 } },
  { hash: 'Startup #E61A', sector: { fr: 'Santé', ar: 'الصحة' }, status: { fr: 'Scores calculés', ar: 'تم حساب المؤشرات' }, scores: { market: 82, commercial: 70, innovation: 85, scalability: 60, green: 55 } },
  { hash: 'Startup #C038', sector: { fr: 'Énergie', ar: 'الطاقة' }, status: { fr: 'Parcours en cours', ar: 'المسار قيد التنفيذ' }, scores: { market: 55, commercial: 48, innovation: 73, scalability: 65, green: 95 } },
]

const SCORE_LABELS = {
  market: { fr: 'Marché', ar: 'السوق' },
  commercial: { fr: 'Commercial', ar: 'تجاري' },
  innovation: { fr: 'Innovation', ar: 'ابتكار' },
  scalability: { fr: 'Scalabilité', ar: 'توسع' },
  green: { fr: 'Vert', ar: 'بيئي' },
}

const STATUS_COLOR = {
  'En diagnostic': '#7096D1',
  'Scores calculés': '#3346AC',
  'Parcours en cours': '#3DA35D',
}

function barColor(v) {
  if (v >= 70) return '#3DA35D'
  if (v >= 50) return '#3346AC'
  return '#E07A1F'
}

export default function CollaboratorDashboardPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionStorage.getItem('collaborator_authed') !== '1') {
      navigate('/collaborator/login', { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    sessionStorage.removeItem('collaborator_authed')
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
        <div className="mb-8">
          <h1 className="font-black text-2xl" style={{ ...SORA, color: '#081F5C' }}>
            {isAr ? 'لوحة تحكم المتعاون' : 'Tableau de Bord Collaborateur'}
          </h1>
          <p className="text-sm mt-1" style={{ ...INTER, color: '#7096D1' }}>
            {isAr ? "هيكل دعم — الوكالة التونسية للنهوض بالصناعة" : "Structure d'Appui — APII"}
          </p>
        </div>

        <div className="rounded-2xl p-6 mb-10 flex items-center gap-4 w-fit" style={{ backgroundColor: '#EEF1FF', border: '1px solid rgba(51,70,172,0.15)' }}>
          <Users size={24} color="#3346AC" />
          <div>
            <p className="font-bold text-2xl" style={{ ...SORA, color: '#081F5C' }}>12</p>
            <p className="text-sm" style={{ ...INTER, color: '#7096D1' }}>
              {isAr ? 'رواد أعمال متابعون' : 'entrepreneurs suivis'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {STARTUPS.map((s, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(112,150,209,0.12)', boxShadow: '0 2px 20px rgba(51,70,172,0.06)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm" style={{ ...SORA, color: '#081F5C' }}>{s.hash}</h3>
                  <span className="text-xs" style={{ ...INTER, color: '#7096D1' }}>{isAr ? s.sector.ar : s.sector.fr}</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ ...INTER, backgroundColor: `${STATUS_COLOR[s.status.fr]}1A`, color: STATUS_COLOR[s.status.fr] }}
                >
                  {isAr ? s.status.ar : s.status.fr}
                </span>
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

              <button
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors hover:brightness-95"
                style={{ ...INTER, backgroundColor: '#F0FBF4', color: '#3DA35D' }}
              >
                <HandHeart size={13} />
                {isAr ? 'اقتراح مرافقة' : 'Proposer un accompagnement'}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ backgroundColor: '#FFF9F0', border: '1px solid rgba(112,150,209,0.12)' }}>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} color="#7096D1" />
            <div>
              <h3 className="font-bold text-sm mb-0.5" style={{ ...SORA, color: '#081F5C' }}>
                {isAr ? 'تقارير تحليلية' : 'Rapports analytiques'}
              </h3>
              <p className="text-sm" style={{ ...INTER, color: '#7096D1' }}>
                {isAr ? 'صدّر مؤشرات المحفظة المجمّعة لرواد الأعمال المتابعين.' : 'Exportez les analytiques agrégées du portefeuille suivi.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => console.log('Téléchargement des analytiques — fonctionnalité à venir')}
            className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-white transition-colors text-sm"
            style={{ ...INTER, backgroundColor: '#3346AC' }}
          >
            <Download size={16} />
            {isAr ? 'تحميل التحليلات' : 'Télécharger les analytiques'}
          </button>
        </div>
      </main>
    </div>
  )
}
