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
} from "lucide-react";
import roadmapData from "./roadmapData.json";

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

function groupByHorizon(steps) {
  const order = ["immediate", "short_term", "medium_term"];
  return order
    .map((h) => ({ horizon: h, items: steps.filter((s) => s.time_horizon === h) }))
    .filter((g) => g.items.length > 0);
}

export default function RoadmapView() {
  const steps = roadmapData.steps;
  const groups = useMemo(() => groupByHorizon(steps), [steps]);

  const [openStepId, setOpenStepId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const panelRefs = useRef({});

  function handleStepClick(e, step) {
    if (e.ctrlKey || e.metaKey) {
      setChatStep(step);
      setChatOpen(true);
      return;
    }
    setOpenStepId((cur) => (cur === step.id ? null : step.id));
  }

  useEffect(() => {
    if (openStepId && panelRefs.current[openStepId]) {
      panelRefs.current[openStepId].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [openStepId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#F7F3EC",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: chatOpen ? "calc(100% - 380px)" : "100%",
          transition: "max-width 0.25s ease",
          padding: "48px 32px 96px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Header stage={roadmapData.maturity_stage} />
          <HorizonLegend />

          <div style={{ marginTop: 56 }}>
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
          onClose={() => setChatOpen(false)}
          chatInput={chatInput}
          setChatInput={setChatInput}
        />
      )}
    </div>
  );
}

function Header({ stage }) {
  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#8A6A1E",
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        <MapPin size={13} strokeWidth={2.2} />
        Stade actuel · {stage}
      </div>
      <h1
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 38,
          lineHeight: 1.15,
          fontWeight: 600,
          color: "#262220",
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        Votre feuille de route
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "#6B6259",
          marginTop: 12,
          maxWidth: 520,
          lineHeight: 1.6,
        }}
      >
        Chaque étape découle directement de votre diagnostic et de vos scores.
        Cliquez sur une étape pour voir ses sources.{" "}
        <span style={{ color: "#4A453F" }}>
          Ctrl + clic pour en discuter.
        </span>
      </p>
    </div>
  );
}

function HorizonLegend() {
  return (
    <div style={{ display: "flex", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
      {Object.entries(HORIZON_META).map(([key, meta]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: meta.accent,
              display: "inline-block",
            }}
          />
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: meta.accent,
            background: meta.soft,
            padding: "5px 11px",
            borderRadius: 20,
          }}
        >
          {meta.label}
        </div>
        <div style={{ flex: 1, height: 1, background: "#E4DCCB" }} />
      </div>

      <div style={{ position: "relative" }}>
        {/* the road line */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 27,
            top: 8,
            bottom: 8,
            width: 2,
            background: `repeating-linear-gradient(to bottom, ${meta.accent}55 0, ${meta.accent}55 6px, transparent 6px, transparent 12px)`,
          }}
        />
        {group.items.map((step) => (
          <RoadStop
            key={step.id}
            step={step}
            meta={meta}
            isOpen={openStepId === step.id}
            onClick={onStepClick}
            registerRef={(el) => (panelRefs.current[step.id] = el)}
          />
        ))}
      </div>
    </div>
  );
}

function RoadStop({ step, meta, isOpen, onClick, registerRef }) {
  const Icon = ICONS[step.icon] || Target;

  return (
    <div style={{ position: "relative", marginBottom: 14 }} ref={registerRef}>
      <button
        onClick={(e) => onClick(e, step)}
        style={{
          all: "unset",
          display: "flex",
          alignItems: "flex-start",
          gap: 18,
          width: "100%",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isOpen ? meta.accent : "#FFFFFF",
            border: `2px solid ${meta.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <Icon
            size={22}
            strokeWidth={1.8}
            color={isOpen ? "#FFFFFF" : meta.accent}
          />
        </div>

        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            border: `1px solid ${isOpen ? meta.accent : "#E4DCCB"}`,
            borderRadius: 14,
            padding: "16px 18px",
            textAlign: "left",
            boxShadow: isOpen
              ? "0 2px 12px rgba(0,0,0,0.05)"
              : "0 1px 2px rgba(0,0,0,0.02)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#262220",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "#8A8074",
                  margin: "5px 0 0",
                  lineHeight: 1.5,
                }}
              >
                Adresse :{" "}
                <span style={{ color: "#6B6259" }}>
                  {step.addresses.label}
                </span>
              </p>
            </div>
            <ChevronDown
              size={17}
              color="#A39A8C"
              style={{
                flexShrink: 0,
                marginTop: 4,
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </div>
        </div>
      </button>

      <TracePanel step={step} meta={meta} isOpen={isOpen} />
    </div>
  );
}

function TracePanel({ step, meta, isOpen }) {
  return (
    <div
      style={{
        marginLeft: 74,
        maxHeight: isOpen ? 480 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s ease, opacity 0.2s ease",
      }}
    >
      <div style={{ padding: "14px 0 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#8A8074",
            marginBottom: 8,
          }}
        >
          <Sparkles size={12} />
          Pourquoi cette étape
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "#4A453F",
            margin: "0 0 16px",
            maxWidth: 580,
          }}
        >
          {step.explanation}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#8A8074",
            marginBottom: 10,
          }}
        >
          Sources utilisées
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {step.resources.map((r) => (
            <a
              key={r.source_id}
              href={r.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid #E4DCCB",
                borderRadius: 10,
                padding: "10px 14px",
                background: "#FFFFFF",
                maxWidth: 580,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: meta.accent,
                    background: meta.soft,
                    padding: "3px 8px",
                    borderRadius: 6,
                    letterSpacing: "0.02em",
                  }}
                >
                  {r.source_id}
                </span>
                <span style={{ fontSize: 13.5, color: "#262220" }}>
                  {r.title}
                </span>
                <span style={{ fontSize: 11.5, color: "#A39A8C" }}>
                  {TYPE_LABEL[r.type] || r.type}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {r.downloadable && (
                  <Download size={14} color="#A39A8C" strokeWidth={1.8} />
                )}
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
    <div
      style={{
        marginTop: 56,
        paddingTop: 20,
        borderTop: "1px solid #E4DCCB",
        fontSize: 12.5,
        color: "#A39A8C",
        lineHeight: 1.6,
      }}
    >
      Chaque étape est générée à partir de votre diagnostic, de vos scores et
      d'extraits récupérés dans la base de connaissances — aucune ressource
      n'est inventée par le modèle.
    </div>
  );
}

function SideChat({ step, onClose, chatInput, setChatInput }) {
  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "#FFFFFF",
        borderLeft: "1px solid #E4DCCB",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #EFEAE0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#A39A8C",
              marginBottom: 4,
            }}
          >
            Discuter de cette étape
          </div>
          <div
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 16,
              fontWeight: 600,
              color: "#262220",
            }}
          >
            {step?.title}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            all: "unset",
            cursor: "pointer",
            color: "#A39A8C",
            padding: 4,
          }}
          aria-label="Fermer le chat"
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: "85%",
            background: "#F7F3EC",
            borderRadius: "4px 14px 14px 14px",
            padding: "10px 14px",
            fontSize: 13.5,
            color: "#4A453F",
            lineHeight: 1.6,
          }}
        >
          Posez une question sur « {step?.title} » — je répondrai en me basant
          uniquement sur votre diagnostic, vos scores et les sources citées
          pour cette étape.
        </div>
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #EFEAE0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #E4DCCB",
            borderRadius: 12,
            padding: "8px 8px 8px 14px",
          }}
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Votre question..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13.5,
              background: "transparent",
              color: "#262220",
            }}
          />
          <button
            style={{
              all: "unset",
              cursor: "pointer",
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#2F6B5E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Envoyer"
          >
            <Send size={13.5} color="#FFFFFF" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}