import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";

export const MAX_BEDROOMS = 5;
const word = (value, lang) => (value && typeof value === "object" ? value[lang] || value.en : value);
export const sizeValue = (bedrooms) => (bedrooms === 0 ? "1 RK" : `${bedrooms} BHK`);

// who sleeps where: each bedroom you add gets a resident
const ROOMS = [
  { name: "Master", who: "🧑‍🤝‍🧑" },
  { name: "Kids", who: "🧒" },
  { name: "Parents", who: "👵" },
  { name: "Guest", who: "🧳" },
  { name: "Study", who: "🧑‍💻" },
];

/** The size option (label, sub) for a number of bedrooms, from the quest's BHK mission. */
export function sizeOption(mission, bedrooms, lang) {
  const o = mission.options.find((x) => x.value === sizeValue(bedrooms));
  return { value: sizeValue(bedrooms), label: o ? word(o.label, lang) : sizeValue(bedrooms), sub: o ? word(o.sub, lang) : "" };
}

/**
 * A floor plan you furnish: the hall and kitchen are always there, and every
 * bedroom you add lights up with its bed and who sleeps there. Tap a room to
 * have exactly that many bedrooms (tap the last one again to take it away);
 * tapping the hall makes it a studio.
 */
export function HomePlan({ bedrooms, onChange, large = false }) {
  return (
    <div className={`hp${large ? " large" : ""}`} role="group" aria-label="Bedrooms">
      <button type="button" className={`hp-room hall${bedrooms === 0 ? " on" : ""}`} onClick={() => onChange(0)} aria-pressed={bedrooms === 0} aria-label="Studio, no separate bedroom">
        <span className="hp-ico">🛋️</span>
        <small>Hall + kitchen</small>
      </button>
      {ROOMS.map((room, i) => {
        const n = i + 1;
        const on = n <= bedrooms;
        return (
          <button
            key={room.name}
            type="button"
            className={`hp-room bed${on ? " on" : ""}`}
            style={{ "--i": i }}
            onClick={() => onChange(n === bedrooms ? n - 1 : n)}
            aria-pressed={on}
            aria-label={on ? `${room.name} bedroom, ${n}` : `Add a ${room.name} bedroom`}
          >
            {on ? (
              <>
                <span className="hp-ico" key={`on-${n}`}>🛏️</span>
                <span className="hp-who" aria-hidden="true">{room.who}</span>
                <i className="hp-z" aria-hidden="true">z</i>
              </>
            ) : (
              <span className="hp-ico plus">+</span>
            )}
            <small>{room.name}</small>
          </button>
        );
      })}
    </div>
  );
}

/** − / + bedroom buttons around the size readout (one compact row). */
export function BedroomStepper({ bedrooms, setBedrooms, option }) {
  return (
    <div className="qtw-compact">
      <button type="button" className="qtw-step" onClick={() => setBedrooms((b) => Math.max(0, b - 1))} disabled={bedrooms === 0} aria-label="Remove a bedroom">
        <Minus size={18} />
      </button>
      <p className="qtw-value" aria-live="polite">
        <strong>{option.label}</strong>
        {option.sub ? <small>{option.sub}</small> : null}
      </p>
      <button type="button" className="qtw-step" onClick={() => setBedrooms((b) => Math.min(MAX_BEDROOMS, b + 1))} disabled={bedrooms === MAX_BEDROOMS} aria-label="Add a bedroom">
        <Plus size={18} />
      </button>
    </div>
  );
}

/** The size question on its own card (used when the 3D map isn't available). */
export default function HomePicker({ mission, lang, onPick }) {
  const [bedrooms, setBedrooms] = useState(2);
  const any = mission.options.find((o) => o.value === "any bhk");
  const option = sizeOption(mission, bedrooms, lang);
  return (
    <div className="qtw">
      <p className="qtw-hint">Furnish your home — tap the rooms you need</p>
      <HomePlan large bedrooms={bedrooms} onChange={setBedrooms} />
      <BedroomStepper bedrooms={bedrooms} setBedrooms={setBedrooms} option={option} />
      <div className="qbudget-actions">
        {any ? (
          <button type="button" className="qpill soft" onClick={() => onPick(any.value, word(any.label, lang))}>
            {word(any.label, lang)} size
          </button>
        ) : null}
        <button type="button" className="qcta" onClick={() => onPick(option.value, option.label)}>
          Continue
        </button>
      </div>
    </div>
  );
}
