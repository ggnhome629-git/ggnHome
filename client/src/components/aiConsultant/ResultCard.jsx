import React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, MessageSquareText } from "lucide-react";
import { NEARBY_PARAMETERS, POSITION_PARAMETER, formatDistance } from "../../data/propertyParameters";
import { cloudinaryUrl } from "../../utils/cloudinaryImage";

const PositionIcon = POSITION_PARAMETER.icon;

const scoreColor = (s) => (s >= 80 ? "#2f855a" : s >= 60 ? "#0f766e" : s >= 40 ? "#c98a1b" : "#b83a2b");

/** One ranked match: score ring, grounded reasons/caveats and the 7 parameters. */
export default function ResultCard({ card, index, priorities = {}, wantCorner, onAsk, onOpen }) {
  const positionLabel = card.corner === "corner" ? "Corner" : card.corner === "middle" ? "Middle" : "—";
  return (
    <article className="gai-card" style={{ animationDelay: `${Math.min(index, 6) * 90}ms` }} aria-label={`Match ${index + 1}: ${card.title}`}>
      <div className="gai-card-media">
        {card.image ? <img src={cloudinaryUrl(card.image, { width: 640 })} alt="" loading="lazy" decoding="async" /> : null}
        <span className="gai-rank">#{index + 1}</span>
        <div className="gai-score" style={{ "--p": card.score, "--sc": scoreColor(card.score) }} title="Match score from the transparent ranking (budget, location, BHK, type, verified distances, quality)">
          <b>{card.score}</b>
          <small>MATCH</small>
        </div>
        <div className="gai-price">{card.priceLabel}</div>
      </div>
      <div className="gai-card-body">
        <div>
          <h4 className="gai-card-title">{card.title}</h4>
          <div className="gai-card-sub">{[card.bhkLabel, card.sector, card.areaSqft ? `${card.areaSqft.toLocaleString("en-IN")} sq ft` : null].filter(Boolean).join(" · ")}</div>
        </div>
        {(card.reasons?.length || card.caveats?.length) ? (
          <ul className="gai-reasons">
            {(card.reasons || []).slice(0, 5).map((r) => (
              <li key={r} className="ok">
                <CheckCircle2 size={14} color="#2f855a" /> {r}
              </li>
            ))}
            {(card.caveats || []).slice(0, 2).map((r) => (
              <li key={r} className="warn">
                <AlertTriangle size={14} color="#c98a1b" /> {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="gai-badges" aria-label="Nearby places and position">
          {NEARBY_PARAMETERS.map((p) => {
            const v = card.params?.[p.key];
            const wanted = p.key in priorities;
            const Icon = p.icon;
            return (
              <div key={p.key} className={`gai-badge${v ? (wanted ? " hit" : "") : " none"}`} style={{ "--pc": p.color }} title={v ? `${p.label}: ${v.name || ""} ~${formatDistance(v.meters)} (approx. straight-line)` : `${p.label}: not verified`}>
                <Icon size={15} color={v ? p.color : "#b5ab9d"} />
                <b>{v ? `~${formatDistance(v.meters)}` : "n/a"}</b>
                {p.short}
              </div>
            );
          })}
          <div className={`gai-badge${card.corner === "corner" || card.corner === "middle" ? (wantCorner && wantCorner === card.corner ? " hit" : "") : " none"}`} style={{ "--pc": POSITION_PARAMETER.color }} title="Corner or middle position (as given by the lister)">
            <PositionIcon size={15} color={card.corner === "not_sure" ? "#b5ab9d" : POSITION_PARAMETER.color} />
            <b>{positionLabel}</b>
            Position
          </div>
        </div>
        <div className="gai-card-actions">
          <button type="button" className="gai-btn" onClick={() => onAsk(index + 1)}>
            <MessageSquareText size={15} /> Ask AI
          </button>
          <a className="gai-btn primary" href={card.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen && onOpen(card)}>
            View <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
