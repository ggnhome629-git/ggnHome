import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Share2, Heart, ChevronLeft, ChevronRight, HelpCircle, Check, AlertCircle } from 'lucide-react';

// Synonyms map for voice commands
const synonymsMap = {
  hall: 'living room',
  lobby: 'living room',
  lounge: 'living room',
  washroom: 'bathroom',
  toilet: 'bathroom',
  master: 'bedroom 1',
  bedroom: 'bedroom',
  rasoi: 'kitchen',
  kitchenet: 'kitchen',
  kaksha: 'room',
  bagicha: 'garden',
  balconi: 'balcony',
  balcony: 'balcony',
  pooja: 'prayer room',
  mandir: 'prayer room',
  dining: 'dining room'
};

// Helper to derive a thumbnail from a Cloudinary URL (fallback to same image)
function deriveThumb(url) {
  if (!url) return '';
  try {
    if (url.includes('res.cloudinary.com')) {
      return url.replace('/upload/', '/upload/c_fill,w_400,h_300,q_auto,f_auto/');
    }
  } catch (_) {}
  return url;
}

function cloudinaryWithQuality(url, mode = 'auto') {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  // modes: 'eco' -> q_auto:eco, 'auto' -> q_auto, 'best' -> q_auto:best
  const q = mode === 'eco' ? 'q_auto:eco' : mode === 'best' ? 'q_auto:best' : 'q_auto';
  return url.replace('/upload/', `/upload/${q},f_auto/`);
}

function copyToClipboard(text) {
  try { navigator.clipboard.writeText(text); return true; } catch { return false; }
}

const normalizeStr = (s = '') => s.toLowerCase().trim();

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) { const m = []; for (let i = 0; i <= b.length; i++) { m[i] = [i]; if (i === 0) continue; for (let j = 0; j <= a.length; j++) { m[0][j] = j; if (j === 0) continue; m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, Math.min(m[i][j - 1] + 1, m[i - 1][j] + 1)); } } return m[b.length][a.length]; }

function usePannellumReady() {
  const [ready, setReady] = useState(!!window.pannellum);
  useEffect(() => {
    if (window.pannellum) { setReady(true); return; }

    // Avoid inserting multiple times
    if (!window.__pannellumInjecting) {
      window.__pannellumInjecting = true;
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.pannellum.org/2.5/pannellum.css';
      css.id = 'pannellum-css';
      if (!document.getElementById('pannellum-css')) document.head.appendChild(css);

      const script = document.createElement('script');
      script.src = 'https://cdn.pannellum.org/2.5/pannellum.js';
      script.async = true;
      script.id = 'pannellum-js';
      script.onload = () => { setReady(true); };
      script.onerror = () => console.error('Failed to load Pannellum');
      if (!document.getElementById('pannellum-js')) document.body.appendChild(script);
    }

    const check = setInterval(() => {
      if (window.pannellum) { clearInterval(check); setReady(true); }
    }, 50);

    return () => { clearInterval(check); /* keep assets in DOM to avoid flicker on re-entry */ };
  }, []);
  return ready;
}

function PanoramaViewer({ src, height = '100%', initialYaw, initialPitch, initialHfov, onViewerReady }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const ready = usePannellumReady();
  // Guarantee a minimum height so the container never collapses
  const safeHeight = height || '60vh';

  useEffect(() => {
    if (!ready || !containerRef.current || !src) return;
    const p = window.pannellum; if (!p || typeof p.viewer !== 'function') return;

    // Destroy previous instance if any
    try { viewerRef.current?.destroy?.(); } catch {}

    // Create a fresh instance
    const viewer = p.viewer(containerRef.current, {
      type: 'equirectangular',
      panorama: src,
      autoLoad: true,
      showZoomCtrl: true,
      compass: false,
      hfov: initialHfov || 100,
      pitch: initialPitch || 0,
      yaw: initialYaw || 0,
    });
    viewerRef.current = viewer;
    try { onViewerReady && onViewerReady(viewer); } catch {}

    // Resize after first render tick (avoids partial render where only the word 'pannellum' appears)
    const r1 = setTimeout(() => { try { viewer.resize(); } catch {} }, 0);
    const r2 = setTimeout(() => { try { viewer.resize(); } catch {} }, 200);

    // Keep the canvas sized on window resize
    const onWinResize = () => { try { viewer.resize(); } catch {} };
    window.addEventListener('resize', onWinResize);

    return () => {
      clearTimeout(r1); clearTimeout(r2);
      window.removeEventListener('resize', onWinResize);
      try { viewerRef.current?.destroy?.(); } catch {}
      viewerRef.current = null;
    };
  }, [ready, src, initialYaw, initialPitch, initialHfov, onViewerReady]);

  return <div ref={containerRef} style={{ width: '100%', height: safeHeight, minHeight: 280, borderRadius: 12, overflow: 'hidden', background: '#0b1b2b' }} />;
}

export default function VoiceVirtualTourModal({
  propertyName = "Luxury Apartment",
  onClose,
  scenes: scenesProp,
  panoramas: panoramasProp,
}) {
  // Read panoramas/scenes from route state if not provided as props
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location?.state || {};

  const panoramasFromRoute = Array.isArray(routeState.panoramas) ? routeState.panoramas : null;
  const scenesFromRoute = Array.isArray(routeState.scenes) ? routeState.scenes : null;
  const propertyNameFromRoute = typeof routeState.propertyName === 'string' ? routeState.propertyName : null;

  const panoramasInput = (Array.isArray(panoramasProp) && panoramasProp.length) ? panoramasProp : panoramasFromRoute;
  const scenesInput = (Array.isArray(scenesProp) && scenesProp.length) ? scenesProp : scenesFromRoute;

  const handleClose = onClose || (() => navigate(-1));
  const effectivePropertyName = propertyNameFromRoute || propertyName;
  const builtFromPanoramas = Array.isArray(panoramasInput) && panoramasInput.length
    ? panoramasInput.map((p, i) => ({
        id: p.id ?? i + 1,
        title: p.title || `Scene ${i + 1}`,
        thumbnail: deriveThumb(p.url),
        rawPanorama: p.url,
      }))
    : null;

  const builtFromScenes = Array.isArray(scenesInput) && scenesInput.length
    ? scenesInput.map((s, i) => ({
        id: s.id ?? i + 1,
        title: s.title || `Scene ${i + 1}`,
        thumbnail: s.thumbnail || deriveThumb(s.panorama || s.url),
        rawPanorama: s.panorama || s.url,
      }))
    : null;

  const scenes = builtFromScenes && builtFromScenes.length ? builtFromScenes
                : builtFromPanoramas && builtFromPanoramas.length ? builtFromPanoramas
                : [];

  const [quality, setQuality] = useState('auto'); // 'eco' | 'auto' | 'best'
  const getPanoUrl = (idx) => cloudinaryWithQuality(scenes[idx]?.rawPanorama, quality);

  const [activeScene, setActiveScene] = useState(0);
  // If query params provided initial view only for first load, freeze them after first mount
  const [initialView, setInitialView] = useState(() => {
    // You may want to parse query params for initial view, but for now, just default values
    return { yaw: 0, pitch: 0, hfov: 100 };
  });
  useEffect(() => { setInitialView(v => ({ ...v })); /* noop but ensures state is created */ }, []);
  // Clamp activeScene when scenes array changes (for deep-linking safety)
  useEffect(() => {
    setActiveScene(i => (i < 0 ? 0 : i >= scenes.length ? Math.max(0, scenes.length - 1) : i));
  }, [scenes.length]);
  const [isListening, setIsListening] = useState(false);
  const [micState, setMicState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  // Keep mic on for the entire 3D view session (auto-restart on end)
  const [keepMicOn, setKeepMicOn] = useState(false);
  const [toast, setToast] = useState('');
  const [showHUD, setShowHUD] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const recognitionRef = useRef(null);
  const hudTimerRef = useRef(null);
  // Pannellum viewer instance (used for share/bookmark, etc.)
  const viewerRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateRate, setAutoRotateRate] = useState(2); // deg/sec
  useEffect(() => {
    const v = viewerRef.current; if (!v) return;
    try { v.stopAutoRotate && v.stopAutoRotate(); } catch {}
    if (autoRotate) {
      try { v.startAutoRotate && v.startAutoRotate(autoRotateRate); } catch {}
    }
  }, [autoRotate, autoRotateRate, activeScene, quality]);

  const enterFullscreen = () => { try { viewerRef.current?.enterFullscreen?.(); } catch {} };
  const zoomIn = () => { try { const v = viewerRef.current; v && v.setHfov(Math.max(30, v.getHfov() - 10)); } catch {} };
  const zoomOut = () => { try { const v = viewerRef.current; v && v.setHfov(Math.min(120, v.getHfov() + 10)); } catch {} };
  const shareDeepLink = () => {
    try {
      const v = viewerRef.current; const params = new URLSearchParams();
      params.set('scene', String(activeScene));
      if (v) { params.set('yaw', Math.round(v.getYaw())); params.set('pitch', Math.round(v.getPitch())); params.set('fov', Math.round(v.getHfov())); }
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      const ok = copyToClipboard(url);
      showToast(ok ? 'Link copied' : url);
    } catch { showToast('Share failed'); }
  };

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [scenesOpen, setScenesOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { console.warn('Speech recognition not supported'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = !!keepMicOn; // keep listening across results if enabled
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => { setMicState('listening'); setIsListening(true); };
    recognition.onresult = (event) => { const transcript = Array.from(event.results).map(result => result[0].transcript).join(''); setTranscript(transcript); if (event.results[0].isFinal) { processVoiceCommand(transcript); } };
    recognition.onerror = (event) => { console.error('Speech recognition error', event.error); setMicState('error'); setTimeout(() => setMicState('idle'), 2000); setIsListening(false); setTranscript(''); };
    recognition.onend = () => {
      if (keepMicOn) {
        try { recognition.start(); setIsListening(true); setMicState('listening'); } catch {}
      } else {
        setIsListening(false);
        if (micState === 'listening') setMicState('idle');
      }
      setTranscript('');
    };
    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch {} };
  }, [keepMicOn]);

  useEffect(() => {
    if (showHUD) { clearTimeout(hudTimerRef.current); hudTimerRef.current = setTimeout(() => setShowHUD(false), 5000); }
    return () => clearTimeout(hudTimerRef.current);
  }, [showHUD, activeScene]);

  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.key === 'ArrowLeft') navigateScene(-1);
      if (e.key === 'ArrowRight') navigateScene(1);
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [activeScene]);

  const showToast = (message) => { setToast(message); setTimeout(() => setToast(''), 3000); };

  const navigateScene = (direction) => {
    const newIndex = (activeScene + direction + scenes.length) % scenes.length;
    setActiveScene(newIndex);
    showToast(`Showing ${scenes[newIndex].title}`);
  };

  const processVoiceCommand = (command) => {
    setMicState('processing');
    const normalized = command.toLowerCase().trim().replace(/[.,!?]/g, '');
    
    let processedCommand = normalized;
    Object.keys(synonymsMap).forEach(key => { if (normalized.includes(key)) processedCommand = normalized.replace(key, synonymsMap[key]); });

    if (processedCommand.includes('next')) { navigateScene(1); setMicState('success'); setTimeout(() => setMicState('idle'), 1000); return; }
    if (processedCommand.includes('previous') || processedCommand.includes('prev')) { navigateScene(-1); setMicState('success'); setTimeout(() => setMicState('idle'), 1000); return; }
    if (processedCommand.includes('help')) { setShowHelp(true); setMicState('success'); setTimeout(() => setMicState('idle'), 1000); return; }

    if (processedCommand.includes('zoom in')) { zoomIn(); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('zoom out')) { zoomOut(); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('rotate on') || processedCommand.includes('auto rotate')) { setAutoRotate(true); showToast('Auto-rotate on'); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('rotate off') || processedCommand.includes('stop rotate')) { setAutoRotate(false); showToast('Auto-rotate off'); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('best quality')) { setQuality('best'); showToast('Quality: Best'); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('eco quality') || processedCommand.includes('low quality')) { setQuality('eco'); showToast('Quality: Eco'); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('normal quality') || processedCommand.includes('auto quality')) { setQuality('auto'); showToast('Quality: Auto'); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('fullscreen')) { enterFullscreen(); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }
    if (processedCommand.includes('share')) { shareDeepLink(); setMicState('success'); setTimeout(() => setMicState('idle'), 800); return; }

    if (processedCommand.includes('show') || processedCommand.includes('go')) {
      const words = processedCommand.split(' ').filter(w => !['show', 'go', 'to', 'the'].includes(w));
      const query = words.join(' ');
      const matches = scenes.map((scene, idx) => ({ idx, title: scene.title.toLowerCase(), distance: levenshtein(query, scene.title.toLowerCase()) })).sort((a, b) => a.distance - b.distance);
      
      if (matches[0].distance <= 3) {
        setActiveScene(matches[0].idx);
        showToast(`Showing ${scenes[matches[0].idx].title}`);
        setMicState('success');
        setTimeout(() => setMicState('idle'), 1000);
      } else if (matches[0].distance <= 6 && matches[1].distance <= 6) {
        showToast(`Did you mean ${scenes[matches[0].idx].title} or ${scenes[matches[1].idx].title}?`);
        setMicState('error');
        setTimeout(() => setMicState('idle'), 2000);
      } else {
        showToast(`Couldn't find "${query}". Try saying the room name clearly.`);
        setMicState('error');
        setTimeout(() => setMicState('idle'), 2000);
      }
    } else {
      showToast('Command not recognized. Say "help" for examples.');
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
    }
  };

  const toggleMic = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (isListening) {
      setKeepMicOn(false); // turning mic off disables always-on for this session
      try { r.stop(); } catch {}
    } else {
      try { r.continuous = !!keepMicOn; r.start(); setShowHUD(true); } catch {}
    }
  };

  const filteredScenes = scenes.filter(scene => normalizeStr(scene.title).includes(normalizeStr(searchQuery)));

  if (!scenes || scenes.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20 }}>
        <div style={{ color: '#00F5D4', fontSize: 18, fontWeight: 600 }}>No panoramas available</div>
        <button onClick={handleClose} style={{ padding: '10px 24px', background: '#00F5D4', color: '#0b1b2b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Close</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.95)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 14px' : '16px 24px', gap: isMobile ? 8 : 16, background: 'rgba(11, 27, 43, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0, 245, 212, 0.1)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#00F5D4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? 14 : 16, padding: 0 }}><ChevronLeft size={20} /> {!isMobile && 'Back'}</button>
          <span style={{ color: '#fff', fontSize: isMobile ? 14 : 18, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 120 : 'none' }}>{effectivePropertyName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <button style={{ background: 'none', border: 'none', color: micState === 'listening' ? '#00F5D4' : '#9CA3AF', cursor: 'pointer', padding: 0 }}>{micState === 'listening' ? <Mic size={isMobile ? 18 : 20} /> : <MicOff size={isMobile ? 18 : 20} />}</button>
          {/* Live mic toggle */}
          {!isMobile ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E5E7EB', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={keepMicOn}
                onChange={(e) => {
                  setKeepMicOn(e.target.checked);
                  showToast(e.target.checked ? 'Live mic enabled' : 'Live mic disabled');
                  // If enabling while idle, start listening immediately
                  if (e.target.checked && !isListening && recognitionRef.current) {
                    try { recognitionRef.current.continuous = true; recognitionRef.current.start(); setShowHUD(true); } catch {}
                  }
                }}
                style={{ accentColor: '#00F5D4' }}
              />
              Live mic
            </label>
          ) : (
            <button
              onClick={() => {
                const next = !keepMicOn; setKeepMicOn(next);
                showToast(next ? 'Live mic enabled' : 'Live mic disabled');
                if (next && !isListening && recognitionRef.current) {
                  try { recognitionRef.current.continuous = true; recognitionRef.current.start(); setShowHUD(true); } catch {}
                }
              }}
              style={{ background: keepMicOn ? 'rgba(0, 245, 212, 0.2)' : 'transparent', border: '1px solid rgba(0, 245, 212, 0.35)', color: '#00F5D4', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12 }}
            >
              {keepMicOn ? 'Live Mic On' : 'Live Mic'}
            </button>
          )}
          {!isMobile && (
            <>
              <select value={quality} onChange={(e) => setQuality(e.target.value)} title="Quality" style={{ background: 'rgba(0,0,0,0.3)', color: '#E5E7EB', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
                <option value="eco">Eco</option>
                <option value="auto">Auto</option>
                <option value="best">Best</option>
              </select>
              <button onClick={shareDeepLink} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}><Share2 size={20} /></button>
              <button onClick={() => setAutoRotate(a => !a)} style={{ background: 'none', border: 'none', color: autoRotate ? '#00F5D4' : '#9CA3AF', cursor: 'pointer', padding: 0 }} title="Auto-rotate">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v2a8 8 0 018 8h2C22 6.477 17.523 2 12 2zM4 12H2c0 5.523 4.477 10 10 10v-2a8 8 0 01-8-8z" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </>
          )}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setScenesOpen((s) => !s)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(0, 245, 212, 0.35)',
                  color: '#00F5D4',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {scenesOpen ? 'Hide' : 'Scenes'}
              </button>

              <button
                onClick={() => setAutoRotate((a) => !a)}
                title="Auto-rotate"
                style={{
                  background: autoRotate ? 'rgba(0, 245, 212, 0.2)' : 'none',
                  border: '1px solid rgba(0, 245, 212, 0.35)',
                  color: autoRotate ? '#00F5D4' : '#00F5D4',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {autoRotate ? 'Stop' : 'Rotate'}
              </button>
            </div>
          )}
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}><X size={isMobile ? 20 : 24} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Scenes Panel */}
        <div style={{
          background: 'rgba(11, 27, 43, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRight: isMobile ? 'none' : '1px solid rgba(0, 245, 212, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          ...(isMobile ? {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: scenesOpen ? '60vh' : 0,
            borderTop: '1px solid rgba(0, 245, 212, 0.2)',
            transition: 'height 0.28s ease',
            overflow: 'hidden',
            zIndex: 50,
          } : {
            width: 320,
            maxWidth: '30vw'
          })
        }}>
          {(!isMobile || scenesOpen) && (
            <>
              {/* Sticky heading for the scenes panel */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  padding: isMobile ? '10px 12px' : '14px 16px',
                  background: 'rgba(11, 27, 43, 0.95)',
                  borderBottom: '1px solid rgba(0, 245, 212, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ color: '#00F5D4', fontWeight: 700, letterSpacing: 0.4, fontSize: isMobile ? 13 : 14 }}>Scenes</div>
                <div style={{ color: '#9CA3AF', fontSize: isMobile ? 12 : 12 }}>{scenes.length}</div>
              </div>

              {/* Search bar */}
              <div style={{ padding: isMobile ? 12 : 16, borderBottom: '1px solid rgba(0, 245, 212, 0.1)' }}>
                <input
                  type="text"
                  placeholder="Search scenes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: isMobile ? '8px 12px' : '10px 16px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 245, 212, 0.2)', borderRadius: 8, color: '#fff', fontSize: isMobile ? 13 : 14, outline: 'none' }}
                />
              </div>

              {/* Scene list */}
              <div style={{ flex: 1, padding: isMobile ? 12 : 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: 10, overflowY: 'auto' }}>
                {filteredScenes.map((scene) => {
                  const isActive = scenes[activeScene].id === scene.id;
                  const borderColor = isActive ? '#00F5D4' : 'rgba(255,255,255,0.12)';
                  // hover effect via inline state
                  // We'll use a trick: create a local state for each card using a closure
                  // But in a map, that's not idiomatic, so we use onMouseEnter/onMouseLeave to set style directly
                  return (
                    <div
                      key={scene.id}
                      onClick={() => { setActiveScene(scenes.indexOf(scene)); showToast(`Showing ${scene.title}`); if (isMobile) setScenesOpen(false); }}
                      onMouseEnter={(e)=> e.currentTarget.style.transform='scale(1.02)'}
                      onMouseLeave={(e)=> e.currentTarget.style.transform='scale(1)'}
                      style={{
                        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '96px 1fr', alignItems: 'center', gap: 10, padding: 10,
                        minHeight: isMobile ? 110 : 72, border: `1px solid ${borderColor}`, borderRadius: 10,
                        background: isActive ? 'rgba(0, 245, 212, 0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer',
                        transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={scene.thumbnail}
                          alt={scene.title}
                          style={{
                            width: isMobile ? '100%' : 96,
                            height: isMobile ? 72 : 64,
                            borderRadius: 8,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: isMobile ? 'center' : 'flex-start',
                        justifyContent: isMobile ? 'center' : 'flex-start',
                      }}>
                        <span
                          style={{
                            color: isActive ? '#00F5D4' : '#E5E7EB',
                            fontSize: 13,
                            fontWeight: isActive ? 700 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                          title={scene.title}
                        >
                          {scene.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {isMobile && scenesOpen && (
          <div onClick={() => setScenesOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40 }} />
        )}

        {/* 360 Viewer */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PanoramaViewer
            key={getPanoUrl(activeScene) || 'pano'}
            src={getPanoUrl(activeScene)}
            initialYaw={initialView.yaw}
            initialPitch={initialView.pitch}
            initialHfov={initialView.hfov}
            onViewerReady={(v) => { viewerRef.current = v; }}
          />
          {/* Overlay Controls */}
          <div style={{ position: 'absolute', right: isMobile ? 14 : 24, bottom: isMobile ? 90 : 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={zoomIn} title="Zoom In" style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer' }}>+</button>
            <button onClick={zoomOut} title="Zoom Out" style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer' }}>−</button>
            <button onClick={enterFullscreen} title="Fullscreen" style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer' }}>⤢</button>
          </div>
          
          {/* Transcript Chip */}
          <div style={{ position: 'absolute', top: isMobile ? 16 : 24, left: isMobile ? 14 : 24, background: 'rgba(0, 245, 212, 0.95)', color: '#0b1b2b', padding: isMobile ? '6px 10px' : '8px 16px', borderRadius: 8, fontSize: isMobile ? 12 : 13, fontWeight: 500, opacity: transcript ? 1 : 0, transition: 'opacity 0.3s', maxWidth: isMobile ? '70%' : 300, wordWrap: 'break-word' }}>{transcript}</div>

          {/* Toast */}
          <div style={{ position: 'absolute', top: isMobile ? 70 : 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 245, 212, 0.95)', color: '#0b1b2b', padding: isMobile ? '8px 14px' : '12px 24px', borderRadius: 8, fontSize: isMobile ? 12 : 14, fontWeight: 600, opacity: toast ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 100, maxWidth: isMobile ? '80%' : 'auto', textAlign: 'center' }}>{toast}</div>

          {/* HUD */}
          <div style={{ position: 'absolute', bottom: isMobile ? (scenesOpen ? '62vh' : 80) : 120, left: '50%', transform: 'translateX(-50%)', background: 'rgba(11, 27, 43, 0.9)', backdropFilter: 'blur(20px)', padding: isMobile ? '10px 14px' : '16px 24px', borderRadius: 12, border: '1px solid rgba(0, 245, 212, 0.2)', color: '#00F5D4', fontSize: isMobile ? 12 : 14, textAlign: 'center', maxWidth: isMobile ? '92%' : '80%', opacity: showHUD ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: showHUD ? 'auto' : 'none' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Voice Commands</div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: '#9CA3AF' }}>Try: "show kitchen" • "next" • "zoom in" • "best quality" • "fullscreen"</div>
          </div>

          {/* Navigation Arrows */}
          {!isMobile && (
            <>
              <button onClick={() => navigateScene(-1)} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(0, 245, 212, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 245, 212, 0.3)', color: '#00F5D4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={24} /></button>
              <button onClick={() => navigateScene(1)} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(0, 245, 212, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 245, 212, 0.3)', color: '#00F5D4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={24} /></button>
            </>
          )}

          {/* Help Button */}
          <button onClick={() => setShowHelp(!showHelp)} style={{ position: 'absolute', top: isMobile ? 16 : 24, right: isMobile ? 14 : 24, width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%', background: 'rgba(0, 245, 212, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 245, 212, 0.3)', color: '#00F5D4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HelpCircle size={isMobile ? 18 : 20} /></button>

          {/* Mic Button */}
          <button onClick={toggleMic} style={{ position: 'absolute', bottom: isMobile ? 16 : 32, right: isMobile ? 16 : 32, width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: '0 8px 32px rgba(0, 245, 212, 0.3)', background: micState === 'listening' ? 'linear-gradient(135deg, #00F5D4, #00A79D)' : micState === 'processing' ? '#FFA500' : micState === 'success' ? '#00FF00' : micState === 'error' ? '#FF0000' : '#374151' }}>
            {micState === 'listening' && <Mic size={isMobile ? 24 : 28} color="#fff" style={{ animation: 'pulse 1.5s infinite' }} />}
            {micState === 'processing' && <div style={{ width: isMobile ? 20 : 24, height: isMobile ? 20 : 24, border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
            {micState === 'success' && <Check size={isMobile ? 24 : 28} color="#fff" />}
            {micState === 'error' && <AlertCircle size={isMobile ? 24 : 28} color="#fff" />}
            {micState === 'idle' && <Mic size={isMobile ? 24 : 28} color="#fff" />}
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101, padding: isMobile ? 20 : 0 }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'rgba(11, 27, 43, 0.95)', backdropFilter: 'blur(20px)', padding: isMobile ? 20 : 32, borderRadius: 16, border: '1px solid rgba(0, 245, 212, 0.3)', maxWidth: isMobile ? '100%' : 500, color: '#fff', width: isMobile ? '100%' : 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#00F5D4', marginBottom: 16, fontSize: isMobile ? 18 : 20 }}>Voice Commands</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: isMobile ? 13 : 14 }}>
              <div><strong style={{ color: '#00F5D4' }}>Navigation:</strong> "show [room name]", "go to [room]", "next", "previous"</div>
              <div><strong style={{ color: '#00F5D4' }}>Examples:</strong> "show kitchen", "go bedroom", "next scene"</div>
              {!isMobile && <div><strong style={{ color: '#00F5D4' }}>Shortcuts:</strong> Use ← → arrow keys for navigation</div>}
              <div><strong style={{ color: '#00F5D4' }}>Synonyms:</strong> hall → living room, washroom → bathroom</div>
            </div>
            <button onClick={() => setShowHelp(false)} style={{ marginTop: 20, padding: '10px 24px', background: '#00F5D4', color: '#0b1b2b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%' }}>Got it!</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}