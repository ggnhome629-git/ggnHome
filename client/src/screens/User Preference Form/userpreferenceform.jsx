import React, { useState, useEffect, useRef } from 'react';

// Professional Color Palette
const COLORS = {
  // Primary Colors
  primaryDark: '#1a365d',
  primary: '#2d3748',
  primaryLight: '#4a5568',
  
  // Secondary Colors
  secondaryDark: '#2c5aa0',
  secondary: '#3182ce',
  secondaryLight: '#4299e1',
  
  // Accent Colors
  accent: '#00b5d8',
  accentLight: '#0bc5ea',
  
  // Neutral Colors
  neutralDark: '#2d3748',
  neutral: '#718096',
  neutralLight: '#e2e8f0',
  neutralLighter: '#f7fafc',
  
  // Status Colors
  success: '#38a169',
  warning: '#d69e2e',
  error: '#e53e3e',
  
  // Background Colors
  background: '#ffffff',
  surface: '#f8fafc',
  overlay: 'rgba(26, 32, 44, 0.8)'
};

const UserPreferenceForm = () => {
  const [formData, setFormData] = useState({
    userName: '',
    mobileNumber: '',
    preferredLocation: '',
    budgetRange: '',
    bhkSize: '',
    propertyType: '',
    furnishingLevel: '',
    moveInDate: '',
    brokerageAmount: 1499
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validFields, setValidFields] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showBrokerageInfo, setShowBrokerageInfo] = useState(false);
  
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const personalInfoFilled = formData.userName && formData.mobileNumber;
    const preferencesFilled = formData.preferredLocation && formData.budgetRange && 
                             formData.bhkSize && formData.propertyType && formData.furnishingLevel;
    
    if (preferencesFilled && formData.moveInDate) setCurrentStep(3);
    else if (personalInfoFilled) setCurrentStep(2);
    else setCurrentStep(1);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setValidFields(prev => ({
      ...prev,
      [name]: value.trim() !== ''
    }));
  };

  const handleDateSelect = (dateType) => {
    let dateValue;
    if (dateType === 'immediate') {
      dateValue = 'Immediate';
    } else if (dateType === 'flexible') {
      dateValue = 'Flexible';
    } else {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + parseInt(dateType));
      dateValue = futureDate.toISOString().split('T')[0];
    }
    
    setFormData(prev => ({
      ...prev,
      moveInDate: dateValue
    }));
    setValidFields(prev => ({ ...prev, moveInDate: true }));
  };

  const handleCustomDateSelect = (e) => {
    const dateValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      moveInDate: dateValue
    }));
    setValidFields(prev => ({ ...prev, moveInDate: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowFullScreenLoader(true);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/api/userpreferenceform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hasLoggedIn: false
        }),
      });

      if (response.ok) {
        setShowSuccessModal(true);
        setFormData({
          userName: '',
          mobileNumber: '',
          preferredLocation: '',
          budgetRange: '',
          bhkSize: '',
          propertyType: '',
          furnishingLevel: '',
          moveInDate: '',
          brokerageAmount: 1499
        });
        setValidFields({});
      } else {
        console.error('Form submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
      setShowFullScreenLoader(false);
    }
  };

  const closeModal = () => {
    setShowSuccessModal(false);
  };

  const isFormValid = () => {
    return formData.userName && 
           formData.mobileNumber && 
           formData.preferredLocation && 
           formData.budgetRange && 
           formData.bhkSize && 
           formData.propertyType && 
           formData.furnishingLevel && 
           formData.moveInDate;
  };

  const dateChips = [
    { label: '🚀 Immediate', value: 'immediate' },
    { label: 'Within 15 days', value: '15' },
    { label: 'Within 30 days', value: '30' },
    { label: '📅 Flexible', value: 'flexible' }
  ];

  const progressSteps = [
    { number: 1, label: 'Personal Info' },
    { number: 2, label: 'Preferences' },
    { number: 3, label: 'Move-in Date' }
  ];

  // Professional Styles
  const styles = {
    container: {
      minHeight: '100dvh',
      padding: '12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      position: 'relative',
      overflowX: 'hidden'
    },
    brandingBackground: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-15deg)',
      fontSize: 'clamp(8rem, 20vw, 15rem)',
      fontWeight: '900',
      color: 'rgba(45, 55, 72, 0.03)',
      userSelect: 'none',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      letterSpacing: '12px',
      textTransform: 'uppercase'
    },
    card: {
      background: COLORS.background,
      borderRadius: '20px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      maxWidth: '680px',
      width: '100%',
      border: `1px solid ${COLORS.neutralLight}`,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10
    },
    stickyHeader: {
      position: 'sticky',
      top: 0,
      background: 'rgba(255, 255, 255, 0.97)',
      backdropFilter: 'blur(16px)',
      padding: '24px 20px 16px 20px',
      borderBottom: `1px solid ${COLORS.neutralLight}`,
      zIndex: 50
    },
    title: {
      color: COLORS.primaryDark,
      fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
      fontWeight: '700',
      marginBottom: '8px',
      textAlign: 'center',
      letterSpacing: '-0.02em'
    },
    subtitle: {
      color: COLORS.neutral,
      fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
      textAlign: 'center',
      marginBottom: '32px',
      lineHeight: '1.6',
      fontWeight: '400'
    },
    progressContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    progressStep: (active, completed) => ({
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.875rem',
      fontWeight: '600',
      background: completed ? COLORS.success : active ? COLORS.secondary : COLORS.neutralLight,
      color: completed || active ? '#FFFFFF' : COLORS.neutral,
      border: completed ? `2px solid ${COLORS.success}` : active ? `2px solid ${COLORS.secondary}` : `2px solid ${COLORS.neutralLight}`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative'
    }),
    progressLine: {
      height: '3px',
      width: '80px',
      background: COLORS.neutralLight,
      borderRadius: '2px',
      position: 'relative',
      overflow: 'hidden'
    },
    progressFill: (completed) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: completed ? '100%' : '0%',
      background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.accent})`,
      transition: 'width 0.5s ease',
      borderRadius: '2px'
    }),
    formContent: {
      padding: '20px',
      overflow: 'visible'
    },
    section: {
      marginBottom: '40px',
      opacity: 0,
      transform: 'translateY(30px)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    sectionHeader: {
      background: `linear-gradient(135deg, ${COLORS.secondary}08, ${COLORS.accent}08)`,
      padding: '20px 24px',
      borderLeft: `4px solid ${COLORS.secondary}`,
      borderRadius: '0 12px 12px 0',
      marginBottom: '28px',
      marginTop: '32px',
      border: `1px solid ${COLORS.neutralLight}`
    },
    sectionTitle: {
      color: COLORS.primaryDark,
      fontSize: '1.25rem',
      fontWeight: '600',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    sectionIcon: {
      fontSize: '1.5rem'
    },
    divider: {
      height: '1px',
      background: `linear-gradient(90deg, transparent 0%, ${COLORS.neutralLight} 50%, transparent 100%)`,
      margin: '40px 0',
      border: 'none'
    },
    inputGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px'
    },
    inputField: {
      marginBottom: '28px',
      position: 'relative'
    },
    inputContainer: {
      position: 'relative'
    },
    input: (hasValue, isFocused) => ({
      width: '100%',
      height: '56px',
      paddingLeft: '56px',
      paddingRight: '48px',
      border: `2px solid ${hasValue || isFocused ? COLORS.secondary : COLORS.neutralLight}`,
      borderRadius: '12px',
      fontSize: '1rem',
      background: COLORS.background,
      color: COLORS.primaryDark,
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      boxShadow: isFocused ? `0 0 0 3px ${COLORS.secondary}20` : 'none',
      fontFamily: 'inherit',
      fontWeight: '500'
    }),
    select: (hasValue, isFocused) => ({
      width: '100%',
      height: '56px',
      paddingLeft: '56px',
      paddingRight: '52px',
      border: `2px solid ${hasValue || isFocused ? COLORS.secondary : COLORS.neutralLight}`,
      borderRadius: '12px',
      fontSize: '1rem',
      background: COLORS.background,
      color: hasValue ? COLORS.primaryDark : COLORS.neutral,
      outline: 'none',
      appearance: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      boxShadow: isFocused ? `0 0 0 3px ${COLORS.secondary}20` : 'none',
      fontFamily: 'inherit',
      fontWeight: '500',
      cursor: 'pointer'
    }),
    inputIcon: {
      position: 'absolute',
      left: '18px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '1.25rem',
      zIndex: 2,
      pointerEvents: 'none',
      opacity: 0.7
    },
    floatingLabel: (hasValue, isFocused) => ({
      position: 'absolute',
      left: '56px',
      top: hasValue || isFocused ? '6px' : '50%',
      transform: hasValue || isFocused ? 'translateY(0)' : 'translateY(-50%)',
      color: hasValue || isFocused ? COLORS.secondary : COLORS.neutral,
      fontSize: hasValue || isFocused ? '0.75rem' : '1rem',
      fontWeight: hasValue || isFocused ? '600' : '500',
      background: COLORS.background,
      padding: hasValue || isFocused ? '0 8px' : '0',
      pointerEvents: 'none',
      transition: 'all 0.2s ease',
      zIndex: 2
    }),
    validCheckmark: (visible) => ({
      position: 'absolute',
      right: '18px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: COLORS.success,
      fontSize: '1.125rem',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s ease'
    }),
    dropdownIcon: {
      position: 'absolute',
      right: '18px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: COLORS.neutral
    },
    dateChipsContainer: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '20px'
    },
    dateChip: (active) => ({
      padding: '14px 24px',
      border: active ? `2px solid ${COLORS.secondary}` : `2px solid ${COLORS.neutralLight}`,
      borderRadius: '12px',
      background: active ? COLORS.secondary : COLORS.background,
      color: active ? '#FFFFFF' : COLORS.neutral,
      fontSize: '0.9rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '140px',
      justifyContent: 'center'
    }),
    dateInput: (hasValue) => ({
      width: '100%',
      height: '56px',
      padding: '16px 20px',
      border: `2px solid ${hasValue ? COLORS.secondary : COLORS.neutralLight}`,
      borderRadius: '12px',
      fontSize: '1rem',
      background: COLORS.background,
      color: COLORS.primaryDark,
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      fontWeight: '500'
    }),
    submitBtn: (valid, submitting) => ({
      width: '100%',
      height: '60px',
      background: valid && !submitting ? `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` : COLORS.neutralLight,
      color: valid && !submitting ? '#FFFFFF' : COLORS.neutral,
      border: 'none',
      borderRadius: '14px',
      fontSize: '1.1rem',
      fontWeight: '600',
      cursor: valid && !submitting ? 'pointer' : 'not-allowed',
      opacity: valid && !submitting ? 1 : 0.6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '24px',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      letterSpacing: '-0.01em'
    }),
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid transparent',
      borderTop: '2px solid #FFFFFF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    fullScreenLoader: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: COLORS.overlay,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(20px)'
    },
    loaderContent: {
      textAlign: 'center',
      color: '#FFFFFF',
      maxWidth: '400px',
      padding: '40px'
    },
    loaderSpinner: {
      width: '60px',
      height: '60px',
      border: '4px solid rgba(255, 255, 255, 0.2)',
      borderTop: `4px solid ${COLORS.accent}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 24px'
    },
    loaderText: {
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '12px',
      background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondaryLight})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    loaderSubtext: {
      color: COLORS.neutralLight,
      fontSize: '1rem',
      opacity: 0.8,
      lineHeight: '1.5'
    },
    progressBar: {
      width: '200px',
      height: '4px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '2px',
      marginTop: '24px',
      overflow: 'hidden'
    },
    progressBarFill: {
      height: '100%',
      background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.accent})`,
      animation: 'progress 2s ease-in-out infinite',
      borderRadius: '2px'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: COLORS.overlay,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(25px)',
      padding: '20px'
    },
    modalContent: {
      background: COLORS.background,
      borderRadius: '24px',
      padding: '48px',
      maxWidth: '520px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.2)',
      border: `1px solid ${COLORS.neutralLight}`,
      position: 'relative',
      animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    modalIcon: {
      width: '80px',
      height: '80px',
      background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.accent})`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      fontSize: '2.5rem',
      color: '#FFFFFF',
      animation: 'bounce 0.6s ease-out'
    },
    modalTitle: {
      color: COLORS.primaryDark,
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '16px',
      letterSpacing: '-0.02em'
    },
    modalSubtitle: {
      color: COLORS.secondary,
      fontSize: '1.25rem',
      fontWeight: '600',
      marginBottom: '12px'
    },
    modalText: {
      color: COLORS.neutral,
      fontSize: '1rem',
      lineHeight: '1.6',
      marginBottom: '32px'
    },
    modalHighlight: {
      color: COLORS.success,
      fontWeight: '600',
      background: `${COLORS.success}15`,
      padding: '16px 24px',
      borderRadius: '12px',
      display: 'inline-block',
      margin: '20px 0',
      border: `1px solid ${COLORS.success}30`,
      fontSize: '1.1rem'
    },
    modalButtonGroup: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    primaryButton: {
      background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})`,
      color: '#FFFFFF',
      border: 'none',
      padding: '16px 32px',
      fontSize: '1rem',
      fontWeight: '600',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '160px',
      justifyContent: 'center'
    },
    secondaryButton: {
      background: 'transparent',
      color: COLORS.neutral,
      border: `2px solid ${COLORS.neutralLight}`,
      padding: '14px 30px',
      fontSize: '1rem',
      fontWeight: '600',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '160px'
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: COLORS.neutral,
      cursor: 'pointer',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    keyframes: `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0,-10px,0);
        }
        70% {
          transform: translate3d(0,-5px,0);
        }
        90% {
          transform: translate3d(0,-2px,0);
        }
      }
      @keyframes progress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        filter: invert(0.4);
      }
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;

        background:
          linear-gradient(
            to right,
            ${COLORS.secondary} 0%,
            ${COLORS.secondary} ${((formData.brokerageAmount - 1499) / (5999 - 1499)) * 100}%,
            ${COLORS.neutralLight} ${((formData.brokerageAmount - 1499) / (5999 - 1499)) * 100}%,
            ${COLORS.neutralLight} 100%
          ),
          repeating-linear-gradient(
            to right,
            transparent 0%,
            transparent calc(100% / 9 - 1px),
            rgba(0, 0, 0, 0.15) calc(100% / 9 - 1px),
            rgba(0, 0, 0, 0.15) calc(100% / 9)
          );
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${COLORS.secondary};
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      }
      input[type="range"]::-moz-range-thumb {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${COLORS.secondary};
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        border: none;
      }
      @media (max-width: 768px) {
        .input-group {
          grid-template-columns: 1fr !important;
        }
        .modal-button-group {
          flex-direction: column;
        }
        input,
        select,
        button {
          font-size: 16px !important;
        }
      }
    `
  };

  return (
    <>
      <style>{styles.keyframes}</style>
      
      {/* Full Screen Loader */}
      {showFullScreenLoader && (
        <div style={styles.fullScreenLoader}>
          <div style={styles.loaderContent}>
            <div style={styles.loaderSpinner}></div>
            <div style={styles.loaderText}>Processing Your Preferences</div>
            <div style={styles.loaderSubtext}>We're analyzing your requirements to find the perfect property matches...</div>
            <div style={styles.progressBar}>
              <div style={styles.progressBarFill}></div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button 
              style={styles.closeButton}
              onClick={closeModal}
              onMouseEnter={(e) => {
                e.target.style.background = COLORS.neutralLight;
                e.target.style.color = COLORS.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = COLORS.neutral;
              }}
            >
              ×
            </button>
            
            <div style={styles.modalIcon}>
              ✓
            </div>
            
            <h2 style={styles.modalTitle}>Preferences Saved Successfully</h2>
            
            <p style={styles.modalSubtitle}>Your property search is now personalized! 🎯</p>
            
            <p style={styles.modalText}>
              We've carefully saved your preferences and will now match you with properties that perfectly align with your requirements.
            </p>
            
            <div style={styles.modalHighlight}>
              Ready to explore your personalized property matches?
            </div>
            
            <p style={styles.modalText}>
              Access exclusive listings, save your favorites, and receive instant notifications when new properties match your criteria.
            </p>
            
            <div style={styles.modalButtonGroup} className="modal-button-group">
              <a 
                href="https://www.ggnhome.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.primaryButton}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(49, 130, 206, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                🌐 Visit GGN Home
              </a>
              
              <button 
                style={styles.secondaryButton}
                onClick={closeModal}
                onMouseEnter={(e) => {
                  e.target.style.background = COLORS.neutral;
                  e.target.style.color = '#FFFFFF';
                  e.target.style.borderColor = COLORS.neutral;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = COLORS.neutral;
                  e.target.style.borderColor = COLORS.neutralLight;
                }}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brokerage Info Modal */}
      {showBrokerageInfo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              style={styles.closeButton}
              onClick={() => setShowBrokerageInfo(false)}
              onMouseEnter={(e) => {
                e.target.style.background = COLORS.neutralLight;
                e.target.style.color = COLORS.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = COLORS.neutral;
              }}
            >
              ×
            </button>

            <div style={styles.modalIcon}>💡</div>

            <h2 style={styles.modalTitle}>Why Brokerage Matters</h2>

            <p style={styles.modalText}>
              Setting a higher brokerage significantly increases your chances of getting the right property.
              <br /><br />
              <strong>Higher brokerage means:</strong>
              <br />• Faster responses from owners & agents
              <br />• Dedicated relationship manager support
              <br />• More accurate and suitable options based on your requirements
              <br />• Priority property matching
              <br /><br />
              Choose a higher brokerage to get priority matching and better support 🚀
            </p>

            <button
              style={styles.primaryButton}
              onClick={() => setShowBrokerageInfo(false)}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(49, 130, 206, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div style={styles.container}>
        <div style={styles.brandingBackground}>GGN HOME</div>
        <div style={styles.card}>
          {/* Sticky Header */}
          <div style={styles.stickyHeader}>
            <h2 style={styles.title}>Property Preference Form</h2>
            <p style={styles.subtitle}>Tell us your requirements and we'll match you with perfect properties</p>
            
            {/* Progress Indicator */}
            <div style={styles.progressContainer}>
              {progressSteps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div style={styles.progressStep(currentStep === step.number, currentStep > step.number)}>
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div style={styles.progressLine}>
                      <div style={styles.progressFill(currentStep > step.number)}></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.formContent}>
            {/* Personal Information Section */}
            <div ref={el => sectionRefs.current[0] = el} style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>👤</span>
                  Personal Information
                </h3>
              </div>
              
              <div style={styles.inputGroup} className="input-group">
                {/* Full Name */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>👤</span>
                    <input
                      type="text"
                      id="userName"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('userName')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.input(formData.userName, focusedField === 'userName')}
                    />
                    <label 
                      htmlFor="userName"
                      style={styles.floatingLabel(formData.userName, focusedField === 'userName')}
                    >
                      Full Name
                    </label>
                    <span style={styles.validCheckmark(validFields.userName)}>
                      ✓
                    </span>
                  </div>
                </div>

                {/* Mobile Number */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>📱</span>
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('mobileNumber')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.input(formData.mobileNumber, focusedField === 'mobileNumber')}
                    />
                    <label 
                      htmlFor="mobileNumber"
                      style={styles.floatingLabel(formData.mobileNumber, focusedField === 'mobileNumber')}
                    >
                      Mobile Number
                    </label>
                    <span style={styles.validCheckmark(validFields.mobileNumber)}>
                      ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <hr style={styles.divider} />

            {/* Property Preferences Section */}
            <div ref={el => sectionRefs.current[1] = el} style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>🏠</span>
                  Property Preferences
                </h3>
              </div>
              
              {/* Preferred Location */}
              <div style={styles.inputField}>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>📍</span>
                  <input
                    type="text"
                    id="preferredLocation"
                    name="preferredLocation"
                    value={formData.preferredLocation}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('preferredLocation')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={styles.input(formData.preferredLocation, focusedField === 'preferredLocation')}
                  />
                  <label 
                    htmlFor="preferredLocation"
                    style={styles.floatingLabel(formData.preferredLocation, focusedField === 'preferredLocation')}
                  >
                    Preferred Location
                  </label>
                  <span style={styles.validCheckmark(validFields.preferredLocation)}>
                    ✓
                  </span>
                </div>
              </div>

              <div style={styles.inputGroup} className="input-group">
                {/* Budget Range */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>💰</span>
                    <input
                      type="text"
                      id="budgetRange"
                      name="budgetRange"
                      value={formData.budgetRange}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('budgetRange')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.input(formData.budgetRange, focusedField === 'budgetRange')}
                    />
                    <label 
                      htmlFor="budgetRange"
                      style={styles.floatingLabel(formData.budgetRange, focusedField === 'budgetRange')}
                    >
                      Budget Range (₹)
                    </label>
                    <span style={styles.validCheckmark(validFields.budgetRange)}>
                      ✓
                    </span>
                  </div>
                </div>

                {/* BHK Size */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>🏠</span>
                    <select
                      id="bhkSize"
                      name="bhkSize"
                      value={formData.bhkSize}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('bhkSize')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.select(formData.bhkSize, focusedField === 'bhkSize')}
                    >
                      <option value=""></option>
                      <option value="1BHK">1 BHK</option>
                      <option value="2BHK">2 BHK</option>
                      <option value="3BHK">3 BHK</option>
                      <option value="4BHK">4 BHK</option>
                      <option value="4BHK+">4+ BHK</option>
                    </select>
                    <label 
                      htmlFor="bhkSize"
                      style={styles.floatingLabel(formData.bhkSize, focusedField === 'bhkSize')}
                    >
                      BHK Size
                    </label>
                    <div style={styles.dropdownIcon}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {validFields.bhkSize && (
                      <span style={{...styles.validCheckmark(validFields.bhkSize), right: '40px'}}>
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.inputGroup} className="input-group">
                {/* Property Type */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>🏢</span>
                    <input
                      type="text"
                      id="propertyType"
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('propertyType')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.input(formData.propertyType, focusedField === 'propertyType')}
                    />
                    <label 
                      htmlFor="propertyType"
                      style={styles.floatingLabel(formData.propertyType, focusedField === 'propertyType')}
                    >
                      Property Type
                    </label>
                    <span style={styles.validCheckmark(validFields.propertyType)}>
                      ✓
                    </span>
                  </div>
                </div>

                {/* Furnishing Level */}
                <div style={styles.inputField}>
                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>🛋️</span>
                    <select
                      id="furnishingLevel"
                      name="furnishingLevel"
                      value={formData.furnishingLevel}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('furnishingLevel')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={styles.select(formData.furnishingLevel, focusedField === 'furnishingLevel')}
                    >
                      <option value=""></option>
                      <option value="fully-furnished">Fully Furnished</option>
                      <option value="semi-furnished">Semi Furnished</option>
                      <option value="unfurnished">Unfurnished</option>
                    </select>
                    <label 
                      htmlFor="furnishingLevel"
                      style={styles.floatingLabel(formData.furnishingLevel, focusedField === 'furnishingLevel')}
                    >
                      Furnishing Level
                    </label>
                    <div style={styles.dropdownIcon}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {validFields.furnishingLevel && (
                      <span style={{...styles.validCheckmark(validFields.furnishingLevel), right: '40px'}}>
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <hr style={styles.divider} />

            {/* Brokerage Preference Section */}
            <div ref={el => sectionRefs.current[2] = el} style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>💼</span>
                  Brokerage Preference
                  <button
                    type="button"
                    onClick={() => setShowBrokerageInfo(true)}
                    style={{
                      marginLeft: '10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      color: COLORS.secondary,
                      padding: '4px 8px',
                      borderRadius: '50%',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = COLORS.secondaryLight + '20';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                  >
                    ℹ️
                  </button>
                </h3>
              </div>

              <div
                style={{
                  border: `2px solid ${COLORS.neutralLight}`,
                  borderRadius: '14px',
                  padding: '20px',
                  background: COLORS.neutralLighter
                }}
              >
                <p style={{ 
                  marginBottom: '16px', 
                  fontWeight: 600, 
                  color: COLORS.primaryDark,
                  fontSize: '1rem'
                }}>
                  Select Brokerage Amount
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  fontSize: '0.875rem',
                  color: COLORS.neutral
                }}>
                  <span>₹1,499</span>
                  <span>₹5,999</span>
                </div>

                <input
                  type="range"
                  min="1499"
                  max="5999"
                  step="500"
                  value={formData.brokerageAmount}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      brokerageAmount: Number(e.target.value)
                    }))
                  }
                  style={{ 
                    width: '100%', 
                    marginBottom: '24px',
                    cursor: 'pointer'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        brokerageAmount: Math.max(1499, prev.brokerageAmount - 500)
                      }))
                    }
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      border: `2px solid ${COLORS.secondary}`,
                      background: COLORS.background,
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: COLORS.secondary,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '300'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = COLORS.secondary;
                      e.target.style.color = '#FFFFFF';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = COLORS.background;
                      e.target.style.color = COLORS.secondary;
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    −
                  </button>

                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${COLORS.secondary}`,
                      fontWeight: 700,
                      fontSize: '1.5rem',
                      background: COLORS.background,
                      color: COLORS.primaryDark,
                      boxShadow: `0 4px 12px ${COLORS.secondary}20`
                    }}
                  >
                    ₹ {formData.brokerageAmount.toLocaleString('en-IN')}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        brokerageAmount: Math.min(5999, prev.brokerageAmount + 500)
                      }))
                    }
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      border: `2px solid ${COLORS.secondary}`,
                      background: COLORS.background,
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: COLORS.secondary,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '300'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = COLORS.secondary;
                      e.target.style.color = '#FFFFFF';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = COLORS.background;
                      e.target.style.color = COLORS.secondary;
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: `${COLORS.secondary}10`,
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.secondary}30`,
                  fontSize: '0.875rem',
                  color: COLORS.neutral,
                  lineHeight: '1.5'
                }}>
                  💡 <strong>Tip:</strong> THE HIGHER THE BROKERAGE, THE GREATER THE RANGE OF OPTIONS AVAILABLE TO YOU.
                </div>
              </div>
            </div>

            <hr style={styles.divider} />

            {/* Move-in Date Section */}
            <div ref={el => sectionRefs.current[3] = el} style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>📅</span>
                  Move-in Timeline
                </h3>
              </div>

              <div style={styles.dateChipsContainer}>
                {dateChips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    style={styles.dateChip(formData.moveInDate === chip.value || 
                      (chip.value === '15' && formData.moveInDate.includes('15 days')) ||
                      (chip.value === '30' && formData.moveInDate.includes('30 days'))
                    )}
                    onClick={() => handleDateSelect(chip.value)}
                    onMouseEnter={(e) => {
                      if (formData.moveInDate !== chip.value) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.borderColor = COLORS.secondary;
                        e.target.style.color = COLORS.secondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.moveInDate !== chip.value) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.borderColor = COLORS.neutralLight;
                        e.target.style.color = COLORS.neutral;
                      }
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: COLORS.neutral,
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Or select a custom date:
                </label>
                <input
                  type="date"
                  value={formData.moveInDate && !['Immediate', 'Flexible'].includes(formData.moveInDate) ? formData.moveInDate : ''}
                  onChange={handleCustomDateSelect}
                  style={styles.dateInput(formData.moveInDate)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={styles.submitBtn(isFormValid(), isSubmitting)}
              disabled={!isFormValid() || isSubmitting}
              onMouseEnter={(e) => {
                if (isFormValid() && !isSubmitting) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 30px rgba(49, 130, 206, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid() && !isSubmitting) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={styles.spinner}></div>
                  Processing Your Preferences...
                </>
              ) : (
                '🚀 Find My Perfect Property Matches'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserPreferenceForm;