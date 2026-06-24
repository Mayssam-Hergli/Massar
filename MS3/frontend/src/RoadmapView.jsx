import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ClipboardCheck,
  Landmark,
  Target,
  Users,
  FileBadge,
  ChevronDown,
  X,
  Send,
  ExternalLink,
  Download,
  Sparkles,
  MapPin,
  Zap,
  TrendingUp,
  RefreshCw,
  Award
} from "lucide-react";

const BACKEND_URL = "http://localhost:8000";

const ICONS = {
  "clipboard-check": ClipboardCheck,
  "building-bank": Landmark,
  "target-arrow": Target,
  "users-group": Users,
  "file-certificate": FileBadge,
};

const HORIZON_META = {
  immediate: { label: "Immédiat", accent: "#B5472B", soft: "#F4E4DB" },
  short_term: { label: "Court terme", accent: "#8A6A1E", soft: "#F1E8D2" },
  medium_term: { label: "Moyen terme", accent: "#2F6B5E", soft: "#DDEAE5" },
};

const TYPE_LABEL = {
  guide: "Guide",
  financing: "Financement",
  ecosystem: "Écosystème",
  administrative: "Démarche admin.",
};

const MOMENTUM_LABELS = {
  stagnant: { label: "Stagnant", color: "#6B6259", bg: "#EFEAE0" },
  steady: { label: "Constant", color: "#2F6B5E", bg: "#DDEAE5" },
  accelerating: { label: "En Accélération 🚀", color: "#8A6A1E", bg: "#F1E8D2" },
  breakthrough: { label: "Avancée Majeure 💎", color: "#B5472B", bg: "#F4E4DB" }
};

function groupByHorizon(steps) {
  if (!steps) return [];
  const order = ["immediate", "short_term", "medium_term"];
  return order
    .map((h) => ({ horizon: h, items: steps.filter((s) => s.time_horizon === h) }))
    .filter((g) => g.items.length > 0);
}

export default function RoadmapView() {
  // --- Core Application States ---
  const [roadmap, setRoadmap] = useState(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // --- Dynamic Score & Progress States ---
  const [currentScore, setCurrentScore] = useState(22); // Initial placeholder/DB state
  const [momentum, setMomentum] = useState("steady");
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [progressInput, setProgressInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  // --- Contextual Chat States ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [openStepId, setOpenStepId] = useState(null);
  const panelRefs = useRef({});

  // --- 1. ENDPOINT: GENERATE ROADMAP ON MOUNT ---
  useEffect(() => {
    triggerRoadmapGeneration();
  }, []);

  async function triggerRoadmapGeneration() {
    setLoadingRoadmap(true);
    setErrorState(null);

    // Mock diagnostic data payload representing your user profile data from DB/State
    const diagnosticPayload = {
      diagnostic: {
        project_metadata: { sector: "HealthTech", current_stage: "Structuration", legal_form: "SUARL" },
        identified_gaps: [
          { gap_id: "g1", domain: "Legal", description: "Missing company registration.", severity: "CRITICAL" },
          { gap_id: "g2", domain: "Market", description: "No proof of traction.", severity: "HIGH" }
        ]
      },
      scoring: {
        maturity_scores: { overall_score: 22.0, financial_readiness: 10.0, legal_compliance: 15.0, technical_execution: 40.0, market_fit: 20.0 },
        flags: { is_eligible_for_startup_act: true, requires_immediate_capital_injection: false }
      },
      knowledge_chunks: {
        retrieved_chunks: [
          { kb_id: "kb_1", title: "Guide de l'enregistrement légal (RNE)", type: "guide", description: "Procédure d'immatriculation d'entreprise en Tunisie au Registre National des Entreprises.", link: "https://rne.tn", downloadable: true, stage_relevance: ["Structuration"], domain: ["Legal"] },
          { kb_id: "kb_2", title: "Validation de Traction Early-Stage", type: "guide", description: "Méthodes de validation de proposition de valeur auprès des professionnels de santé tunisiens.", link: "https://ecosystem.tn/guides", downloadable: false, stage_relevance: ["Structuration"], domain: ["Market"] }
        ]
      }
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagnosticPayload)
      });

      const result = await response.json();
      if (response.ok && result.status === "success") {
        setRoadmap(result.data);
      } else {
        throw new Error(result.detail || "Erreur lors de la génération de la feuille de route.");
      }
    } catch (err) {
      console.error("Roadmap Generation Error:", err);
      setErrorState(err.message);
    } finally {
      setLoadingRoadmap(false);
    }
  }

  // --- 2. ENDPOINT: EVALUATE PROGRESS (SCORE CALCULATION) ---
  async function handleEvaluateProgress(e) {
    e.preventDefault();
    if (!progressInput.trim() || isEvaluating) return;

    const currentUpdate = progressInput.trim();
    setIsEvaluating(true);
    setEvaluationFeedback("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/roadmap/evaluate-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: roadmap?.project_id || "mock_project_123",
          latest_update: currentUpdate
        })
      });

      const result = await response.json();
      if (response.ok && result.status === "success") {
        // Dynamically update metrics inside the UI
        setCurrentScore(result.data.progress_score);
        setMomentum(result.data.momentum);
        setEvaluationFeedback(result.data.reasoning);
        setProgressInput("");
      } else {
        setEvaluationFeedback("Une erreur est survenue lors de l'évaluation de vos progrès.");
      }
    } catch (err) {
      console.error("Evaluation Network Error:", err);
      setEvaluationFeedback("Impossible de joindre le moteur d'évaluation.");
    } finally {
      setIsEvaluating(false);
    }
  }

  // --- 3. ENDPOINT: CONTEXTUAL ROADMAP CHAT ---
  function handleStepClick(e, step) {
    if (e.ctrlKey || e.metaKey) {
      setChatStep(step);
      setChatSessionId(`session_${step.id}_${Date.now()}`);
      setChatMessages([
        {
          role: "assistant",
          content: `Posez une question sur « ${step.title} » — je répondrai en me basant uniquement sur votre diagnostic, vos scores et les sources citées pour cette étape.`,
        },
      ]);
      setChatOpen(true);
      return;
    }
    setOpenStepId((cur) => (cur === step.id ? null : step.id));
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || isSending) return;

    const userText = chatInput.trim();
    setChatInput("");
    setIsSending(true);
    setChatMessages((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/roadmap/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: chatSessionId,
          project_id: roadmap?.project_id || "mock_project_123",
          clicked_component: {
            title: chatStep.title,
            description: chatStep.explanation,
            step_id: chatStep.id,
          },
          new_message: userText,
        }),
      });

      const result = await response.json();
      if (response.ok && result.status === "success") {
        setChatMessages((prev) => [...prev, { role: "assistant", content: result.data.reply }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
      }
    } catch (err) {
      console.error("Chat Network Error:", err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Impossible de joindre le serveur de diagnostic." }]);
    } finally {
      setIsSending(false);
    }
  }

  const groups = useMemo(() => groupByHorizon(roadmap?.steps), [roadmap]);

  useEffect(() => {
    if (openStepId && panelRefs.current[openStepId]) {
      panelRefs.current[openStepId].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [openStepId]);

  // Loading Screen Layout
  if (loadingRoadmap) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F7F3EC" }}>
        <RefreshCw size={36} className="animate-spin" color="#2F6B5E" style={{ animation: "spin 2s linear infinite" }} />
        <p style={{ marginTop: 16, color: "#6B6259", fontSize: 15, fontFamily: "Inter, sans-serif" }}>Calcul et génération de votre feuille de route personnalisée...</p>
      </div>
    );
  }

  // Error State Layout
  if (errorState) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F7F3EC", padding: 24, textAlign: "center" }}>
        <p style={{ color: "#B5472B", fontWeight: 600, fontSize: 18 }}>Échec de synchronisation</p>
        <p style={{ color: "#6B6259", fontSize: 14, margin: "8px 0 24px", maxWidth: 400 }}>{errorState}</p>
        <button onClick={triggerRoadmapGeneration} style={{ background: "#2F6B5E", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 500 }}>
          Réessayer la génération
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#F7F3EC", fontFamily: "'Inter', sans-serif", display: "flex" }}>
      <div style={{ flex: 1, maxWidth: chatOpen ? "calc(100% - 380px)" : "100%", transition: "max-width 0.25s ease", padding: "48px 32px 96px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          
          {/* Header metrics */}
          <Header stage={roadmap?.maturity_stage || "Analyse..."} score={currentScore} momentum={momentum} />
          
          {/* Progress Evaluator Console Widget */}
          <ProgressEvaluator 
            input={progressInput} 
            setInput={setProgressInput} 
            onSubmit={handleEvaluateProgress} 
            loading={isEvaluating} 
            feedback={evaluationFeedback} 
          />

          <HorizonLegend />

          <div style={{ marginTop: 40 }}>
            {groups.map((group, gi) => (
              <HorizonSection
                key={group.horizon}
                group={group}
                isLast={gi === groups.length - 1}
                openStepId={openStepId}
                onStepClick={handleStepClick}
                panelRefs={panelRefs}
              />
            ))}
          </div>
          <Footnote />
        </div>
      </div>

      {chatOpen && (
        <SideChat
          step={chatStep}
          messages={chatMessages}
          onClose={() => setChatOpen(false)}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={handleSendMessage}
          isSending={isSending}
        />
      )}
    </div>
  );
}

function Header({ stage, score, momentum }) {
  const mMeta = MOMENTUM_LABELS[momentum] || MOMENTUM_LABELS.steady;
  return (
    <div style={{ background: "#FFFFFF", padding: "24px 28px", borderRadius: 16, border: "1px solid #E4DCCB", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A6A1E", fontWeight: 600, marginBottom: 8 }}>
            <MapPin size={13} strokeWidth={2.2} />
            Stade d'avancement · {stage}
          </div>
          <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 32, fontWeight: 600, color: "#262220", margin: 0, letterSpacing: "-0.01em" }}>
            Votre feuille de route
          </h1>
        </div>

        {/* Dynamic Score Indicator & Momentum Chips */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ background: mMeta.bg, color: mMeta.color, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20, border: `1px solid ${mMeta.color}33` }}>
            Élan : {mMeta.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F3EC", padding: "10px 16px", borderRadius: 12, border: "1px solid #E4DCCB" }}>
            <Award size={20} color="#2F6B5E" />
            <div>
              <div style={{ fontSize: 10, color: "#8A8074", textTransform: "uppercase", fontWeight: 600 }}>Score Global</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#262220" }}>{score} <span style={{ fontSize: 12, color: "#8A8074", fontWeight: 400 }}>/ 100</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar metric line */}
      <div style={{ width: "100%", height: 6, background: "#EFEAE0", borderRadius: 3, marginTop: 20, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: "#2F6B5E", transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </div>
  );
}

function ProgressEvaluator({ input, setInput, onSubmit, loading, feedback }) {
  return (
    <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 16, border: "1px solid #E4DCCB", marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#2F6B5E", marginBottom: 12 }}>
        <Zap size={14} fill="#2F6B5E" />
        Déclarer une avancée (Mettre à jour le score)
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ex: J'ai finalisé l'enregistrement légal au RNE et obtenu l'identifiant unique..."
          style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #E4DCCB", fontSize: 13.5, background: "#FDFDFD", color: "#262220", outline: "none" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{ background: (!input.trim() || loading) ? "#A39A8C" : "#2F6B5E", color: "#FFFFFF", border: "none", borderRadius: 10, padding: "0 20px", fontSize: 13.5, fontWeight: 500, cursor: (!input.trim() || loading) ? "not-allowed" : "pointer", transition: "background 0.2s", display: "flex", alignItems: "center", gap: 8 }}
        >
          {loading ? <RefreshCw size={14} style={{ animation: "spin 2s linear infinite" }} /> : <TrendingUp size={14} />}
          Évaluer
        </button>
      </form>
      
      {feedback && (
        <div style={{ marginTop: 14, padding: "12px 16px", background: "#F7F3EC", borderLeft: "3px solid #2F6B5E", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#4A453F", lineHeight: 1.6 }}>
          <strong>Analyse de l'évaluateur :</strong> {feedback}
        </div>
      )}
    </div>
  );
}

function HorizonLegend() {
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {Object.entries(HORIZON_META).map(([key, meta]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent, display: "inline-block" }} />
          <span style={{ fontSize: 12.5, color: "#6B6259" }}>{meta.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizonSection({ group, isLast, openStepId, onStepClick, panelRefs }) {
  const meta = HORIZON_META[group.horizon];
  return (
    <div style={{ position: "relative", marginBottom: isLast ? 0 : 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: meta.accent, background: meta.soft, padding: "5px 11px", borderRadius: 20 }}>
          {meta.label}
        </div>
        <div style={{ flex: 1, height: 1, background: "#E4DCCB" }} />
      </div>

      <div style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 27, top: 8, bottom: 8, width: 2, background: `repeating-linear-gradient(to bottom, ${meta.accent}55 0, ${meta.accent}55 6px, transparent 6px, transparent 12px)` }} />
        {group.items.map((step) => (
          <RoadStop key={step.id} step={step} meta={meta} isOpen={openStepId === step.id} onClick={onStepClick} registerRef={(el) => (panelRefs.current[step.id] = el)} />
        ))}
      </div>
    </div>
  );
}

function RoadStop({ step, meta, isOpen, onClick, registerRef }) {
  const Icon = ICONS[step.icon] || Target;
  return (
    <div style={{ position: "relative", marginBottom: 14 }} ref={registerRef}>
      <button onClick={(e) => onClick(e, step)} style={{ all: "unset", display: "flex", alignItems: "flex-start", gap: 18, width: "100%", cursor: "pointer", boxSizing: "border-box" }}>
        <div style={{ position: "relative", zIndex: 1, width: 56, height: 56, borderRadius: "50%", background: isOpen ? meta.accent : "#FFFFFF", border: `2px solid ${meta.accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
          <Icon size={22} strokeWidth={1.8} color={isOpen ? "#FFFFFF" : meta.accent} />
        </div>
        <div style={{ flex: 1, background: "#FFFFFF", border: `1px solid ${isOpen ? meta.accent : "#E4DCCB"}`, borderRadius: 14, padding: "16px 18px", textAlign: "left", boxShadow: isOpen ? "0 2px 12px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)", transition: "border-color 0.15s, box-shadow 0.15s" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h3 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#262220", margin: 0, lineHeight: 1.4 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: "#8A8074", margin: "5px 0 0", lineHeight: 1.5 }}>Adresse : <span style={{ color: "#6B6259" }}>{step.addresses?.label || "Non spécifiée"}</span></p>
            </div>
            <ChevronDown size={17} color="#A39A8C" style={{ flexShrink: 0, marginTop: 4, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </div>
        </div>
      </button>
      <TracePanel step={step} meta={meta} isOpen={isOpen} />
    </div>
  );
}

function TracePanel({ step, meta, isOpen }) {
  return (
    <div style={{ marginLeft: 74, maxHeight: isOpen ? 480 : 0, opacity: isOpen ? 1 : 0, overflow: "hidden", transition: "max-height 0.28s ease, opacity 0.2s ease" }}>
      <div style={{ padding: "14px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8A8074", marginBottom: 8 }}>
          <Sparkles size={12} /> Pourquoi cette étape
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4A453F", margin: "0 0 16px", maxWidth: 580 }}>{step.explanation}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8A8074", marginBottom: 10 }}>
          Sources utilisées
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {step.resources?.map((r) => (
            <a key={r.source_id} href={r.link} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", border: "1px solid #E4DCCB", borderRadius: 10, padding: "10px 14px", background: "#FFFFFF", maxWidth: 580 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: meta.accent, background: meta.soft, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.02em" }}>{r.source_id}</span>
                <span style={{ fontSize: 13.5, color: "#262220" }}>{r.title}</span>
                <span style={{ fontSize: 11.5, color: "#A39A8C" }}>{TYPE_LABEL[r.type] || r.type}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {r.downloadable && <Download size={14} color="#A39A8C" strokeWidth={1.8} />}
                <ExternalLink size={14} color="#A39A8C" strokeWidth={1.8} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footnote() {
  return (
    <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid #E4DCCB", fontSize: 12.5, color: "#A39A8C", lineHeight: 1.6 }}>
      Chaque étape est générée à partir de votre diagnostic, de vos scores et d'extraits récupérés dans la base de connaissances — aucune ressource n'est inventée par le modèle.
    </div>
  );
}

function SideChat({ step, messages, onClose, chatInput, setChatInput, onSend, isSending }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ width: 380, flexShrink: 0, height: "100vh", position: "sticky", top: 0, background: "#FFFFFF", borderLeft: "1px solid #E4DCCB", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #EFEAE0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#A39A8C", marginBottom: 4 }}>Discuter de cette étape</div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 600, color: "#262220" }}>{step?.title}</div>
        </div>
        <button onClick={onClose} style={{ all: "unset", cursor: "pointer", color: "#A39A8C", padding: 4 }} aria-label="Fermer le chat"><X size={18} /></button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        {messages.map((msg, index) => {
          const isAi = msg.role === "assistant";
          return (
            <div key={index} style={{ alignSelf: isAi ? "flex-start" : "flex-end", maxWidth: "85%", background: isAi ? "#F7F3EC" : "#2F6B5E", color: isAi ? "#4A453F" : "#FFFFFF", borderRadius: isAi ? "4px 14px 14px 14px" : "14px 14px 4px 14px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          );
        })}
        {isSending && <div style={{ alignSelf: "flex-start", fontSize: 12, color: "#A39A8C", fontStyle: "italic", paddingLeft: 4 }}>L'assistant analyse le contexte...</div>}
      </div>
      <div style={{ padding: 16, borderTop: "1px solid #EFEAE0" }}>
        <form onSubmit={(e) => { e.preventDefault(); onSend(); }} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #E4DCCB", borderRadius: 12, padding: "8px 8px 8px 14px" }}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isSending} placeholder={isSending ? "Attente d'une réponse..." : "Votre question..."} style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, background: "transparent", color: "#262220" }} />
          <button type="submit" disabled={!chatInput.trim() || isSending} style={{ all: "unset", cursor: (!chatInput.trim() || isSending) ? "not-allowed" : "pointer", width: 30, height: 30, borderRadius: 8, background: (!chatInput.trim() || isSending) ? "#A39A8C" : "#2F6B5E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }} aria-label="Envoyer">
            <Send size={13.5} color="#FFFFFF" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}