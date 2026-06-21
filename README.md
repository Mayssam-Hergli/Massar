# Massar — MS1 (File Parser + Questionnaire Intake)

Backend services for the **Massar** startup / project-viability assessment platform.
This repository contains **my** part of a multi-agent system — **MS1**: ingest the
founder's documents, pre-fill and verify their questionnaire, and write the
`diagnostic_answers` contract that the teammate-owned **MS2 scoring agent** reads. All
services are async, typed (Pydantic), and integrate through a shared **PostgreSQL**
database rather than by calling each other directly.

---

## What MS1 delivers

| Capability | Module | What it does |
|---|---|---|
| **File Parser** | `services/file_parser` | Reads uploaded documents (PDF / DOCX / CSV / XLSX) and turns them into plain text + typed fragments |
| **Document pre-fill & verify** ⭐ | `services/ms1_diagnostic/prefill.py` | Maps a pitch deck / business plan onto the 31 questionnaire keys → **suggests** answers and **cross-checks** the founder's submission (match / mismatch / fill) |
| **Questionnaire intake** ⭐ | `services/ms1_diagnostic/answer_schema.py`, `intake.py` | Validates the venture questionnaire against the 31-key contract and writes the flat `diagnostic_answers` object for MS2 |
| **Common platform** | `services/common` | Cross-cutting: config, structured observability, resilience, health, typed errors |

⭐ = the features that wire the PDF and the questionnaire together.

### Where MS1 fits in the team workflow

```text
Founder uploads pitch deck / business plan (PDF/DOCX/CSV/XLSX)
        │   File Parser  +  DocumentPrefillService
        ▼
Pre-filled + verified answers  ──►  founder confirms / edits
        │   IntakeService  (validate → build)
        ▼
diagnostic_answers  (31 flat venture keys, JSONB)
        on project_profiles
        │
        ▼
MS2 Scoring Agent (teammate)  reads diagnostic_answers → writes scores
        │
        ▼
MS3 Agent (teammate)  reads scores → decides KB retrieval
```

No service calls another directly — each stage reads what the previous wrote to the
shared `project_profiles` table. The PDF step is **assistive**: it pre-fills and flags,
but MS1 only ever writes the answers the founder finally confirms, so the MS2 contract
stays exactly the 31 keys.

---

## The 31-key `diagnostic_answers` contract

`services/ms1_diagnostic/answer_schema.py` is the **single source of truth** for what
MS1 writes (and MS2 reads). Keys are grouped by the scorer's modules; every key is
always present (optional keys are defaulted):

| Group | Keys |
|---|---|
| **market** (6) | `market_size`, `customer_interviews`, `has_loi`, `has_paying_customers`, `revenue_model_documented`, `revenue_model_type` |
| **commercial** (4) | `value_proposition_clarity`, `product_maturity`, `pricing_strategy`, `offer_need_alignment` |
| **innovation** (4) | `local_novelty`, `technology_intensity`, `barrier_to_entry`, `has_ip_protection`* |
| **scalability** (3) | `replicability`, `manual_dependency`, `geographic_potential` |
| **green** (12) | `energy_source`, `energy_consumption`, `transport_activity`, `water_volume`, `water_origin`, `wastewater_treatment`, `zone_type`, `surface_impacted`, `ecosystem_disruption`, `raw_material_consumption`, `waste_volume`, `recycling_strategy` |
| **anomaly** (2) | `has_pitch_deck`*, `funding_needed`* |

`*` optional — defaults applied (`has_ip_protection="none"`, `revenue_model_type="undefined"`,
`has_pitch_deck=false`, `funding_needed=""`). Schema version: `ms1.answers.v1`.

---

## Repository layout

```text
services/
├── common/                 # Cross-cutting platform layer
│   ├── config.py           #   env-driven Settings tree (APP_* vars)
│   ├── exceptions.py       #   rooted PlatformError hierarchy
│   ├── observability.py    #   JSON logging, correlation IDs, metrics sink
│   ├── resilience.py       #   retry, circuit breaker, timeout, concurrency gate
│   └── health.py           #   liveness / readiness probes
│
├── file_parser/            # Document ingestion (PDF/DOCX/CSV/XLSX → text/fragments)
│   ├── extractors.py       #   async pdfplumber / python-docx / pandas extractors
│   ├── normalizer.py       #   fragment → typed signal helper
│   └── core.py             #   pipeline orchestration + persistence
│
├── ms1_diagnostic/         # MS1 — the active venture path
│   ├── answer_schema.py    # ⭐ the 31-key contract: enums, validation, builder
│   ├── intake.py           # ⭐ IntakeService (validate→build→write) + AnswerRepository
│   ├── prefill.py          # ⭐ DocumentPrefillService: doc → suggest & verify answers
│   │
│   ├── questions.py        #   (legacy ESG) branching DAG questionnaire
│   ├── gap_detector.py     #   (legacy ESG) perception-vs-reality analytics
│   ├── blocker_ranker.py   #   (legacy ESG) priority blocker matrix
│   └── engine.py           #   (legacy ESG) maturity classifier
│
└── scoring_agent/          # (reference) MS2 implementation — teammate owns the live one

demo_prefill.py             # pitch deck → suggested + verified answers
demo_intake.py              # confirmed answers → the diagnostic_answers MS2 reads
demo.py                     # (legacy ESG) full parse → diagnose → score pipeline
tests/                      # pytest suite (13 tests)
INTEGRATION.md              # shared-DB merge notes
requirements.txt
```

> **Active vs. legacy:** the Massar venture flow uses **`answer_schema.py` + `intake.py`
> + `prefill.py`**. The ESG diagnostic modules (`questions/gap_detector/blocker_ranker/
> engine`) and the reference `scoring_agent` are an earlier, richer analytics model
> retained in the tree (exercised by `demo.py` / `tests/test_end_to_end.py`).

---

## Features in detail

### 1. File Parser (`services/file_parser`)

Reads a document off the event loop and yields its text.

- **Extractors** (`extractors.py`) — one per file type (`pdfplumber`, `python-docx`,
  `pandas`), all behind a uniform async `extract()` that offloads the blocking libraries
  to threads. An `ExtractorRegistry` resolves by content-type or extension.
- Enterprise hardening: file-size + content-type validation, content-hash idempotency,
  bounded batch concurrency, resilient persistence, correlation-scoped logging/metrics.

### 2. Document pre-fill & verify ⭐ (`prefill.py`)

Turns an uploaded pitch deck / business plan into questionnaire help.

- **`DocumentPrefillService.suggest_from_document(...)`** — parses the file (via the File
  Parser) and runs a rule-based extractor that maps phrases to the venture keys, each
  suggestion carrying a **confidence** and an **evidence snippet** (e.g. *"raising a
  **Series A** round"* → `funding_needed="series_a"`). Only values valid for a key's enum
  are kept, so suggestions can never break the contract. An optional structured-LLM
  extractor can be injected for messy decks.
- **`verify(answers, suggestions)`** — cross-checks the founder's submission against the
  document and labels each field **match / mismatch / prefill** (mismatches are surfaced
  for the founder to confirm).
- **`prefilled_answers(...)`** — fills confident blanks so the form starts mostly complete.

### 3. Questionnaire intake ⭐ (`answer_schema.py`, `intake.py`)

The contract producer.

- **`answer_schema.py`** — the authoritative 31-key spec with enum values, plus
  `validate_answers()` (rejects unknown keys, bad enums, out-of-range `has_loi`) and
  `build_diagnostic_answers()` (coerces types, applies optional-key defaults, guarantees
  every key is present).
- **`intake.py`** — `IntakeService.submit(...)` runs validate → build → persist;
  `AnswerRepository` writes the flat object to `project_profiles.diagnostic_answers` with
  an **additive, column-scoped** upsert (never touches other teams' columns) and an
  append-only `project_answers_history` audit trail. Mirrors the team's
  `PATCH /profiles/{id}/answers` endpoint shape.

### 4. Common platform (`services/common`)

- **`config.py`** — one immutable, env-driven `Settings` tree (`APP_*`).
- **`observability.py`** — JSON structured logging, a `correlation_id` that flows through
  async chains into every log line, and a pluggable `MetricsSink` (in-memory default;
  swap for Prometheus/OTel without touching call sites).
- **`resilience.py`** — `retry`/`retry_async`, `AsyncCircuitBreaker`, `with_timeout`,
  `BoundedGate`.
- **`health.py`** — liveness + DB-backed readiness probes.
- **`exceptions.py`** — a rooted `PlatformError` hierarchy mapping cleanly to HTTP codes
  (e.g. `AnswerValidationError` → 4xx, `PersistenceError` → 5xx).

---

## Demos & tests (run in the terminal)

```bash
python demo_prefill.py     # pitch deck → 19 suggested answers + mismatch flags
python demo_intake.py      # confirmed answers → the 31-key diagnostic_answers JSON
python demo.py             # (legacy ESG) full parse → diagnose → score pipeline
python -m pytest -q        # 13 passed
```

All demos run **with no database and no API key** (in-memory pool + deterministic logic).

---

## Installation

```bash
python -m pip install -r requirements.txt
```

Runtime deps: `pydantic`, `pdfplumber`, `python-docx`, `pandas`, `openpyxl`, `asyncpg`,
`anthropic`. `anthropic` and `asyncpg` are **lazy-loaded** — the intake, pre-fill, and
parsing logic run and are testable without them. Set `ANTHROPIC_API_KEY` only to enable
the optional LLM extractor.

---

## Quickstart

### Pre-fill & verify from a document

```python
from services.ms1_diagnostic.prefill import DocumentPrefillService

svc = DocumentPrefillService()
suggestions = await svc.suggest_from_document(
    data=open("deck.pdf", "rb").read(), filename="deck.pdf", content_type="application/pdf",
)
verifications = svc.verify(answers=founder_answers, suggestions=suggestions)
# surface mismatches; svc.prefilled_answers(...) fills confident blanks
```

### Submit the questionnaire (writes `diagnostic_answers` for MS2)

```python
from services.ms1_diagnostic.intake import IntakeService, AnswerRepository

repo = AnswerRepository(pool)
await repo.ensure_schema()                          # additive; safe alongside teammates'
service = IntakeService(repository=repo)
diagnostic_answers = await service.submit(
    project_id=pid, tenant_id=tid, answers=confirmed_answers,
)   # validated, all 31 keys present, written to project_profiles.diagnostic_answers
```

---

## Configuration

Environment variables under the `APP_` prefix (see `services/common/config.py`):

| Variable | Default | Purpose |
|---|---|---|
| `APP_DATABASE_DSN` | – | PostgreSQL connection string (asyncpg) |
| `APP_PARSER_MAX_FILE_BYTES` | `26214400` | Upload size limit (25 MiB) |
| `APP_PARSER_MAX_CONCURRENCY` | `8` | Parallel document parses |
| `APP_LLM_ENABLED` | `true` | Toggle the optional LLM extractor |
| `APP_LLM_MODEL` | `claude-opus-4-8` | Model id |
| `APP_LLM_TIMEOUT_SECONDS` | `45` | Per-LLM-call timeout |
| `APP_CIRCUIT_FAILURE_THRESHOLD` | `5` | Failures before a circuit opens |
| `APP_LOG_JSON` | `true` | JSON vs. human logs |

---

## Operational notes

- Call `configure_logging(...)` once at process startup.
- Call `AnswerRepository.ensure_schema()` once at startup — it's **additive**
  (`ADD COLUMN IF NOT EXISTS`) and composes safely with whatever owns the rest of
  `project_profiles`, in any order.
- Health probes: `HealthCheck(pool=pool).readiness()` for Kubernetes / load balancers.
- Tenant-aware (`tenant_id`) with an append-only history table for audit.

---

## Status

MS1 is working end to end: **document → pre-fill/verify → confirmed answers →
`diagnostic_answers` (31 keys)**, proven by `demo_prefill.py`, `demo_intake.py`, and a
**13-test** suite. The optional LLM layers degrade gracefully when no API key is set.

**Open (teammate / DB-owner items):** live Supabase DSN + `project_profiles.id` type;
a thin `PATCH /profiles/{id}/answers` HTTP route over `IntakeService`; confirmation of a
possible 3rd anomaly key.
