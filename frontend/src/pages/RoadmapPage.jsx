import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { roadmapApi } from '../api/roadmap'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import Spinner from '../components/Spinner'
import {
  ArrowLeft, ArrowRight, ExternalLink, Sparkles, Send,
  CheckCircle2, Clock, MapPin,
} from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const SECTION_COLORS = ['#3DA35D', '#3346AC', '#081F5C', '#7096D1', '#E07A1F']

// Best-effort pretty labels for the MS3 time_horizon values; unknown values
// fall back to the raw string (uppercased) so nothing is ever hidden.
const HORIZON_LABELS = {
  immediate: { fr: 'IMMÉDIAT', ar: 'فوري' },
  immédiat: { fr: 'IMMÉDIAT', ar: 'فوري' },
  short_term: { fr: 'COURT TERME', ar: 'قصير المدى' },
  'court terme': { fr: 'COURT TERME', ar: 'قصير المدى' },
  court_terme: { fr: 'COURT TERME', ar: 'قصير المدى' },
  medium_term: { fr: 'MOYEN TERME', ar: 'متوسط المدى' },
  'moyen terme': { fr: 'MOYEN TERME', ar: 'متوسط المدى' },
  moyen_terme: { fr: 'MOYEN TERME', ar: 'متوسط المدى' },
  long_term: { fr: 'LONG TERME', ar: 'طويل المدى' },
  'long terme': { fr: 'LONG TERME', ar: 'طويل المدى' },
  long_terme: { fr: 'LONG TERME', ar: 'طويل المدى' },
}

function horizonLabel(h, isAr) {
  if (!h) return isAr ? 'أخرى' : 'AUTRE'
  const key = String(h).toLowerCase()
  const found = HORIZON_LABELS[key]
  if (found) return isAr ? found.ar : found.fr
  return String(h).toUpperCase()
}

// Preserve first-seen order of horizons, grouping steps under each.
function groupByHorizon(steps) {
  const groups = []
  const index = {}
  for (const step of steps) {
    const h = step.time_horizon || 'autre'
    if (!(h in index)) {
      index[h] = groups.length
      groups.push({ horizon: h, steps: [] })
    }
    groups[index[h]].steps.push(step)
  }
  return groups
}

function StatusPill({ status, isAr }) {
  const done = status === 'done' || status === 'completed' || status === 'terminé'
  const color = done ? '#3DA35D' : '#E07A1F'
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ ...INTER, backgroundColor: `${color}1A`, color }}
    >
      {done ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {done ? (isAr ? 'منجز' : 'Terminé') : (isAr ? 'قيد الإنجاز' : 'À faire')}
    </span>
  )
}

function StepCard({ step, isAr }) {
  const resource = step.resources && step.resources.length > 0 ? step.resources[0] : null
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 16px rgba(51,70,172,0.07)', border: '1px solid rgba(112,150,209,0.1)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="font-bold text-base" style={{ ...SORA, color: '#081F5C' }}>
          {step.title}
        </h3>
        <StatusPill status={step.status} isAr={isAr} />
      </div>

      {step.explanation && (
        <p className="text-sm mb-3 leading-relaxed" style={{ ...INTER, color: '#7096D1' }}>
          {step.explanation}
        </p>
      )}

      {resource && (
        resource.link ? (
          <a
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors hover:brightness-95"
            style={{ ...INTER, backgroundColor: '#F0FBF4', color: '#3DA35D' }}
          >
            <ExternalLink size={12} />
            {resource.title || resource.source_id}
          </a>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ ...INTER, backgroundColor: '#F0FBF4', color: '#3DA35D' }}
          >
            {resource.title || resource.source_id}
          </span>
        )
      )}
    </div>
  )
}

// Stable per-session id (UUID required by the chat_sessions table).
function newSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function ChatSection({ profileId, isAr }) {
  const { token } = useAuth()
  const [sessionId] = useState(newSessionId)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await roadmapApi.chat(token, {
        sessionId,
        profileId,
        component: {
          title: isAr ? 'المسار الكامل' : 'Parcours complet',
          description: isAr ? 'مساعد عام لمسار رائد الأعمال' : "Assistant général du parcours de l'entrepreneur",
          step_id: null,
        },
        message: text,
      })
      const reply = res?.data?.reply || (isAr ? 'لا يوجد رد.' : 'Aucune réponse.')
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || (isAr ? 'تعذر إرسال الرسالة' : "Échec de l'envoi du message"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-14">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} color="#3DA35D" />
        <h2 className="font-bold text-lg" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? 'مساعد مسار' : 'Assistant Massar'}
        </h2>
      </div>

      <div
        className="rounded-2xl p-5 flex flex-col"
        style={{ backgroundColor: '#FAFBFF', border: '1px solid rgba(112,150,209,0.14)' }}
      >
        <div className="flex-1 space-y-4 mb-4 max-h-96 overflow-y-auto">
          {messages.length === 0 && !sending && (
            <p className="text-sm text-center py-6" style={{ ...INTER, color: '#7096D1' }}>
              {isAr
                ? 'اطرح سؤالا حول مسارك — على سبيل المثال: «كيف أبدأ مع BFPME؟»'
                : 'Posez une question sur votre parcours — ex. : « Comment démarrer avec la BFPME ? »'}
            </p>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="flex-shrink-0 mr-2 mt-1">
                  <Sparkles size={16} color="#3DA35D" />
                </div>
              )}
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  ...INTER,
                  maxWidth: '78%',
                  backgroundColor: m.role === 'user' ? '#3346AC' : '#FFFFFF',
                  color: m.role === 'user' ? '#FFFFFF' : '#081F5C',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(112,150,209,0.16)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.role === 'assistant' && (
                  <span className="block text-[11px] font-bold mb-0.5" style={{ color: '#3DA35D' }}>
                    {isAr ? 'مساعد مسار' : 'Assistant Massar'}
                  </span>
                )}
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start items-center gap-2">
              <Sparkles size={16} color="#3DA35D" />
              <div className="rounded-2xl px-4 py-2.5" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(112,150,209,0.16)' }}>
                <Spinner size="sm" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p className="text-xs mb-2 px-3 py-2 rounded-lg" style={{ ...INTER, color: '#c0392b', backgroundColor: '#FFF5F5' }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder={isAr ? 'اكتب رسالتك...' : 'Écrivez votre message...'}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              ...INTER,
              border: '1.5px solid rgba(112,150,209,0.25)',
              color: '#081F5C',
              backgroundColor: '#FFFFFF',
              textAlign: isAr ? 'right' : 'left',
            }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="flex items-center justify-center rounded-xl text-white disabled:opacity-50 transition-colors"
            style={{ ...INTER, backgroundColor: '#3346AC', width: 44, height: 44 }}
          >
            <Send size={18} style={isAr ? { transform: 'scaleX(-1)' } : {}} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RoadmapPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'
  const { token } = useAuth()
  const { profile, loading: profileLoading } = useActiveProfile()

  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const load = async (pid) => {
    setLoading(true)
    setError(null)
    try {
      const res = await roadmapApi.get(token, pid)
      setRoadmap(res?.data || null)
    } catch (err) {
      if (err.status === 404) {
        setRoadmap(null) // not generated yet — normal state
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) load(profile.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profile])

  const handleGenerate = async () => {
    if (!profile) return
    setError(null)
    setGenerating(true)
    try {
      await roadmapApi.generate(token, profile.id)
      await load(profile.id) // re-fetch normalized shape (status + KB links)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const groups = roadmap?.steps ? groupByHorizon(roadmap.steps) : []

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      <SiteHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-32 pb-20">
        {/* Back to dashboard */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors hover:underline"
          style={{ ...INTER, color: '#3346AC' }}
        >
          <ArrowLeft size={15} style={isAr ? { transform: 'scaleX(-1)' } : {}} />
          {isAr ? 'العودة إلى لوحة التحكم' : 'Retour au tableau de bord'}
        </Link>

        <h1 className="font-black text-3xl mb-3 text-center" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? (
            <>مسارك<span style={{ color: '#3DA35D' }}> الخاص</span></>
          ) : (
            <>Votre <span style={{ color: '#3DA35D' }}>Parcours</span></>
          )}
        </h1>

        {roadmap?.maturity_stage && (
          <div className="flex justify-center mb-10">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
              style={{ ...INTER, backgroundColor: '#EEF1FF', color: '#3346AC' }}
            >
              <MapPin size={14} />
              {isAr ? 'مرحلة النضج' : 'Stade de maturité'} : {roadmap.maturity_stage}
            </span>
          </div>
        )}

        {error && (
          <p className="mb-6 text-sm px-4 py-2.5 rounded-xl text-center" style={{ ...INTER, color: '#c0392b', backgroundColor: '#FFF5F5', border: '1px solid rgba(192,57,43,0.15)' }}>
            {error}
          </p>
        )}

        {(profileLoading || loading) ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : !roadmap ? (
          /* No roadmap yet — offer to generate */
          <div className="text-center py-16 rounded-2xl flex flex-col items-center gap-5" style={{ border: '2px dashed rgba(112,150,209,0.25)' }}>
            <p className="max-w-md" style={{ ...INTER, color: '#7096D1' }}>
              {isAr
                ? 'لم يتم إنشاء مسارك بعد. أنشئه انطلاقا من تشخيصك ومؤشراتك.'
                : "Votre parcours n'a pas encore été généré. Créez-le à partir de votre diagnostic et de vos scores."}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-white disabled:opacity-60 transition-colors text-sm"
              style={{ ...INTER, backgroundColor: '#3DA35D' }}
            >
              {generating && <Spinner size="sm" />}
              {generating
                ? (isAr ? 'جارٍ الإنشاء...' : 'Génération en cours...')
                : (isAr ? 'إنشاء مساري' : 'Générer mon parcours')}
              {!generating && <ArrowRight size={16} style={isAr ? { transform: 'scaleX(-1)' } : {}} />}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-10">
              {groups.map((group, gi) => {
                const color = SECTION_COLORS[gi % SECTION_COLORS.length]
                return (
                  <div key={group.horizon} style={{ borderInlineStart: `3px solid ${color}`, paddingInlineStart: '24px' }}>
                    <span
                      className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                      style={{ ...INTER, backgroundColor: `${color}1A`, color }}
                    >
                      {horizonLabel(group.horizon, isAr)}
                    </span>
                    <div className="space-y-4">
                      {group.steps.map((step, si) => (
                        <StepCard key={`${step.order ?? si}-${si}`} step={step} isAr={isAr} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {profile && <ChatSection profileId={profile.id} isAr={isAr} />}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
