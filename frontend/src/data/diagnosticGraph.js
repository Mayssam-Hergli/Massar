/**
 * Dynamic diagnostic graph — branching topology over the existing 31 fields.
 *
 * The field CONTENT (labels/options) still lives in DiagnosticPage's STEPS;
 * this file only owns the *flow* (which question follows which, conditionally).
 * Two users with different answers therefore traverse different paths and
 * answer a different number of questions.
 *
 * Each node's `next` is resolved by resolveNext():
 *   - `rules[]` are evaluated in order; the first match wins (-> go)
 *   - a rule tests the just-given answer, or any prior answer via `field`
 *   - otherwise `default` is used. "__end__" terminates the questionnaire.
 *
 * IMPORTANT — MS2 scoring contract: the scoring agent reads a fixed set of
 * keys. Questions skipped by a branch are back-filled (see SKIP_DEFAULTS +
 * buildFinalAnswers) with values that stay *consistent* with the branch that
 * skipped them, so scores are never computed on empty/contradictory input.
 */

export const GRAPH = {
  start: 'market_size',
  nodes: {
    // ── Marché ──────────────────────────────────────────────────────────
    market_size:          { next: { default: 'has_paying_customers' } },
    // Branch: paying customers ⇒ demand already proven, skip the validation
    // probing (customer_interviews / has_loi) and jump to revenue model.
    has_paying_customers: { next: { rules: [{ op: 'eq', value: true, go: 'revenue_model_documented' }], default: 'customer_interviews' } },
    customer_interviews:  { next: { default: 'has_loi' } },
    has_loi:              { next: { default: 'revenue_model_documented' } },
    // Branch: no revenue model defined ⇒ asking its *type* is meaningless.
    revenue_model_documented: { next: { rules: [{ op: 'eq', value: 'none', go: 'value_proposition_clarity' }], default: 'revenue_model_type' } },
    revenue_model_type:   { next: { default: 'value_proposition_clarity' } },

    // ── Offre commerciale ───────────────────────────────────────────────
    value_proposition_clarity: { next: { default: 'product_maturity' } },
    product_maturity:     { next: { default: 'pricing_strategy' } },
    pricing_strategy:     { next: { default: 'offer_need_alignment' } },
    offer_need_alignment: { next: { default: 'local_novelty' } },

    // ── Innovation ──────────────────────────────────────────────────────
    local_novelty:        { next: { default: 'technology_intensity' } },
    technology_intensity: { next: { default: 'barrier_to_entry' } },
    barrier_to_entry:     { next: { default: 'has_ip_protection' } },
    has_ip_protection:    { next: { default: 'replicability' } },

    // ── Scalabilité ─────────────────────────────────────────────────────
    replicability:        { next: { default: 'manual_dependency' } },
    manual_dependency:    { next: { default: 'geographic_potential' } },
    geographic_potential: { next: { default: 'has_pitch_deck' } },
    // Branch: no pitch deck ⇒ not actively raising, skip the amount sought.
    has_pitch_deck:       { next: { rules: [{ op: 'eq', value: true, go: 'funding_needed' }], default: 'energy_source' } },
    funding_needed:       { next: { default: 'energy_source' } },

    // ── Impact environnemental ──────────────────────────────────────────
    energy_source:        { next: { default: 'energy_consumption' } },
    energy_consumption:   { next: { default: 'transport_activity' } },
    transport_activity:   { next: { default: 'water_volume' } },
    // Branch: no water used ⇒ skip water origin & wastewater treatment.
    water_volume:         { next: { rules: [{ op: 'eq', value: 'none', go: 'zone_type' }], default: 'water_origin' } },
    water_origin:         { next: { default: 'wastewater_treatment' } },
    wastewater_treatment: { next: { default: 'zone_type' } },
    zone_type:            { next: { default: 'surface_impacted' } },
    surface_impacted:     { next: { default: 'ecosystem_disruption' } },
    ecosystem_disruption: { next: { default: 'raw_material_consumption' } },
    raw_material_consumption: { next: { default: 'waste_volume' } },
    waste_volume:         { next: { default: 'recycling_strategy' } },
    recycling_strategy:   { next: { default: '__end__' } },
  },
}

export const END = '__end__'

/**
 * Back-fill values for questions a branch skipped — chosen to stay coherent
 * with the answer that caused the skip (so MS2 isn't fed contradictions).
 */
export const SKIP_DEFAULTS = {
  customer_interviews: '10+',          // skipped when has_paying_customers = true
  has_loi: 2,                          // skipped when has_paying_customers = true
  revenue_model_type: 'undefined',     // skipped when revenue_model_documented = 'none'
  funding_needed: '',                  // skipped when has_pitch_deck = false
  water_origin: 'rainwater_recycled',  // skipped when water_volume = 'none'
  wastewater_treatment: 'none_generated',
}

function evalRule(rule, answers, lastValue) {
  const v = rule.field ? answers[rule.field] : lastValue
  switch (rule.op) {
    case 'eq': return v === rule.value
    case 'neq': return v !== rule.value
    case 'in': return Array.isArray(rule.value) && rule.value.includes(v)
    case 'gt': return Number(v) > Number(rule.value)
    case 'lt': return Number(v) < Number(rule.value)
    case 'exists': return v != null && v !== ''
    default: return false
  }
}

/** Resolve the id of the next question given the answer just provided. */
export function resolveNext(node, answers, lastValue) {
  const n = node && node.next
  if (!n) return END
  for (const rule of n.rules || []) {
    if (evalRule(rule, answers, lastValue)) return rule.go
  }
  return n.default || END
}

function edgesOf(node) {
  const n = node && node.next
  if (!n) return []
  const e = (n.rules || []).map((r) => r.go)
  if (n.default) e.push(n.default)
  return e
}

/** BFS: minimum number of questions still to answer from `nodeId` to the end. */
export function stepsToEnd(graph, nodeId) {
  const queue = [[nodeId, 0]]
  const seen = new Set([nodeId])
  while (queue.length) {
    const [id, d] = queue.shift()
    if (id === END) return d
    for (const nx of edgesOf(graph.nodes[id])) {
      if (!seen.has(nx)) { seen.add(nx); queue.push([nx, d + 1]) }
    }
  }
  return 1
}

/**
 * Produce the complete 31-key answer object for the backend: start from the
 * caller's defaults, override skipped keys with branch-consistent values,
 * then apply the user's actual answers. Guarantees MS2 receives every key.
 */
export function buildFinalAnswers(answers, baseDefaults) {
  const out = { ...baseDefaults }
  for (const k of Object.keys(baseDefaults)) {
    if (k in answers) out[k] = answers[k]
    else if (k in SKIP_DEFAULTS) out[k] = SKIP_DEFAULTS[k]
  }
  return out
}
