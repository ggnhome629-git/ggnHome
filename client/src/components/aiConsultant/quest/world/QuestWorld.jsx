import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowRight, ExternalLink, LocateFixed, Maximize, Minus, Plus, Search, X } from "lucide-react";
import { consultantApi } from "../../consultantApi";
import { cloudinaryUrl } from "../../../../utils/cloudinaryImage";
import flow from "../../../../data/questFlow.json";
import { TowerBuilding, FloorControls, sizeOption } from "../TowerPicker";
import {
  AMENITY_ICONS,
  FALLBACK_STYLE,
  GURGAON,
  HQ,
  MAX_PICKS,
  areaForListing,
  areasFromReq,
  budgetPhrase,
  kmBetween,
  laneRoad,
  lanePlots,
  loadAreas,
  outlineCollection,
} from "./worldData";

const word = (value, lang) => (value && typeof value === "object" ? value[lang] || value.en : value);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const EMPTY = { type: "FeatureCollection", features: [] };
const OVERVIEW = { center: [GURGAON.lng, GURGAON.lat], zoom: 10.7, pitch: 50, bearing: -12 };
const laneBearing = (i) => 25 + i * 55;
const MISSION = Object.fromEntries(flow.missions.map((m) => [m.slot, m]));

const modeOf = (slot) => (slot === "location" ? "explore" : slot === "budget" || slot === "bhk" ? "lane" : slot === "priorities" ? "nearby" : "idle");

/** GgnHome's agent: a smiling pilot in a little plane, as a map marker. */
const AGENT_SVG = `<svg viewBox="-40 -30 80 60" width="64" height="48" aria-hidden="true">
<ellipse cx="2" cy="24" rx="16" ry="3.5" fill="rgba(15,34,51,.22)"/>
<path d="M-22 4 L-34 -4 L-34 8 Z" fill="#00a79d"/>
<path d="M-24 8 Q-26 -4 -8 -6 L18 -6 Q34 -4 34 4 Q34 12 18 12 L-12 12 Q-22 12 -24 8 Z" fill="#fff" stroke="#00756e" stroke-width="2.4"/>
<path d="M-6 6 L-16 22 L-6 22 L10 6 Z" fill="#00a79d" stroke="#00756e" stroke-width="1.6" stroke-linejoin="round"/>
<circle cx="12" cy="-6" r="9.5" fill="#ffd9b8" stroke="#c98f5f" stroke-width="1.4"/>
<path d="M3 -9 Q12 -22 21 -9 Z" fill="#00756e"/>
<circle cx="9" cy="-6" r="1.4" fill="#0f2233"/><circle cx="15.5" cy="-6" r="1.4" fill="#0f2233"/>
<path d="M8.5 -2 Q12 1 16 -2" fill="none" stroke="#0f2233" stroke-width="1.4" stroke-linecap="round"/>
<rect class="qw-prop" x="32" y="-9" width="3" height="20" rx="1.5" fill="#5d6f80"/>
</svg>`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Adds 3D buildings when the base style has none, plus our own sources and layers. */
function addWorldLayers(map, areas) {
  const layers = map.getStyle().layers || [];
  if (!layers.some((l) => l.type === "fill-extrusion")) {
    const building = layers.find((l) => l["source-layer"] === "building");
    if (building) {
      map.addLayer({
        id: "gg-buildings",
        type: "fill-extrusion",
        source: building.source,
        "source-layer": "building",
        minzoom: 13.5,
        paint: {
          "fill-extrusion-color": "#e4ded4",
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 9],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
          "fill-extrusion-opacity": 0.85,
        },
      });
    }
  }
  if (!map.getSource("gg-sectors")) {
    map.addSource("gg-sectors", { type: "geojson", data: outlineCollection(areas) });
    map.addLayer({
      id: "gg-sector-block",
      type: "fill-extrusion",
      source: "gg-sectors",
      paint: {
        "fill-extrusion-color": ["case", ["boolean", ["feature-state", "picked"], false], "#ffb703", ["boolean", ["feature-state", "near"], false], "#2ec4b6", ["get", "colour"]],
        "fill-extrusion-height": ["case", ["boolean", ["feature-state", "picked"], false], 160, 14],
        "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.45, 14, 0.25, 16, 0.12],
      },
    });
    map.addLayer({
      id: "gg-sector-edge",
      type: "line",
      source: "gg-sectors",
      paint: { "line-color": ["get", "colour"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 2.5], "line-opacity": 0.8 },
    });
  }
  if (!map.getSource("gg-trail")) {
    map.addSource("gg-trail", { type: "geojson", data: EMPTY });
    map.addLayer({ id: "gg-trail", type: "line", source: "gg-trail", paint: { "line-color": "#d48f00", "line-width": 3, "line-dasharray": [0.5, 2.5], "line-opacity": 0.85 }, layout: { "line-cap": "round" } });
  }
  if (!map.getSource("gg-lane")) {
    map.addSource("gg-lane", { type: "geojson", data: EMPTY });
    const w = (base) => ["interpolate", ["exponential", 2], ["zoom"], 14, base / 8, 17, base, 19, base * 4];
    map.addLayer({ id: "gg-lane-edge", type: "line", source: "gg-lane", paint: { "line-color": "#c7ccd1", "line-width": w(30) }, layout: { "line-cap": "round" } });
    map.addLayer({ id: "gg-lane-road", type: "line", source: "gg-lane", paint: { "line-color": "#5b6570", "line-width": w(24) }, layout: { "line-cap": "round" } });
    map.addLayer({ id: "gg-lane-mark", type: "line", source: "gg-lane", paint: { "line-color": "#ffffff", "line-width": w(1.6), "line-dasharray": [3, 3] } });
  }
}

/**
 * The quest's game world: a real 3D map of Gurgaon (MapLibre on LocationIQ or
 * OpenFreeMap tiles) that stays on screen from the area question to the end.
 *  - area (explore): every sector as a 3D block and pin; pick up to three and
 *    GgnHome's agent flies to each.
 *  - size + budget (lane): the camera drops onto a street in the sector; knock
 *    floors off a building for the BHK, then real homes from our listings line
 *    the lane with their rent / price — tap the one that fits your budget.
 *  - nearby (priorities): zoom back out with hospitals, schools, metro… around
 *    the picked areas; tap the ones that matter.
 * Other questions float over a slowly turning map. Calls `onFail` when WebGL or
 * the map can't load, so the classic pickers take over.
 */
export default function QuestWorld({ slot, mode, lang, req, busy, onAnswer, onFail }) {
  const worldMode = modeOf(slot);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const agentRef = useRef(null);
  const agentPos = useRef({ ...HQ });
  const raf = useRef(0);
  const orbitRaf = useRef(0);
  const pinMarkers = useRef(new Map());
  const homeMarkers = useRef([]);
  const amenityMarkers = useRef([]);
  const youMarker = useRef(null);
  const towerMarker = useRef(null);
  const handlers = useRef({});
  const modeRef = useRef(worldMode);
  modeRef.current = worldMode;

  const [areas, setAreas] = useState([]);
  const [styleVersion, setStyleVersion] = useState(0);
  const [zoomBand, setZoomBand] = useState("far");
  const [picks, setPicks] = useState([]);
  const [flying, setFlying] = useState(null); // label while the agent is in the air
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [near, setNear] = useState({ state: "idle", values: new Set() });
  // lane
  const [laneIdx, setLaneIdx] = useState(0);
  const [floors, setFloors] = useState(3);
  const [size, setSize] = useState(null); // { value, label } once chosen
  const [lane, setLane] = useState({ state: "idle", homes: [], stats: null, key: "" });
  const [home, setHome] = useState(null);
  const [towerEl, setTowerEl] = useState(null);
  // nearby
  const [places, setPlaces] = useState({ state: "idle", groups: {} });
  const [chosen, setChosen] = useState([]);

  const ready = styleVersion > 0 && areas.length > 0;
  const toastTimer = useRef(0);
  const say = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ------------------------------------------------------------ setup */
  useEffect(() => {
    let alive = true;
    loadAreas()
      .then((a) => alive && setAreas(a))
      .catch(() => alive && onFail?.());
    return () => {
      alive = false;
    };
  }, [onFail]);

  useEffect(() => {
    let map = null;
    let cancelled = false;
    let styleTimer = 0;
    (async () => {
      let style = FALLBACK_STYLE;
      try {
        const c = await consultantApi.mapConfig();
        if (c?.style) style = c.style;
      } catch (_) {
        // keyless tiles it is
      }
      if (cancelled || !containerRef.current) return;
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [GURGAON.lng, GURGAON.lat],
          zoom: 9.3,
          pitch: 0,
          bearing: 0,
          maxPitch: 75,
          maxBounds: [
            [76.55, 28.05],
            [77.5, 28.8],
          ],
          attributionControl: { compact: true },
        });
      } catch (_) {
        onFail?.();
        return;
      }
      mapRef.current = map;
      let styled = false;
      const switchToFallback = () => {
        if (styled) return;
        if (style !== FALLBACK_STYLE) {
          style = FALLBACK_STYLE;
          map.setStyle(FALLBACK_STYLE);
          clearTimeout(styleTimer);
          styleTimer = setTimeout(() => !styled && onFail?.(), 12000);
        } else onFail?.();
      };
      styleTimer = setTimeout(switchToFallback, 12000);
      map.on("error", (e) => {
        if (!styled && !e?.sourceId) switchToFallback();
      });
      map.on("style.load", () => {
        styled = true;
        clearTimeout(styleTimer);
        setStyleVersion((v) => v + 1);
      });
      map.on("zoom", () => {
        const z = map.getZoom();
        setZoomBand(z >= 13.4 ? "near" : z >= 11.8 ? "mid" : "far");
      });
      map.on("click", "gg-sector-block", (e) => {
        const value = e.features?.[0]?.properties?.value;
        if (value) handlers.current.pickValue?.(value);
      });
      map.on("mouseenter", "gg-sector-block", () => {
        if (modeRef.current === "explore") map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "gg-sector-block", () => {
        map.getCanvas().style.cursor = "";
      });
      const stopOrbit = () => cancelAnimationFrame(orbitRaf.current);
      map.on("mousedown", stopOrbit);
      map.on("touchstart", stopOrbit);

      const agentEl = el("div", "qw-agent");
      const plane = el("div", "qw-agent-plane");
      plane.innerHTML = AGENT_SVG; // static markup, no data
      agentEl.appendChild(plane);
      agentRef.current = { marker: new maplibregl.Marker({ element: agentEl, anchor: "center" }).setLngLat([HQ.lng, HQ.lat]).addTo(map), plane };
    })();
    return () => {
      cancelled = true;
      clearTimeout(styleTimer);
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(orbitRaf.current);
      if (map) map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // our layers go back on after every style (re)load, once the areas are in
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleVersion || !areas.length) return;
    addWorldLayers(map, areas);
  }, [styleVersion, areas]);

  // the agent's starting point, then a short fly-in to the overview on first load
  const introDone = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || introDone.current) return;
    introDone.current = true;
    if (worldMode === "explore" || worldMode === "idle") map.easeTo({ ...OVERVIEW, padding: framePadding(), duration: reducedMotion() ? 0 : 2600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // areas the consultant already has (after a reload, or typed in chat)
  useEffect(() => {
    if (!areas.length) return;
    const known = areasFromReq(req, areas);
    if (known.length && !picks.length) setPicks(known);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, req?.sectors?.join(), req?.localities?.join()]);

  /* ------------------------------------------------------- the agent */
  // GgnBot's line sits over the top of the map and the step's panel over the
  // bottom, so the camera centres on the gap between them.
  // `lift` reserves extra room above the focus point for something tall standing on it.
  const framePadding = useCallback((lift = 0) => {
    const stage = containerRef.current?.closest(".qst");
    const h = containerRef.current?.clientHeight || 600;
    const top = (stage?.querySelector(".qw-top")?.offsetHeight || 200) + lift;
    const panel = stage?.querySelector(".qw-panel");
    const bottom = panel ? panel.offsetHeight + 24 : 260;
    const room = h - top - bottom;
    // on short screens keep at least a third of the map in view
    const squeeze = room < h / 3 ? (h / 3 - room) / 2 : 0;
    return { top: Math.max(0, top - squeeze), bottom: Math.max(0, bottom - squeeze), left: 0, right: 0 };
  }, []);

  const flyAgent = useCallback((to, cam, caption) => {
    const map = mapRef.current;
    const agent = agentRef.current;
    if (!map || !agent) return Promise.resolve();
    const padding = framePadding(cam.lift || 0);
    cancelAnimationFrame(raf.current);
    cancelAnimationFrame(orbitRaf.current);
    const from = { ...agentPos.current };
    const dist = kmBetween(from, to);
    const done = () => {
      agentPos.current = { lng: to.lng, lat: to.lat };
      agent.marker.setLngLat([to.lng, to.lat]);
      agent.plane.style.transform = "";
      setFlying(null);
    };
    if (reducedMotion() || dist < 0.03) {
      map.easeTo({ center: [to.lng, to.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, padding, duration: reducedMotion() ? 0 : 900 });
      done();
      return new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 900));
    }
    const dx = to.lng - from.lng;
    const dy = to.lat - from.lat;
    const len = Math.hypot(dx, dy) || 1;
    const ctrl = { lng: (from.lng + to.lng) / 2 - (dy / len) * len * 0.25, lat: (from.lat + to.lat) / 2 + (dx / len) * len * 0.25 };
    const at = (t) => {
      const u = 1 - t;
      return { lng: u * u * from.lng + 2 * u * t * ctrl.lng + t * t * to.lng, lat: u * u * from.lat + 2 * u * t * ctrl.lat + t * t * to.lat };
    };
    const trail = Array.from({ length: 41 }).map((_, i) => {
      const p = at(i / 40);
      return [p.lng, p.lat];
    });
    map.getSource("gg-trail")?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trail } });
    setFlying(caption);

    const z0 = map.getZoom();
    const p0 = map.getPitch();
    const b0 = map.getBearing();
    let b1 = cam.bearing ?? b0;
    if (b1 - b0 > 180) b1 -= 360;
    if (b0 - b1 > 180) b1 += 360;
    const zMid = Math.min(z0, cam.zoom, 13.2 - Math.min(2.4, dist / 5));
    const ms = clamp(1900 + dist * 170, 2100, 4300);
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        const t = ease(p);
        const pos = at(t);
        const zoom = p < 0.5 ? lerp(z0, zMid, ease(p / 0.5)) : lerp(zMid, cam.zoom, ease((p - 0.5) / 0.5));
        map.jumpTo({ center: [pos.lng, pos.lat], zoom, pitch: lerp(p0, cam.pitch ?? p0, t), bearing: lerp(b0, b1, t), padding });
        agent.marker.setLngLat([pos.lng, pos.lat]);
        agentPos.current = pos;
        const ahead = at(Math.min(1, t + 0.02));
        const a = map.project([pos.lng, pos.lat]);
        const b = map.project([ahead.lng, ahead.lat]);
        const flip = b.x < a.x ? -1 : 1;
        const theta = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const rot = clamp(flip === 1 ? theta : ((theta + 360) % 360) - 180, -35, 35);
        agent.plane.style.transform = `rotate(${Number.isFinite(rot) ? rot : 0}deg) scaleX(${flip})`;
        if (p < 1) raf.current = requestAnimationFrame(step);
        else {
          done();
          resolve();
        }
      };
      raf.current = requestAnimationFrame(step);
    });
  }, [framePadding]);

  /* ------------------------------------------------------ area pins */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || pinMarkers.current.size) return;
    for (const a of areas) {
      const node = el("button", `qw-pin ${a.kind}`);
      node.type = "button";
      node.style.setProperty("--zone", "var(--qw-zone-" + a.zone + ")");
      node.appendChild(el("b", "", a.short));
      if (a.kind === "sector") node.appendChild(el("span", "", a.label));
      node.setAttribute("aria-label", a.label);
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.current.pickValue?.(a.value);
      });
      const marker = new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([a.lng, a.lat]).addTo(map);
      pinMarkers.current.set(a.value, { marker, node });
    }
  }, [ready, areas]);

  // picked / near state onto pins and 3D blocks
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getSource("gg-sectors")) return;
    const picked = new Set(picks.map((p) => p.value));
    for (const a of areas) {
      const isPicked = picked.has(a.value);
      const isNear = near.values.has(a.value);
      pinMarkers.current.get(a.value)?.node.classList.toggle("picked", isPicked);
      pinMarkers.current.get(a.value)?.node.classList.toggle("near", isNear);
      if (a.outline) map.setFeatureState({ source: "gg-sectors", id: a.id }, { picked: isPicked, near: isNear });
    }
  }, [picks, near, areas, ready, styleVersion]);

  const togglePick = useCallback(
    (value) => {
      if (modeRef.current !== "explore" || busy) return;
      const a = areas.find((x) => x.value === value);
      if (!a) return;
      if (picks.some((p) => p.value === value)) {
        setPicks((prev) => prev.filter((p) => p.value !== value));
        return;
      }
      if (picks.length >= MAX_PICKS) {
        say(`Up to ${MAX_PICKS} areas — remove one to add ${a.label}`);
        return;
      }
      setPicks((prev) => [...prev, a]);
      setSearchOpen(false);
      setQuery("");
      flyAgent(a, { zoom: 14.1, pitch: 58, bearing: mapRef.current?.getBearing() }, `Flying to ${a.label}…`).then(() => say(`📍 ${a.label} added to your hunt`));
    },
    [areas, picks, busy, flyAgent, say]
  );
  handlers.current.pickValue = togglePick;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^sec(tor)?\s*-?\s*/, "");
    if (!q) return [];
    return areas
      .filter((a) => (a.kind === "sector" ? a.short.toLowerCase().startsWith(q) : a.label.toLowerCase().includes(q)))
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "sector" ? -1 : 1))
      .slice(0, 8);
  }, [areas, query]);

  const findNearMe = () => {
    if (!navigator.geolocation) return say("Location isn't available here — search instead.");
    setNear({ state: "loading", values: new Set() });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const me = { lat: coords.latitude, lng: coords.longitude };
        if (kmBetween(me, GURGAON) > 60) {
          setNear({ state: "idle", values: new Set() });
          return say("You seem to be outside Gurgaon — explore the map instead.");
        }
        const closest = [...areas].sort((a, b) => kmBetween(me, a) - kmBetween(me, b)).slice(0, 5);
        setNear({ state: "ready", values: new Set(closest.map((a) => a.value)) });
        const map = mapRef.current;
        if (map) {
          youMarker.current?.remove();
          youMarker.current = new maplibregl.Marker({ element: el("div", "qw-you", "You") }).setLngLat([me.lng, me.lat]).addTo(map);
          map.flyTo({ center: [me.lng, me.lat], zoom: 13, pitch: 55, duration: reducedMotion() ? 0 : 2200 });
        }
        say("Glowing areas are closest to you");
      },
      () => {
        setNear({ state: "idle", values: new Set() });
        say("Location was declined — search or tap the map.");
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 }
    );
  };

  /* ---------------------------------------------- mode transitions */
  const clearMarkers = (ref) => {
    ref.current.forEach((m) => m.remove());
    ref.current = [];
  };

  // explore: back to the overview whenever the area question comes (back) round
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || worldMode !== "explore") return;
    clearMarkers(homeMarkers);
    clearMarkers(amenityMarkers);
    map.getSource("gg-lane")?.setData(EMPTY);
    if (introDone.current && map.getZoom() > 12) map.easeTo({ ...OVERVIEW, padding: framePadding(), duration: reducedMotion() ? 0 : 1800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, ready]);

  // lane: what size the consultant already knows when it asks for the budget
  useEffect(() => {
    if (worldMode !== "lane") return;
    if (slot === "budget" && (req?.bhkAny || req?.bhk?.length)) {
      const n = req.bhkAny ? null : req.bhk[0];
      setSize(n === null ? { value: "any bhk", label: "Any size" } : sizeOption(MISSION.bhk, Math.min(5, n), lang));
    } else setSize(null);
    setHome(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, slot]);

  const laneArea = picks[laneIdx] || picks[0] || null;
  const laneCenter = laneArea ? { lng: laneArea.lng, lat: laneArea.lat } : { ...GURGAON };

  // lane: drop onto the street of the current area
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || worldMode !== "lane") return undefined;
    clearMarkers(amenityMarkers);
    youMarker.current?.remove();
    const bearing = laneBearing(laneIdx);
    map.getSource("gg-lane")?.setData(EMPTY);
    let alive = true;
    flyAgent(laneCenter, { zoom: 16.9, pitch: 68, bearing, lift: 150 }, laneArea ? `Landing in ${laneArea.label}…` : "Landing in Gurgaon…").then(() => {
      if (!alive) return;
      map.getSource("gg-lane")?.setData(laneRoad(laneCenter, bearing));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, ready, laneIdx, laneArea?.value]);

  // lane: the building you knock floors off, standing on the street
  useEffect(() => {
    const map = mapRef.current;
    const showTower = map && ready && worldMode === "lane" && !size && !flying;
    if (!showTower) {
      towerMarker.current?.remove();
      towerMarker.current = null;
      setTowerEl(null);
      return;
    }
    if (towerMarker.current) return;
    const node = el("div", "qw-tower");
    towerMarker.current = new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([laneCenter.lng, laneCenter.lat]).addTo(map);
    setTowerEl(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, ready, size, flying, laneArea?.value]);

  // lane: fetch real homes once the size is set
  const laneKey = `${mode}|${picks.map((p) => p.value).join(" and ")}|${size?.value || ""}`;
  useEffect(() => {
    if (worldMode !== "lane" || !size || lane.key === laneKey) return;
    let alive = true;
    setLane({ state: "loading", homes: [], stats: null, key: laneKey });
    const where = picks.map((p) => p.value).join(" and ");
    const q = [where, size.value === "any bhk" ? "" : size.value].filter(Boolean).join(" ");
    consultantApi
      .lane(mode, q)
      .then((d) => alive && setLane({ state: "ready", homes: d.homes || [], stats: d.stats, key: laneKey }))
      .catch(() => alive && setLane({ state: "error", homes: [], stats: null, key: laneKey }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, laneKey]);

  const laneHomes = useMemo(() => {
    if (!picks.length) return lane.homes.slice(0, 12);
    return lane.homes.filter((h) => areaForListing(h, picks)?.value === laneArea?.value).slice(0, 12);
  }, [lane.homes, picks, laneArea]);

  // lane: the homes line the street, cheapest on the near side
  useEffect(() => {
    const map = mapRef.current;
    clearMarkers(homeMarkers);
    if (!map || !ready || worldMode !== "lane" || !size || flying || lane.state !== "ready") return;
    const plots = lanePlots(laneCenter, laneBearing(laneIdx), laneHomes.length);
    laneHomes.forEach((h, i) => {
      const node = el("button", "qw-home");
      node.type = "button";
      node.style.setProperty("--d", `${i * 90}ms`);
      node.setAttribute("aria-label", `${h.bhkLabel || ""} ${h.priceLabel} in ${h.sector}`.trim());
      node.appendChild(el("span", "qw-home-tag", h.priceLabel.replace(/\s*\/\s*month$/i, "")));
      const house = el("span", "qw-home-house");
      house.appendChild(el("span", "qw-home-roof"));
      const body = el("span", "qw-home-body");
      if (h.image) {
        const img = el("img");
        img.src = cloudinaryUrl(h.image, { width: 160 });
        img.alt = "";
        img.loading = "lazy";
        body.appendChild(img);
      } else body.appendChild(el("span", "qw-home-emoji", "🏠"));
      house.appendChild(body);
      node.appendChild(house);
      if (h.bhkLabel) node.appendChild(el("span", "qw-home-bhk", h.bhkLabel));
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.current.openHome?.(h);
      });
      // maplibre positions markers with an inline transform, so animate a child instead
      const wrap = el("div", "qw-mk");
      wrap.appendChild(node);
      homeMarkers.current.push(new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([plots[i].lng, plots[i].lat]).addTo(map));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneHomes, worldMode, ready, size, flying, lane.state]);

  handlers.current.openHome = (h) => setHome(h);
  useEffect(() => {
    homeMarkers.current.forEach((m, i) => m.getElement().firstChild?.classList.toggle("on", laneHomes[i]?.id === home?.id));
  }, [home, laneHomes]);

  // nearby: zoom back out over the picked areas and load what's around them
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || worldMode !== "nearby") return undefined;
    clearMarkers(homeMarkers);
    map.getSource("gg-lane")?.setData(EMPTY);
    map.getSource("gg-trail")?.setData(EMPTY);
    const spots = picks.length ? picks : [{ ...GURGAON, value: "gurgaon", label: "Gurgaon" }];
    const bounds = new maplibregl.LngLatBounds();
    spots.forEach((s) => {
      bounds.extend([s.lng - 0.022, s.lat - 0.02]);
      bounds.extend([s.lng + 0.022, s.lat + 0.02]);
    });
    const pad = framePadding();
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    map.fitBounds(bounds, { padding: { ...pad, top: pad.top + 20, bottom: pad.bottom + 20, left: 30, right: 60 }, pitch: 50, bearing: -15, maxZoom: 14.2, duration: reducedMotion() ? 0 : 2600 });
    agentRef.current?.marker.setLngLat([spots[0].lng, spots[0].lat]);
    agentPos.current = { lng: spots[0].lng, lat: spots[0].lat };

    let alive = true;
    setPlaces({ state: "loading", groups: {} });
    Promise.allSettled(spots.map((s) => consultantApi.areaAmenities(s.lat, s.lng))).then((results) => {
      if (!alive) return;
      const groups = {};
      const seen = new Set();
      results.forEach((r) => {
        if (r.status !== "fulfilled") return;
        for (const g of r.value.groups || []) {
          for (const item of g.items) {
            const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            (groups[g.category] = groups[g.category] || []).push(item);
          }
        }
      });
      const anyOk = results.some((r) => r.status === "fulfilled");
      setPlaces({ state: anyOk ? "ready" : "error", groups });
      clearMarkers(amenityMarkers);
      Object.entries(groups).forEach(([cat, items]) =>
        items.forEach((item, i) => {
          const node = el("button", "qw-amenity");
          node.type = "button";
          node.dataset.cat = cat;
          node.style.setProperty("--d", `${(i % 6) * 120}ms`);
          node.textContent = AMENITY_ICONS[cat] || "📍";
          node.setAttribute("aria-label", item.name);
          const popup = new maplibregl.Popup({ offset: 18, closeButton: false, className: "qw-popup" }).setDOMContent(
            (() => {
              const box = el("div");
              box.appendChild(el("strong", "", item.name));
              box.appendChild(el("small", "", `${item.distanceMeters < 1000 ? `${item.distanceMeters} m` : `${(item.distanceMeters / 1000).toFixed(1)} km`} from the area centre`));
              return box;
            })()
          );
          const wrap = el("div", "qw-mk");
          wrap.appendChild(node);
          amenityMarkers.current.push(new maplibregl.Marker({ element: wrap }).setLngLat([item.longitude, item.latitude]).setPopup(popup).addTo(map));
        })
      );
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldMode, ready, picks.map((p) => p.value).join()]);

  useEffect(() => {
    if (worldMode === "nearby") setChosen([]);
  }, [worldMode]);
  useEffect(() => {
    amenityMarkers.current.forEach((m) => {
      const node = m.getElement().firstChild;
      if (!node) return;
      node.classList.toggle("on", chosen.includes(node.dataset.cat));
      node.classList.toggle("dim", chosen.length > 0 && !chosen.includes(node.dataset.cat));
    });
  }, [chosen, places]);

  // any other question: the map turns slowly in the background
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || worldMode !== "idle" || reducedMotion()) return undefined;
    clearMarkers(homeMarkers);
    const spin = () => {
      map.setBearing(map.getBearing() + 0.04);
      orbitRaf.current = requestAnimationFrame(spin);
    };
    orbitRaf.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(orbitRaf.current);
  }, [worldMode, ready]);

  /* ---------------------------------------------------------- panels */
  const map = mapRef.current;
  const zoomBy = (d) => map?.easeTo({ zoom: map.getZoom() + d, duration: 300 });
  const sizeLabel = size?.label || "";
  const answerBudget = (h) =>
    onAnswer(`${size.value} ${budgetPhrase(h.price, mode)}`, `${sizeLabel} · up to ${h.priceLabel}`);

  let panel = null;
  if (!busy && ready && worldMode === "explore") {
    panel = (
      <div className="qw-panel">
        {picks.length ? (
          <div className="qw-picks" role="list" aria-label="Areas in your hunt">
            {picks.map((p, i) => (
              <span key={p.value} role="listitem" className="qw-chip">
                <b>{i + 1}</b> {p.label}
                <button type="button" onClick={() => setPicks((prev) => prev.filter((x) => x.value !== p.value))} aria-label={`Remove ${p.label}`}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="qw-tip">Tap up to {MAX_PICKS} sectors on the map, or search</p>
        )}
        <div className="qw-row">
          <button type="button" className="qpill soft" onClick={() => onAnswer(MISSION.location.anywhere.value, word(MISSION.location.anywhere.label, lang))}>
            {word(MISSION.location.anywhere.label, lang)}
          </button>
          <button
            type="button"
            className="qcta"
            disabled={!picks.length || Boolean(flying)}
            onClick={() => onAnswer(picks.map((p) => p.value).join(" and "), picks.map((p) => p.label).join(", "))}
          >
            {picks.length ? `Hunt in ${picks.length === 1 ? picks[0].label : `${picks.length} areas`}` : "Pick an area"} <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  } else if (!busy && ready && worldMode === "lane" && !flying) {
    const areaTabs =
      picks.length > 1 ? (
        <div className="qw-tabs" role="tablist" aria-label="Your areas">
          {picks.map((p, i) => (
            <button key={p.value} type="button" role="tab" aria-selected={i === laneIdx} className={i === laneIdx ? "on" : ""} onClick={() => setLaneIdx(i)}>
              {p.label}
            </button>
          ))}
        </div>
      ) : null;
    if (!size) {
      const option = sizeOption(MISSION.bhk, floors, lang);
      panel = (
        <div className="qw-panel">
          <p className="qw-tip">🏗️ Knock floors off the building — one floor is one bedroom</p>
          <FloorControls compact floors={floors} setFloors={setFloors} option={option} />
          <div className="qw-row">
            <button type="button" className="qpill soft" onClick={() => setSize({ value: "any bhk", label: word(MISSION.bhk.options.find((o) => o.value === "any bhk")?.label, lang) || "Any" })}>
              Any size
            </button>
            <button type="button" className="qcta" onClick={() => setSize({ value: option.value, label: option.label })}>
              Show {option.label} homes <ArrowRight size={17} />
            </button>
          </div>
        </div>
      );
    } else if (home) {
      panel = (
        <div className="qw-panel qw-homecard">
          <button type="button" className="qw-x" onClick={() => setHome(null)} aria-label="Close">
            <X size={16} />
          </button>
          <div className="qw-homecard-top">
            <span className="img">{home.image ? <img src={cloudinaryUrl(home.image, { width: 320 })} alt="" /> : "🏠"}</span>
            <div>
              <strong>{home.priceLabel}</strong>
              <small>{[home.bhkLabel, home.areaSqft ? `${home.areaSqft} sq ft` : null, home.furnishing].filter(Boolean).join(" · ")}</small>
              <small className="t">{home.title || home.sector}</small>
            </div>
          </div>
          <div className="qw-row">
            <a className="qpill soft" href={home.url} target="_blank" rel="noopener noreferrer">
              View <ExternalLink size={14} />
            </a>
            {slot === "budget" ? (
              <button type="button" className="qcta" onClick={() => answerBudget(home)}>
                My budget is about this
              </button>
            ) : (
              <button type="button" className="qcta" onClick={() => onAnswer(size.value, sizeLabel)}>
                Continue with {sizeLabel} <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      );
    } else {
      const s = lane.stats;
      panel = (
        <div className="qw-panel">
          {areaTabs}
          {lane.state === "loading" ? (
            <p className="qw-tip">🔎 Finding {sizeLabel} homes on this street…</p>
          ) : laneHomes.length ? (
            <>
              <p className="qw-tip">
                {slot === "budget" ? "Tap the home whose price feels right — that sets your budget" : `${laneHomes.length} live ${sizeLabel} homes on this street — tap one to peek`}
              </p>
              {s ? (
                <div className="qw-stats">
                  <span>
                    <small>From</small>
                    {laneHomes[0].priceLabel}
                  </span>
                  <span>
                    <small>Typical</small>
                    {laneHomes[Math.floor(laneHomes.length / 2)].priceLabel}
                  </span>
                  <span>
                    <small>Up to</small>
                    {laneHomes[laneHomes.length - 1].priceLabel}
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <p className="qw-tip">
              {lane.state === "error" ? "Couldn't load homes right now." : `No live ${sizeLabel} homes in ${laneArea?.label || "this area"} yet.`}
            </p>
          )}
          <div className="qw-row">
            <button type="button" className="qpill soft" onClick={() => setSize(null)}>
              Change size
            </button>
            {slot === "budget" ? (
              <button type="button" className="qpill soft" onClick={() => onAnswer(`${size.value} and ${MISSION.budget.flexible.value}`, `${sizeLabel} · ${word(MISSION.budget.flexible.label, lang)}`)}>
                {word(MISSION.budget.flexible.label, lang)}
              </button>
            ) : (
              <button type="button" className="qcta" onClick={() => onAnswer(size.value, sizeLabel)}>
                Continue with {sizeLabel} <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      );
    }
  } else if (!busy && ready && worldMode === "nearby") {
    const m = MISSION.priorities;
    panel = (
      <div className="qw-panel">
        <p className="qw-tip">
          {places.state === "loading"
            ? "🛰️ Scanning what's around your areas…"
            : places.state === "error"
              ? "Nearby places couldn't load — pick what matters anyway"
              : "What should be close to home? Tap all that matter"}
        </p>
        <div className="qw-cats" role="group" aria-label="Pick one or more">
          {m.options.map((o) => {
            const on = chosen.includes(o.value);
            const count = places.groups[o.value]?.length;
            return (
              <button
                key={o.value}
                type="button"
                className={`qw-cat${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => setChosen((c) => (c.includes(o.value) ? c.filter((v) => v !== o.value) : [...c, o.value]))}
              >
                <span>{AMENITY_ICONS[o.value] || o.icon}</span>
                {word(o.label, lang)}
                {count ? <small>{count}</small> : null}
              </button>
            );
          })}
        </div>
        <div className="qw-row">
          <button
            type="button"
            className="qcta wide"
            onClick={() => {
              if (!chosen.length) return onAnswer(m.done.value, word(m.done.label, lang));
              const labels = m.options.filter((o) => chosen.includes(o.value)).map((o) => word(o.label, lang));
              return onAnswer(chosen.join(" and "), labels.join(", "));
            }}
          >
            {chosen.length ? `Continue with ${chosen.length} →` : word(m.done.label, lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`qw qw-${worldMode} qw-z-${zoomBand}${flying ? " qw-flying" : ""}`}>
      <div className="qw-map" ref={containerRef} />
      {!ready ? (
        <div className="qw-loading" aria-live="polite">
          <span className="qw-globe">🗺️</span>
          Loading the map of Gurgaon…
        </div>
      ) : null}

      {ready && worldMode === "explore" ? (
        <div className="qw-tools">
          <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-label="Search for a sector" aria-expanded={searchOpen} className={searchOpen ? "on" : ""}>
            <Search size={18} />
          </button>
          <button type="button" onClick={findNearMe} aria-label="Areas near me" disabled={near.state === "loading"}>
            <LocateFixed size={18} />
          </button>
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom in">
            <Plus size={18} />
          </button>
          <button type="button" onClick={() => zoomBy(-0.8)} aria-label="Zoom out">
            <Minus size={18} />
          </button>
          <button type="button" onClick={() => map?.easeTo({ ...OVERVIEW, padding: framePadding(), duration: 1200 })} aria-label="Show all of Gurgaon">
            <Maximize size={18} />
          </button>
        </div>
      ) : null}

      {searchOpen && worldMode === "explore" ? (
        <div className="qw-search" role="search">
          <label>
            <Search size={16} aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sector number or area — 57, DLF, Sohna…" aria-label="Search sector or area" />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={16} />
            </button>
          </label>
          {query.trim() ? (
            <ul>
              {matches.map((a) => (
                <li key={a.value}>
                  <button type="button" onClick={() => togglePick(a.value)}>
                    <span aria-hidden="true">✈</span> {a.label}
                    {picks.some((p) => p.value === a.value) ? <small>picked</small> : null}
                  </button>
                </li>
              ))}
              {!matches.length ? <li className="none">No sector by that name on the map</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {flying ? (
        <div className="qw-caption" aria-live="polite">
          ✈ {flying}
        </div>
      ) : null}
      {toast ? (
        <div className="qw-toast" role="status">
          {toast}
        </div>
      ) : null}

      {panel}
      {towerEl ? createPortal(<TowerBuilding floors={floors} onFloor={setFloors} />, towerEl) : null}
    </div>
  );
}
