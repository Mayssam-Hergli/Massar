import { useLang } from '../context/LanguageContext'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

const SECTIONS = [
  {
    color: '#3DA35D',
    label: { fr: 'IMMÉDIAT (0-2 semaines)', ar: 'فوري (0-2 أسابيع)' },
    actions: [
      {
        title: { fr: 'Conduire 10 entretiens clients distributeurs', ar: 'إجراء 10 لقاءات مع عملاء موزعين' },
        desc: { fr: 'Valider la demande réelle avant tout investissement supplémentaire.', ar: 'تثبيت الطلب الحقيقي قبل أي استثمار إضافي.' },
        source: 'APII',
      },
      {
        title: { fr: 'Contacter ANETI Espaces Entreprendre', ar: 'الاتصال بفضاءات منظمة التشغيل' },
        desc: { fr: 'Bénéficier d\'un accompagnement gratuit pour structurer le projet.', ar: 'الاستفادة من مرافقة مجانية لتنظيم المشروع.' },
        source: 'Programme CEFE',
      },
    ],
  },
  {
    color: '#3346AC',
    label: { fr: 'COURT TERME (1-3 mois)', ar: 'قصير المدى (1-3 أشهر)' },
    actions: [
      {
        title: { fr: 'Créer structure juridique SUARL', ar: 'إنشاء شركة ذات مسؤولية محدودة فردية' },
        desc: { fr: 'Sécuriser le cadre légal avant la signature de premiers contrats.', ar: 'تأمين الإطار القانوني قبل توقيع أولى العقود.' },
        source: 'RNE',
      },
      {
        title: { fr: 'Formaliser le business model', ar: 'صياغة نموذج الأعمال رسميا' },
        desc: { fr: 'Documenter la stratégie de revenus pour convaincre les premiers partenaires.', ar: 'توثيق استراتيجية الإيرادات لإقناع الشركاء الأوائل.' },
        source: 'BFPME',
      },
    ],
  },
  {
    color: '#081F5C',
    label: { fr: 'MOYEN TERME (3-6 mois)', ar: 'متوسط المدى (3-6 أشهر)' },
    actions: [
      {
        title: { fr: 'Postuler au Label Startup Act', ar: 'التقديم للحصول على وسام Startup Act' },
        desc: { fr: 'Accéder aux avantages fiscaux et financiers réservés aux startups labellisées.', ar: 'الاستفادة من المزايا الجبائية والمالية المخصصة للشركات الناشئة المصنفة.' },
        source: 'startup.gov.tn',
      },
      {
        title: { fr: 'Préparer dossier financement BTS', ar: 'تحضير ملف تمويل BTS' },
        desc: { fr: 'Anticiper le besoin de trésorerie pour la phase de croissance.', ar: 'استباق الحاجة إلى السيولة لمرحلة النمو.' },
        source: 'Programme BTS 2025',
      },
    ],
  },
]

export default function RoadmapPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      <SiteHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-32 pb-20">
        <h1 className="font-black text-3xl mb-10 text-center" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? (
            <>مسارك<span style={{ color: '#3DA35D' }}> الخاص</span></>
          ) : (
            <>Votre <span style={{ color: '#3DA35D' }}>Parcours</span></>
          )}
        </h1>

        <div className="space-y-10">
          {SECTIONS.map((section, si) => (
            <div key={si} style={{ borderInlineStart: `3px solid ${section.color}`, paddingInlineStart: '24px' }}>
              <span
                className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                style={{ ...INTER, backgroundColor: `${section.color}1A`, color: section.color }}
              >
                {isAr ? section.label.ar : section.label.fr}
              </span>

              <div className="space-y-4">
                {section.actions.map((action, ai) => (
                  <div
                    key={ai}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 16px rgba(51,70,172,0.07)', border: '1px solid rgba(112,150,209,0.1)' }}
                  >
                    <h3 className="font-bold text-base mb-1.5" style={{ ...SORA, color: '#081F5C' }}>
                      {isAr ? action.title.ar : action.title.fr}
                    </h3>
                    <p className="text-sm mb-3" style={{ ...INTER, color: '#7096D1' }}>
                      {isAr ? action.desc.ar : action.desc.fr}
                    </p>
                    <span
                      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ ...INTER, backgroundColor: '#F0FBF4', color: '#3DA35D' }}
                    >
                      {action.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-12" style={{ ...INTER, color: 'rgba(112,150,209,0.7)' }}>
          {isAr
            ? 'سيتم تخصيص هذا المسار من قبل وكيل MS3 — البيانات ثابتة لأغراض العرض التجريبي.'
            : "Ce parcours sera personnalisé par l'agent MS3 — données statiques pour la démonstration."}
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
