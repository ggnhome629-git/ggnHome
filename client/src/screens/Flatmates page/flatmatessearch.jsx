import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, Home, Filter, X, Heart, BarChart2, Grid, List, Moon, Sun, CheckCircle, Loader, AlertCircle, ChevronLeft, ChevronRight, Users, DollarSign, Zap, RefreshCw } from 'lucide-react';
import TopNavigationBar from '../Flatmates page/TopNavigationBar';
// Property Modal Component
const FlatmateSearchPropertyModal = ({ isOpen: isOpenProp, listingId: listingIdProp, onClose }) => {
  // Hybrid auth: accessToken for fallback to cookie
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
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryState, setEnquiryState] = useState({ name: '', email: '', phone: '', message: '' });
  const [enqStatus, setEnqStatus] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });

  const showToast = (msg, type = 'info') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  };

  useEffect(() => {
    if (!isOpen || !listingId) return;

    const abort = new AbortController();
    const base = process.env.REACT_APP_Base_API || '';
    const url = `${base.replace(/\/$/, '')}/flatmatelistingdetails?id=${encodeURIComponent(listingId)}`;

    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(url, { signal: abort.signal, credentials: 'include' });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = await res.json();
        const listing = json.listing || json || null;
        setData(listing);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => abort.abort();
  }, [isOpen, listingId]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setLoading(false);
      setShowEnquiry(false);
      setEnqStatus(null);
      setEnquiryState({ name: '', email: '', phone: '', message: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isOpen) return;
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
          email: userData.email ? String(userData.email).trim().toLowerCase() : (userData.Email ? String(userData.Email).trim().toLowerCase() : s.email),
          phone: userData.mobile ? String(userData.mobile) : (userData.mobileNumber ? String(userData.mobileNumber) : (userData.phone ? String(userData.phone) : s.phone)),
        }));
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, [isOpen, userToken]);

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
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
      showToast('Enquiry submitted successfully', 'success');
    } catch (err) {
      setEnqStatus('error');
      setError(err.message || 'Failed to send enquiry');
      showToast('Failed to send enquiry', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalStyles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(10,11,13,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    },
    modal: {
      width: 'min(1100px, 96%)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(2,6,23,0.2)', position: 'relative'
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #eef2f7' },
    closeBtn: { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' },
    body: { padding: 18 },
    chip: { background: '#f8fafc', padding: '6px 10px', borderRadius: 6, color: '#374151', fontSize: 13, border: '1px solid #eef2f7' },
    primaryBtn: { background: '#0ea5a4', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer' },
    ghostBtn: { background: 'transparent', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e6edf3' },
    loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.85)', zIndex: 3000, borderRadius: 10
    },
    toast: {
      position: 'fixed', right: 18, bottom: 18, padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 20px rgba(2,6,23,0.12)',
      background: '#fff', color: '#0f172a', zIndex: 4000, fontWeight: 600
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={handleClose}>
      
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        {modalLoading && (
          <div style={modalStyles.loadingOverlay}>
            <Loader className="animate-spin" size={44} />
            <div style={{ marginTop: 10 }}>Sending enquiry...</div>
          </div>
        )}
        
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0 }}>{data ? data.title : 'Property details'}</h3>
          <button onClick={handleClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        <div style={modalStyles.body}>
          {loading && <div style={{ padding: 20 }}>Loading...</div>}
          {error && <div style={{ color: 'crimson', padding: 10 }}>{error}</div>}
          {!loading && !error && !data && <div style={{ padding: 20 }}>No details available.</div>}

          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
              <div>
                {Array.isArray(data.photos) && data.photos.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                    {data.photos.map((p, idx) => (
                      <img key={idx} src={p.url} alt={`photo-${idx}`} style={{ width: 240, height: 160, objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ width: '100%', minHeight: 180, background: '#f2f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 14, borderRadius: 8 }}>
                    No photos available
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <h4 style={{ marginBottom: 6 }}>Description</h4>
                  <div style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{data.description}</div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={modalStyles.chip}>Moves in: {formatDate(data.moveInDate)}</div>
                  <div style={modalStyles.chip}>Furnished: {data.furnished ? 'Yes' : 'No'}</div>
                  <div style={modalStyles.chip}>Preferred: {data.preferredGender}</div>
                  <div style={modalStyles.chip}>Occupancy: {data.occupancyWanted}</div>
                  <div style={modalStyles.chip}>Current occupants: {data.currentOccupants}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <h4 style={{ marginBottom: 6 }}>Amenities</h4>
                  {Array.isArray(data.amenities) && data.amenities.length > 0 ? (
                    <ul style={{ marginTop: 6 }}>
                      {data.amenities.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  ) : (
                    <div style={{ color: '#6b7280' }}>No amenities listed.</div>
                  )}
                </div>
              </div>

              <aside style={{ borderLeft: '1px solid #eef2f7', paddingLeft: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 6px 0' }}>Location</h4>
                  <div style={{ color: '#374151' }}>{data.area}, {data.city}</div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 6px 0' }}>Budget</h4>
                  <div style={{ color: '#374151' }}>₹ {data.budget?.min} — ₹ {data.budget?.max}</div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 6px 0' }}>Listing Info</h4>
                  <div style={{ color: '#374151' }}>Posted: {formatDate(data.createdAt)}</div>
                  <div style={{ color: '#374151' }}>Status: {data.isActive ? 'Active' : 'Inactive'}</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    style={modalStyles.primaryBtn}
                    onClick={() => {
                      setShowEnquiry(true);
                      setEnquiryState(s => ({
                        ...s,
                        message: 'I am interested in this flatmate listing. Please provide me more details.'
                      }));
                    }}
                  >
                    Enquire
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
                  <div>Contact methods:</div>
                  <div>Phone: {data.contactMethods?.phone ? 'Available' : 'Hidden'}</div>
                  <div>Email: {data.contactMethods?.email ? 'Available' : 'Hidden'}</div>
                </div>
              </aside>

              {showEnquiry && (
                <div style={{ gridColumn: '1 / -1', marginTop: 12, borderTop: '1px solid #eef2f7', paddingTop: 12 }}>
                  <h4>Send an enquiry</h4>
                  {enqStatus === 'sent' ? (
                    <div style={{ color: 'green' }}>Enquiry sent. Our support team will contact you shortly.</div>
                  ) : (
                    <form onSubmit={handleEnquirySubmit} style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={`Listing: ${String(data?._id || '').slice(0, 6)}`} readOnly style={{ ...modalStyles.input, fontWeight: '600' }} />
                        <input placeholder="Email" type="email" required value={enquiryState.email} readOnly style={modalStyles.input} />
                      </div>
                      <input placeholder="Phone (optional)" value={enquiryState.phone} readOnly style={modalStyles.input} />
                      <textarea placeholder="Message" required value={enquiryState.message} onChange={e => setEnquiryState(s => ({ ...s, message: e.target.value }))} style={{ ...modalStyles.input, minHeight: 80 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" style={modalStyles.primaryBtn} disabled={enqStatus === 'sending'}>
                          {enqStatus === 'sending' ? 'Sending...' : 'Send Enquiry'}
                        </button>
                        <button type="button" onClick={() => { setShowEnquiry(false); setEnqStatus(null); }} style={modalStyles.ghostBtn}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast.show && (
        <div style={{ ...modalStyles.toast, ...(toast.type === 'success' ? { background: '#ecfdf5', color: '#065f46' } : toast.type === 'error' ? { background: '#fff1f2', color: '#9f1239' } : {}) }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// Replace all onClose( with handleClose( inside FlatmateSearchPropertyModal component
const ThemeContext = React.createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const colors = {
    primary: '#00A79D',
    secondary: '#003366',
    slate: '#4A6A8A',
    cyan: '#22D3EE',
    alabaster: '#F4F7F9',
    background: darkMode ? '#0F172A' : '#F8FAFC',
    surface: darkMode ? '#1E293B' : '#FFFFFF',
    surfaceHover: darkMode ? '#334155' : '#F1F5F9',
    text: darkMode ? '#F1F5F9' : '#333333',
    textSecondary: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Custom hooks
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const usePersistedBookmarks = () => {
  const [bookmarks, setBookmarks] = useState(new Set());

  const toggleBookmark = useCallback((listingId) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
  }, []);

  return [bookmarks, toggleBookmark];
};

// Image Carousel Component
const ImageCarousel = ({ photos, alt, colors }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const validImages = photos?.filter(img => img?.url) || [];
  const displayImages = validImages.length > 0 ? validImages : [{ url: '/default-property.jpg' }];

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    setImageLoaded(false);
  };

  const goToPrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    setImageLoaded(false);
  };

  return (
    <div 
      style={{ position: 'relative', paddingBottom: '66.67%', overflow: 'hidden' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {!imageLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: colors.surfaceHover,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Loader className="animate-spin" size={24} color={colors.textSecondary} />
        </div>
      )}
      
      <img
        src={displayImages[currentIndex].url}
        alt={`${alt} - Image ${currentIndex + 1}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={(e) => {
          e.target.src = '/default-property.jpg';
          setImageLoaded(true);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: imageLoaded ? 1 : 0,
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'opacity 0.3s, transform 0.6s ease'
        }}
      />

      {displayImages.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: `translateY(-50%) scale(${isHovered ? 1 : 0})`,
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease',
              opacity: isHovered ? 1 : 0
            }}
          >
            <ChevronLeft size={20} color="#333" />
          </button>

          <button
            onClick={goToNext}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: `translateY(-50%) scale(${isHovered ? 1 : 0})`,
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease',
              opacity: isHovered ? 1 : 0
            }}
          >
            <ChevronRight size={20} color="#333" />
          </button>

          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 2
          }}>
            {currentIndex + 1}/{displayImages.length}
          </div>
        </>
      )}
    </div>
  );
};

// Enhanced Listing Card
const ListingCard = React.memo(({ listing, colors, bookmarks, toggleBookmark, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    toggleBookmark(listing._id || listing.id);
  };

  const isBookmarked = bookmarks.has(listing._id || listing.id);
  
  const budgetDisplay = listing.budget?.min && listing.budget?.max 
    ? `₹${listing.budget.min.toLocaleString()}-${listing.budget.max.toLocaleString()}` 
    : (listing.pricePerMonth ? `₹${listing.pricePerMonth.toLocaleString()}/mo` : 'Budget flexible');

  const moveInDisplay = listing.moveInDate 
    ? new Date(listing.moveInDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : 'Flexible';

  const location = listing.area ? `${listing.area}, ${listing.city || ''}` : (listing.city || 'Location not specified');

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.12)' : '0 2px 16px rgba(0,0,0,0.08)',
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      tabIndex={0}
      aria-label={`${listing.title} in ${location}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <ImageCarousel photos={listing.photos} alt={listing.title} colors={colors} />

      {/* Bookmark Button */}
      <button
        onClick={handleBookmarkClick}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: isBookmarked ? colors.error : 'rgba(255,255,255,0.95)',
          border: 'none',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transform: isBookmarked ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
      >
        
      </button>

      {/* Status Badges */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', zIndex: 2 }}>
        {(listing.isActive || listing.status === 'active') && (
          <span style={{
            backgroundColor: colors.success,
            color: 'white',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <CheckCircle size={12} />
            Active
          </span>
        )}
        {(listing.verified || listing.boosted) && (
          <span style={{
            backgroundColor: colors.warning,
            color: 'white',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <Zap size={12} />
            Featured
          </span>
        )}
      </div>

      {/* Card Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          color: colors.text,
          fontSize: '18px',
          fontWeight: '600',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {listing.title}
        </h3>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
          <MapPin size={16} />
          <span>{location}</span>
        </div>

        {/* Key Details Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: colors.alabaster,
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${colors.border}`,
            transition: 'all 0.3s ease'
          }}>
            <DollarSign size={14} color={colors.primary} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{budgetDisplay}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: colors.alabaster,
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <Calendar size={14} color={colors.slate} />
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>{moveInDisplay}</span>
          </div>

          {listing.preferredGender && listing.preferredGender !== 'any' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: colors.alabaster,
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <Users size={14} color={colors.slate} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: colors.text, textTransform: 'capitalize' }}>
                {listing.preferredGender}
              </span>
            </div>
          )}

          {listing.roomType && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: colors.alabaster,
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <Home size={14} color={colors.slate} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>
                {listing.roomType}
              </span>
            </div>
          )}
        </div>

        {/* Description Preview */}
        {listing.description && (
          <p style={{
            margin: '0 0 16px 0',
            color: colors.textSecondary,
            fontSize: '14px',
            lineHeight: '1.6',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {listing.description}
          </p>
        )}

        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
            {listing.amenities.slice(0, 3).map((amenity, i) => (
              <span
                key={i}
                style={{
                  backgroundColor: `${colors.primary}10`,
                  color: colors.primary,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span style={{
                color: colors.textSecondary,
                fontSize: '12px',
                padding: '4px 10px'
              }}>
                +{listing.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textSecondary, fontSize: '13px' }}>
            <BarChart2 size={14} />
            <span>{listing.views || 0} views</span>
          </div>
          
          {listing.furnished && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: colors.primary,
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <Home size={14} />
              <span>Furnished</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Skeleton Loader
const ListingCardSkeleton = ({ colors }) => (
  <div style={{
    backgroundColor: colors.surface,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${colors.border}`,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <div style={{
      position: 'relative',
      paddingBottom: '66.67%',
      backgroundColor: colors.surfaceHover,
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(90deg, ${colors.surfaceHover} 25%, ${colors.border} 50%, ${colors.surfaceHover} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite'
      }} />
    </div>
    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ height: '20px', backgroundColor: colors.surfaceHover, borderRadius: '4px', width: '80%' }} />
      <div style={{ height: '16px', backgroundColor: colors.surfaceHover, borderRadius: '4px', width: '60%' }} />
      <div style={{ height: '16px', backgroundColor: colors.surfaceHover, borderRadius: '4px', width: '40%' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <div style={{ height: '24px', backgroundColor: colors.surfaceHover, borderRadius: '12px', width: '60px' }} />
        <div style={{ height: '24px', backgroundColor: colors.surfaceHover, borderRadius: '12px', width: '50px' }} />
      </div>
    </div>
  </div>
);

// Main Component
const FlatmateDiscovery = () => {
  const { darkMode, setDarkMode, colors } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const openListingModal = (id) => {
    // navigate so the modal gets a bookmarkable URL and remember background location
    try {
      navigate(`/flatmatesearchpropertymodal/${id}`, { state: { background: location } });
    } catch (e) {
      // fallback: simple push
      window.history.pushState(null, '', `/flatmatesearchpropertymodal/${id}`);
    }
    setSelectedListing(id);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceMin: 0,
    priceMax: 50000,
    city: '',
    area: '',
    moveInDate: '',
    preferredGender: '',
    furnished: null,
    roomType: '',
    amenities: [],
    sortBy: 'newest'
  });

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [bookmarks, toggleBookmark] = usePersistedBookmarks();
  const [totalResults, setTotalResults] = useState(0);
  const [selectedListing, setSelectedListing] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Fetch listings from backend
  const fetchListings = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20'
      });

      if (debouncedSearchQuery) queryParams.set('q', debouncedSearchQuery);
      if (filters.city) queryParams.set('city', filters.city);
      if (filters.area) queryParams.set('area', filters.area);
      if (filters.priceMin > 0) queryParams.set('minPrice', filters.priceMin);
      if (filters.priceMax < 50000) queryParams.set('maxPrice', filters.priceMax);
      if (filters.moveInDate) queryParams.set('moveInDate', filters.moveInDate);
      if (filters.preferredGender) queryParams.set('preferredGender', filters.preferredGender);
      if (filters.furnished !== null) queryParams.set('furnished', filters.furnished);
      if (filters.roomType) queryParams.set('roomType', filters.roomType);
      if (filters.amenities.length > 0) queryParams.set('amenities', filters.amenities.join(','));
      if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);

      const base = process.env.REACT_APP_Base_API || '';
      const url = `${base}/api/flatmates/listings/search?${queryParams.toString()}`;

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch listings: ${res.status}`);
      }

      const json = await res.json();
      
      if (json && json.success && json.data) {
        const items = json.data.items || [];
        
        if (append) {
          setListings(prev => [...prev, ...items]);
        } else {
          setListings(items);
        }
        
        setHasMore(items.length >= 20);
        setPage(pageNum);
        setTotalResults(json.data.totalItems || items.length);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters]);
    // If the page is opened with a query parameter (e.g. /flatmatessearch?q=sec%2046),
  // initialize the search input and trigger a search.
  // We place this effect after fetchListings is defined so we can call it directly.
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get('q') || '';
      if (q) {
        // update the input if it's different
        setSearchQuery(prev => (prev === q ? prev : q));
        // fetch immediately so results show without waiting for debounce
        fetchListings(1, false);
      }
    } catch (e) {
      // ignore malformed URLSearchParams
      console.warn('Failed to parse search params', e);
    }
    // only re-run when the location.search changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Initial load
  useEffect(() => {
    fetchListings(1, false);
  }, [debouncedSearchQuery, filters.sortBy, filters.city, filters.area, filters.preferredGender, filters.furnished, filters.roomType, filters.amenities]);

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchListings(page + 1, true);
    }
  };

  // Filter Drawer
  const FilterDrawer = () => (
    <>
      {showFilterDrawer && (
        <>
          <div
            onClick={() => setShowFilterDrawer(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: '380px',
              maxWidth: '90vw',
              backgroundColor: colors.surface,
              boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
              zIndex: 1001,
              padding: '32px 24px',
              overflowY: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Filter listings"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ color: colors.text, margin: 0, fontSize: '24px', fontWeight: '600' }}>Filters</h2>
              <button
                onClick={() => setShowFilterDrawer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-label="Close filters"
              >
                <X size={24} />
              </button>
            </div>

            {/* Price Range */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: colors.text, fontWeight: '500' }}>
                Budget Range
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: colors.textSecondary, fontSize: '14px' }}>
                <span>₹{filters.priceMin.toLocaleString()}</span>
                <span>₹{filters.priceMax.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={filters.priceMax}
                onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(filters.priceMax/50000)*100}%, ${colors.border} ${(filters.priceMax/50000)*100}%, ${colors.border} 100%)`,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Gender Preference */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: colors.text, fontWeight: '500' }}>
                Gender Preference
              </label>
              <select
                value={filters.preferredGender}
                onChange={(e) => setFilters(prev => ({ ...prev, preferredGender: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Room Type */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: colors.text, fontWeight: '500' }}>
                Room Type
              </label>
              <select
                value={filters.roomType}
                onChange={(e) => setFilters(prev => ({ ...prev, roomType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="">Any</option>
                <option value="Private Room">Private Room</option>
                <option value="Shared Room">Shared Room</option>
                <option value="Entire Place">Entire Place</option>
              </select>
            </div>

            {/* Furnished */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.furnished === true}
                  onChange={(e) => setFilters(prev => ({ ...prev, furnished: e.target.checked ? true : null }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: colors.primary }}
                />
                <span style={{ color: colors.text, fontSize: '15px', fontWeight: '500' }}>Furnished only</span>
              </label>
            </div>

            {/* Move-in Date */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: colors.text, fontWeight: '500' }}>
                Move-in Date
              </label>
              <input
                type="date"
                value={filters.moveInDate}
                onChange={(e) => setFilters(prev => ({ ...prev, moveInDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              onClick={() => {
                setShowFilterDrawer(false);
                setPage(1);
                fetchListings(1, false);
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Apply Filters
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {loading && listings.length === 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: colors.background,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5000,
          gap: '20px',
          animation: 'fadeIn 0.5s ease'
        }}>
          <Loader className="animate-spin" size={64} color={colors.primary} />
          <h2 style={{ color: colors.text, margin: 0 }}>Finding the best matches for you…</h2>
          <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
            Please wait while we load flatmate listings
          </p>
        </div>
      )}
      <TopNavigationBar />
      {/* Hero Section with Search */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.secondary} 0%, #1e5a7a 50%, ${colors.slate} 100%)`,
        padding: '80px 24px 60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: `radial-gradient(circle, ${colors.cyan}10 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{
            color: 'white',
            fontSize: '48px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '16px',
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
            animation: 'fadeInUp 0.6s ease'
          }}>
            Find Your Perfect Flatmate
          </h1>
          <p style={{
            color: colors.cyan,
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '40px',
            fontWeight: '400',
            animation: 'fadeInUp 0.8s ease'
          }}>
            Discover compatible roommates that match your lifestyle and budget
          </p>

          {/* Search Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            maxWidth: '800px',
            margin: '0 auto',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            padding: '8px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'fadeInUp 1s ease'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={20} style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.slate,
                zIndex: 1
              }} />
              <input
                type="text"
                placeholder="Search by location or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px 16px 56px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.text
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: colors.surfaceHover,
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: colors.textSecondary,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.error;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.surfaceHover;
                    e.currentTarget.style.color = colors.textSecondary;
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchListings(1, false)}
              style={{
                padding: '16px 32px',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.cyan} 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
                boxShadow: `0 4px 16px ${colors.primary}40`
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Filters Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {totalResults > 0 && (
                <span style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>
                  {totalResults} Listings
                </span>
              )}

              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="relevance">Relevance</option>
              </select>

              {/* View Mode */}
              <div style={{ display: 'flex', gap: '8px', backgroundColor: colors.surfaceHover, borderRadius: '12px', padding: '4px' }}>
                {[
                  { mode: 'grid', icon: Grid },
                  { mode: 'list', icon: List }
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '10px',
                      backgroundColor: viewMode === mode ? colors.surface : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: viewMode === mode ? colors.primary : colors.textSecondary,
                      transition: 'all 0.2s'
                    }}
                    aria-label={`${mode} view`}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  padding: '10px',
                  backgroundColor: colors.surfaceHover,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  transition: 'all 0.2s'
                }}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <button
              onClick={() => setShowFilterDrawer(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', animation: 'fadeIn 0.5s ease' }}>
            <AlertCircle size={48} color={colors.error} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: colors.text, marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
              Something went wrong
            </h3>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => fetchListings(1, false)}
              style={{
                padding: '12px 24px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : listings.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
            <h3 style={{ color: colors.text, marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
              No listings found
            </h3>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({
                  priceMin: 0,
                  priceMax: 50000,
                  city: '',
                  area: '',
                  moveInDate: '',
                  preferredGender: '',
                  furnished: null,
                  roomType: '',
                  amenities: [],
                  sortBy: 'newest'
                });
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* Loading Skeletons */}
            {loading && listings.length === 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                {[...Array(6)].map((_, i) => (
                  <ListingCardSkeleton key={i} colors={colors} />
                ))}
              </div>
            ) : (
              <>
                <div
                  role="list"
                  style={{
                    display: viewMode === 'grid' ? 'grid' : 'flex',
                    gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'none',
                    flexDirection: viewMode === 'list' ? 'column' : 'row',
                    gap: '24px'
                  }}
                >
                  {listings.map((listing, index) => (
                    <div
                      key={listing._id || listing.id}
                      style={{
                        animation: `fadeInUp 0.5s ease ${index * 0.05}s both`
                      }}
                    >
                      <ListingCard
                        listing={listing}
                        colors={colors}
                        bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark}
                        onClick={() => openListingModal(listing._id || listing.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Loading More Indicator */}
                {loading && listings.length > 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
                    <Loader className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                    <p style={{ marginTop: '16px' }}>Loading more listings...</p>
                  </div>
                )}

                {/* Load More Button */}
                {!loading && hasMore && listings.length > 0 && (
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button
                      onClick={loadMore}
                      style={{
                        padding: '12px 32px',
                        backgroundColor: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <FilterDrawer />

      {/* Property Details Modal */}
      <FlatmateSearchPropertyModal
        isOpen={!!selectedListing}
        listingId={selectedListing}
        onClose={() => setSelectedListing(null)}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowFilterDrawer(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: colors.primary,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: `0 8px 24px ${colors.primary}60`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99,
          transition: 'all 0.3s ease',
          animation: 'bounce 2s ease infinite'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        aria-label="Open filters"
      >
        <Filter size={24} />
      </button>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes fadeInUp {
            from { 
              opacity: 0;
              transform: translateY(20px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${colors.primary};
            cursor: pointer;
            border: 3px solid ${colors.surface};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
          }
          
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${colors.primary};
            cursor: pointer;
            border: 3px solid ${colors.surface};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
          }
          
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          * {
            box-sizing: border-box;
          }

          button:focus-visible,
          input:focus-visible,
          select:focus-visible {
            outline: 2px solid ${colors.primary};
            outline-offset: 2px;
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              transition-duration: 0.01ms !important;
            }
          }
          
          @media (max-width: 768px) {
            h1 {
              font-size: 32px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

const FlatmateDiscoveryWithTheme = () => (
  <ThemeProvider>
    <FlatmateDiscovery />
  </ThemeProvider>
);

export default FlatmateDiscoveryWithTheme;