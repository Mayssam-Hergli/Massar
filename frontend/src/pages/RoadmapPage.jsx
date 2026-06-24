import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useActiveProfile } from '../hooks/useActiveProfile';
import { roadmapApi } from '../api/roadmap';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
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
  Sparkles,
  MapPin,
  TrendingUp,
  RefreshCw
} from "lucide-react";

const ICONS = {
  "clipboard-check": ClipboardCheck,
  "building-bank": Landmark,
  "target-arrow": Target,
  "users-group": Users,
  "file-certificate": FileBadge,
};

const HORIZON_META = {
  "Horizon 1": { label: "Immédiat", accent: "#B5472B", soft: "#F4E4DB" },
  "Horizon 2": { label: "Court terme", accent: "#8A6A1E", soft: "#F1E8D2" },
  "Horizon 3": { label: "Moyen terme", accent: "#2F6B5E", soft: "#DDEAE5" },
};

const MOMENTUM_LABELS = {
  stagnant: { label: "Stagnant", color: "#6B6259", bg: "#EFEAE0" },
  steady: { label: "Constant", color: "#2F6B5E", bg: "#DDEAE5" },
  accelerating: { label: "En Accélération 🚀", color: "#8A6A1E", bg: "#F1E8D2" },
  breakthrough: { label: "Avancée Majeure 💎", color: "#B5472B", bg: "#F4E4DB" }
};

function groupByHorizon(steps) {
  if (!steps) return [];
  const order = ["Horizon 1", "Horizon 2", "Horizon 3"];
  return order
    .map((h) => ({ horizon: h, items: steps.filter((s) => s.time_horizon === h) }))
    .filter((g) => g.items.length > 0);
}

export default function RoadmapPage() {
  const { token } = useAuth();
  const { profile } = useActiveProfile();
  const { isAr } = useLang();

  // --- Core Application States ---
  const [roadmap, setRoadmap] = useState(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [needsGeneration, setNeedsGeneration] = useState(false);

  // --- Dynamic Score & Progress States ---
  const [currentScore, setCurrentScore] = useState(56); 
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

  useEffect(() => {
    if (token && profile?.id) {
      fetchRoadmap();
    }
  }, [token, profile?.id]);

  async function fetchRoadmap() {
    setLoadingRoadmap(true);
    setErrorState(null);
    setNeedsGeneration(false);
    try {
      const res = await roadmapApi.get(token, profile.id);
      if (res && res.status === "success") {
        setRoadmap(res.data);
      } else {
        setNeedsGeneration(true);
      }
    } catch (err) {
      setNeedsGeneration(true);
      console.error("Error fetching roadmap:", err);
    } finally {
      setLoadingRoadmap(false);
    }
  }

  async function triggerRoadmapGeneration() {
    if (!profile?.id) return;
    setLoadingRoadmap(true);
    setErrorState(null);
    try {
      const res = await roadmapApi.generate(token, profile.id);
      if (res && res.status === "success") {
        setRoadmap(res.data);
        setNeedsGeneration(false);
      } else {
        throw new Error("Impossible de générer le parcours.");
      }
    } catch (err) {
      setErrorState(err.message || "Erreur lors de la génération de la feuille de route.");
    } finally {
      setLoadingRoadmap(false);
    }
  }

  async function handleEvaluateProgress(e) {
    e.preventDefault();
    if (!progressInput.trim() || isEvaluating || !profile?.id) return;

    const currentUpdate = progressInput.trim();
    setIsEvaluating(true);
    setEvaluationFeedback("");

    try {
      const res = await roadmapApi.evaluateProgress(token, {
        profileId: profile.id,
        latestUpdate: currentUpdate
      });

      if (res && res.status === "success") {
        setCurrentScore(res.data.progress_score || 65);
        setMomentum(res.data.momentum || "accelerating");
        setEvaluationFeedback(res.data.reasoning);
        setProgressInput("");
      } else {
        setEvaluationFeedback("Une erreur est survenue lors de l'évaluation.");
      }
    } catch (err) {
      setEvaluationFeedback("Impossible de joindre le moteur d'évaluation.");
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleStepClick(e, step) {
    const stepIdStr = String(step.id);
    if (e.ctrlKey || e.metaKey) {
      setChatStep(step);
      setChatSessionId(`session_${stepIdStr}_${Date.now()}`);
      setChatMessages([
        {
          role: "assistant",
          content: `Posez une question sur « ${step.title} » — je répondrai en me basant uniquement sur votre diagnostic, vos scores et les sources citées pour cette étape.`,
        },
      ]);
      setChatOpen(true);
      return;
    }
    setOpenStepId((cur) => (cur === stepIdStr ? null : stepIdStr));
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || isSending || !profile?.id) return;

    const userText = chatInput.trim();
    setChatInput("");
    setIsSending(true);
    setChatMessages((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const res = await roadmapApi.chat(token, {
        sessionId: chatSessionId,
        profileId: profile.id,
        component: {
          title: chatStep.title,
          description: chatStep.explanation || "",
          step_id: String(chatStep.id),
        },
        message: userText
      });

      if (res && res.status === "success") {
        setChatMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Impossible de joindre le serveur de diagnostic." }]);
    } finally {
      setIsSending(false);
    }
  }
const roadmapData = roadmap?.data || roadmap;
console.log("Roadmap data:", roadmapData);
console.log("extracting to groups")
console.log("Roadmap steps:", roadmapData?.steps);
const groups = useMemo(() => groupByHorizon(roadmapData?.steps), [roadmapData]);
  useEffect(() => {
    if (openStepId && panelRefs.current[openStepId]) {
      panelRefs.current[openStepId].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [openStepId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F7F3EC" }}>
      <SiteHeader />

      <main style={{ flex: 1, display: "flex", width: "100%" }}>
        {loadingRoadmap ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <RefreshCw size={36} style={{ animation: "spin 2s linear infinite" }} color="#2F6B5E" />
            <p style={{ marginTop: 16, color: "#6B6259", fontSize: 15 }}>Synchronisation avec votre feuille de route...</p>
          </div>
        ) : errorState ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <p style={{ color: "#B5472B", fontWeight: 600, fontSize: 18 }}>Échec de synchronisation</p>
            <p style={{ color: "#6B6259", fontSize: 14, margin: "8px 0 24px", maxWidth: 400 }}>{errorState}</p>
            <button onClick={fetchRoadmap} style={{ background: "#2F6B5E", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}>
              Réessayer
            </button>
          </div>
        ) : needsGeneration ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
            <Sparkles size={40} color="#8A6A1E" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, color: "#262220", margin: "0 0 8px" }}>Générez votre plan d'action</h2>
            <p style={{ color: "#6B6259", fontSize: 14, maxWidth: 460, marginBottom: 24 }}>Prêt à transformer votre diagnostic en jalons clairs et actionnables adaptés à l'écosystème ?</p>
            <button onClick={triggerRoadmapGeneration} style={{ background: "#2F6B5E", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Générer mon parcours <TrendingUp size={16} />
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, maxWidth: chatOpen ? "calc(100% - 380px)" : "100%", transition: "max-width 0.25s ease", padding: "48px 32px 96px" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              
              <Header stage={roadmapData?.maturity_stage || "Analyse..."} score={currentScore} momentum={momentum} />
              
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
        )}

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
      </main>

      <SiteFooter />
    </div>
  );
}

// --- Structural Layout Subcomponents ---

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
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, color: "#262220", margin: 0 }}>
            Votre feuille de route
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#8A8074", fontWeight: 500 }}>Score d'exécution</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#2F6B5E" }}>{score}<span style={{ fontSize: 14, color: "#A39A8C", fontWeight: 400 }}> /100</span></div>
          </div>
          <div style={{ background: mMeta.bg, color: mMeta.color, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20 }}>
            {mMeta.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressEvaluator({ input, setInput, onSubmit, loading, feedback }) {
  return (
    <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 16, border: "1px solid #E4DCCB", marginBottom: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: "#262220" }}>Console d'évaluation continue</h3>
      <p style={{ fontSize: 12.5, color: "#6B6259", margin: "0 0 14px", lineHeight: 1.5 }}>
        Décrivez vos récentes avancées professionnelles (ex: signature d'un contrat, immatriculation au RNE). L'évaluateur recalculera dynamiquement vos scores.
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: J'ai finalisé le dépôt du dossier de brevet à l'INNORPI hier..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #E4DCCB", fontSize: 13.5, background: "#FDFDFD", color: "#262220", outline: "none" }}
        />
        <button type="submit" disabled={!input.trim() || loading} style={{ background: (!input.trim() || loading) ? "#A39A8C" : "#2F6B5E", color: "#FFFFFF", border: "none", borderRadius: 10, padding: "0 20px", fontSize: 13.5, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          {loading ? <RefreshCw size={14} style={{ animation: "spin 2s linear infinite" }} /> : <TrendingUp size={14} />} Évaluer
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
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", borderBottom: "1px solid #E4DCCB", paddingBottom: 12 }}>
      {Object.entries(HORIZON_META).map(([key, meta]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 500, color: "#6B6259" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.accent }} />
          {meta.label}
        </div>
      ))}
    </div>
  );
}

function HorizonSection({ group, isLast, openStepId, onStepClick, panelRefs }) {
  const meta = HORIZON_META[group.horizon] || { label: "Plan", accent: "#2F6B5E" };
  return (
    <div style={{ marginBottom: isLast ? 0 : 40, display: "flex", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: meta.accent, textTransform: "uppercase", tracking: "0.05em", background: "#FFFFFF", border: `1px solid ${meta.accent}`, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
          {meta.label}
        </div>
        <div style={{ flex: 1, width: 2, background: meta.accent, opacity: 0.3, marginTop: 8 }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {group.items.map((step) => {
          const stepIdStr = String(step.id);
          return (
            <StepItem
              key={stepIdStr}
              step={step}
              isOpen={openStepId === stepIdStr}
              onClick={(e) => onStepClick(e, step)}
              innerRef={(el) => (panelRefs.current[stepIdStr] = el)}
              meta={meta}
            />
          );
        })}
      </div>
    </div>
  );
}

function StepItem({ step, isOpen, onClick, innerRef, meta }) {
  const Icon = ICONS[step.icon] || ClipboardCheck;
  return (
    <div ref={innerRef} style={{ display: "flex", gap: 14, alignItems: "flex-start", width: "100%" }}>
      <button onClick={onClick} style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 12, background: isOpen ? meta.accent : "#FFFFFF", border: `1px solid ${isOpen ? meta.accent : "#E4DCCB"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
        <Icon size={20} color={isOpen ? "#FFFFFF" : meta.accent} />
      </button>
      <div style={{ flex: 1, background: "#FFFFFF", border: `1px solid ${isOpen ? meta.accent : "#E4DCCB"}`, borderRadius: 14, padding: "16px 18px", transition: "all 0.2s" }}>
        
        {/* Fixed Line: Styles cleanly unified to allow full horizontal row extension */}
        <div 
          onClick={onClick} 
          role="button" 
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, cursor: "pointer", width: "100%" }}
        >
          <div>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 600, color: "#262220", margin: 0 }}>{step.title}</h3>
            <p style={{ fontSize: 12.5, color: "#8A8074", margin: "4px 0 0" }}>Jalons · Statut : <span style={{ color: "#2F6B5E", fontWeight: 500 }}>{step.status || "En attente"}</span></p>
          </div>
          <ChevronDown size={17} color="#A39A8C" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>

        {isOpen && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #EFEAE0", fontSize: 14, color: "#4A453F", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 16px", whiteSpace: "pre-wrap" }}>{step.explanation}</p>
            {step.resources && step.resources.length > 0 && (
              <div style={{ background: "#F7F3EC", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#8A6A1E", textTransform: "uppercase" }}>Ressources associées</span>
                {step.resources.map((res, ri) => (
                  <div key={ri} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#262220" }}>{res.title || "Lien Utile"}</span>
                    {res.link && (
                      <a href={res.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2F6B5E", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>
                        Ouvrir <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#A39A8C", marginTop: 12, fontStyle: "italic" }}>
              Astuce : Utilisez Ctrl+Clic (ou Cmd+Clic) pour ouvrir l'assistant contextuel sur cette étape.
            </div>
          </div>
        )}
      </div>
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
    <div style={{ width: 380, borderLeft: "1px solid #E4DCCB", background: "#FFFFFF", display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", position: "sticky", top: 70 }}>
      <div style={{ padding: 18, borderBottom: "1px solid #EFEAE0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#262220" }}>Assistant Contextuel</h4>
          <span style={{ fontSize: 12, color: "#8A8074" }}>Focus: {step?.title}</span>
        </div>
        <button onClick={onClose} style={{ all: "unset", cursor: "pointer", color: "#A39A8C" }}><X size={18} /></button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? "#2F6B5E" : "#F7F3EC", color: msg.role === "user" ? "#FFFFFF" : "#262220", padding: "10px 14px", borderRadius: 12, fontSize: 13.5, maxWidth: "85%", whiteSpace: "pre-wrap" }}>
            {msg.content}
          </div>
        ))}
        {isSending && <div style={{ fontSize: 12, color: "#A39A8C", fontStyle: "italic" }}>Analyse du contexte...</div>}
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #EFEAE0" }}>
        <form onSubmit={(e) => { e.preventDefault(); onSend(); }} style={{ display: "flex", gap: 8, border: "1px solid #E4DCCB", borderRadius: 12, padding: "6px 8px 6px 14px", alignItems: "center" }}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isSending} placeholder="Votre question..." style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, background: "transparent", color: "#262220" }} />
          <button type="submit" disabled={!chatInput.trim() || isSending} style={{ all: "unset", background: "#2F6B5E", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <Send size={14} />
          </button>
        </form>
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