import React, { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { consultantApi } from "../consultantApi";
import GgnMap from "./GgnMap";
import { buildLayout } from "./gurgaonMap";

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/**
 * Answering "which area?" the easy way: areas near you in one tap, a search over
 * every sector and locality, popular picks, or tapping a zone on the map.
 */
export default function AreaPicker({ mission, mode, lang, onPick, disabled }) {
  const [target, setTarget] = useState(null); // { pin, nonce } — where the agent is flying
  const [focus, setFocus] = useState(null);
  const [near, setNear] = useState({ state: "idle", message: "", values: null, zones: null });
  const layout = useMemo(() => buildLayout(mission.zones), [mission]);
  const popular = mission.popular[mode === "sale" ? "buy" : "rent"] || mission.popular.rent;

  const fly = (pin) => setTarget({ pin, nonce: Date.now() });
  const flyToValue = (v) => {
    const pin = layout.byValue.get(String(v).toLowerCase());
    if (pin) fly(pin);
    else onPick(v, v);
  };

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setNear({ state: "error", message: "Location isn't available here — use the map or search.", values: null, zones: null });
      return;
    }
    setNear({ state: "loading", message: "", values: null, zones: null });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const nearestZone = [...mission.zones].sort((a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng))[0];
        const zoneFocus = () => setFocus({ id: nearestZone.id, nonce: Date.now() });
        try {
          const data = await consultantApi.nearbyAreas(lat, lng);
          if (data.outside) {
            setNear({ state: "error", message: "You seem to be outside Gurgaon — explore the map instead.", values: null, zones: null });
            return;
          }
          if (data.areas?.length) {
            zoneFocus();
            setNear({ state: "ready", message: "Glowing houses are the closest areas with homes right now.", values: new Set(data.areas.map((a) => a.value.toLowerCase())), zones: new Set([nearestZone.id]) });
            return;
          }
        } catch (_) {
          // fall back to the nearest zone
        }
        zoneFocus();
        setNear({ state: "ready", message: `You're near ${nearestZone.label}.`, values: new Set(), zones: new Set([nearestZone.id]) });
      },
      () => setNear({ state: "error", message: "Location was declined — use the map or search.", values: null, zones: null }),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 }
    );
  };

  return (
    <div className="qarea">
      <GgnMap
        layout={layout}
        target={target}
        focus={focus}
        near={near}
        disabled={disabled}
        onFly={fly}
        onArrive={onPick}
        onUseText={(t) => onPick(t, t)}
      />
      {near.message ? <p className="qarea-note">{near.message}</p> : null}
      <div className="qpills" role="group" aria-label="Quick picks">
        <button type="button" className="qpill near" onClick={findNearMe} disabled={disabled || near.state === "loading"}>
          <LocateFixed size={15} /> {near.state === "loading" ? "Finding…" : "Near me"}
        </button>
        {popular.map((v, i) => (
          <button key={v} type="button" className="qpill" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} onClick={() => flyToValue(v)} disabled={disabled}>
            {v}
          </button>
        ))}
        <button type="button" className="qpill soft" onClick={() => onPick(mission.anywhere.value, mission.anywhere.label[lang] || mission.anywhere.label.en)} disabled={disabled}>
          {mission.anywhere.label[lang] || mission.anywhere.label.en}
        </button>
      </div>
    </div>
  );
}
