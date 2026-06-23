import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { scoresApi } from '../api/scores'
import { roadmapApi } from '../api/roadmap'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import Spinner from '../components/Spinner'
import { ChevronDown, AlertTriangle, CheckCircle2, Download, Leaf, ArrowRight, ClipboardList } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const DIM_LABELS = {
  market: { fr: 'Score Marché', ar: 'مؤشر السوق' },
  commercial: { fr: 'Score Commercial', ar: 'مؤشر العرض التجاري' },
  innovation: { fr: 'Score Innovation', ar: 'مؤشر الابتكار' },
  scalability: { fr: 'Score Scalabilité', ar: 'مؤشر قابلية التوسع' },
}

const SUB_LABELS = {
  taille_marche: { fr: 'Taille du marché', ar: 'حجم السوق' },
  validation_client: { fr: 'Validation client', ar: 'تثبيت العملاء' },
  modele_revenus: { fr: 'Modèle de revenus', ar: 'نموذج الإيرادات' },
  proposition_valeur: { fr: 'Proposition de valeur', ar: 'عرض القيمة' },
  maturite_produit: { fr: 'Maturité produit', ar: 'نضج المنتج' },
  strategie_pricing: { fr: 'Stratégie de pricing', ar: 'استراتيجية التسعير' },
  alignement_besoin: { fr: 'Alignement besoin', ar: 'التطابق مع الحاجة' },
  nouveaute_locale: { fr: 'Nouveauté locale', ar: 'الحداثة المحلية' },
  intensite_technologique: { fr: 'Intensité technologique', ar: 'كثافة التكنولوجيا' },
  barriere_entree: { fr: "Barrière à l'entrée", ar: 'حاجز الدخول' },
  replicabilite: { fr: 'Réplicabilité', ar: 'إمكانية التكرار' },
  dependance_manuelle: { fr: 'Dépendance manuelle', ar: 'الاعتماد اليدوي' },
  potentiel_geographique: { fr: 'Potentiel géographique', ar: 'الإمكانات الجغرافية' },
}

const PILLAR_LABELS = {
  climat_air: { fr: 'Climat / Air', ar: 'المناخ / الهواء' },
  eau: { fr: 'Eau', ar: 'المياه' },
  sols_biodiversite: { fr: 'Sols / Biodiversité', ar: 'التربة / التنوع البيولوجي' },
  ressources_dechets: { fr: 'Ressources / Déchets', ar: 'الموارد / النفايات' },
}

const UNDP_COLOR = (raw) => {
  if (raw <= 7) return '#3DA35D'
  if (raw <= 11) return '#D4A017'
  if (raw <= 15) return '#E07A1F'
  if (raw <= 18) return '#C0392B'
  return '#7B1B1B'
}

const ANOMALY_MESSAGES = {
  market_no_validation: {
    fr: 'Marché ciblé large mais aucune validation client (entretiens ou clients payants).',
    ar: 'سوق مستهدف كبير دون أي تثبيت من العملاء (لقاءات أو عملاء فعليون).',
  },
  scalability_manual_conflict: {
    fr: 'Scalabilité automatisée revendiquée alors que la dépendance humaine reste élevée.',
    ar: 'قابلية توسع آلية مزعومة بينما الاعتماد على التدخل البشري يبقى مرتفعا.',
  },
  product_built_unvalidated: {
    fr: 'Produit fini construit sans jamais avoir validé son adéquation avec un besoin réel.',
    ar: 'منتج جاهز تم بناؤه دون التحقق من تطابقه مع حاجة حقيقية.',
  },
  revenue_no_clients: {
    fr: 'Modèle de revenus documenté mais aucun client payant.',
    ar: 'نموذج إيرادات موثق دون أي عميل يدفع فعليا.',
  },
  green_fundraising_risk: {
    fr: 'Impact environnemental élevé combiné à une levée de fonds active.',
    ar: 'أثر بيئي مرتفع مرتبط بعملية جمع تمويل نشطة.',
  },
}

// Demo fallback — the "overconfident founder" profile, used whenever the
// backend isn't reachable so the page still demos meaningfully.
const MOCK_SCORES = {
  scores: {
    market: {
      composite: 42.0,
      sub_scores: {
        taille_marche: { value: 90, weight: 0.3 },
        validation_client: { value: 0, weight: 0.4 },
        modele_revenus: { value: 50, weight: 0.3 },
      },
    },
    commercial: {
      composite: 82.0,
      sub_scores: {
        proposition_valeur: { value: 90, weight: 0.3 },
        maturite_produit: { value: 100, weight: 0.25 },
        strategie_pricing: { value: 100, weight: 0.25 },
        alignement_besoin: { value: 25, weight: 0.2 },
      },
    },
    innovation: {
      composite: 100.0,
      sub_scores: {
        nouveaute_locale: { value: 100, weight: 0.35 },
        intensite_technologique: { value: 100, weight: 0.3 },
        barriere_entree: { value: 100, weight: 0.35 },
      },
    },
    scalability: {
      composite: 73.0,
      sub_scores: {
        replicabilite: { value: 100, weight: 0.35 },
        dependance_manuelle: { value: 10, weight: 0.3 },
        potentiel_geographique: { value: 100, weight: 0.35 },
      },
    },
    green: {
      composite: 50.0,
      undp_raw_total: 12,
      undp_classification: 'Impact modéré',
      pillars: {
        climat_air: { score: 3 },
        eau: { score: 3 },
        sols_biodiversite: { score: 3 },
        ressources_dechets: { score: 3 },
      },
    },
  },
  anomaly_flags: [
    { code: 'market_no_validation', severity: 'high' },
    { code: 'scalability_manual_conflict', severity: 'medium' },
    { code: 'product_built_unvalidated', severity: 'medium' },
  ],
  justifications: {
    market: {
      fr: "Le marché ciblé est large, mais l'absence totale d'entretiens clients et de clients payants laisse ce score fragile.",
      ar: 'السوق المستهدف كبير، لكن غياب لقاءات العملاء والعملاء الفعليين كليا يجعل هذا المؤشر هشا.',
    },
    commercial: {
      fr: "Produit annoncé comme fini avec une stratégie de pricing définie, mais l'adéquation au besoin réel n'a jamais été validée.",
      ar: 'منتج معلن أنه جاهز مع استراتيجية تسعير محددة، لكن التطابق مع الحاجة الحقيقية لم يثبت أبدا.',
    },
  },
}

function barColor(v) {
  if (v === null || v === undefined) return '#cbd5e1'
  if (v >= 70) return '#3DA35D'
  if (v >= 50) return '#3346AC'
  return '#E07A1F'
}

// Real MS2 justifications may be a plain string (LLM text) or a { fr, ar } object.
function justText(just, isAr) {
  if (!just) return null
  if (typeof just === 'string') return just
  return isAr ? (just.ar || just.fr) : (just.fr || just.ar)
}

function DimensionCard({ dim, data, justification, isAr }) {
  const [open, setOpen] = useState(false)
  if (!data) return null
  const composite = data.composite
  const just = justText(justification, isAr)

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(112,150,209,0.12)', boxShadow: '0 2px 20px rgba(51,70,172,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-base" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? DIM_LABELS[dim].ar : DIM_LABELS[dim].fr}
        </h3>
        <div className="text-right">
          <span className="font-bold text-2xl" style={{ ...SORA, color: barColor(composite) }}>
            {composite?.toFixed(1) ?? '—'}
          </span>
          <span className="text-sm ml-1" style={{ ...INTER, color: '#7096D1' }}>/100</span>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(112,150,209,0.15)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, composite ?? 0)}%`, backgroundColor: barColor(composite) }} />
      </div>

      {data.sub_scores && Object.keys(data.sub_scores).length > 0 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold self-start"
          style={{ ...INTER, color: '#3346AC' }}
        >
          {isAr ? 'تفاصيل المؤشرات الفرعية' : 'Détails des sous-critères'}
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      )}

      {open && data.sub_scores && (
        <div className="space-y-3 pt-1" style={{ borderTop: '1px solid rgba(112,150,209,0.1)' }}>
          {Object.entries(data.sub_scores).map(([key, sub]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1" style={{ ...INTER, color: '#7096D1' }}>
                <span>{SUB_LABELS[key] ? (isAr ? SUB_LABELS[key].ar : SUB_LABELS[key].fr) : key}</span>
                <span style={{ color: '#081F5C', fontWeight: 600 }}>
                  {Number(sub.value).toFixed(1)} <span style={{ color: '#7096D1', fontWeight: 400 }}>({Math.round(sub.weight * 100)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(112,150,209,0.12)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, sub.value)}%`, backgroundColor: barColor(sub.value) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {just && (
        <p className="text-xs leading-relaxed pt-2" style={{ ...INTER, color: '#7096D1', borderTop: '1px solid rgba(112,150,209,0.1)' }}>
          {just}
        </p>
      )}
    </div>
  )
}

function GreenScoreCard({ data, isAr }) {
  if (!data) return null
  const color = UNDP_COLOR(data.undp_raw_total)
  return (
    <div
      className="md:col-span-2 rounded-2xl p-7 flex flex-col gap-5"
      style={{ backgroundColor: '#F0FBF4', border: `1.5px solid ${color}33`, boxShadow: '0 4px 28px rgba(61,163,93,0.1)' }}
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Leaf size={20} color="#3DA35D" />
          <h3 className="font-bold text-lg" style={{ ...SORA, color: '#081F5C' }}>
            {isAr ? 'مؤشر الأثر البيئي' : 'Score Vert (UNDP)'}
          </h3>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ ...INTER, backgroundColor: color, color: '#fff' }}
        >
          {data.undp_classification}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-bold text-3xl" style={{ ...SORA, color }}>{data.composite?.toFixed(1)}</span>
        <span style={{ ...INTER, color: '#7096D1' }}>/100</span>
        <span className="text-xs ml-3" style={{ ...INTER, color: '#7096D1' }}>
          {isAr ? 'إجمالي PNUD' : 'Total UNDP'}: {Number(data.undp_raw_total).toFixed(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(data.pillars || {}).map(([key, pillar]) => (
          <div key={key} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(61,163,93,0.18)' }}>
            <p className="text-xs mb-1.5" style={{ ...INTER, color: '#7096D1' }}>
              {PILLAR_LABELS[key] ? (isAr ? PILLAR_LABELS[key].ar : PILLAR_LABELS[key].fr) : key}
            </p>
            <div className="flex justify-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: n <= Math.round(pillar.score) ? color : 'rgba(112,150,209,0.15)' }} />
              ))}
            </div>
            <p className="text-sm font-bold" style={{ ...SORA, color: '#081F5C' }}>{Number(pillar.score).toFixed(1)}/5</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'
  const { token } = useAuth()
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useActiveProfile()

  const [data, setData] = useState(null)
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    scoresApi.get(token, profile.id)
      .then((res) => { setData(res); setUsingMock(false) })
      .catch((err) => {
        if (err.status === 404) {
          // not yet scored — normal state, show compute button
          setData(null)
        } else {
          // backend unreachable or other failure — fall back to mock demo data
          setData(MOCK_SCORES)
          setUsingMock(true)
        }
      })
      .finally(() => setLoading(false))
  }, [token, profile])

  const handleCompute = async () => {
    if (!profile) return
    setError(null)
    setComputing(true)
    try {
      const result = await scoresApi.compute(token, profile.id)
      setData(result)
      setUsingMock(false)
    } catch (err) {
      setData(MOCK_SCORES)
      setUsingMock(true)
      setError(err.message)
    } finally {
      setComputing(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    if (!profile) return
    setError(null)
    setGenerating(true)
    try {
      await roadmapApi.generate(token, profile.id)
      navigate('/roadmap')
    } catch (err) {
      setError(err.message)
      setGenerating(false)
    }
  }

  const anomalies = data?.anomaly_flags || []

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-32 pb-20">
        {/* Header card */}
        <div
          className="rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(112,150,209,0.12)', boxShadow: '0 2px 20px rgba(51,70,172,0.06)' }}
        >
          <div>
            <h1 className="font-bold text-xl" style={{ ...SORA, color: '#081F5C' }}>
              {profile?.name || (isAr ? 'مشروعي' : 'Mon Projet')}
            </h1>
            {data && (
              <p className="text-sm mt-1" style={{ ...INTER, color: '#7096D1' }}>
                {usingMock
                  ? (isAr ? 'بيانات تجريبية (الخادم غير متاح)' : 'Données de démonstration (backend indisponible)')
                  : anomalies.length > 0
                    ? (isAr ? `${anomalies.length} إشارة تنبيه مكتشفة` : `${anomalies.length} signal d'alerte détecté${anomalies.length > 1 ? 's' : ''}`)
                    : (isAr ? 'لم يتم رصد أي خلل' : 'Aucune anomalie détectée')}
              </p>
            )}
          </div>
          <button
            onClick={handleCompute}
            disabled={computing}
            className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-white disabled:opacity-60 transition-colors text-sm"
            style={{ ...INTER, backgroundColor: '#3346AC' }}
          >
            {computing && <Spinner size="sm" />}
            {computing
              ? (isAr ? 'جارٍ الحساب...' : 'Calcul en cours...')
              : (isAr ? 'حساب المؤشرات' : 'Calculer les scores')}
          </button>
        </div>

        {error && (
          <p className="mb-6 text-sm px-4 py-2.5 rounded-xl" style={{ ...INTER, color: '#c0392b', backgroundColor: '#FFF5F5', border: '1px solid rgba(192,57,43,0.15)' }}>
            {error}
          </p>
        )}

        {!data ? (
          <div className="text-center py-16 rounded-2xl flex flex-col items-center gap-5" style={{ border: '2px dashed rgba(112,150,209,0.25)' }}>
            <p className="max-w-md" style={{ ...INTER, color: '#7096D1' }}>
              {isAr
                ? 'لم يتم حساب المؤشرات بعد. أكمل التشخيص أولا ثم اضغط على "حساب المؤشرات".'
                : 'Les scores ne sont pas encore calculés. Complétez d\'abord le diagnostic, puis cliquez sur « Calculer les scores ».'}
            </p>
            <Link
              to="/diagnostic"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-white transition-colors text-sm"
              style={{ ...INTER, backgroundColor: '#3DA35D' }}
            >
              <ClipboardList size={16} />
              {isAr ? 'إكمال التشخيص' : 'Compléter le diagnostic'}
              <ArrowRight size={15} style={isAr ? { transform: 'scaleX(-1)' } : {}} />
            </Link>
          </div>
        ) : (
          <>
            {/* Score cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <DimensionCard dim="market" data={data.scores?.market} justification={data.justifications?.market ?? MOCK_SCORES.justifications.market} isAr={isAr} />
              <DimensionCard dim="commercial" data={data.scores?.commercial} justification={data.justifications?.commercial ?? MOCK_SCORES.justifications.commercial} isAr={isAr} />
              <DimensionCard dim="innovation" data={data.scores?.innovation} justification={data.justifications?.innovation} isAr={isAr} />
              <DimensionCard dim="scalability" data={data.scores?.scalability} justification={data.justifications?.scalability} isAr={isAr} />
              <GreenScoreCard data={data.scores?.green} isAr={isAr} />
            </div>

            {/* Anomalies */}
            <div className="mb-8">
              <h2 className="font-bold text-lg mb-4" style={{ ...SORA, color: '#081F5C' }}>
                {isAr ? 'كشف الخلل' : 'Détection des anomalies'}
              </h2>
              {anomalies.length === 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ backgroundColor: '#F0FBF4', border: '1px solid rgba(61,163,93,0.2)' }}>
                  <CheckCircle2 size={16} color="#3DA35D" />
                  <span className="text-sm font-medium" style={{ ...INTER, color: '#3DA35D' }}>
                    {isAr ? 'لم يتم رصد أي خلل' : 'Aucune anomalie détectée'}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.map((flag, i) => {
                    const high = flag.severity === 'high'
                    const msg = ANOMALY_MESSAGES[flag.code]
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-xl"
                        style={{
                          backgroundColor: high ? '#FFF5F5' : '#FFF9EE',
                          borderInlineStart: `4px solid ${high ? '#C0392B' : '#E07A1F'}`,
                          border: `1px solid ${high ? 'rgba(192,57,43,0.15)' : 'rgba(224,122,31,0.18)'}`,
                        }}
                      >
                        <AlertTriangle size={16} color={high ? '#C0392B' : '#E07A1F'} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{ ...INTER, backgroundColor: high ? '#C0392B' : '#E07A1F', color: '#fff' }}
                          >
                            {high ? (isAr ? 'حرجة' : 'Haute') : (isAr ? 'متوسطة' : 'Moyenne')}
                          </span>
                          <p className="text-sm" style={{ ...INTER, color: '#081F5C' }}>
                            {msg ? (isAr ? msg.ar : msg.fr) : flag.message || flag.code}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions: generate roadmap (MS3) + PDF export */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerateRoadmap}
                disabled={generating}
                className="flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-white disabled:opacity-60 transition-colors text-sm"
                style={{ ...INTER, backgroundColor: '#3DA35D' }}
              >
                {generating && <Spinner size="sm" />}
                {generating
                  ? (isAr ? 'جارٍ إنشاء المسار...' : 'Génération du parcours...')
                  : (isAr ? 'إنشاء مساري' : 'Générer mon parcours')}
                {!generating && <ArrowRight size={16} style={isAr ? { transform: 'scaleX(-1)' } : {}} />}
              </button>

              <button
                onClick={() => console.log('Téléchargement du rapport PDF — fonctionnalité à venir')}
                className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                style={{ ...INTER, border: '1.5px solid #7096D1', color: '#7096D1' }}
              >
                <Download size={16} />
                {isAr ? 'تحميل التقرير PDF' : 'Télécharger le rapport PDF'}
              </button>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
