import React, { useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { consultantApi } from "../consultantApi";

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/**
 * The easy way to answer "which area?": one tap for areas near you, the popular
 * ones, a search box over every sector and locality, or browsing by zone.
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
    return all.filter((o) => o.label.toLowerCase().includes(q) || o.label.toLowerCase().replace("sector ", "") === q).slice(0, 12);
  }, [all, query]);

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setNear({ state: "error", areas: [], message: "Location isn't available here — search or pick below." });
      return;
    }
    setNear({ state: "loading", areas: [], message: "" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        try {
          const data = await consultantApi.nearbyAreas(lat, lng);
          if (data.outside) {
            setNear({ state: "error", areas: [], message: "You seem to be outside Gurgaon — search or pick an area below." });
            return;
          }
          if (data.areas?.length) {
            setNear({ state: "ready", areas: data.areas, message: "" });
            return;
          }
        } catch (_) {
          // fall back to the nearest zones below
        }
        // No listings close by (or the server is busy): suggest the nearest zones.
        const zones = [...mission.zones].sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng));
        setZone(zones[0].id);
        setNear({ state: "ready", areas: zones[0].options.slice(0, 8), message: `Closest zone: ${zones[0].emoji} ${zones[0].label}` });
      },
      () => setNear({ state: "error", areas: [], message: "Location permission was declined — search or pick below." }),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 }
    );
  };

  const chip = (o, i, extra = "") => (
    <button key={`${o.value}-${i}`} type="button" className={`qst-answer${extra}`} style={{ "--hue": `${(i * 47) % 360}`, animationDelay: `${i * 40}ms` }} onClick={() => onPick(o.value, o.label)} disabled={disabled}>
      {o.label}
      {Number.isFinite(o.km) ? <small>{o.km < 1 ? `${Math.round(o.km * 1000)} m` : `${o.km} km`}</small> : null}
    </button>
  );
  const zoneOpen = mission.zones.find((z) => z.id === zone);

  return (
    <div className="qst-area">
      <div className="qst-area-top">
        <button type="button" className="qst-near" onClick={findNearMe} disabled={disabled || near.state === "loading"}>
          <LocateFixed size={17} /> {near.state === "loading" ? "Finding areas near you…" : "Near me"}
        </button>
        <label className="qst-area-search">
          <Search size={16} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sector or area — e.g. 57, DLF, Sohna" aria-label="Search sector or area" />
        </label>
      </div>

      {near.message ? <p className="qst-area-note">{near.message}</p> : null}
      {near.areas.length ? (
        <div className="qst-answers" role="group" aria-label="Areas near you">
          {near.areas.map((o, i) => chip(o, i, " near"))}
        </div>
      ) : null}

      {query.trim() ? (
        <div className="qst-answers" role="group" aria-label="Matching areas">
          {matches.length ? matches.map((o, i) => chip(o, i)) : <p className="qst-area-note">No match — press send to use what you typed.</p>}
        </div>
      ) : (
        <>
          <div className="qst-answers" role="group" aria-label="Popular areas">
            {popular.map((v, i) => chip({ value: v, label: v }, i))}
            {chip({ value: mission.anywhere.value, label: mission.anywhere.label[lang] || mission.anywhere.label.en }, popular.length, " ghost")}
          </div>
          <div className="qst-zones" role="tablist" aria-label="Browse by zone">
            {mission.zones.map((z) => (
              <button key={z.id} type="button" role="tab" aria-selected={zone === z.id} className={zone === z.id ? "on" : ""} onClick={() => setZone(zone === z.id ? null : z.id)}>
                {z.emoji} {z.label}
              </button>
            ))}
          </div>
          {zoneOpen ? (
            <div className="qst-answers qst-zone-list" role="group" aria-label={zoneOpen.label}>
              {zoneOpen.options.map((o, i) => chip(o, i))}
            </div>
          ) : null}
        </>
      )}
      {query.trim() ? (
        <button type="button" className="qst-use-typed" onClick={() => onPick(query.trim(), query.trim())} disabled={disabled}>
          Use “{query.trim()}” →
        </button>
      ) : null}
    </div>
  );
}
