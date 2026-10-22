import React, { useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { consultantApi } from "../consultantApi";

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** A schematic map of Gurgaon: tap a zone bubble to see its sectors and areas. */
function ZoneMap({ zones, active, onSelect }) {
  return (
    <svg className="qzm" viewBox="0 0 340 248" role="group" aria-label="Gurgaon zones">
      {/* main roads, for orientation only */}
      <path className="qzm-road" d="M20 18 L320 210" />
      <path className="qzm-road" d="M262 40 L292 108 L270 170" />
      <path className="qzm-road" d="M78 42 L160 62 L262 40" />
      <path className="qzm-road" d="M214 104 L184 160 L104 200" />
      <text className="qzm-tag" x="300" y="200">NH-48</text>
      {zones.map((z) => {
        const on = active === z.id;
        return (
          <g
            key={z.id}
            className={`qzm-zone${on ? " on" : ""}`}
            transform={`translate(${z.map.x} ${z.map.y})`}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={z.label}
            onClick={() => onSelect(on ? null : z.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(on ? null : z.id);
              }
            }}
          >
            <circle r="23" />
            <text className="qzm-emoji" y="6">{z.emoji}</text>
            <text className="qzm-label" y="37">{z.short}</text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Answering "which area?" the easy way: areas near you in one tap, a search over
 * every sector and locality, popular picks, or tapping a zone on the map.
 */
export default function AreaPicker({ mission, mode, lang, onPick, disabled }) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState(null);
  const [near, setNear] = useState({ state: "idle", areas: [], message: "" });
  const all = useMemo(() => mission.zones.flatMap((z) => z.options), [mission]);
  const popular = mission.popular[mode === "sale" ? "buy" : "rent"] || mission.popular.rent;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^sec(tor)?\s*/, "");
    if (!q) return [];
    return all.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 12);
  }, [all, query]);

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setNear({ state: "error", areas: [], message: "Location isn't available here — use the map or search." });
      return;
    }
    setNear({ state: "loading", areas: [], message: "" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const nearestZone = [...mission.zones].sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng))[0];
        try {
          const data = await consultantApi.nearbyAreas(lat, lng);
          if (data.outside) {
            setNear({ state: "error", areas: [], message: "You seem to be outside Gurgaon — tap a zone on the map instead." });
            return;
          }
          if (data.areas?.length) {
            setZone(nearestZone.id);
            setNear({ state: "ready", areas: data.areas, message: "Closest areas with homes right now:" });
            return;
          }
        } catch (_) {
          // fall back to the nearest zone
        }
        setZone(nearestZone.id);
        setNear({ state: "ready", areas: nearestZone.options.slice(0, 8), message: `You're near ${nearestZone.label}:` });
      },
      () => setNear({ state: "error", areas: [], message: "Location was declined — use the map or search." }),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 }
    );
  };

  const pill = (o, i, extra = "") => (
    <button key={`${o.value}-${i}`} type="button" className={`qpill${extra}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} onClick={() => onPick(o.value, o.label)} disabled={disabled}>
      {o.label}
      {Number.isFinite(o.km) ? <small>{o.km < 1 ? `${Math.round(o.km * 1000)} m` : `${o.km} km`}</small> : null}
    </button>
  );
  const zoneOpen = mission.zones.find((z) => z.id === zone);

  return (
    <div className="qarea">
      <div className="qarea-top">
        <button type="button" className="qarea-near" onClick={findNearMe} disabled={disabled || near.state === "loading"}>
          <LocateFixed size={18} /> {near.state === "loading" ? "Finding…" : "Near me"}
        </button>
        <label className="qarea-search">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sector 57, DLF, Sohna…" aria-label="Search sector or area" />
        </label>
      </div>

      {query.trim() ? (
        <div className="qpills" role="group" aria-label="Matching areas">
          {matches.map((o, i) => pill(o, i))}
          <button type="button" className="qpill use" onClick={() => onPick(query.trim(), query.trim())} disabled={disabled}>
            Use “{query.trim()}” →
          </button>
        </div>
      ) : (
        <>
          {near.message ? <p className="qarea-note">{near.message}</p> : null}
          {near.areas.length ? (
            <div className="qpills" role="group" aria-label="Areas near you">
              {near.areas.map((o, i) => pill(o, i, " near"))}
            </div>
          ) : null}

          <ZoneMap zones={mission.zones} active={zone} onSelect={setZone} />

          {zoneOpen ? (
            <div className="qarea-zone">
              <p className="qarea-note">
                {zoneOpen.emoji} <strong>{zoneOpen.label}</strong> — tap your area
              </p>
              <div className="qpills scroll" role="group" aria-label={zoneOpen.label}>
                {zoneOpen.options.map((o, i) => pill(o, i))}
              </div>
            </div>
          ) : (
            <div className="qpills" role="group" aria-label="Popular areas">
              {popular.map((v, i) => pill({ value: v, label: v }, i))}
              {pill({ value: mission.anywhere.value, label: mission.anywhere.label[lang] || mission.anywhere.label.en }, popular.length, " soft")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
