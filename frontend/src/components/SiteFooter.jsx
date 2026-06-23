import { useLang } from '../context/LanguageContext'
import SponsorRoller from './SponsorRoller'

const SORA = { fontFamily: "'Sora', sans-serif" }
const INTER = { fontFamily: "'Inter', sans-serif" }

export default function SiteFooter() {
  const { lang } = useLang()
  const isAr = lang === 'ar'

  return (
    <footer style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid rgba(112,150,209,0.1)' }}>
      <SponsorRoller variant="light" />
      <div
        className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4"
        style={{ borderTop: '1px solid rgba(112,150,209,0.08)' }}
      >
        <span className="text-lg font-black tracking-tight" style={{ ...SORA, color: '#081F5C' }}>
          {isAr ? 'مسار' : 'Massar'}
        </span>
        <p className="text-xs" style={{ ...INTER, color: 'rgba(112,150,209,0.55)' }}>
          © 2024 Massar. {isAr ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}
        </p>
      </div>
    </footer>
  )
}
