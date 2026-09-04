import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Defensive wrapper for keydown listeners
(function(){
  try {
    if (typeof window === 'undefined' || !window.document || !Document || !Document.prototype) return;
    const __origAdd = Document.prototype.addEventListener;
    Document.prototype.addEventListener = function(type, listener, options) {
      if (type === 'keydown' && typeof listener === 'function') {
        const wrapped = function(e) {
          try {
            return listener.call(this, e);
          } catch (err) {
            console.warn('[wrapped keydown listener] error swallowed:', err);
            return undefined;
          }
        };
        return __origAdd.call(this, type, wrapped, options);
      }
      return __origAdd.call(this, type, listener, options);
    };
  } catch (e) { /* ignore */ }
})();

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return iso;
  }
};

const DEFAULT_PROPERTY_IMAGE = '/default-property.jpg';

const PlaceholderImage = ({ children }) => (
  <div style={styles.placeholder}>
    <img 
      src={DEFAULT_PROPERTY_IMAGE} 
      alt="Default property" 
      style={styles.defaultImage}
    />
    {children && <div style={styles.placeholderText}>{children}</div>}
  </div>
);

export default function FlatmateSearchPropertyModal({ isOpen: isOpenProp, listingId: listingIdProp, onClose }) {
  // Hybrid authentication: get access token from localStorage
  const userToken = localStorage.getItem("accessToken");
  // route-aware behaviour
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // prefer prop, fall back to route param /flatmatesearchpropertymodal/:id
  const listingIdFromRoute = params && params.id ? params.id : null;
  const listingId = listingIdProp || listingIdFromRoute;

  // prefer explicit prop for isOpen; otherwise treat presence of listingId as open
  const isOpen = typeof isOpenProp === 'boolean' ? isOpenProp : Boolean(listingId);

  // unified close handler: call provided onClose if present,
  // otherwise navigate back or to a safe listing/search page
  const handleClose = () => {
    if (typeof onClose === 'function') {
      return onClose();
    }
    if (listingIdFromRoute) {
      if (location.state && location.state.background) {
        navigate(-1);
      } else {
        navigate('/flatmatesearch', { replace: true });
      }
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [enquiryState, setEnquiryState] = useState({ name: '', email: '', phone: '', message: '' });
  const [enqStatus, setEnqStatus] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });
  const [validationErrors, setValidationErrors] = useState({});
  
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  // Memoized formatted values
  const formattedMoveInDate = useMemo(() => 
    data?.moveInDate ? formatDate(data.moveInDate) : 'N/A', 
    [data?.moveInDate]
  );

  const formattedCreatedAt = useMemo(() => 
    data?.createdAt ? formatDate(data.createdAt) : 'N/A', 
    [data?.createdAt]
  );

  const formattedUpdatedAt = useMemo(() => 
    data?.updatedAt ? formatDate(data.updatedAt) : 'N/A', 
    [data?.updatedAt]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard handlers - Escape to close and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Data fetching - keep original API logic
  useEffect(() => {
    if (!isOpen || !listingId) return;

    const abort = new AbortController();
    const base = process.env.REACT_APP_Base_API || '';
    const detailsUrlBase = `${base.replace(/\/$/, '')}/flatmatelistingdetails?id=${encodeURIComponent(listingId)}`;

    const viewedKey = `ggn_viewed_${listingId}`;
    const viewedTTLSeconds = 60 * 60;

    const getViewedMeta = () => {
      try {
        const raw = localStorage.getItem(viewedKey);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    };

    const markViewedNow = () => {
      try { 
        localStorage.setItem(viewedKey, JSON.stringify({ ts: Date.now() })); 
      } catch (e) { /* ignore */ }
    };

    const needsIncrement = () => {
      const meta = getViewedMeta();
      if (!meta || !meta.ts) return true;
      return (Date.now() - meta.ts) > (viewedTTLSeconds * 1000);
    };

    const doIncrement = async () => {
      try {
        const incUrl = `${base.replace(/\/$/, '')}/listings/${encodeURIComponent(listingId)}/view`;
        const r = await fetch(incUrl, { method: 'POST', credentials: 'include' });
        if (r.ok) return true;
      } catch (e) { /* fallback */ }
      
      try {
        const fallback = `${detailsUrlBase}&incView=true`;
        const rf = await fetch(fallback, { signal: abort.signal, credentials: 'include' });
        return rf.ok;
      } catch (e) {
        return false;
      }
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      
      try {
        const res = await fetch(detailsUrlBase, { signal: abort.signal, credentials: 'include' });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = await res.json();
        const listing = json.listing || json || null;
        setData(listing);

        if (needsIncrement()) {
          const ok = await doIncrement();
          if (ok) {
            markViewedNow();
            setData(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : prev);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => abort.abort();
  }, [isOpen, listingId]);

  // Fetch user profile (hybrid authentication: cookies + Authorization header)
  useEffect(() => {
    if (!isOpen) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: 'GET',
          credentials: 'include',
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });

        let userData = null;
        try { userData = await res.json(); } catch (e) { userData = null; }

        if (!res.ok || !userData) return;

        setEnquiryState(s => ({
          ...s,
          name: userData.name ? String(userData.name) : s.name,
          email: userData.email ? String(userData.email).trim().toLowerCase() :
                 (userData.Email ? String(userData.Email).trim().toLowerCase() : s.email),
          phone: userData.mobile ? String(userData.mobile) :
                 (userData.mobileNumber ? String(userData.mobileNumber) :
                 (userData.phone ? String(userData.phone) : s.phone)),
        }));
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };

    fetchUser();
  }, [isOpen, userToken]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setLoading(false);
      setEnqStatus(null);
      setValidationErrors({});
      setEnquiryState({ name: '', email: '', phone: '', message: '' });
    }
  }, [isOpen]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!enquiryState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiryState.email)) {
      errors.email = 'Valid email is required';
    }
    
    if (!enquiryState.message || enquiryState.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [enquiryState]);

  const handleEnquirySubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix form errors', 'error');
      return;
    }

    if (enqStatus === 'sending') return; // Prevent double submission

    setEnqStatus('sending');
    setError(null);
    setModalLoading(true);
    
    try {
      const base = process.env.REACT_APP_Base_API || '';
      const url = `${base.replace(/\/$/, '')}/flatmateenquiry`;
      const payload = { listingId, ...enquiryState };
      
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error(`Server: ${res.status}`);
      
      setEnqStatus('sent');
      showToast('Enquiry submitted successfully! The owner will contact you soon.', 'success');
    } catch (err) {
      setEnqStatus('error');
      setError(err.message || 'Failed to send enquiry');
      showToast('Failed to send enquiry. Please try again.', 'error');
    } finally {
      setModalLoading(false);
    }
  }, [validateForm, enqStatus, enquiryState, listingId, showToast, userToken]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div 
        ref={modalRef}
        style={styles.modal} 
        onClick={(e) => e.stopPropagation()}
      >
        {modalLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner} aria-hidden="true" />
            <div style={{ marginTop: 10, color: '#003366', fontWeight: 600 }}>Sending enquiry...</div>
          </div>
        )}

        <div style={styles.header}>
          <h3 id="modal-title" style={styles.title}>
            {data?.title || 'Property Details'}
          </h3>
          <button 
            ref={closeButtonRef}
            onClick={handleClose} 
            style={styles.closeBtn} 
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {loading && (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <div style={{ marginTop: 12, color: '#4A6A8A' }}>Loading details...</div>
            </div>
          )}
          
          {error && !loading && (
            <div style={styles.errorState}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && !data && (
            <div style={{ padding: 20, color: '#4A6A8A' }}>No details available.</div>
          )}

          {data && (
            <div style={styles.contentGrid}>
              <div style={styles.leftColumn}>
                {/* Default property image */}
                <div style={styles.photoSection}>
                  <PlaceholderImage />
                </div>

                {/* Description */}
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Description</h4>
                  <div style={styles.description}>{data.description || 'No description provided.'}</div>
                </div>

                {/* Quick info pills */}
                <div style={styles.pillContainer}>
                  <div style={styles.pill}>📅 Move-in: {formattedMoveInDate}</div>
                  <div style={styles.pill}>🛋️ {data.furnished ? 'Furnished' : 'Unfurnished'}</div>
                  <div style={styles.pill}>👤 {data.preferredGender || 'Any'}</div>
                  <div style={styles.pill}>🏠 {data.occupancyWanted || 1} wanted</div>
                  <div style={styles.pill}>👥 {data.currentOccupants || 0} current</div>
                </div>

                {/* Amenities */}
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Amenities</h4>
                  {Array.isArray(data.amenities) && data.amenities.length > 0 ? (
                    <ul style={styles.amenitiesList}>
                      {data.amenities.map((a, i) => (
                        <li key={i} style={styles.amenityItem}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: '#4A6A8A' }}>No amenities listed.</div>
                  )}
                </div>

                {/* Enquiry form */}
                {enqStatus !== 'sent' && (
                  <div style={styles.enquirySection}>
                    <h4 style={styles.sectionTitle}>Send Enquiry</h4>
                    <form onSubmit={handleEnquirySubmit} style={styles.form}>
                      <div>
                        <input
                          type="email"
                          placeholder="Your email"
                          required
                          value={enquiryState.email}
                          onChange={e => setEnquiryState(s => ({ ...s, email: e.target.value }))}
                          disabled={enqStatus === 'sending'}
                          style={{
                            ...styles.input,
                            ...(validationErrors.email && styles.inputError)
                          }}
                          aria-invalid={!!validationErrors.email}
                        />
                        {validationErrors.email && (
                          <div style={styles.fieldError}>{validationErrors.email}</div>
                        )}
                      </div>

                      <div>
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={enquiryState.phone}
                          onChange={e => setEnquiryState(s => ({ ...s, phone: e.target.value }))}
                          disabled={enqStatus === 'sending'}
                          style={styles.input}
                        />
                      </div>

                      <div>
                        <textarea
                          placeholder="Your message (minimum 10 characters)"
                          required
                          value={enquiryState.message}
                          onChange={e => setEnquiryState(s => ({ ...s, message: e.target.value }))}
                          disabled={enqStatus === 'sending'}
                          style={{
                            ...styles.textarea,
                            ...(validationErrors.message && styles.inputError)
                          }}
                          aria-invalid={!!validationErrors.message}
                        />
                        {validationErrors.message && (
                          <div style={styles.fieldError}>{validationErrors.message}</div>
                        )}
                      </div>

                      <div style={styles.buttonGroup}>
                        <button 
                          type="submit" 
                          style={{
                            ...styles.primaryBtn,
                            ...(enqStatus === 'sending' && styles.btnDisabled)
                          }}
                          disabled={enqStatus === 'sending'}
                        >
                          {enqStatus === 'sending' ? 'Sending...' : 'Send Enquiry'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {enqStatus === 'sent' && (
                  <div style={styles.successMessage}>
                    <div style={styles.successIcon}>✓</div>
                    <div>
                      <strong>Enquiry sent successfully!</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#4A6A8A' }}>
                        The property owner will contact you soon via email or phone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky sidebar */}
              <aside style={styles.sidebar}>
                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>Location</h4>
                  <div style={styles.sidebarText}>
                    {data.area}, {data.city}
                  </div>
                </div>

                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>Budget</h4>
                  <div style={styles.budgetRange}>
                    ₹{data.budget?.min?.toLocaleString() || 'N/A'} — ₹{data.budget?.max?.toLocaleString() || 'N/A'}
                  </div>
                </div>

                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>Listing Details</h4>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={{
                      ...styles.statusBadge,
                      ...(data.isActive ? styles.statusActive : styles.statusInactive)
                    }}>
                      {data.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Posted:</span>
                    <span style={styles.sidebarText}>{formattedCreatedAt}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Updated:</span>
                    <span style={styles.sidebarText}>{formattedUpdatedAt}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Views:</span>
                    <span style={styles.sidebarText}>{data.views || 0}</span>
                  </div>
                </div>

                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>Contact Methods</h4>
                  <div style={styles.contactMethods}>
                    <div style={styles.contactMethod}>
                      📞 Phone: {data.contactMethods?.phone ? '✓ Available' : '✗ Hidden'}
                    </div>
                    <div style={styles.contactMethod}>
                      ✉️ Email: {data.contactMethods?.email ? '✓ Available' : '✗ Hidden'}
                    </div>
                  </div>
                </div>

                <div style={styles.listingIdSection}>
                  <small style={styles.listingId}>ID: {data._id}</small>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast.show && (
        <div 
          style={{
            ...styles.toast,
            ...(toast.type === 'success' && styles.toastSuccess),
            ...(toast.type === 'error' && styles.toastError)
          }}
          role="status"
          aria-live="polite"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0, 51, 102, 0.85) 0%, rgba(74, 106, 138, 0.75) 50%, rgba(0, 167, 157, 0.65) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: 16,
    animation: 'fadeIn 0.3s ease'
  },
  modal: {
    width: 'min(1100px, 100%)',
    maxHeight: '92vh',
    overflow: 'auto',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    boxShadow: '0 20px 60px rgba(0, 51, 102, 0.3), 0 0 1px rgba(255, 255, 255, 0.5) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    position: 'relative',
    animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 3000,
    borderRadius: 20
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    border: '4px solid #F4F7F9',
    borderTopColor: '#00A79D',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(74, 106, 138, 0.15)',
    position: 'sticky',
    top: 0,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 247, 249, 0.95) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #003366 0%, #00A79D 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1.3,
    letterSpacing: '-0.5px'
  },
  closeBtn: {
    background: 'rgba(244, 247, 249, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(74, 106, 138, 0.2)',
    fontSize: 24,
    cursor: 'pointer',
    color: '#4A6A8A',
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(0, 51, 102, 0.08)'
  },
  body: {
    padding: '24px'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    color: '#4A6A8A'
  },
  errorState: {
    padding: 20,
    background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 226, 226, 0.8) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#991B1B',
    borderRadius: 12,
    border: '1px solid rgba(252, 165, 165, 0.5)',
    boxShadow: '0 4px 16px rgba(153, 27, 27, 0.1)'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 32
  },
  leftColumn: {
    minWidth: 0
  },
  photoSection: {
    marginBottom: 24
  },
  placeholder: {
    width: '100%',
    aspectRatio: '16/9',
    background: 'linear-gradient(135deg, rgba(0, 167, 157, 0.1) 0%, rgba(34, 211, 238, 0.15) 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    border: '1px solid rgba(0, 167, 157, 0.2)',
    boxShadow: '0 8px 24px rgba(0, 167, 157, 0.12)'
  },
  defaultImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  placeholderText: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    background: 'rgba(0, 51, 102, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontWeight: 500
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#003366'
  },
  description: {
    color: '#333333',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    fontSize: 15
  },
  pillContainer: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24
  },
  pill: {
    background: 'rgba(244, 247, 249, 0.9)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '10px 16px',
    borderRadius: 24,
    color: '#003366',
    fontSize: 14,
    border: '1px solid rgba(0, 167, 157, 0.2)',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 51, 102, 0.08)',
    transition: 'all 0.3s ease'
  },
  amenitiesList: {
    margin: 0,
    padding: '0 0 0 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 8
  },
  amenityItem: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 1.8
  },
  enquirySection: {
    marginTop: 32,
    padding: 28,
    background: 'linear-gradient(135deg, rgba(244, 247, 249, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    border: '1px solid rgba(0, 167, 157, 0.2)',
    boxShadow: '0 8px 24px rgba(0, 167, 157, 0.1)'
  },
  form: {
    display: 'grid',
    gap: 16
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 12,
    border: '1px solid rgba(74, 106, 138, 0.25)',
    fontSize: 15,
    color: '#333333',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
    fontWeight: 500
  },
  inputError: {
    borderColor: '#DC2626',
    background: 'rgba(254, 226, 226, 0.9)'
  },
  textarea: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 12,
    border: '1px solid rgba(74, 106, 138, 0.25)',
    fontSize: 15,
    color: '#333333',
    minHeight: 120,
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
    fontWeight: 500,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 6,
    fontWeight: 500
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-start',
    marginTop: 8
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '16px 32px',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(0, 167, 157, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    letterSpacing: '0.3px'
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  successMessage: {
    marginTop: 32,
    padding: 28,
    background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    border: '1px solid rgba(0, 167, 157, 0.3)',
    display: 'flex',
    gap: 18,
    alignItems: 'flex-start',
    color: '#003366',
    boxShadow: '0 8px 24px rgba(0, 167, 157, 0.15)'
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(0, 167, 157, 0.3)'
  },
  sidebar: {
    borderLeft: '1px solid rgba(74, 106, 138, 0.15)',
    paddingLeft: 28,
    position: 'sticky',
    top: 24,
    alignSelf: 'flex-start',
    background: 'linear-gradient(135deg, rgba(244, 247, 249, 0.5) 0%, rgba(255, 255, 255, 0.4) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 16px rgba(0, 51, 102, 0.08)'
  },
  sidebarSection: {
    marginBottom: 24
  },
  sidebarTitle: {
    margin: '0 0 10px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#003366',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sidebarText: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 1.5
  },
  budgetRange: {
    color: '#00A79D',
    fontSize: 20,
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(0, 167, 157, 0.2)',
    letterSpacing: '0.5px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  detailLabel: {
    color: '#4A6A8A',
    fontSize: 14
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 700,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  statusActive: {
    background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(34, 211, 238, 0.15) 100%)',
    color: '#00A79D',
    border: '1px solid rgba(0, 167, 157, 0.3)',
    boxShadow: '0 2px 8px rgba(0, 167, 157, 0.15)'
  },
  statusInactive: {
    background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 226, 226, 0.8) 100%)',
    color: '#991B1B',
    border: '1px solid rgba(252, 165, 165, 0.5)',
    boxShadow: '0 2px 8px rgba(153, 27, 27, 0.1)'
  },
  contactMethods: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  contactMethod: {
    color: '#333333',
    fontSize: 14,
    lineHeight: 1.6
  },
  listingIdSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid rgba(74, 106, 138, 0.15)'
  },
  listingId: {
    color: '#4A6A8A',
    fontSize: 12,
    fontFamily: 'monospace'
  },
  toast: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    padding: '16px 24px',
    borderRadius: 12,
    boxShadow: '0 12px 32px rgba(0, 51, 102, 0.2)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#003366',
    zIndex: 4000,
    fontWeight: 600,
    minWidth: 280,
    maxWidth: 400,
    animation: 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },
  toastSuccess: {
    background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98) 0%, rgba(34, 211, 238, 0.2) 100%)',
    color: '#00A79D',
    borderLeft: '4px solid #00A79D',
    boxShadow: '0 12px 32px rgba(0, 167, 157, 0.25)'
  },
  toastError: {
    background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.98) 0%, rgba(254, 226, 226, 0.9) 100%)',
    color: '#991B1B',
    borderLeft: '4px solid #DC2626',
    boxShadow: '0 12px 32px rgba(153, 27, 27, 0.25)'
  }
};

// Add animations
if (typeof document !== 'undefined' && document.head) {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from {
        transform: scale(0.95);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%) translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0) translateY(0);
        opacity: 1;
      }
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 167, 157, 0.35);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      transform: none !important;
      box-shadow: none !important;
    }
    button[style*="closeBtn"]:hover {
      background: rgba(0, 167, 157, 0.1) !important;
      color: #00A79D !important;
      transform: rotate(90deg);
      box-shadow: 0 4px 12px rgba(0, 167, 157, 0.2) !important;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #00A79D;
      box-shadow: 0 0 0 4px rgba(0, 167, 157, 0.15), 0 4px 12px rgba(0, 167, 157, 0.1);
      transform: translateY(-1px);
    }
    div[style*="pill"]:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 167, 157, 0.2);
      background: rgba(0, 167, 157, 0.1);
      border-color: rgba(0, 167, 157, 0.4);
    }
  `;
  document.head.appendChild(styleSheet);
}