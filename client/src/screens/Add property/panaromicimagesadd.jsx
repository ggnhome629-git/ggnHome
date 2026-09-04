import React, { useEffect, useMemo, useState } from 'react';

/**
 * PanoramicImagesModal
 * Props:
 *  - open: boolean (controls visibility)
 *  - onClose: function () -> void
 *  - onApply: function (itemsArray) -> void
 *      itemsArray = [{ title, file, yaw, pitch, notes }]
 *  - initialItems: optional prefilled array in same shape as onApply
 *
 * Usage in Add Property page:
 *  const [showPanoModal, setShowPanoModal] = useState(false);
 *  const [draftPanoramas, setDraftPanoramas] = useState([]);
 *  <button onClick={() => setShowPanoModal(true)}>Add 360° Scenes</button>
 *  <PanoramicImagesModal
 *     open={showPanoModal}
 *     onClose={() => setShowPanoModal(false)}
 *     onApply={(items)=>{ setDraftPanoramas(items); setShowPanoModal(false); }}
 *     initialItems={draftPanoramas}
 *  />
 *  ... later, include `draftPanoramas` in your main Add Property submit payload
 */
export default function PanoramicImagesModal({ open, onClose, onApply, initialItems = [], forceShowTutorial = false, tutorialVideoSrc = 'https://www.youtube.com/watch?v=pmp7f8u5L-g' }) {
  const [items, setItems] = useState(() =>
    (initialItems && initialItems.length ? initialItems : [{ title: '', file: null, yaw: 0, pitch: 0, notes: '' }])
  );

  // Tutorial stepper: 0 = tutorial, 1 = form
  const [step, setStep] = useState(0);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const isYouTube = (url) => /(?:youtube\.com\/.+v=|youtu\.be\/)/i.test(url || '');
  const toYouTubeEmbed = (url) => {
    try {
      if (!isYouTube(url)) return null;
      const u = new URL(url);
      const id = u.searchParams.get('v') || (u.pathname.split('/').pop());
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    } catch { return null; }
  };

  useEffect(() => {
    if (open) {
      const ls = (typeof window !== 'undefined') ? window.localStorage : null;
      const shouldSkip = !!ls && ls.getItem('skipPanoTutorialV2') === '1';
      // If forced, always show tutorial regardless of localStorage
      setStep(forceShowTutorial ? 0 : (shouldSkip ? 1 : 0));
      setItems(initialItems && initialItems.length ? initialItems : [{ title: '', file: null, yaw: 0, pitch: 0, notes: '' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, forceShowTutorial]);

  const canApply = useMemo(() => items.some(it => it.title && it.file), [items]);

  const addRow = () => {
    if (items.length >= 5) return; // guard: limit to 5
    setItems(prev => [...prev, { title: '', file: null, yaw: 0, pitch: 0, notes: '' }]);
  };

  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx, patch) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleApply = () => {
    // Only pass rows that have at least a title + file selected
    const cleaned = items
      .filter(it => it.title && it.file)
      .map(it => ({ title: it.title.trim(), file: it.file, yaw: Number(it.yaw) || 0, pitch: Number(it.pitch) || 0, notes: it.notes?.trim() || '' }));
    onApply?.(cleaned);
  };

  const goToForm = () => setStep(1);
  const persistSkipIfNeeded = () => {
    try {
      if (skipNextTime && typeof window !== 'undefined') {
        window.localStorage.setItem('skipPanoTutorialV2', '1');
      }
    } catch {}
  };

  if (!open) return null;

  // ---------- Inline styles ----------
  const styles = {
    backdrop: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      backdropFilter: 'blur(2px)'
    },
    modal: {
      width: 'min(880px, 96vw)', maxHeight: '86vh', overflow: 'hidden',
      background: '#fff', borderRadius: 14, boxShadow: '0 10px 32px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column'
    },
    header: {
      padding: '14px 18px', borderBottom: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#f8fbff'
    },
    title: { margin: 0, color: '#0b3a60', fontSize: 18, fontWeight: 800 },
    body: { padding: 16, overflowY: 'auto' },
    row: {
      display: 'grid', gridTemplateColumns: '120px 1fr 110px 110px', gap: 12, alignItems: 'center',
      padding: 12, border: '1px solid #eef2f6', borderRadius: 10, background: '#fff'
    },
    rowNarrow: { gridTemplateColumns: '1fr', gap: 10 },
    label: { fontSize: 12, color: '#4a6a8a', marginBottom: 6, fontWeight: 600 },
    input: {
      width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d7e2ec', outline: 'none',
      fontSize: 14, color: '#0b3a60', background: '#fff'
    },
    file: { border: '1px dashed #c6d6e5', padding: 10, borderRadius: 8, background: '#f9fbfd' },
    notes: { minHeight: 40, resize: 'vertical' },
    preview: {
      width: 120, height: 64, borderRadius: 8, objectFit: 'cover', background: '#eef2f6', border: '1px solid #e6eef5'
    },
    footer: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderTop: '1px solid #eef2f6', background: '#fcfdff'
    },
    btnGhost: {
      background: 'transparent', color: '#0b3a60', border: '1px solid #cfe0ee', padding: '10px 14px', borderRadius: 10,
      cursor: 'pointer', fontWeight: 700
    },
    btnPrimary: {
      background: canApply ? '#003366' : '#96abc0', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 10,
      cursor: canApply ? 'pointer' : 'not-allowed', fontWeight: 800
    },
    addBtn: {
      background: '#e8f3ff', color: '#0b3a60', border: '1px dashed #a9c7e6', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700
    },
    removeBtn: {
      background: '#fff5f5', color: '#a13838', border: '1px solid #f1d1d1', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700
    },
    tutorialWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' },
    tutorialWrapNarrow: { gridTemplateColumns: '1fr' },
    videoCard: { background: '#f7fbff', border: '1px solid #e2eef8', borderRadius: 12, padding: 12 },
    video: { width: '100%', height: 'auto', borderRadius: 10, display: 'block' },
    videoActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
    modalBox: { width: 'min(920px, 96vw)', background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 10px 32px rgba(0,0,0,0.35)' },
  };

  // mobile detection to switch to stacked rows
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 680;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Add 360° Panoramic Scenes</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 1 && (
              <button
                onClick={() => setStep(0)}
                title="View tutorial"
                style={{ ...styles.btnGhost, padding: '6px 10px' }}
              >
                Tutorial
              </button>
            )}
            <button onClick={onClose} aria-label="Close" style={{ ...styles.btnGhost, padding: '6px 10px' }}>✕</button>
          </div>
        </div>

        <div style={styles.body}>
          {step === 0 ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#0b3a60' }}>
                How to Add 360° Panoramic Scenes
              </div>
              <div style={{ ...styles.tutorialWrap, ...(isMobile ? styles.tutorialWrapNarrow : {}) }}>
                <ol style={{ paddingLeft: 20, marginBottom: 12, color: '#4a6a8a', fontSize: 14 }}>
                  <li style={{ marginBottom: 8 }}>
                    Open your phone camera and select the <b>Panorama</b> mode.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    Stand in the center of the room for the best result.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    Slowly rotate your phone from left to right, keeping it at eye level.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    Ensure the space is well lit to avoid dark or blurry images.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    Save the image in landscape format (2:1 aspect ratio recommended).
                  </li>
                  <li>
                    Upload up to 5 panoramic images and give each one a descriptive room title.
                  </li>
                </ol>
                <div style={styles.videoCard}>
                  <div style={{ color: '#0b3a60', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>How to record a panorama (demo)</div>
                  {isYouTube(tutorialVideoSrc) ? (
                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                      <iframe
                        key={tutorialVideoSrc}
                        src={toYouTubeEmbed(tutorialVideoSrc)}
                        title="Panorama tutorial"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      key={tutorialVideoSrc}
                      src={tutorialVideoSrc}
                      style={styles.video}
                      muted
                      loop
                      playsInline
                      controls
                      poster="https://res.cloudinary.com/demo/image/upload/w_800/v1699999999/sample.jpg"
                    />
                  )}
                  <div style={styles.videoActions}>
                    <button
                      style={styles.btnGhost}
                      onClick={() => setShowVideoModal(true)}
                      title="View larger"
                    >
                      View larger
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4a6a8a' }}>
                  <input
                    type="checkbox"
                    checked={skipNextTime}
                    onChange={e => setSkipNextTime(e.target.checked)}
                  />
                  Don’t show this tutorial again
                </label>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={onClose} style={styles.btnGhost}>Cancel</button>
                <button
                  onClick={() => {
                    persistSkipIfNeeded();
                    goToForm();
                  }}
                  style={styles.btnPrimary}
                >
                  Continue to Add Scenes
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ color: '#4a6a8a', fontSize: 13, marginBottom: 10 }}>
                Add up to <b>5</b> equirectangular images (2:1 ratio) with a title per room. These will be saved into the property form and uploaded when you submit the property.
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {items.map((it, idx) => {
                  const previewUrl = it.file ? URL.createObjectURL(it.file) : null;
                  return (
                    <div key={idx} style={{ ...styles.row, ...(isMobile ? styles.rowNarrow : null) }}>
                      {/* Preview (desktop only) */}
                      {!isMobile && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={styles.label}>Preview</span>
                          {previewUrl ? (
                            <img src={previewUrl} alt="preview" style={styles.preview} onLoad={(e)=> URL.revokeObjectURL(previewUrl)} />
                          ) : (
                            <div style={{ ...styles.preview, display: 'grid', placeItems: 'center', color: '#97a9bb', fontSize: 12 }}>No file</div>
                          )}
                        </div>
                      )}

                      {/* File input */}
                      <div>
                        <div style={styles.label}>Panoramic Image</div>
                        <div style={styles.file}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => updateRow(idx, { file: e.target.files?.[0] || null })}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <div style={styles.label}>Title (e.g., Living Room)</div>
                        <input
                          type="text"
                          value={it.title}
                          placeholder="Room title"
                          onChange={(e) => updateRow(idx, { title: e.target.value })}
                          style={styles.input}
                        />
                      </div>

                      {/* Yaw & Pitch (optional) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={styles.label}>Yaw (°)</div>
                          <input
                            type="number"
                            value={it.yaw}
                            onChange={(e) => updateRow(idx, { yaw: e.target.value })}
                            style={styles.input}
                          />
                        </div>
                        <div>
                          <div style={styles.label}>Pitch (°)</div>
                          <input
                            type="number"
                            value={it.pitch}
                            onChange={(e) => updateRow(idx, { pitch: e.target.value })}
                            style={styles.input}
                          />
                        </div>
                      </div>

                      {/* Notes (full width on mobile) */}
                      <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                        <div style={styles.label}>Notes (optional)</div>
                        <textarea
                          value={it.notes}
                          onChange={(e) => updateRow(idx, { notes: e.target.value })}
                          style={{ ...styles.input, ...styles.notes }}
                          placeholder="e.g., Start view facing entrance"
                        />
                      </div>

                      {/* Remove */}
                      <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        {items.length > 1 && (
                          <button onClick={() => removeRow(idx)} style={styles.removeBtn}>Remove</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  onClick={addRow}
                  disabled={items.length >= 5}
                  style={{
                    ...styles.addBtn,
                    opacity: items.length >= 5 ? 0.6 : 1,
                    cursor: items.length >= 5 ? 'not-allowed' : 'pointer',
                  }}
                >
                  + Add Scene
                </button>
              </div>
            </>
          )}
        </div>

        {step === 1 && (
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.btnGhost}>Cancel</button>
            <button onClick={handleApply} style={styles.btnPrimary}>Use in Property Form</button>
          </div>
        )}

        {showVideoModal && (
          <div style={styles.modalOverlay} onClick={() => setShowVideoModal(false)}>
            <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ color: '#0b3a60', fontWeight: 800 }}>Panorama Tutorial</div>
                <button onClick={() => setShowVideoModal(false)} style={styles.btnGhost}>Close</button>
              </div>
              {isYouTube(tutorialVideoSrc) ? (
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                  <iframe
                    key={`modal-${tutorialVideoSrc}`}
                    src={toYouTubeEmbed(tutorialVideoSrc)}
                    title="Panorama tutorial"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  key={`modal-${tutorialVideoSrc}`}
                  src={tutorialVideoSrc}
                  style={{ width: '100%', height: 'auto', borderRadius: 10 }}
                  controls
                  playsInline
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}