import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";

export const MAX_FLOORS = 5;
const word = (value, lang) => (value && typeof value === "object" ? value[lang] || value.en : value);
export const sizeValue = (floors) => (floors === 0 ? "1 RK" : `${floors} BHK`);

/** The size option (label, sub) for a number of floors, from the quest's BHK mission. */
export function sizeOption(mission, floors, lang) {
  const o = mission.options.find((x) => x.value === sizeValue(floors));
  return { value: sizeValue(floors), label: o ? word(o.label, lang) : sizeValue(floors), sub: o ? word(o.sub, lang) : "" };
}

/**
 * The building itself: every floor is a bedroom. Tapping a floor keeps it and
 * knocks down everything above; the roof drops with each floor removed. Used on
 * its own card and standing on a sector's lane in the 3D map.
 */
export function TowerBuilding({ floors, onFloor }) {
  return (
    <div className="qtw-building">
      <div className="qtw-roof" aria-hidden="true">
        <i />
      </div>
      {Array.from({ length: MAX_FLOORS }).map((_, i) => {
        const n = MAX_FLOORS - i; // top floor first, so the stack reads top-down
        const gone = n > floors;
        return (
          <button
            key={n}
            type="button"
            className={`qtw-floor${gone ? " gone" : ""}`}
            onClick={() => onFloor(n)}
            aria-label={`Keep ${sizeValue(n)}`}
            aria-pressed={n === floors}
            tabIndex={gone ? -1 : 0}
          >
            <span className="qtw-win">🛏️</span>
            <span className="qtw-win">🪟</span>
            <span className="qtw-no">{n}</span>
          </button>
        );
      })}
      <div className="qtw-ground" aria-hidden="true">
        <span>🚪</span>
      </div>
      <div className="qtw-debris" key={floors} aria-hidden="true">
        <i /> <i /> <i />
      </div>
    </div>
  );
}

/** − / + floor buttons and the size readout; `compact` puts them on one row (the map panel). */
export function FloorControls({ floors, setFloors, option, compact = false }) {
  if (compact) {
    return (
      <div className="qtw-compact">
        <button type="button" className="qtw-step" onClick={() => setFloors((f) => Math.max(0, f - 1))} disabled={floors === 0} aria-label="Remove a floor">
          <Minus size={18} />
        </button>
        <p className="qtw-value" aria-live="polite">
          <strong>{option.label}</strong>
          {option.sub ? <small>{option.sub}</small> : null}
        </p>
        <button type="button" className="qtw-step" onClick={() => setFloors((f) => Math.min(MAX_FLOORS, f + 1))} disabled={floors === MAX_FLOORS} aria-label="Add a floor">
          <Plus size={18} />
        </button>
      </div>
    );
  }
  return (
    <>
      <p className="qtw-value">
        <strong>{option.label}</strong>
        {option.sub ? <small>{option.sub}</small> : null}
      </p>
      <div className="qtw-actions">
        <button type="button" className="qpill" onClick={() => setFloors((f) => Math.max(0, f - 1))} disabled={floors === 0}>
          <Minus size={15} /> Remove floor
        </button>
        <button type="button" className="qpill" onClick={() => setFloors((f) => Math.min(MAX_FLOORS, f + 1))} disabled={floors === MAX_FLOORS}>
          <Plus size={15} /> Add floor
        </button>
      </div>
    </>
  );
}

/**
 * Size as a building, on its own card (used when the 3D map isn't available).
 * Start with the tall tower and knock floors off until the home is the size you want.
 */
export default function TowerPicker({ mission, lang, onPick }) {
  const [floors, setFloors] = useState(3);
  const any = mission.options.find((o) => o.value === "any bhk");
  const option = sizeOption(mission, floors, lang);

  return (
    <div className="qtw">
      <div className="qtw-stage">
        <div className="qtw-sun" aria-hidden="true" />
        <TowerBuilding floors={floors} onFloor={setFloors} />
      </div>
      <FloorControls floors={floors} setFloors={setFloors} option={option} />
      <p className="qtw-hint">Tap a floor to knock down everything above it</p>
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
