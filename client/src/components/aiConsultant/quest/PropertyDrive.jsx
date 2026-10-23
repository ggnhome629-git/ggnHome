import React, { useEffect, useState } from "react";
import { cloudinaryUrl } from "../../../utils/cloudinaryImage";

/**
 * A cinematic, hands-free listing tour using the actual search-result records.
 * It deliberately avoids fabricating street-level driving routes or property
 * interiors: listing links open the source listing for the complete gallery.
 */
export default function PropertyDrive({ listings = [], onClose, onRefine }) {
  const homes = listings.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [commute, setCommute] = useState(30);
  const [metro, setMetro] = useState(15);
  const [monthly, setMonthly] = useState(5000);
  const [simOpen, setSimOpen] = useState(false);
  const current = homes[index] || {};
  useEffect(() => {
    if (!playing || homes.length < 2) return undefined;
    const timer = setInterval(() => setIndex((n) => (n + 1) % homes.length), 6500);
    return () => clearInterval(timer);
  }, [playing, homes.length]);
  useEffect(() => {
    setIndex((n) => Math.min(n, Math.max(0, homes.length - 1)));
  }, [homes.length]);
  if (!homes.length) return null;
  const photo = current.image ? cloudinaryUrl(current.image, { width: 1400 }) : "";
  const move = (delta) => {
    setIndex((n) => (n + delta + homes.length) % homes.length);
    setPlaying(false);
  };
  return (
    <section className="qdrive" aria-label="Property drive tour">
      <div className="qdrive-top">
        <div><span className="qdrive-kicker">RIYA'S PROPERTY DRIVE</span><h2>Take a seat. Let's explore.</h2><p>Home {index + 1} of {homes.length} · Listings appear one by one</p></div>
        <button className="qdrive-close" type="button" onClick={onClose} aria-label="Close tour">×</button>
      </div>
      <div className="qdrive-scene" key={current.id || current.url || index}>
        {photo ? <img className="qdrive-photo" src={photo} alt={`Listing photo for ${current.sector || "this home"}`} /> : <div className="qdrive-no-photo">🏡<span>Photo not available for this listing</span></div>}
        <div className="qdrive-windshield" />
        <div className="qdrive-road"><i /><i /><i /></div>
        <div className="qdrive-dash"><span>🚘</span><small>PROPERTY DRIVE · GURGAON</small></div>
        <div className="qdrive-homecard">
          <span className="qdrive-price">{current.priceLabel || "Price on request"}</span>
          <b>{[current.bhkLabel, current.propertyType].filter(Boolean).join(" · ") || "Property listing"}</b>
          <span>{[current.sector, current.areaSqft ? `${current.areaSqft} sq ft` : null, current.furnishing].filter(Boolean).join(" · ") || "Details on listing"}</span>
          {current.url ? <a href={current.url} target="_blank" rel="noopener noreferrer">Enter home · Open full listing/gallery ↗</a> : <span>Full gallery link not available</span>}
        </div>
      </div>
      <div className="qdrive-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous property">← Previous</button>
        <button type="button" className="qdrive-play" onClick={() => setPlaying((p) => !p)}>{playing ? "Ⅱ Pause tour" : "▶ Resume auto-tour"}</button>
        <button type="button" onClick={() => move(1)} aria-label="Next property">Next →</button>
      </div>
      <div className="qdrive-progress" aria-label={`Property ${index + 1} of ${homes.length}`}>{homes.map((home, i) => <button key={home.id || home.url || i} type="button" className={i === index ? "active" : ""} onClick={() => { setIndex(i); setPlaying(false); }} aria-label={`Go to home ${i + 1}`} />)}</div>
      <div className="qdrive-extra">
        <button type="button" onClick={() => setSimOpen((v) => !v)}>{simOpen ? "Hide daily-life simulator" : "🧭 Simulate daily life around a home"}</button>
        <button type="button" onClick={onRefine}>💬 Ask Riya to change the search</button>
      </div>
      {simOpen ? <div className="qdrive-simulator">
        <h3>Daily-life scenario <small>— your inputs, not live commute data</small></h3>
        <label>One-way commute you expect <b>{commute} min</b><input type="range" min="5" max="120" step="5" value={commute} onChange={(e) => setCommute(Number(e.target.value))} /></label>
        <label>Metro access walk you estimate <b>{metro} min</b><input type="range" min="0" max="45" step="1" value={metro} onChange={(e) => setMetro(Number(e.target.value))} /></label>
        <label>Other monthly travel spend <b>₹{monthly.toLocaleString("en-IN")}</b><input type="range" min="0" max="25000" step="500" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} /></label>
        <p>At your inputs: <b>{commute * 2 * 22} min</b> commuting/month (22 workdays), plus <b>{metro} min</b> estimated metro access each way. Monthly spend entered: <b>₹{monthly.toLocaleString("en-IN")}</b>. Verify routes, fares and amenity distances before deciding.</p>
      </div> : null}
    </section>
  );
}
