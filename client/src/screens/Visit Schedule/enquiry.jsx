import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EnquiryPage = ({ propertyId, onClose }) => {
  const [formData, setFormData] = useState({
    message: 'I am interested. Please share the details.',
    brokerage: 1499,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Hybrid auth: get token for optional Authorization header fallback
  const userToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const validate = () => {
    const newErrors = {};
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'message') {
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 120), 320)}px`;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!propertyId) {
      toast.error("Property ID missing. Cannot submit enquiry.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_CREATE_ENQUIRY_API}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({
          propertyId,
          message: formData.message,
          brokerage: formData.brokerage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Enquiry submitted successfully! We will get in touch with you soon.');
        setFormData({ message: 'I am interested. Please share the details.', brokerage: 1499 });
        setErrors({});
      } else {
        toast.error(data.message || 'Failed to submit enquiry');
      }
    } catch (error) {
      console.error('Error sending enquiry:', error);
      toast.error('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const brokeragePercentage = ((formData.brokerage - 1499) / (5999 - 1499)) * 100;

  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} />
      {loading && (
        <div style={styles.loaderOverlay}>
          <div style={styles.loaderContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: 16, color: '#fff', fontWeight: '600', fontSize: 15 }}>Submitting your enquiry...</p>
          </div>
        </div>
      )}
      <div style={styles.modalOverlay} className="enquiry-modal-overlay" onClick={onClose}>
        <div style={styles.modalContainer} className="enquiry-modal fade-in-scale" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={onClose}
            style={styles.closeButton}
            className="close-button"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
          
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Contact & Enquiry</h2>
            <p style={styles.modalSubtitle}>Let us help you find your perfect property</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={styles.form} onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}>
            <div style={styles.fieldGroup}>
              <label htmlFor="message" style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                className="enquiry-textarea"
                placeholder="Tell us about your requirements, preferred date & time, budget, or any questions..."
                value={formData.message}
                onChange={handleChange}
                rows={5}
                style={{ 
                  ...styles.textarea, 
                  borderColor: errors.message ? '#e74c3c' : '#e0e7ff',
                  background: errors.message ? '#fff5f5' : '#fafbff'
                }}
              />
              {errors.message && <span style={styles.error}>{errors.message}</span>}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Brokerage Amount
                <span
                  title="THE HIGHER THE BROKERAGE, THE GREATER THE RANGE OF OPTIONS AVAILABLE TO YOU."
                  style={styles.infoIcon}
                  className="info-icon"
                >
                  i
                </span>
              </label>

              <div style={styles.brokerageDisplay}>
                <span style={styles.currencySymbol}>₹</span>
                <span style={styles.brokerageAmount}>{formData.brokerage.toLocaleString('en-IN')}</span>
              </div>

              <div style={styles.sliderContainer}>
                <input
                  type="range"
                  min={1499}
                  max={5999}
                  step={500}
                  value={formData.brokerage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, brokerage: Number(e.target.value) }))
                  }
                  style={{
                    ...styles.rangeSlider,
                    background: `linear-gradient(to right, #007BFF 0%, #007BFF ${brokeragePercentage}%, #e0e7ff ${brokeragePercentage}%, #e0e7ff 100%)`
                  }}
                  className="brokerage-slider"
                />
                <div style={styles.rangeLabels}>
                  <span style={styles.rangeLabel}>₹1,499</span>
                  <span style={styles.rangeLabel}>₹5,999</span>
                </div>
              </div>

              <div style={styles.brokerageInfo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#007BFF" style={{ marginRight: 6, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" fill="#007BFF" opacity="0.1"></circle>
                  <path d="M12 16v-4M12 8h.01" stroke="#007BFF" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                <span style={styles.brokerageInfoText}>
                  Higher brokerage ensures better support, priority shortlisting, and more accurate property matches.
                </span>
              </div>
            </div>

            <button 
              type="button" 
              style={styles.submitButton} 
              className="submit-button"
              disabled={loading}
              onClick={handleSubmit}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
              Submit Enquiry
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .fade-in-scale {
          animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInScale {
          from { 
            opacity: 0; 
            transform: scale(0.95) translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
        
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top: 4px solid #fff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .enquiry-textarea:focus {
          border-color: #007BFF !important;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
          background: #fff !important;
        }

        .brokerage-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s ease;
        }

        .brokerage-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007BFF, #00B4D8);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
          transition: all 0.2s ease;
        }

        .brokerage-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.6);
        }

        .brokerage-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007BFF, #00B4D8);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
          transition: all 0.2s ease;
        }

        .brokerage-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.6);
        }

        .submit-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0, 123, 255, 0.3);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .info-icon {
          transition: all 0.2s ease;
        }

        .info-icon:hover {
          transform: scale(1.1);
          background: #0056b3;
        }

        .close-button {
          transition: all 0.2s ease;
        }

        .close-button:hover {
          transform: rotate(90deg) scale(1.1);
          background: rgba(255, 255, 255, 0.3);
        }

        .close-button:active {
          transform: rotate(90deg) scale(0.95);
        }

        @media (max-width: 600px) {
          .enquiry-modal {
            margin: 12px !important;
            padding: 20px !important;
            max-height: calc(100vh - 24px) !important;
            overflow-y: auto !important;
          }
          
          .enquiry-textarea {
            min-height: 120px !important;
            font-size: 15px !important;
          }
          input,
          textarea,
          button {
            font-size: 16px !important;
          }
          .brokerage-slider {
            height: 10px;
          }
        }
      `}</style>
    </>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(4px)',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    maxWidth: 540,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
  },
  modalHeader: {
    background: 'linear-gradient(135deg, #007BFF 0%, #00B4D8 100%)',
    padding: '28px 32px',
    borderRadius: '16px 16px 0 0',
    color: '#fff',
  },
  modalTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  modalSubtitle: {
    margin: '8px 0 0 0',
    fontSize: 14,
    opacity: 0.95,
    fontWeight: '400',
  },
  form: {
    padding: '32px',
  },
  fieldGroup: {
    marginBottom: 28,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    fontWeight: '600',
    fontSize: 14,
    color: '#1a1a1a',
    letterSpacing: '0.2px',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    borderRadius: 10,
    border: '2px solid #e0e7ff',
    outline: 'none',
    resize: 'vertical',
    minHeight: 130,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    transition: 'all 0.2s ease',
    lineHeight: 1.6,
  },
  error: {
    marginTop: 6,
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
  },
  brokerageDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
    padding: '16px',
    background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%)',
    borderRadius: 12,
    border: '2px solid #cce4ff',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007BFF',
    marginRight: 4,
  },
  brokerageAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#003d82',
    letterSpacing: '-1px',
  },
  sliderContainer: {
    marginBottom: 12,
  },
  rangeSlider: {
    width: '100%',
    cursor: 'pointer',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  brokerageInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 14px',
    background: '#f0f7ff',
    borderRadius: 8,
    border: '1px solid #cce4ff',
  },
  brokerageInfoText: {
    fontSize: 13,
    color: '#003d82',
    lineHeight: 1.5,
    fontWeight: '500',
  },
  infoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#007BFF',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    cursor: 'help',
    marginLeft: 6,
    flexShrink: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backdropFilter: 'blur(4px)',
  },
  submitButton: {
    width: '100%',
    padding: '16px 0',
    background: 'linear-gradient(135deg, #007BFF 0%, #00B4D8 100%)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0, 123, 255, 0.25)',
  },
  loaderOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

export default EnquiryPage;