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

// Escape user/LLM text before injecting into the report HTML.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Build a self-contained, official-grade HTML report from the live scores and
// open it ready to print / save as PDF (no extra dependency needed).
function buildReportHtml(data, profileName, isAr) {
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || ''
  const logo = `${origin}/massar-logo.svg`
  const scores = data.scores || {}
  const bizDims = ['market', 'commercial', 'innovation', 'scalability']
  const now = new Date()
  const date = now.toLocaleDateString(isAr ? 'ar-TN' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  const ref = `MSR-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`
  const name = (profileName && String(profileName)) || (isAr ? 'مشروعي' : 'Mon Projet')

  const L = isAr ? {
    dir: 'rtl', confidentiel: 'سري', confReport: 'تقرير سري',
    title: 'تقرير التشخيص والتقييم', subtitle: 'تقييم معمّق متعدد الأبعاد لجاهزية المشروع الريادي',
    preparedFor: 'أُعدّ لفائدة', preparedBy: 'أُعدّ من قبل', platform: 'منصة مسار',
    dateL: 'تاريخ التقرير', version: 'الإصدار', reference: 'المرجع', classification: 'التصنيف',
    restricted: 'سري — تداول محدود',
    s01: 'الخلاصة', execSummary: 'الملخص التنفيذي', keyPoints: 'النقاط الرئيسية',
    s02: 'لمحة', keyMetrics: 'المؤشرات الرئيسية',
    scoreGlobal: 'المؤشر العام', greenScore: 'المؤشر البيئي', anomaliesK: 'حالات الخلل', criteria: 'المعايير المحلّلة',
    s03: 'تحليل', breakdown: 'تفصيل المؤشرات', dimension: 'المحور', scoreH: 'المؤشر', statusH: 'الحالة', compositeRow: 'المؤشر المركّب العام',
    s04: 'تفصيل', detailed: 'تحليل مفصّل حسب المحور',
    s05: 'اليقظة', anomTitle: 'حالات الخلل ونقاط اليقظة', noAnom: 'لم يتم رصد أي خلل',
    envTitle: 'المؤشر البيئي (PNUD)', undpTotal: 'المجموع PNUD',
    sain: 'سليم', modere: 'متوسط', critique: 'حرج', high: 'حرجة', medium: 'متوسطة',
    signTitle: 'المصادقة والإمضاء', authSign: 'إمضاء معتمد', official: 'تقرير رسمي',
    disclaimer: 'أُنشئ هذا التقرير آليًا بواسطة منصة مسار انطلاقًا من التشخيص الذاتي للمشروع ونموذج تقييم متعدد الأبعاد قابل للتفسير. النتائج استشارية وتُقرأ إلى جانب العناية الواجبة.',
    generatedBy: 'تم إنشاؤه بواسطة منصة مسار', pageWord: 'صفحة',
  } : {
    dir: 'ltr', confidentiel: 'Confidentiel', confReport: 'Rapport Confidentiel',
    title: "Rapport de Diagnostic & d'Évaluation", subtitle: "Évaluation multidimensionnelle approfondie de la maturité du projet entrepreneurial",
    preparedFor: 'Préparé pour', preparedBy: 'Préparé par', platform: 'Plateforme Massar',
    dateL: 'Date du rapport', version: 'Version', reference: 'Référence', classification: 'Classification',
    restricted: 'Confidentiel — Diffusion restreinte',
    s01: 'Synthèse', execSummary: 'Synthèse Exécutive', keyPoints: 'Points clés',
    s02: 'Aperçu', keyMetrics: 'Indicateurs Clés',
    scoreGlobal: 'Score Global', greenScore: 'Score Vert (UNDP)', anomaliesK: 'Anomalies Détectées', criteria: 'Critères Analysés',
    s03: 'Analyse', breakdown: 'Détail des Scores', dimension: 'Dimension', scoreH: 'Score', statusH: 'Statut', compositeRow: 'Score composite global',
    s04: 'Détail', detailed: 'Analyse Détaillée par Dimension',
    s05: 'Vigilance', anomTitle: 'Anomalies & Points de Vigilance', noAnom: 'Aucune anomalie détectée',
    envTitle: 'Score Environnemental (UNDP)', undpTotal: 'Total UNDP',
    sain: 'Sain', modere: 'Modéré', critique: 'Critique', high: 'Haute', medium: 'Moyenne',
    signTitle: 'Validation & Signature', authSign: 'Signature autorisée', official: 'Rapport Officiel',
    disclaimer: "Ce rapport a été généré automatiquement par la plateforme Massar à partir du diagnostic auto-déclaré du projet et d'un modèle de scoring multidimensionnel explicable. Les conclusions sont fournies à titre indicatif et doivent être lues avec la due diligence.",
    generatedBy: 'Généré par la plateforme Massar', pageWord: 'Page',
  }

  const dimLabel = (d) => DIM_LABELS[d] ? (isAr ? DIM_LABELS[d].ar : DIM_LABELS[d].fr) : d
  const statusOf = (v) => v >= 70 ? { t: L.sain, c: 'ok' } : v >= 50 ? { t: L.modere, c: 'warn' } : { t: L.critique, c: 'crit' }
  const fillClass = (v) => v >= 70 ? 'good' : v >= 50 ? '' : 'warn'

  const g = scores.green
  const flags = data.anomaly_flags || []
  const highN = flags.filter((f) => f.severity === 'high').length
  const medN = flags.length - highN
  const ranked = bizDims.filter((d) => Number.isFinite(scores[d]?.composite)).sort((a, b) => scores[b].composite - scores[a].composite)
  const haveRank = ranked.length > 0
  const strong = ranked[0], weak = ranked[ranked.length - 1]
  const comps = bizDims.map((d) => scores[d]?.composite).filter((v) => Number.isFinite(v))
  const scoreGlobal = comps.length ? Math.round(comps.reduce((a, b) => a + b, 0) / comps.length) : null
  const criteriaCount = bizDims.reduce((n, d) => n + Object.keys(scores[d]?.sub_scores || {}).length, 0) + Object.keys(g?.pillars || {}).length

  // ── Executive summary ──
  const lead = haveRank
    ? (isAr
        ? `يحصل المشروع «${esc(name)}» على مؤشر عام قدره <b>${scoreGlobal}/100</b>. أبرز نقطة قوة هي ${esc(dimLabel(strong))} (${Math.round(scores[strong].composite)})، في حين يمثّل ${esc(dimLabel(weak))} (${Math.round(scores[weak].composite)}) أهمّ نقطة يقظة.`
        : `Le projet « ${esc(name)} » obtient un score global de <b>${scoreGlobal}/100</b>. Sa force principale est ${esc(dimLabel(strong))} (${Math.round(scores[strong].composite)}), tandis que ${esc(dimLabel(weak))} (${Math.round(scores[weak].composite)}) constitue le principal point de vigilance.`)
    : (isAr ? 'النتائج التفصيلية مبيّنة أدناه.' : 'Les résultats détaillés figurent ci-dessous.')

  const takeaways = haveRank ? [
    isAr ? `أقوى محور: <b>${esc(dimLabel(strong))}</b> — ${Math.round(scores[strong].composite)}/100.` : `Dimension la plus forte : <b>${esc(dimLabel(strong))}</b> — ${Math.round(scores[strong].composite)}/100.`,
    isAr ? `المحور الأضعف: <b>${esc(dimLabel(weak))}</b> — ${Math.round(scores[weak].composite)}/100، يُعالَج بأولوية.` : `Dimension la plus faible : <b>${esc(dimLabel(weak))}</b> — ${Math.round(scores[weak].composite)}/100, à traiter en priorité.`,
    isAr ? `<b>${flags.length}</b> حالة خلل (${highN} حرجة، ${medN} متوسطة).` : `<b>${flags.length}</b> anomalie(s) détectée(s) — ${highN} haute(s), ${medN} moyenne(s).`,
    g ? (isAr ? `المؤشر البيئي <b>${Math.round(g.composite)}/100</b> — ${esc(g.undp_classification)}.` : `Score environnemental <b>${Math.round(g.composite)}/100</b> — ${esc(g.undp_classification)}.`) : '',
  ].filter(Boolean) : []
  const takeawaysHtml = takeaways.map((t, i) => `<li><span class="idx">${i + 1}</span><span>${t}</span></li>`).join('')

  // ── KPI grid ──
  const kpis = `
    <div class="kpi navy"><div class="kv num">${scoreGlobal ?? '—'}<small>/100</small></div><div class="kl">${L.scoreGlobal}</div></div>
    <div class="kpi emerald"><div class="kv num">${g?.composite != null ? Math.round(g.composite) : '—'}<small>/100</small></div><div class="kl">${L.greenScore}</div><div class="kd">${esc(g?.undp_classification || '—')}</div></div>
    <div class="kpi amber"><div class="kv num">${flags.length}</div><div class="kl">${L.anomaliesK}</div><div class="kd">${highN} ${L.high} · ${medN} ${L.medium}</div></div>
    <div class="kpi"><div class="kv num">${criteriaCount}</div><div class="kl">${L.criteria}</div></div>`

  // ── Scoring table ──
  const tableRows = [...bizDims, 'green'].filter((d) => (d === 'green' ? g : scores[d])).map((d) => {
    const v = d === 'green' ? g.composite : scores[d].composite
    const st = statusOf(v)
    const lbl = d === 'green' ? L.greenScore : dimLabel(d)
    return `<tr>
      <td><span class="name">${esc(lbl)}</span></td>
      <td><span class="meter"><span class="trk"><span class="fil ${fillClass(v)}" style="width:${Math.min(100, v || 0)}%"></span></span><span class="mn num">${Number(v).toFixed(0)}</span></span></td>
      <td class="c"><span class="pill ${st.c}">${st.t}</span></td>
    </tr>`
  }).join('')
  const totalRow = scoreGlobal != null
    ? `<tr class="total"><td><span class="name">${L.compositeRow}</span></td><td class="r">—</td><td class="c num">${scoreGlobal}</td></tr>`
    : ''

  // ── Detailed per-dimension analysis ──
  const detailed = bizDims.filter((d) => scores[d]).map((d) => {
    const c = scores[d].composite
    const st = statusOf(c)
    const just = justText(data.justifications?.[d], isAr)
    const subs = Object.entries(scores[d].sub_scores || {}).map(([k, sub]) => {
      const lbl = SUB_LABELS[k] ? (isAr ? SUB_LABELS[k].ar : SUB_LABELS[k].fr) : k
      return `<tr><td>${esc(lbl)}</td><td class="v num">${Number(sub.value).toFixed(0)} <span class="wt">(${Math.round(sub.weight * 100)}%)</span></td></tr>`
    }).join('')
    return `<div class="dcard">
      <div class="dh"><h3>${esc(dimLabel(d))}</h3><span class="dscore" style="color:${barColor(c)}">${c?.toFixed(1) ?? '—'}<small>/100</small></span><span class="pill ${st.c}">${st.t}</span></div>
      ${subs ? `<table class="subt">${subs}</table>` : ''}
      ${just ? `<p class="djust">${esc(just)}</p>` : ''}
    </div>`
  }).join('')

  // ── Environmental pillars ──
  const greenBlock = g ? `<div class="green-wrap">
      <div class="gh"><h3>${L.envTitle}</h3><span class="gbadge" style="background:${UNDP_COLOR(g.undp_raw_total)}">${esc(g.undp_classification)}</span></div>
      <div class="grow"><span class="gscore" style="color:${UNDP_COLOR(g.undp_raw_total)}">${g.composite?.toFixed(1) ?? '—'}<small>/100</small></span><span class="wt">${L.undpTotal}: ${Number(g.undp_raw_total).toFixed(1)}</span></div>
      <div class="pillars">${Object.entries(g.pillars || {}).map(([k, p]) => {
        const lbl = PILLAR_LABELS[k] ? (isAr ? PILLAR_LABELS[k].ar : PILLAR_LABELS[k].fr) : k
        return `<div class="pillar"><div class="pn">${esc(lbl)}</div><div class="pv num">${Number(p.score).toFixed(1)}<small>/5</small></div></div>`
      }).join('')}</div>
    </div>` : ''

  // ── Anomalies ──
  const anomList = flags.length
    ? flags.map((f) => {
        const hi = f.severity === 'high'
        const msg = ANOMALY_MESSAGES[f.code] ? (isAr ? ANOMALY_MESSAGES[f.code].ar : ANOMALY_MESSAGES[f.code].fr) : (f.message || f.code)
        return `<div class="an ${hi ? 'hi' : 'me'}"><span class="sev" style="background:${hi ? '#C0392B' : '#E07A1F'}">${hi ? L.high : L.medium}</span><span>${esc(msg)}</span></div>`
      }).join('')
    : `<p class="ok">✓ ${L.noAnom}</p>`

  return `<!DOCTYPE html><html dir="${L.dir}" lang="${isAr ? 'ar' : 'fr'}"><head><meta charset="utf-8"><title>${L.confReport} — Massar</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap');
:root{--navy:#081F5C;--indigo:#3346AC;--emerald:#3DA35D;--ink:#1A202C;--slate:#2D3748;--muted:#64748B;--soft:#7096D1;--line:#E2E8F0;--bg:#F7F9FC;--bgi:#EEF1FF;--amber:#E07A1F;--red:#C0392B;--sans:'Inter','Segoe UI',sans-serif;--disp:'Sora','Inter',sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:var(--sans);color:var(--ink);font-size:10pt;line-height:1.55;background:#fff}
h1,h2,h3,h4{font-family:var(--disp);color:var(--navy);font-weight:700;letter-spacing:-.01em}
.num{font-variant-numeric:tabular-nums}b{font-weight:700;color:var(--navy)}
@page{size:A4;margin:18mm 16mm;@bottom-right{content:"${L.pageWord} " counter(page) " / " counter(pages);font:600 8pt 'Inter',sans-serif;color:#64748B}@bottom-left{content:"${L.confidentiel} · Massar";font:400 8pt 'Inter',sans-serif;color:#94A3B8}}
@page:first{margin:0;@bottom-right{content:none}@bottom-left{content:none}}
/* Cover */
.cover{position:relative;height:297mm;padding:32mm 26mm;display:flex;flex-direction:column;overflow:hidden;break-after:page}
.c-accent{position:absolute;top:0;${isAr ? 'right' : 'left'}:0;width:13mm;height:100%;background:var(--navy)}
.c-accent::after{content:"";position:absolute;top:0;${isAr ? 'right' : 'left'}:13mm;width:3mm;height:100%;background:var(--emerald)}
.c-top{display:flex;align-items:center;gap:12px;margin-${isAr ? 'right' : 'left'}:8mm}
.c-logo{height:34px;width:auto}
.c-word{font-family:var(--disp);font-weight:800;font-size:15pt;letter-spacing:3px;color:var(--navy)}
.c-geo{display:flex;gap:5px;margin:26mm 0 0 0;padding-${isAr ? 'right' : 'left'}:8mm}
.c-geo i{display:block;width:34px;height:5px;border-radius:3px}
.c-geo i:nth-child(1){background:var(--navy)}.c-geo i:nth-child(2){background:var(--indigo)}.c-geo i:nth-child(3){background:var(--emerald)}
.c-eyebrow{margin:9mm 0 5mm 0;padding-${isAr ? 'right' : 'left'}:8mm;font-size:9.5pt;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--emerald)}
.c-title{padding-${isAr ? 'right' : 'left'}:8mm;font-family:var(--disp);font-weight:800;font-size:38pt;line-height:1.06;color:var(--navy);max-width:150mm}
.c-sub{margin-top:7mm;padding-${isAr ? 'right' : 'left'}:8mm;font-size:12.5pt;color:var(--slate);max-width:145mm;line-height:1.5}
.c-spacer{flex:1}
.c-class{margin:0 0 9mm 0;padding-${isAr ? 'right' : 'left'}:8mm;display:flex;align-items:center;gap:7px;font-size:8.5pt;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--red)}
.c-class i{width:8px;height:8px;border-radius:50%;background:var(--red)}
.c-meta{padding-${isAr ? 'right' : 'left'}:8mm;display:grid;grid-template-columns:1fr 1fr;gap:7mm 14mm;max-width:150mm;border-top:1.5pt solid var(--line);padding-top:8mm}
.c-meta dt{font-size:8pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.c-meta dd{font-size:11pt;font-weight:600;color:var(--ink)}
/* Sections */
.content{padding-top:2mm}
.sec{margin-top:10mm;break-inside:avoid}
.eyebrow{font-size:8.5pt;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--emerald);margin-bottom:5px}
.sec h2{font-size:16pt;line-height:1.2;margin-bottom:3mm;padding-bottom:3mm;position:relative}
.sec h2::after{content:"";position:absolute;${isAr ? 'right' : 'left'}:0;bottom:0;width:46px;height:3px;border-radius:2px;background:var(--indigo)}
.lead{font-size:10.5pt;color:var(--slate);max-width:168mm}
/* Callout */
.callout{break-inside:avoid;background:var(--bg);border:1pt solid var(--line);border-${isAr ? 'right' : 'left'}:4pt solid var(--emerald);border-radius:10px;padding:6mm 7mm;margin-top:5mm}
.callout h3{font-size:11.5pt;margin-bottom:3mm;display:flex;align-items:center;gap:9px}
.cdot{width:9px;height:9px;border-radius:50%;background:var(--emerald)}
.takeaways{list-style:none;margin-top:3mm;display:grid;gap:3mm}
.takeaways li{display:flex;gap:10px;align-items:flex-start;font-size:9.6pt;color:var(--ink)}
.takeaways .idx{flex:none;width:18px;height:18px;border-radius:5px;background:var(--bgi);color:var(--indigo);font-weight:800;font-size:8pt;display:flex;align-items:center;justify-content:center;margin-top:1px}
/* KPI */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:5mm}
.kpi{break-inside:avoid;border:1pt solid var(--line);border-radius:10px;padding:6mm 5mm 5mm;position:relative;overflow:hidden}
.kpi::before{content:"";position:absolute;top:0;${isAr ? 'right' : 'left'}:0;width:100%;height:3px;background:var(--indigo)}
.kpi.emerald::before{background:var(--emerald)}.kpi.amber::before{background:var(--amber)}.kpi.navy::before{background:var(--navy)}
.kv{font-family:var(--disp);font-weight:800;font-size:25pt;line-height:1;color:var(--navy);letter-spacing:-1px}
.kv small{font-size:11pt;font-weight:600;color:var(--muted);letter-spacing:0}
.kpi.emerald .kv{color:var(--emerald)}.kpi.amber .kv{color:var(--amber)}
.kl{margin-top:4mm;font-size:7.5pt;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted)}
.kd{margin-top:2mm;font-size:8pt;font-weight:600;color:var(--slate)}
/* Table */
.twrap{break-inside:avoid;margin-top:5mm;border:1pt solid var(--line);border-radius:10px;overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:9.3pt}
thead th{background:var(--navy);color:#fff;font-family:var(--sans);font-weight:600;font-size:8pt;letter-spacing:.6px;text-transform:uppercase;text-align:${isAr ? 'right' : 'left'};padding:3.6mm 5mm}
thead th.c{text-align:center}
tbody td{padding:3.2mm 5mm;border-bottom:.6pt solid var(--line);color:var(--slate);vertical-align:middle}
tbody tr:nth-child(even){background:var(--bg)}tbody tr:last-child td{border-bottom:none}
td.c{text-align:center}td.r{text-align:${isAr ? 'left' : 'right'}}
td .name{font-weight:700;color:var(--navy)}
tr.total{background:var(--bgi)}tr.total td{font-weight:800;color:var(--navy);border-top:1pt solid var(--indigo)}
.meter{display:inline-flex;align-items:center;gap:8px;width:100%}
.trk{flex:1;height:6px;border-radius:4px;background:var(--line);overflow:hidden;min-width:55px}
.fil{height:100%;border-radius:4px;background:var(--indigo)}.fil.good{background:var(--emerald)}.fil.warn{background:var(--amber)}
.mn{width:26px;text-align:${isAr ? 'left' : 'right'};font-weight:700;color:var(--ink);font-size:9pt}
.pill{display:inline-block;font-size:7.5pt;font-weight:700;letter-spacing:.4px;padding:2.5px 9px;border-radius:20px;text-transform:uppercase}
.pill.ok{background:#EAF7EF;color:#2d7a45}.pill.warn{background:#FEF3E2;color:#b9651a}.pill.crit{background:#FBEAE8;color:#a02d23}
/* Detailed cards */
.dcard{break-inside:avoid;border:1pt solid var(--line);border-radius:10px;padding:5mm 6mm;margin-top:4mm}
.dh{display:flex;align-items:center;gap:10px;margin-bottom:2mm}
.dh h3{font-size:12pt;flex:1}
.dscore{font-family:var(--disp);font-weight:800;font-size:16pt}.dscore small{font-size:9pt;color:var(--muted);font-weight:600}
.subt{margin-top:2mm}.subt td{padding:2.4mm 0;border-bottom:.5pt solid var(--line);color:var(--slate)}
.subt td.v{text-align:${isAr ? 'left' : 'right'};color:var(--ink);font-weight:600}
.wt{color:var(--muted);font-weight:400}
.djust{font-size:9.3pt;color:var(--slate);margin-top:3mm;padding-top:3mm;border-top:1pt solid var(--line);line-height:1.55}
/* Green */
.green-wrap{break-inside:avoid;margin-top:5mm;background:#F4FBF6;border:1pt solid rgba(61,163,93,.28);border-radius:10px;padding:6mm 7mm}
.gh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:3mm}.gh h3{font-size:12pt}
.gbadge{color:#fff;font-size:8pt;font-weight:700;padding:3px 11px;border-radius:20px}
.grow{display:flex;align-items:baseline;gap:10px;margin-bottom:4mm}
.gscore{font-family:var(--disp);font-weight:800;font-size:20pt}.gscore small{font-size:10pt;color:var(--muted);font-weight:600}
.pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.pillar{background:#fff;border:1pt solid rgba(61,163,93,.2);border-radius:8px;padding:3.5mm;text-align:center}
.pn{font-size:7.6pt;color:var(--muted);margin-bottom:2mm;min-height:6mm}
.pv{font-family:var(--disp);font-weight:800;font-size:13pt;color:var(--navy)}.pv small{font-size:8pt;color:var(--muted);font-weight:600}
/* Anomalies */
.an{display:flex;gap:10px;align-items:flex-start;padding:10px 13px;border-radius:9px;margin-top:3mm;font-size:9.4pt;break-inside:avoid}
.an.hi{background:#FFF5F5;border:1px solid rgba(192,57,43,.2)}.an.me{background:#FFF9EE;border:1px solid rgba(224,122,31,.22)}
.sev{color:#fff;font-size:7.5pt;font-weight:700;padding:2.5px 9px;border-radius:20px;white-space:nowrap;text-transform:uppercase}
.ok{color:var(--emerald);font-weight:700;font-size:10pt;margin-top:3mm}
.summary{margin-top:4mm;font-size:9pt;color:var(--slate);font-style:italic}
/* Signature */
.signoff{margin-top:11mm;padding-top:7mm;border-top:1.5pt solid var(--line);display:flex;justify-content:space-between;gap:14mm;align-items:flex-start;break-inside:avoid}
.so-note{flex:1}.so-note h4{font-size:12pt;margin-bottom:3mm}.so-note p{font-size:9pt;color:var(--slate);max-width:118mm;line-height:1.55}
.sigline{margin-top:11mm;max-width:72mm}
.sigline span{display:block;border-top:1pt solid var(--slate);width:100%;margin-bottom:4px}
.sigline label{font-size:8pt;color:var(--muted);font-weight:600}
.stamp{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}
.stamp-ring{width:33mm;height:33mm;border-radius:50%;border:2.4pt solid var(--navy);display:flex;align-items:center;justify-content:center;transform:rotate(-7deg);position:relative}
.stamp-ring::after{content:"";position:absolute;inset:2.6mm;border-radius:50%;border:1pt solid var(--navy)}
.stamp-in{text-align:center;line-height:1.25}
.stamp-brand{font-family:var(--disp);font-weight:800;font-size:13pt;letter-spacing:2px;color:var(--navy)}
.stamp-sub{font-size:6pt;font-weight:700;letter-spacing:1.4px;color:var(--emerald);text-transform:uppercase}
.stamp-date{font-size:6pt;color:var(--muted);margin-top:2px}
.stamp-ref{font-size:7.5pt;font-weight:600;color:var(--muted)}
.docfoot{margin-top:9mm;padding-top:5mm;border-top:1pt solid var(--line);font-size:8pt;color:var(--muted);text-align:center}
@media screen{body{background:#eef1f6;padding:22px 0}.cover,.content{width:210mm;background:#fff;box-shadow:0 12px 40px rgba(8,31,92,.14);margin:0 auto}.cover{margin-bottom:22px}.content{padding:18mm 16mm;margin-bottom:22px}}
</style></head>
<body>
  <section class="cover">
    <div class="c-accent"></div>
    <div class="c-top"><img class="c-logo" src="${logo}" alt="Massar" onerror="this.style.display='none'"/><span class="c-word">MASSAR</span></div>
    <div class="c-geo"><i></i><i></i><i></i></div>
    <div class="c-eyebrow">${L.confReport}</div>
    <h1 class="c-title">${esc(L.title)}</h1>
    <p class="c-sub">${esc(L.subtitle)}</p>
    <div class="c-spacer"></div>
    <div class="c-class"><i></i>${L.restricted}</div>
    <dl class="c-meta">
      <div><dt>${L.preparedFor}</dt><dd>${esc(name)}</dd></div>
      <div><dt>${L.preparedBy}</dt><dd>${L.platform}</dd></div>
      <div><dt>${L.dateL}</dt><dd>${date}</dd></div>
      <div><dt>${L.version}</dt><dd>1.0</dd></div>
      <div><dt>${L.reference}</dt><dd>${ref}</dd></div>
      <div><dt>${L.classification}</dt><dd>${L.confidentiel}</dd></div>
    </dl>
  </section>

  <main class="content">
    <section class="sec">
      <div class="eyebrow">01 · ${L.s01}</div>
      <h2>${L.execSummary}</h2>
      <p class="lead">${lead}</p>
      ${takeawaysHtml ? `<div class="callout"><h3><span class="cdot"></span>${L.keyPoints}</h3><ul class="takeaways">${takeawaysHtml}</ul></div>` : ''}
    </section>

    <section class="sec">
      <div class="eyebrow">02 · ${L.s02}</div>
      <h2>${L.keyMetrics}</h2>
      <div class="kpis">${kpis}</div>
    </section>

    <section class="sec">
      <div class="eyebrow">03 · ${L.s03}</div>
      <h2>${L.breakdown}</h2>
      <div class="twrap"><table><thead><tr><th>${L.dimension}</th><th>${L.scoreH}</th><th class="c">${L.statusH}</th></tr></thead><tbody>${tableRows}${totalRow}</tbody></table></div>
      ${greenBlock}
    </section>

    <section class="sec">
      <div class="eyebrow">04 · ${L.s04}</div>
      <h2>${L.detailed}</h2>
      ${detailed}
    </section>

    <section class="sec">
      <div class="eyebrow">05 · ${L.s05}</div>
      <h2>${L.anomTitle}</h2>
      ${anomList}
      ${data.anomaly_summary ? `<p class="summary">${esc(data.anomaly_summary)}</p>` : ''}
    </section>

    <section class="signoff">
      <div class="so-note">
        <h4>${L.signTitle}</h4>
        <p>${esc(L.disclaimer)}</p>
        <div class="sigline"><span></span><label>${L.authSign}</label></div>
      </div>
      <div class="stamp">
        <div class="stamp-ring"><div class="stamp-in"><div class="stamp-brand">MASSAR</div><div class="stamp-sub">${L.official}</div><div class="stamp-date">${date}</div></div></div>
        <div class="stamp-ref">${L.reference}: ${ref}</div>
      </div>
    </section>

    <div class="docfoot">${L.generatedBy} · ${ref} · ${date}</div>
  </main>
  <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
</body></html>`
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

  const handleDownloadReport = () => {
    if (!data) return
    const html = buildReportHtml(data, profile?.name, isAr)
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html) // embedded onload triggers the print/save-as-PDF dialog
      w.document.close()
      w.focus()
      return
    }
    // popup blocked → download the report as a standalone HTML file instead
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-massar-${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
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
                onClick={handleDownloadReport}
                className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm hover:bg-blue-50"
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
