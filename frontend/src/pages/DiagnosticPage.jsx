import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { profilesApi } from '../api/profiles'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useAuth } from '../context/AuthContext'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import Spinner from '../components/Spinner'
import { UploadCloud, ChevronRight, ChevronLeft, FileCheck2 } from 'lucide-react'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

// ─── Field definitions (31 fields across 5 steps) ──────────────────────────

const STEPS = [
  {
    title: { fr: 'Marché', ar: 'السوق' },
    fields: [
      {
        key: 'market_size',
        label: { fr: 'Taille de votre marché cible', ar: 'حجم السوق المستهدف' },
        options: [
          { value: 'small', fr: 'Petit (< 1M TND)', ar: 'صغير (< 1 مليون دينار)' },
          { value: 'medium', fr: 'Moyen (1–10M TND)', ar: 'متوسط (1-10 مليون دينار)' },
          { value: 'large', fr: 'Grand (10–100M TND)', ar: 'كبير (10-100 مليون دينار)' },
          { value: 'very_large', fr: 'Très grand (> 100M TND)', ar: 'كبير جدا (> 100 مليون دينار)' },
        ],
      },
      {
        key: 'customer_interviews',
        label: { fr: 'Entretiens clients réalisés', ar: 'عدد لقاءات العملاء المنجزة' },
        options: [
          { value: '0', fr: 'Aucun', ar: 'لا شيء' },
          { value: '1-5', fr: '1 à 5', ar: '1 إلى 5' },
          { value: '6-10', fr: '6 à 10', ar: '6 إلى 10' },
          { value: '10+', fr: 'Plus de 10', ar: 'أكثر من 10' },
        ],
      },
      {
        key: 'has_loi',
        label: { fr: "Lettres d'intention signées", ar: 'خطابات النوايا الموقعة' },
        options: [
          { value: 0, fr: 'Aucune', ar: 'لا شيء' },
          { value: 1, fr: 'Une', ar: 'واحدة' },
          { value: 2, fr: 'Deux ou plus', ar: 'اثنتان أو أكثر' },
        ],
      },
      {
        key: 'has_paying_customers',
        label: { fr: 'Clients payants existants', ar: 'عملاء يدفعون حاليا' },
        options: [
          { value: false, fr: 'Non', ar: 'لا' },
          { value: true, fr: 'Oui', ar: 'نعم' },
        ],
      },
      {
        key: 'revenue_model_documented',
        label: { fr: 'Modèle de revenus', ar: 'نموذج الإيرادات' },
        options: [
          { value: 'none', fr: 'Non défini', ar: 'غير محدد' },
          { value: 'draft', fr: 'En cours', ar: 'قيد الإعداد' },
          { value: 'documented', fr: 'Documenté', ar: 'موثق' },
        ],
      },
      {
        key: 'revenue_model_type',
        label: { fr: 'Type de modèle de revenus', ar: 'نوع نموذج الإيرادات' },
        options: [
          { value: 'undefined', fr: 'Non défini', ar: 'غير محدد' },
          { value: 'subscription', fr: 'Abonnement', ar: 'اشتراك' },
          { value: 'transactional', fr: 'Transactionnel', ar: 'معاملات' },
          { value: 'freemium', fr: 'Freemium', ar: 'مجاني جزئيا' },
        ],
      },
    ],
  },
  {
    title: { fr: 'Offre Commerciale', ar: 'العرض التجاري' },
    fields: [
      {
        key: 'value_proposition_clarity',
        label: { fr: 'Clarté de la proposition de valeur', ar: 'وضوح عرض القيمة' },
        options: [
          { value: 'none', fr: 'Inexistante', ar: 'غير موجودة' },
          { value: 'vague', fr: 'Vague', ar: 'غامضة' },
          { value: 'clear', fr: 'Claire', ar: 'واضحة' },
          { value: 'differentiated', fr: 'Différenciée', ar: 'متميزة' },
        ],
      },
      {
        key: 'product_maturity',
        label: { fr: 'Maturité du produit', ar: 'نضج المنتج' },
        options: [
          { value: 'idea', fr: 'Idée', ar: 'فكرة' },
          { value: 'prototype', fr: 'Prototype', ar: 'نموذج أولي' },
          { value: 'mvp', fr: 'MVP', ar: 'منتج أدنى قابل للتطبيق' },
          { value: 'product', fr: 'Produit fini', ar: 'منتج جاهز' },
        ],
      },
      {
        key: 'pricing_strategy',
        label: { fr: 'Stratégie de pricing', ar: 'استراتيجية التسعير' },
        options: [
          { value: 'none', fr: 'Absente', ar: 'غائبة' },
          { value: 'draft', fr: 'En cours de définition', ar: 'قيد التحديد' },
          { value: 'defined', fr: 'Définie', ar: 'محددة' },
        ],
      },
      {
        key: 'offer_need_alignment',
        label: { fr: 'Adéquation offre-besoin', ar: 'مدى تطابق العرض مع الحاجة' },
        options: [
          { value: 'none', fr: 'Non validée', ar: 'غير مثبتة' },
          { value: 'partial', fr: 'Partiellement validée', ar: 'مثبتة جزئيا' },
          { value: 'validated', fr: 'Validée', ar: 'مثبتة' },
        ],
      },
    ],
  },
  {
    title: { fr: 'Innovation', ar: 'الابتكار' },
    fields: [
      {
        key: 'local_novelty',
        label: { fr: 'Nouveauté sur le marché local', ar: 'حداثة الفكرة في السوق المحلي' },
        options: [
          { value: 'existing', fr: 'Solution existante', ar: 'حل موجود' },
          { value: 'similar', fr: "Similaire à l'existant", ar: 'مشابه للموجود' },
          { value: 'new', fr: 'Nouvelle approche', ar: 'مقاربة جديدة' },
          { value: 'unique', fr: 'Unique / Pionnier', ar: 'فريد / رائد' },
        ],
      },
      {
        key: 'technology_intensity',
        label: { fr: 'Intensité technologique', ar: 'كثافة التكنولوجيا' },
        options: [
          { value: 'none', fr: 'Aucune', ar: 'لا شيء' },
          { value: 'low', fr: 'Faible', ar: 'منخفضة' },
          { value: 'medium', fr: 'Moyenne', ar: 'متوسطة' },
          { value: 'high', fr: 'Élevée', ar: 'مرتفعة' },
        ],
      },
      {
        key: 'barrier_to_entry',
        label: { fr: "Barrière à l'entrée", ar: 'حاجز الدخول للمنافسين' },
        options: [
          { value: 'none', fr: 'Nulle', ar: 'منعدمة' },
          { value: 'low', fr: 'Faible', ar: 'منخفضة' },
          { value: 'medium', fr: 'Moyenne', ar: 'متوسطة' },
          { value: 'high', fr: 'Élevée', ar: 'مرتفعة' },
        ],
      },
      {
        key: 'has_ip_protection',
        label: { fr: 'Protection intellectuelle', ar: 'حماية الملكية الفكرية' },
        options: [
          { value: 'none', fr: 'Aucune', ar: 'لا شيء' },
          { value: 'pending', fr: 'En cours de dépôt', ar: 'قيد التسجيل' },
          { value: 'granted', fr: 'Accordée', ar: 'ممنوحة' },
        ],
      },
    ],
  },
  {
    title: { fr: 'Scalabilité', ar: 'قابلية التوسع' },
    fields: [
      {
        key: 'replicability',
        label: { fr: 'Réplicabilité du modèle', ar: 'إمكانية تكرار النموذج' },
        options: [
          { value: 'manual', fr: 'Manuelle', ar: 'يدوية' },
          { value: 'semi_auto', fr: 'Semi-automatisée', ar: 'شبه آلية' },
          { value: 'automated', fr: 'Automatisée', ar: 'آلية' },
        ],
      },
      {
        key: 'manual_dependency',
        label: { fr: "Dépendance à l'intervention humaine", ar: 'الاعتماد على التدخل البشري' },
        options: [
          { value: 'high', fr: 'Élevée', ar: 'مرتفعة' },
          { value: 'medium', fr: 'Moyenne', ar: 'متوسطة' },
          { value: 'low', fr: 'Faible', ar: 'منخفضة' },
          { value: 'none', fr: 'Nulle', ar: 'منعدمة' },
        ],
      },
      {
        key: 'geographic_potential',
        label: { fr: 'Potentiel géographique', ar: 'الإمكانات الجغرافية' },
        options: [
          { value: 'local', fr: 'Local (ville)', ar: 'محلي (المدينة)' },
          { value: 'national', fr: 'National', ar: 'وطني' },
          { value: 'regional', fr: 'Régional (Afrique / MENA)', ar: 'إقليمي (إفريقيا / الشرق الأوسط)' },
          { value: 'global', fr: 'International', ar: 'دولي' },
        ],
      },
      {
        key: 'has_pitch_deck',
        label: { fr: 'Pitch deck disponible', ar: 'وثيقة العرض التقديمي متوفرة' },
        options: [
          { value: false, fr: 'Non', ar: 'لا' },
          { value: true, fr: 'Oui', ar: 'نعم' },
        ],
      },
      {
        key: 'funding_needed',
        label: { fr: 'Montant recherché en TND (optionnel)', ar: 'المبلغ المطلوب بالدينار (اختياري)' },
        type: 'text',
        placeholder: { fr: 'ex. 500000', ar: 'مثال: 500000' },
      },
    ],
  },
  {
    title: { fr: 'Impact Environnemental', ar: 'الأثر البيئي' },
    fields: [
      {
        key: 'energy_source',
        label: { fr: "Source d'énergie principale", ar: 'مصدر الطاقة الرئيسي' },
        options: [
          { value: 'solar_wind', fr: 'Solaire / Éolien', ar: 'شمسية / رياح' },
          { value: 'mixed_renewable_grid', fr: 'Mix renouvelable + réseau', ar: 'مزيج متجدد + شبكة' },
          { value: 'grid_steg', fr: 'Réseau STEG', ar: 'شبكة الكهرباء والغاز' },
          { value: 'grid_diesel', fr: 'Réseau + groupes électrogènes', ar: 'شبكة + مولدات ديزل' },
          { value: 'diesel_only', fr: 'Diesel uniquement', ar: 'ديزل فقط' },
        ],
      },
      {
        key: 'energy_consumption',
        label: { fr: 'Consommation énergétique', ar: 'استهلاك الطاقة' },
        options: [
          { value: 'minimal', fr: 'Minimale', ar: 'ضئيلة' },
          { value: 'low', fr: 'Faible', ar: 'منخفضة' },
          { value: 'moderate', fr: 'Modérée', ar: 'متوسطة' },
          { value: 'high', fr: 'Élevée', ar: 'مرتفعة' },
          { value: 'very_high', fr: 'Très élevée', ar: 'مرتفعة جدا' },
        ],
      },
      {
        key: 'transport_activity',
        label: { fr: 'Activité transport / logistique', ar: 'نشاط النقل واللوجستيك' },
        options: [
          { value: 'none', fr: 'Aucune', ar: 'لا شيء' },
          { value: 'local', fr: 'Locale (< 50 km)', ar: 'محلي (< 50 كم)' },
          { value: 'regional', fr: 'Régionale', ar: 'إقليمي' },
          { value: 'national', fr: 'Nationale', ar: 'وطني' },
          { value: 'international', fr: 'Internationale', ar: 'دولي' },
        ],
      },
      {
        key: 'water_volume',
        label: { fr: "Volume d'eau utilisée", ar: 'حجم المياه المستخدمة' },
        options: [
          { value: 'none', fr: 'Aucune', ar: 'لا شيء' },
          { value: 'low_controlled', fr: 'Faible et contrôlée', ar: 'منخفض ومراقب' },
          { value: 'moderate', fr: 'Modérée', ar: 'متوسط' },
          { value: 'high', fr: 'Élevée', ar: 'مرتفع' },
          { value: 'very_high', fr: 'Très élevée', ar: 'مرتفع جدا' },
        ],
      },
      {
        key: 'water_origin',
        label: { fr: "Origine de l'eau", ar: 'مصدر المياه' },
        options: [
          { value: 'rainwater_recycled', fr: 'Pluie / Eau recyclée', ar: 'مياه الأمطار / معاد تدويرها' },
          { value: 'municipal_controlled', fr: 'Réseau municipal contrôlé', ar: 'شبكة بلدية مراقبة' },
          { value: 'municipal_uncontrolled', fr: 'Réseau municipal non contrôlé', ar: 'شبكة بلدية غير مراقبة' },
          { value: 'groundwater', fr: 'Nappe phréatique', ar: 'مياه جوفية' },
          { value: 'natural_body', fr: "Cours d'eau naturel", ar: 'مجرى مائي طبيعي' },
        ],
      },
      {
        key: 'wastewater_treatment',
        label: { fr: 'Traitement des eaux usées', ar: 'معالجة المياه العادمة' },
        options: [
          { value: 'none_generated', fr: 'Aucune eau usée générée', ar: 'لا مياه عادمة' },
          { value: 'full_treatment', fr: 'Traitement complet', ar: 'معالجة كاملة' },
          { value: 'partial_treatment', fr: 'Traitement partiel', ar: 'معالجة جزئية' },
          { value: 'discharged_untreated', fr: 'Rejet sans traitement', ar: 'تصريف دون معالجة' },
          { value: 'discharged_environment', fr: 'Rejet en milieu naturel', ar: 'تصريف في الطبيعة' },
        ],
      },
      {
        key: 'zone_type',
        label: { fr: "Zone d'activité", ar: 'نوع المنطقة' },
        options: [
          { value: 'urban_industrial', fr: 'Zone industrielle urbaine', ar: 'منطقة صناعية حضرية' },
          { value: 'suburban', fr: 'Périurbaine', ar: 'ضواحي' },
          { value: 'rural_agricultural', fr: 'Zone rurale / agricole', ar: 'منطقة ريفية / فلاحية' },
          { value: 'near_protected', fr: "Proche d'une zone protégée", ar: 'قرب منطقة محمية' },
          { value: 'inside_protected', fr: 'Dans une zone protégée', ar: 'داخل منطقة محمية' },
        ],
      },
      {
        key: 'surface_impacted',
        label: { fr: 'Surface impactée', ar: 'المساحة المتأثرة' },
        options: [
          { value: 'none', fr: 'Nulle', ar: 'منعدمة' },
          { value: 'small', fr: 'Petite (< 500 m²)', ar: 'صغيرة (< 500 م²)' },
          { value: 'medium', fr: 'Moyenne', ar: 'متوسطة' },
          { value: 'large', fr: 'Grande', ar: 'كبيرة' },
          { value: 'very_large', fr: 'Très grande', ar: 'كبيرة جدا' },
        ],
      },
      {
        key: 'ecosystem_disruption',
        label: { fr: 'Impact sur les écosystèmes', ar: 'التأثير على النظم البيئية' },
        options: [
          { value: 'none', fr: 'Nul', ar: 'منعدم' },
          { value: 'negligible', fr: 'Négligeable', ar: 'ضئيل' },
          { value: 'moderate_reversible', fr: 'Modéré et réversible', ar: 'متوسط وقابل للعكس' },
          { value: 'significant', fr: 'Significatif', ar: 'كبير' },
          { value: 'irreversible', fr: 'Irréversible', ar: 'غير قابل للعكس' },
        ],
      },
      {
        key: 'raw_material_consumption',
        label: { fr: 'Consommation de matières premières', ar: 'استهلاك المواد الخام' },
        options: [
          { value: 'none_minimal', fr: 'Nulle / Minimale', ar: 'منعدم / ضئيل' },
          { value: 'low_recycled', fr: 'Faible avec recyclage', ar: 'منخفض مع إعادة تدوير' },
          { value: 'moderate_partial', fr: 'Modérée avec recyclage partiel', ar: 'متوسط مع تدوير جزئي' },
          { value: 'high_virgin', fr: 'Élevée, matière vierge', ar: 'مرتفع، مواد غير معاد تدويرها' },
          { value: 'very_high_no_recycling', fr: 'Très élevée, aucun recyclage', ar: 'مرتفع جدا، دون تدوير' },
        ],
      },
      {
        key: 'waste_volume',
        label: { fr: 'Volume de déchets produits', ar: 'حجم النفايات المنتجة' },
        options: [
          { value: 'none', fr: 'Nul', ar: 'منعدم' },
          { value: 'low_managed', fr: 'Faible et géré', ar: 'منخفض ومدار' },
          { value: 'moderate_partial', fr: 'Modéré, gestion partielle', ar: 'متوسط، إدارة جزئية' },
          { value: 'high', fr: 'Élevé', ar: 'مرتفع' },
          { value: 'very_high_unmanaged', fr: 'Très élevé, non géré', ar: 'مرتفع جدا، غير مدار' },
        ],
      },
      {
        key: 'recycling_strategy',
        label: { fr: 'Stratégie de recyclage', ar: 'استراتيجية إعادة التدوير' },
        options: [
          { value: 'full_circular', fr: 'Économie circulaire complète', ar: 'اقتصاد دائري كامل' },
          { value: 'active_program', fr: 'Programme actif', ar: 'برنامج نشط' },
          { value: 'partial', fr: 'Partielle', ar: 'جزئية' },
          { value: 'minimal', fr: 'Minimale', ar: 'ضئيلة' },
          { value: 'none', fr: 'Aucune', ar: 'لا شيء' },
        ],
      },
    ],
  },
]

// "Overconfident founder" demo profile — deliberately triggers
// market_no_validation, scalability_manual_conflict, product_built_unvalidated.
const DEMO_ANSWERS = {
  market_size: 'very_large',
  customer_interviews: '0',
  has_loi: 0,
  has_paying_customers: false,
  revenue_model_documented: 'draft',
  revenue_model_type: 'undefined',
  value_proposition_clarity: 'clear',
  product_maturity: 'product',
  pricing_strategy: 'defined',
  offer_need_alignment: 'none',
  local_novelty: 'new',
  technology_intensity: 'medium',
  barrier_to_entry: 'medium',
  has_ip_protection: 'none',
  replicability: 'automated',
  manual_dependency: 'high',
  geographic_potential: 'global',
  has_pitch_deck: true,
  funding_needed: '750000',
  energy_source: 'grid_steg',
  energy_consumption: 'moderate',
  transport_activity: 'national',
  water_volume: 'moderate',
  water_origin: 'municipal_controlled',
  wastewater_treatment: 'partial_treatment',
  zone_type: 'urban_industrial',
  surface_impacted: 'medium',
  ecosystem_disruption: 'moderate_reversible',
  raw_material_consumption: 'moderate_partial',
  waste_volume: 'moderate_partial',
  recycling_strategy: 'partial',
}

function initAnswers() {
  const a = {}
  STEPS.forEach((step) => {
    step.fields.forEach((f) => {
      a[f.key] = f.type === 'text' ? '' : f.options[0].value
    })
  })
  return a
}

function OptionCards({ field, value, onChange, isAr }) {
  const cols = field.options.length > 3 ? 'sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
  return (
    <div className={`grid grid-cols-1 ${cols} gap-2.5`}>
      {field.options.map((opt) => {
        const selected = String(value) === String(opt.value)
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className="text-left rounded-xl px-4 py-3 transition-all duration-150"
            style={{
              ...INTER,
              border: selected ? '1.5px solid #3346AC' : '1.5px solid rgba(112,150,209,0.25)',
              backgroundColor: selected ? '#EEF1FF' : '#FFFFFF',
              color: selected ? '#081F5C' : '#475569',
              fontWeight: selected ? 600 : 500,
              fontSize: '0.85rem',
              textAlign: isAr ? 'right' : 'left',
            }}
          >
            {isAr ? opt.ar : opt.fr}
          </button>
        )
      })}
    </div>
  )
}

function FieldRenderer({ field, value, onChange, isAr }) {
  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isAr ? field.placeholder.ar : field.placeholder.fr}
        style={{
          ...INTER,
          width: '100%',
          border: '1.5px solid rgba(112,150,209,0.25)',
          borderRadius: '10px',
          padding: '11px 14px',
          fontSize: '0.9rem',
          color: '#081F5C',
          backgroundColor: '#FAFBFF',
          textAlign: isAr ? 'right' : 'left',
        }}
      />
    )
  }

  if (field.options.length <= 5) {
    return <OptionCards field={field} value={value} onChange={onChange} isAr={isAr} />
  }

  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...INTER,
        width: '100%',
        border: '1.5px solid rgba(112,150,209,0.25)',
        borderRadius: '10px',
        padding: '11px 14px',
        fontSize: '0.9rem',
        color: '#081F5C',
        backgroundColor: '#FAFBFF',
      }}
    >
      {field.options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {isAr ? opt.ar : opt.fr}
        </option>
      ))}
    </select>
  )
}

export default function DiagnosticPage() {
  const { lang } = useLang()
  const { token } = useAuth()
  const isAr = lang === 'ar'
  const navigate = useNavigate()
  const { profile, loading: profileLoading, error: profileError } = useActiveProfile()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(initAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const fileInputRef = useRef(null)

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1
  const set = (key, value) => setAnswers((a) => ({ ...a, [key]: value }))

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFileName(f.name)
  }

  const handleSubmit = async () => {
    if (!profile) return
    setError(null)
    setSubmitting(true)
    try {
      await profilesApi.setAnswers(token, profile.id, answers)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const L = {
    title: isAr ? 'تشخيص المشروع' : 'Diagnostic de projet',
    demoFill: isAr ? 'تعبئة ببيانات تجريبية' : 'Remplir avec données démo',
    uploadLabel: isAr
      ? 'وثائق اختيارية — خطة الأعمال، القوائم المالية، العقود (PDF, JPG, PNG)'
      : 'Documents optionnels — business plan, états financiers, contrats (PDF, JPG, PNG)',
    step: isAr ? 'خطوة' : 'Étape',
    of: isAr ? 'من' : 'sur',
    prev: isAr ? 'السابق' : 'Précédent',
    next: isAr ? 'التالي' : 'Suivant',
    submit: isAr ? 'إرسال التشخيص' : 'Soumettre le diagnostic',
    sending: isAr ? 'جارٍ الإرسال...' : 'Envoi...',
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      <SiteHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-32 pb-20">
        {/* Upload zone */}
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-8 mb-6 cursor-pointer transition-colors hover:bg-blue-50/30"
          style={{ border: '2px dashed rgba(61,163,93,0.4)', backgroundColor: '#F7FBF8' }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
          {fileName ? <FileCheck2 size={26} color="#3DA35D" /> : <UploadCloud size={26} color="#3DA35D" />}
          <p className="text-sm font-medium text-center" style={{ ...INTER, color: '#3DA35D' }}>
            {fileName || L.uploadLabel}
          </p>
        </label>

        {/* Header row: title + demo fill */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-xl" style={{ ...SORA, color: '#081F5C' }}>
            {L.title}
          </h1>
          <button
            onClick={() => setAnswers(DEMO_ANSWERS)}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-gray-100"
            style={{ ...INTER, color: '#7096D1', border: '1px solid rgba(112,150,209,0.25)' }}
          >
            {L.demoFill}
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i < step ? '#3DA35D' : i === step ? '#3346AC' : 'rgba(112,150,209,0.18)' }}
            />
          ))}
        </div>
        <p className="text-xs mb-6" style={{ ...INTER, color: '#7096D1' }}>
          {L.step} {step + 1} {L.of} {STEPS.length} — {isAr ? currentStep.title.ar : currentStep.title.fr}
        </p>

        {/* Card */}
        <div
          className="rounded-2xl p-6 sm:p-8 space-y-6"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 40px rgba(51,70,172,0.08), 0 1px 4px rgba(51,70,172,0.05)',
            border: '1px solid rgba(112,150,209,0.12)',
          }}
        >
          <h2 className="font-bold text-lg" style={{ ...SORA, color: '#081F5C' }}>
            {isAr ? currentStep.title.ar : currentStep.title.fr}
          </h2>

          {currentStep.fields.map((field) => (
            <div key={field.key}>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ ...INTER, color: '#081F5C' }}
              >
                {isAr ? field.label.ar : field.label.fr}
              </label>
              <FieldRenderer
                field={field}
                value={answers[field.key]}
                onChange={(v) => set(field.key, v)}
                isAr={isAr}
              />
            </div>
          ))}
        </div>

        {(error || profileError) && (
          <p
            className="mt-4 text-sm px-4 py-2.5 rounded-xl"
            style={{ ...INTER, color: '#c0392b', backgroundColor: '#FFF5F5', border: '1px solid rgba(192,57,43,0.15)' }}
          >
            {error || profileError}
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 transition-colors text-sm"
            style={{ ...INTER, border: '1.5px solid #3346AC', color: '#3346AC' }}
          >
            {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {L.prev}
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-white disabled:opacity-60 transition-colors text-sm"
              style={{ ...INTER, backgroundColor: '#3DA35D' }}
            >
              {submitting && <Spinner size="sm" />}
              {submitting ? L.sending : L.submit}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-1.5 font-semibold px-6 py-2.5 rounded-xl text-white transition-colors text-sm"
              style={{ ...INTER, backgroundColor: '#3346AC' }}
            >
              {L.next}
              {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
