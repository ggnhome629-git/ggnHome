import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TopNavigationBar from '../Flatmates page/TopNavigationBar';
const { useNavigate } = require('react-router-dom');

const CreateFlatmateListing = () => {
  const [currentStep, setCurrentStep] = useState(() => {
    return parseInt(localStorage.getItem('flatmateListingCurrentStep')) || 1;
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    area: '',
    moveInDate: '',
    budget: { min: '', max: '' },
    preferredGender: 'any',
    occupancyWanted: 1,
    currentOccupants: 1,
    furnished: false,
    amenities: [],
    contactMethods: { phone: false, email: false },
    photos: []
  });

  const [draftSaved, setDraftSaved] = useState(false);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({
    step1: false, step2: false, step3: false, step4: false, step5: false
  });
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Hybrid authentication: accessToken from localStorage
  const userToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const amenitiesOptions = [
    'WiFi', 'Air Conditioning', 'Heating', 'Laundry', 'Parking', 
    'Gym', 'Swimming Pool', 'Balcony', 'Garden', 'Security',
    'Furnished Kitchen', 'TV', 'Cleaning Service', 'Pet Friendly',
    'Bike Storage', 'Concierge', 'Roof Terrace'
  ];

  const commonCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Miami'];
  const cityAreas = {
    'New York': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Upper East Side', 'Upper West Side', 'Harlem'],
    'Los Angeles': ['Downtown', 'Hollywood', 'Santa Monica', 'Beverly Hills', 'Westwood', 'Venice', 'Silver Lake', 'Koreatown'],
    'Chicago': ['Downtown', 'Lincoln Park', 'Lakeview', 'Wicker Park', 'Hyde Park', 'River North', 'West Loop'],
    'Houston': ['Downtown', 'Montrose', 'Heights', 'Galleria', 'Midtown', 'Rice Military']
  };

  // Load saved draft and step once on mount
  useEffect(() => {
    const savedStep = localStorage.getItem('flatmateListingCurrentStep');
    if (savedStep) setCurrentStep(parseInt(savedStep));

    const draft = localStorage.getItem('flatmateListingDraft');
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch (e) {
        console.error('Failed to parse saved draft:', e);
      }
    }
  }, []);

  // Autosave form data (debounced) when formData or currentStep changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  const saveDraft = () => {
    localStorage.setItem('flatmateListingDraft', JSON.stringify(formData));
    localStorage.setItem('flatmateListingCurrentStep', currentStep.toString());
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Validation functions
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      else if (formData.title.length < 10) newErrors.title = 'Title should be at least 10 characters';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (formData.description.length > 2000) newErrors.description = 'Description must be less than 2000 characters';
    }

    if (step === 2) {
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.area.trim()) newErrors.area = 'Area is required';
      if (!formData.moveInDate) newErrors.moveInDate = 'Move-in date is required';
      if (formData.moveInDate && new Date(formData.moveInDate) < new Date().setHours(0,0,0,0)) {
        newErrors.moveInDate = 'Move-in date must be in the future';
      }
    }

    if (step === 3) {
      if (!formData.budget.min || formData.budget.min < 100) newErrors.minBudget = 'Minimum budget must be at least $100';
      if (!formData.budget.max || formData.budget.max < 100) newErrors.maxBudget = 'Maximum budget must be at least $100';
      if (formData.budget.min && formData.budget.max && parseInt(formData.budget.min) > parseInt(formData.budget.max)) {
        newErrors.maxBudget = 'Maximum budget must be greater than minimum';
      }
      if (formData.occupancyWanted < 1) newErrors.occupancyWanted = 'Must want at least 1 flatmate';
      if (formData.currentOccupants < 0) newErrors.currentOccupants = 'Invalid number of occupants';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: Proper input change handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTextInputChange = (field) => (e) => {
    handleInputChange(field, e.target.value);
  };

  const handleNumberInputChange = (field) => (e) => {
    handleInputChange(field, e.target.value === '' ? '' : Number(e.target.value));
  };

  const handleBudgetChange = (field) => (e) => {
    const value = e.target.value === '' ? '' : Number(e.target.value);
    handleInputChange(`budget.${field}`, value);
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      handleInputChange('description', value);
    }
  };

  const handleCitySearch = (e) => {
    const value = e.target.value;
    handleInputChange('city', value);
    if (value.length > 1) {
      const filtered = commonCities.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      );
      setCitySuggestions(filtered);
    } else {
      setCitySuggestions([]);
    }
  };

  const handleAreaSearch = (e) => {
    const value = e.target.value;
    handleInputChange('area', value);
    if (formData.city && value.length > 1) {
      const areas = cityAreas[formData.city] || [];
      const filtered = areas.filter(area => 
        area.toLowerCase().includes(value.toLowerCase())
      );
      setAreaSuggestions(filtered);
    } else {
      setAreaSuggestions([]);
    }
  };

  const handleAmenityChange = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleContactMethodChange = (method) => (e) => {
    handleInputChange(`contactMethods.${method}`, e.target.checked);
  };

  // Photo handling
  const handlePhotoUpload = (files) => {
    const newPhotos = Array.from(files).slice(0, 10 - formData.photos.length).map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
    
    if (newPhotos.length > 0) {
      addToast(`${newPhotos.length} photo(s) added successfully`, 'success');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handlePhotoUpload(files);
  };

  const removePhoto = (id) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => {
        if (photo.id === id) {
          URL.revokeObjectURL(photo.preview);
        }
        return photo.id !== id;
      })
    }));
    addToast('Photo removed', 'info');
  };

  const movePhoto = (fromIndex, toIndex) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      const [movedPhoto] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, movedPhoto);
      return { ...prev, photos: newPhotos };
    });
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => {
        const next = Math.min(prev + 1, 5);
        localStorage.setItem('flatmateListingCurrentStep', next.toString());
        return next;
      });
      window.scrollTo(0, 0);
    } else {
      addToast('Please fix the errors before proceeding', 'error');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => {
      const previous = Math.max(prev - 1, 1);
      localStorage.setItem('flatmateListingCurrentStep', previous.toString());
      return previous;
    });
    window.scrollTo(0, 0);
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    localStorage.setItem('flatmateListingCurrentStep', step.toString());
    setShowConfirmation(false);
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!validateStep(5)) {
      addToast('Please fix all errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = `${process.env.REACT_APP_Base_API}/api/flatmates/listings`;
      const payload = new FormData();
      
      payload.append('title', formData.title.trim());
      payload.append('description', formData.description.trim());
      payload.append('city', formData.city.trim());
      payload.append('area', formData.area.trim());
      payload.append('moveInDate', formData.moveInDate);
      payload.append('budget', JSON.stringify({
        min: parseInt(formData.budget.min),
        max: parseInt(formData.budget.max)
      }));
      payload.append('preferredGender', formData.preferredGender);
      payload.append('occupancyWanted', String(formData.occupancyWanted));
      payload.append('currentOccupants', String(formData.currentOccupants));
      payload.append('furnished', formData.furnished ? 'true' : 'false');
      payload.append('amenities', JSON.stringify(formData.amenities));
      payload.append('contactMethods', JSON.stringify(formData.contactMethods));

      formData.photos.forEach((photo) => {
        payload.append('photos', photo.file);
      });

      // Hybrid authentication: use accessToken, fallback to cookies
      const headers = userToken
        ? { Authorization: `Bearer ${userToken}` }
        : {};

      const res = await axios.post(url, payload, {
        headers,
        withCredentials: true,
      });

      localStorage.removeItem('flatmateListingDraft');
      localStorage.removeItem('flatmateListingCurrentStep');
      
      addToast('🎉 Listing created successfully! Redirecting...', 'success');
      
      setTimeout(() => {
        navigate(`/flatmatesearchpropertymodal/${res.data.listing?._id || res.data._id}`);
      }, 2000);

    } catch (error) {
      console.error('Failed to submit listing', error);
      const msg = error?.response?.data?.message || error.message || 'Failed to submit listing';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  // Enhanced Step Components with FIXED input handlers
  const renderStep1 = () => (
    <div style={styles.stepContainer}>
      <CollapsibleSection
        title="📝 Basic Information"
        isCollapsed={collapsedSections.step1}
        onToggle={() => toggleSection('step1')}
        stepNumber={1}
        completed={formData.title && formData.description}
      >
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="title">
            Listing Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={handleTextInputChange('title')}
            placeholder="e.g., Spacious room in friendly apartment near downtown"
            style={{
              ...styles.input,
              ...(errors.title ? styles.inputError : formData.title ? styles.inputSuccess : {})
            }}
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : "title-help"}
          />
          {errors.title ? (
            <span id="title-error" style={styles.errorText}>{errors.title}</span>
          ) : (
            <div id="title-help" style={styles.helpText}>
              Make it catchy! Include key features like location or room type
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="description">
            Description *
            <span style={styles.charCount}>
              {formData.description.length}/2000
            </span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the room size, natural light, common areas, your lifestyle, household habits, and what you're looking for in a flatmate..."
            style={{
              ...styles.input,
              ...styles.textarea,
              ...(errors.description ? styles.inputError : formData.description ? styles.inputSuccess : {})
            }}
            rows="6"
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : "description-help"}
          />
          {errors.description ? (
            <span id="description-error" style={styles.errorText}>{errors.description}</span>
          ) : (
            <div id="description-help" style={styles.helpText}>
              Tip: Mention nearby transport, shops, and the general vibe of your household
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContainer}>
      <CollapsibleSection
        title="📍 Location & Move-in Date"
        isCollapsed={collapsedSections.step2}
        onToggle={() => toggleSection('step2')}
        stepNumber={2}
        completed={formData.city && formData.area && formData.moveInDate}
      >
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="city">
            City *
          </label>
          <div style={styles.suggestionsContainer}>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={handleCitySearch}
              placeholder="Start typing your city..."
              style={{
                ...styles.input,
                ...(errors.city ? styles.inputError : formData.city ? styles.inputSuccess : {})
              }}
              aria-required="true"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "city-error" : "city-help"}
            />
            {citySuggestions.length > 0 && (
              <div style={styles.suggestionsList}>
                {citySuggestions.map(city => (
                  <div
                    key={city}
                    style={styles.suggestionItem}
                    onClick={() => {
                      handleInputChange('city', city);
                      setCitySuggestions([]);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleInputChange('city', city);
                        setCitySuggestions([]);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    📍 {city}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.city ? (
            <span id="city-error" style={styles.errorText}>{errors.city}</span>
          ) : (
            <div id="city-help" style={styles.helpText}>
              We'll use this to show your listing to people in the right area
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="area">
            Area/Neighborhood *
          </label>
          <div style={styles.suggestionsContainer}>
            <input
              id="area"
              type="text"
              value={formData.area}
              onChange={handleAreaSearch}
              placeholder="Enter your neighborhood or area"
              style={{
                ...styles.input,
                ...(errors.area ? styles.inputError : formData.area ? styles.inputSuccess : {})
              }}
              aria-required="true"
              aria-invalid={!!errors.area}
              aria-describedby={errors.area ? "area-error" : "area-help"}
            />
            {areaSuggestions.length > 0 && (
              <div style={styles.suggestionsList}>
                {areaSuggestions.map(area => (
                  <div
                    key={area}
                    style={styles.suggestionItem}
                    onClick={() => {
                      handleInputChange('area', area);
                      setAreaSuggestions([]);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleInputChange('area', area);
                        setAreaSuggestions([]);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    🗺️ {area}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.area ? (
            <span id="area-error" style={styles.errorText}>{errors.area}</span>
          ) : (
            <div id="area-help" style={styles.helpText}>
              Specific neighborhoods help flatmates find the perfect location
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="moveInDate">
            Move-in Date *
          </label>
          <input
            id="moveInDate"
            type="date"
            value={formData.moveInDate}
            onChange={handleTextInputChange('moveInDate')}
            min={new Date().toISOString().split('T')[0]}
            style={{
              ...styles.input,
              ...(errors.moveInDate ? styles.inputError : formData.moveInDate ? styles.inputSuccess : {})
            }}
            aria-required="true"
            aria-invalid={!!errors.moveInDate}
            aria-describedby={errors.moveInDate ? "moveInDate-error" : "moveInDate-help"}
          />
          {errors.moveInDate ? (
            <span id="moveInDate-error" style={styles.errorText}>{errors.moveInDate}</span>
          ) : (
            <div id="moveInDate-help" style={styles.helpText}>
              Flexible dates can attract more potential flatmates
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.stepContainer}>
      <CollapsibleSection
        title="💰 Budget & Occupancy"
        isCollapsed={collapsedSections.step3}
        onToggle={() => toggleSection('step3')}
        stepNumber={3}
        completed={formData.budget.min && formData.budget.max}
      >
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Monthly Budget Range *
            <span style={styles.helpText}>(in USD)</span>
          </label>
          <div
            style={{
              ...styles.budgetContainer,
              gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr'
            }}
          >
            <div style={styles.budgetInputWrapper}>
            <div style={styles.inputWithPrefix}>
                <span style={styles.currencySymbol}>₹</span>
                <input
                  type="number"
                  value={formData.budget.min}
                  onChange={handleBudgetChange('min')}
                  placeholder="500"
                  min="100"
                  step="50"
                  style={{
                    ...styles.input,
                    ...styles.budgetInput,
                    ...(errors.minBudget ? styles.inputError : formData.budget.min ? styles.inputSuccess : {})
                  }}
                  aria-required="true"
                  aria-invalid={!!errors.minBudget}
                  aria-label="Minimum monthly budget"
                />
              </div>
              {errors.minBudget && <span style={styles.errorText}>{errors.minBudget}</span>}
            </div>
            
            <span style={styles.budgetSeparator}>to</span>
            
            <div style={styles.budgetInputWrapper}>
            <div style={styles.inputWithPrefix}>
                <span style={styles.currencySymbol}>₹</span>
                <input
                  type="number"
                  value={formData.budget.max}
                  onChange={handleBudgetChange('max')}
                  placeholder="1500"
                  min="100"
                  step="50"
                  style={{
                    ...styles.input,
                    ...styles.budgetInput,
                    ...(errors.maxBudget ? styles.inputError : formData.budget.max ? styles.inputSuccess : {})
                  }}
                  aria-required="true"
                  aria-invalid={!!errors.maxBudget}
                  aria-label="Maximum monthly budget"
                />
              </div>
              {errors.maxBudget && <span style={styles.errorText}>{errors.maxBudget}</span>}
            </div>
          </div>
          <div style={styles.helpText}>
            💡 Typical room rents: Studios ₹800-₹1,500 | Roommates ₹500-₹1,200
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="preferredGender">
            Preferred Flatmate Gender
          </label>
          <div style={styles.radioGroup}>
            {['any', 'male', 'female'].map(gender => (
              <label key={gender} style={styles.radioLabel}>
                <input
                  type="radio"
                  name="preferredGender"
                  value={gender}
                  checked={formData.preferredGender === gender}
                  onChange={handleTextInputChange('preferredGender')}
                  style={styles.radio}
                />
                <span style={styles.radioText}>
                  {gender === 'any' ? '👥 Any Gender' : gender === 'male' ? '👨 Male' : '👩 Female'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            ...styles.formRow,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
          }}
        >
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="currentOccupants">
              👨‍👩‍👧‍👦 Current Occupants
            </label>
            <input
              id="currentOccupants"
              type="number"
              value={formData.currentOccupants}
              onChange={handleNumberInputChange('currentOccupants')}
              min="0"
              max="10"
              style={{
                ...styles.input,
                ...(errors.currentOccupants && styles.inputError)
              }}
            />
            {errors.currentOccupants && <span style={styles.errorText}>{errors.currentOccupants}</span>}
            <div style={styles.helpText}>Including yourself</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="occupancyWanted">
              🎯 Flatmates Wanted
            </label>
            <input
              id="occupancyWanted"
              type="number"
              value={formData.occupancyWanted}
              onChange={handleNumberInputChange('occupancyWanted')}
              min="1"
              max="5"
              style={{
                ...styles.input,
                ...(errors.occupancyWanted && styles.inputError)
              }}
            />
            {errors.occupancyWanted && <span style={styles.errorText}>{errors.occupancyWanted}</span>}
            <div style={styles.helpText}>How many people are you looking for?</div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderStep4 = () => (
    <div style={styles.stepContainer}>
      <CollapsibleSection
        title="🏠 Amenities & Contact"
        isCollapsed={collapsedSections.step4}
        onToggle={() => toggleSection('step4')}
        stepNumber={4}
        completed={true}
      >
        <div style={styles.formGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.furnished}
              onChange={(e) => handleInputChange('furnished', e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>🛏️ Fully Furnished Room</span>
          </label>
          <div style={styles.helpText}>
            Includes bed, desk, wardrobe, and other essential furniture
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>✨ Available Amenities</label>
          <div
            style={{
              ...styles.amenitiesGrid,
              gridTemplateColumns: isMobile
                ? '1fr 1fr'
                : styles.amenitiesGrid.gridTemplateColumns
            }}
          >
            {amenitiesOptions.map(amenity => (
              <label key={amenity} style={styles.amenityLabel}>
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => handleAmenityChange(amenity)}
                  style={styles.checkbox}
                />
                <span style={styles.amenityText}>{amenity}</span>
              </label>
            ))}
          </div>
          <div style={styles.helpText}>
            Select all amenities included with your place
          </div>
        </div>

        
      </CollapsibleSection>
    </div>
  );

  const renderStep5 = () => (
    <div style={styles.stepContainer}>
      <CollapsibleSection
        title="📸 Photos & Final Review"
        isCollapsed={collapsedSections.step5}
        onToggle={() => toggleSection('step5')}
        stepNumber={5}
        completed={formData.photos.length > 0}
      >
        <div style={styles.formGroup}>
          <label style={styles.label}>🖼️ Upload Photos</label>
          <div
           
  style={{
    ...styles.uploadArea,
    ...(isDragging && styles.uploadAreaDragging),
    ...(formData.photos.length > 0 && styles.uploadAreaHasPhotos),
    padding: isMobile ? '24px 16px' : styles.uploadArea.padding
  }}

            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop area for photos. Click to open file selector."
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              style={styles.fileInput}
            />
            <div style={styles.uploadIcon}>📷</div>
            <div style={styles.uploadText}>
              {formData.photos.length > 0 ? 
                `Add more photos (${formData.photos.length}/10)` : 
                'Click to upload or drag and drop photos here'
              }
            </div>
            <div style={styles.uploadSubtext}>
              Recommended: 4-8 clear photos of the room, common areas, building exterior, and amenities
            </div>
            <div style={styles.uploadRequirements}>
              📏 Max 10 photos • 🖼️ JPEG, PNG • 📱 High quality preferred
            </div>
          </div>
        </div>

        {formData.photos.length > 0 && (
          <div style={styles.photoPreviewContainer}>
            <h4 style={styles.photoPreviewTitle}>
              📋 Photo Preview ({formData.photos.length}/10)
              <span style={styles.photoHelp}>Drag to reorder</span>
            </h4>
            <div style={styles.photoGrid}>
              {formData.photos.map((photo, index) => (
                <div key={photo.id} style={styles.photoItem}>
                  <img
                    src={photo.preview}
                    alt={`Preview ${index + 1}`}
                    style={styles.photoPreview}
                  />
                  <div style={styles.photoOverlay}>
                    <div style={styles.photoActions}>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(index, index - 1)}
                          style={styles.photoActionButton}
                          aria-label={`Move photo ${index + 1} left`}
                        >
                          ⬅️
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        style={{...styles.photoActionButton, ...styles.photoActionButtonDanger}}
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        🗑️
                      </button>
                      {index < formData.photos.length - 1 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(index, index + 1)}
                          style={styles.photoActionButton}
                          aria-label={`Move photo ${index + 1} right`}
                        >
                          ➡️
                        </button>
                      )}
                    </div>
                    <div style={styles.photoIndex}>#{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* <div style={styles.reviewSection}>
          <h4 style={styles.reviewTitle}>👀 Live Preview</h4>
          <LivePreview formData={formData} />
        </div> */}
      </CollapsibleSection>
    </div>
  );

  const steps = [
    { title: 'Basic Info', icon: '📝' },
    { title: 'Location', icon: '📍' },
    { title: 'Budget', icon: '💰' },
    { title: 'Amenities', icon: '🏠' },
    { title: 'Photos & Review', icon: '📸' }
  ];

  return (
    <div style={styles.container}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 999 }}>
        <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
      </div>

      {/* Toast Notifications */}
      <div
        style={{
          ...styles.toastContainer,
          top: isMobile ? 'auto' : styles.toastContainer.top,
          bottom: isMobile ? '20px' : 'auto',
          left: isMobile ? '50%' : 'auto',
          right: isMobile ? 'auto' : styles.toastContainer.right,
          transform: isMobile ? 'translateX(-50%)' : 'none'
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              ...styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]
            }}
            role="alert"
          >
            <span style={styles.toastIcon}>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1
  style={{
    ...styles.mainTitle,
    fontSize: isMobile ? '1.8rem' : '2.5rem'
  }}
>
  Create Flatmate Listing
</h1>
          <p style={styles.subtitle}>Find the perfect flatmate for your space</p>
        </div>
        {draftSaved && (
          <div style={styles.draftSavedBadge}>
            💾 Draft Saved
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          {steps.map((step, index) => (
            <div
              key={step.title}
              style={{
                ...styles.progressStep,
                ...(index + 1 === currentStep && styles.progressStepActive),
                ...(index + 1 < currentStep && styles.progressStepCompleted)
              }}
            >
              <div style={styles.progressStepContent}>
                <div style={styles.progressIcon}>
                  {index + 1 < currentStep ? '✅' : step.icon}
                </div>
                <div style={styles.progressTextContainer}>
                  <div style={styles.progressStepNumber}>Step {index + 1}</div>
                  <div style={styles.progressStepTitle}>{step.title}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div style={styles.progressConnector}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          ...styles.formContainer,
          gridTemplateColumns: isMobile ? '1fr' : '1fr 400px'
        }}
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          <div
  style={{
    ...styles.buttonContainer,
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '16px' : undefined,
    alignItems: isMobile ? 'stretch' : 'center'
  }}
>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                style={styles.secondaryButton}
              >
                ← Previous
              </button>
            )}
            
            <div
  style={{
    ...styles.rightButtons,
    flexDirection: isMobile ? 'column' : 'row',
    width: isMobile ? '100%' : 'auto'
  }}
>
              <button
                type="button"
                onClick={saveDraft}
                style={styles.draftButton}
              >
                💾 Save Draft
              </button>
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  style={styles.primaryButton}
                >
                  Continue to {steps[currentStep].title} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmation(true)}
                  style={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div style={styles.spinner}></div>
                      Publishing...
                    </>
                  ) : (
                    '🚀 Publish Listing'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {!isMobile && (
          <div style={styles.sidebar}>
            <LivePreview formData={formData} />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          formData={formData}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmation(false)}
          onEditSection={goToStep}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

// Enhanced Collapsible Section Component
const CollapsibleSection = ({ title, isCollapsed, onToggle, stepNumber, completed, children }) => (
  <div style={styles.collapsibleSection}>
    <button
      type="button"
      onClick={onToggle}
      style={styles.collapsibleHeader}
      aria-expanded={!isCollapsed}
    >
      <div style={styles.collapsibleHeaderContent}>
        <div style={styles.stepIndicator}>
          <div style={{
            ...styles.stepNumberCircle,
            ...(completed && styles.stepNumberCircleCompleted)
          }}>
            {completed ? '✓' : stepNumber}
          </div>
        </div>
        <span style={styles.collapsibleTitle}>{title}</span>
      </div>
      <span style={styles.collapsibleIcon}>
        {isCollapsed ? '▶' : '▼'}
      </span>
    </button>
    {!isCollapsed && (
      <div style={styles.collapsibleContent}>
        {children}
      </div>
    )}
  </div>
);

// Enhanced Confirmation Modal Component
const ConfirmationModal = ({ formData, onConfirm, onCancel, onEditSection, isSubmitting }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modal} role="dialog" aria-labelledby="confirmation-title">
      <div style={styles.modalHeader}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <h2 id="confirmation-title" style={styles.modalTitle}>🎉 Ready to Publish!</h2>
            <p style={styles.modalSubtitle}>Review your listing before it goes live</p>
          </div>

          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {/* Duplicate publish action in header for visibility */}
            <button
              type="button"
              onClick={onConfirm}
              style={{...styles.modalConfirmButton, padding: '8px 16px'}}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div style={styles.spinner}></div>
                  Publishing...
                </>
              ) : (
                '🚀 Publish'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div style={styles.confirmationSections}>
        <div style={styles.confirmationSection}>
          <div style={styles.confirmationSectionHeader}>
            <h3>📝 Basic Information</h3>
            <button
              type="button"
              onClick={() => onEditSection(1)}
              style={styles.editSectionButton}
            >
              Edit
            </button>
          </div>
          <div style={styles.confirmationContent}>
            <p><strong>Title:</strong> {formData.title || 'Not set'}</p>
            <p><strong>Description:</strong> {formData.description ? `${formData.description.substring(0, 100)}...` : 'Not set'}</p>
          </div>
        </div>

        <div style={styles.confirmationSection}>
          <div style={styles.confirmationSectionHeader}>
            <h3>📍 Location</h3>
            <button
              type="button"
              onClick={() => onEditSection(2)}
              style={styles.editSectionButton}
            >
              Edit
            </button>
          </div>
          <div style={styles.confirmationContent}>
            <p><strong>Location:</strong> {formData.area && formData.city ? `${formData.area}, ${formData.city}` : 'Not set'}</p>
            <p><strong>Move-in Date:</strong> {formData.moveInDate || 'Not set'}</p>
          </div>
        </div>

        <div style={styles.confirmationSection}>
          <div style={styles.confirmationSectionHeader}>
            <h3>💰 Budget & Occupancy</h3>
            <button
              type="button"
              onClick={() => onEditSection(3)}
              style={styles.editSectionButton}
            >
              Edit
            </button>
          </div>
          <div style={styles.confirmationContent}>
            <p><strong>Budget:</strong> {formData.budget.min && formData.budget.max ? `₹${formData.budget.min} - ₹${formData.budget.max}/month` : 'Not set'}</p>
            <p><strong>Flatmates:</strong> {formData.occupancyWanted} wanted, {formData.currentOccupants} current</p>
            <p><strong>Preferred Gender:</strong> {formData.preferredGender === 'any' ? 'Any' : formData.preferredGender}</p>
          </div>
        </div>

        <div style={styles.confirmationSection}>
          <div style={styles.confirmationSectionHeader}>
            <h3>🏠 Amenities</h3>
            <button
              type="button"
              onClick={() => onEditSection(4)}
              style={styles.editSectionButton}
            >
              Edit
            </button>
          </div>
          <div style={styles.confirmationContent}>
            <p><strong>Amenities:</strong> {formData.amenities.length > 0 ? formData.amenities.join(', ') : 'None selected'}</p>
            <p><strong>Furnished:</strong> {formData.furnished ? 'Yes' : 'No'}</p>
            <p><strong>Contact via:</strong> {[
              formData.contactMethods.phone && 'Phone',
              formData.contactMethods.email && 'Email'
            ].filter(Boolean).join(', ') || 'None selected'}</p>
          </div>
        </div>

        <div style={styles.confirmationSection}>
          <div style={styles.confirmationSectionHeader}>
            <h3>📸 Photos</h3>
            <button
              type="button"
              onClick={() => onEditSection(5)}
              style={styles.editSectionButton}
            >
              Edit
            </button>
          </div>
          <div style={styles.confirmationContent}>
            <p><strong>Photos Uploaded:</strong> {formData.photos.length}</p>
          </div>
        </div>
      </div>

      <div style={styles.modalFooter}>
        <button
          type="button"
          onClick={onCancel}
          style={styles.modalCancelButton}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={styles.modalConfirmButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div style={styles.spinner}></div>
              Publishing...
            </>
          ) : (
            '🚀 Publish Listing'
          )}
        </button>
      </div>
    </div>
  </div>
);

// Enhanced Live Preview Component
const LivePreview = ({ formData }) => {
  return (
    <div style={previewStyles.container}>
      
      <div style={previewStyles.card}>
        {formData.photos.length > 0 && (
          <div style={previewStyles.imageContainer}>
            <img
              src={formData.photos[0].preview}
              alt="Listing preview"
              style={previewStyles.mainImage}
            />
            {formData.photos.length > 1 && (
              <div style={previewStyles.imageCount}>
                +{formData.photos.length - 1} more
              </div>
            )}
          </div>
        )}
        
        <div style={previewStyles.content}>
          <div style={previewStyles.header}>
            <h4 style={previewStyles.listingTitle}>
              {formData.title || 'Your listing title will appear here'}
            </h4>
            <div style={previewStyles.price}>
              {formData.budget.min && formData.budget.max 
                ? `₹${formData.budget.min} - ₹${formData.budget.max}/mo`
                : 'Price range'
              }
            </div>
          </div>
          
          <div style={previewStyles.location}>
            📍 {formData.city && formData.area 
              ? `${formData.area}, ${formData.city}`
              : 'Location not set'
            }
          </div>
          
          <div style={previewStyles.description}>
            {formData.description 
              ? (formData.description.length > 150 
                  ? `${formData.description.substring(0, 150)}...` 
                  : formData.description)
              : 'Description will appear here...'
            }
          </div>
          
          <div style={previewStyles.details}>
            <div style={previewStyles.detailItem}>
              <span style={previewStyles.detailLabel}>Move-in:</span>
              <span>{formData.moveInDate || 'Not set'}</span>
            </div>
            <div style={previewStyles.detailItem}>
              <span style={previewStyles.detailLabel}>Gender:</span>
              <span>{formData.preferredGender === 'any' ? 'Any' : formData.preferredGender}</span>
            </div>
            <div style={previewStyles.detailItem}>
              <span style={previewStyles.detailLabel}>Occupants:</span>
              <span>{formData.currentOccupants} current, {formData.occupancyWanted} wanted</span>
            </div>
            <div style={previewStyles.detailItem}>
              <span style={previewStyles.detailLabel}>Furnished:</span>
              <span>{formData.furnished ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          {formData.amenities.length > 0 && (
            <div style={previewStyles.amenities}>
              <strong>✨ Amenities:</strong> 
              <div style={previewStyles.amenitiesList}>
                {formData.amenities.slice(0, 3).join(', ')}
                {formData.amenities.length > 3 && ` +${formData.amenities.length - 3} more`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F4F7F9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingTop: '80px'
  },
  header: {
    background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
    color: 'white',
    padding: '40px 20px',
    textAlign: 'center',
    position: 'relative'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  mainTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: '0 0 10px 0',
    background: 'linear-gradient(45deg, #FFFFFF, #22D3EE)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.2rem',
    opacity: 0.9,
    margin: 0,
    fontWeight: '300'
  },
  draftSavedBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#00A79D',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
progressBar: {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  maxWidth: '800px',
  margin: '0 auto',
  flexWrap: 'wrap',
  gap: '12px'
},
  progressStep: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    position: 'relative'
  },
  progressStepContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 2,
    backgroundColor: 'white',
    padding: '0 10px'
  },
  progressIcon: {
    fontSize: '1.5rem'
  },
  progressTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  progressStepNumber: {
    fontSize: '12px',
    color: '#4A6A8A',
    fontWeight: '600'
  },
  progressStepTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333333'
  },
  progressStepActive: {
    color: '#003366'
  },
  progressStepCompleted: {
    color: '#00A79D'
  },
  progressConnector: {
    flex: 1,
    height: '2px',
    backgroundColor: '#E1E8ED',
    margin: '0 10px'
  },
  formContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px'
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #E1E8ED'
  },
  stepContainer: {
    marginBottom: '0'
  },
  collapsibleSection: {
    border: '1px solid #E1E8ED',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  collapsibleHeader: {
    width: '100%',
    padding: '20px 24px',
    backgroundColor: '#F8FAFC',
    border: 'none',
    textAlign: 'left',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    color: '#003366'
  },
  // hover variant to be applied via JS or CSS class
  collapsibleHeaderHover: {
    backgroundColor: '#F1F5F9'
  },
  collapsibleHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center'
  },
  stepNumberCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#4A6A8A',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600'
  },
  stepNumberCircleCompleted: {
    backgroundColor: '#00A79D'
  },
  collapsibleTitle: {
    fontSize: '18px',
    fontWeight: '600'
  },
  collapsibleIcon: {
    fontSize: '14px',
    color: '#4A6A8A'
  },
  collapsibleContent: {
    padding: '24px'
  },
  formGroup: {
    marginBottom: '24px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#003366',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E1E8ED',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  },
  inputFocus: {
    borderColor: '#22D3EE',
    boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.1)',
    outline: 'none'
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#FDF2F2'
  },
  inputSuccess: {
    borderColor: '#00A79D'
  },
  textarea: {
    resize: 'vertical',
    minHeight: '120px',
    fontFamily: 'inherit'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E1E8ED',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer'
  },
  budgetContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '12px',
    alignItems: 'end'
  },
  budgetInputWrapper: {
    position: 'relative'
  },
  inputWithPrefix: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  currencySymbol: {
    position: 'absolute',
    left: '12px',
    color: '#4A6A8A',
    fontWeight: '600',
    zIndex: 1
  },
  budgetInput: {
    paddingLeft: '30px'
  },
  budgetSeparator: {
    color: '#4A6A8A',
    fontWeight: '600',
    paddingBottom: '12px',
    textAlign: 'center'
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #E1E8ED',
    transition: 'all 0.2s ease'
  },
  // hover variant for radioLabel
  radioLabelHover: {
    borderColor: '#22D3EE'
  },
  radio: {
    margin: 0
  },
  radioText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    padding: '8px 0'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    margin: 0
  },
  checkboxText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333333'
  },
  amenitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '8px'
  },
  amenityLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #E1E8ED',
    transition: 'all 0.2s ease'
  },
  // hover variant for amenityLabel
  amenityLabelHover: {
    borderColor: '#22D3EE',
    backgroundColor: '#F8FAFC'
  },
  amenityText: {
    fontSize: '14px'
  },
  contactMethods: {
    display: 'flex',
    gap: '20px',
    marginTop: '8px'
  },
  uploadArea: {
    border: '2px dashed #4A6A8A',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative'
  },
  uploadAreaDragging: {
    borderColor: '#22D3EE',
    backgroundColor: '#F0FDFF',
    transform: 'scale(1.02)'
  },
  uploadAreaHasPhotos: {
    padding: '20px'
  },
  fileInput: {
    display: 'none'
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '16px'
  },
  uploadText: {
    color: '#003366',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px'
  },
  uploadSubtext: {
    color: '#4A6A8A',
    fontSize: '14px',
    marginBottom: '8px'
  },
  uploadRequirements: {
    color: '#4A6A8A',
    fontSize: '12px'
  },
  photoPreviewContainer: {
    marginTop: '24px'
  },
  photoPreviewTitle: {
    color: '#003366',
    marginBottom: '16px',
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  photoHelp: {
    fontSize: '12px',
    color: '#4A6A8A',
    fontWeight: 'normal'
  },
photoGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: '12px'
},
  photoItem: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    aspectRatio: '1'
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '8px',
    opacity: 0,
    transition: 'opacity 0.2s ease'
  },
  // helper style to show photo overlay - apply via JS when hovered
  photoOverlayVisible: {
    opacity: 1
  },
  photoActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px'
  },
  photoActionButton: {
    background: 'rgba(255,255,255,0.9)',
    color: '#003366',
    border: 'none',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoActionButtonDanger: {
    color: '#e74c3c'
  },
  photoIndex: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center'
  },
  reviewSection: {
    marginTop: '32px'
  },
  reviewTitle: {
    color: '#003366',
    marginBottom: '20px',
    fontSize: '20px',
    fontWeight: '600'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E1E8ED'
  },
  rightButtons: {
    display: 'flex',
    gap: '16px'
  },
  primaryButton: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '14px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,51,102,0.2)'
  },
  // hover/active variant for primary button (apply via class or JS)
  primaryButtonHover: {
    backgroundColor: '#002244',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,51,102,0.3)'
  },
  secondaryButton: {
    backgroundColor: '#4A6A8A',
    color: 'white',
    padding: '14px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  secondaryButtonHover: {
    backgroundColor: '#3A5A7A'
  },
  draftButton: {
    backgroundColor: '#00A79D',
    color: 'white',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  draftButtonHover: {
    backgroundColor: '#00968D'
  },
  submitButton: {
    backgroundColor: '#22D3EE',
    color: '#003366',
    padding: '14px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(34,211,238,0.3)'
  },
  submitButtonHover: {
    backgroundColor: '#0BC5E0',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(34,211,238,0.4)'
  },
  // disabled variant for submit button
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none'
  },
  sidebar: {
    position: 'sticky',
    top: '100px',
    height: 'fit-content',
    alignSelf: 'flex-start'
  },
  // Toast Styles
  toastContainer: {
    position: 'fixed',
    top: '100px',
    right: '20px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  toast: {
    padding: '16px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    minWidth: '300px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease'
  },
  toastSuccess: {
    backgroundColor: '#00A79D'
  },
  toastError: {
    backgroundColor: '#e74c3c'
  },
  toastInfo: {
    backgroundColor: '#003366'
  },
  toastIcon: {
    fontSize: '18px'
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '30px 30px 20px',
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E1E8ED'
  },
  modalTitle: {
    color: '#003366',
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700'
  },
  modalSubtitle: {
    color: '#4A6A8A',
    margin: 0,
    fontSize: '16px'
  },
  confirmationSections: {
    padding: '20px 30px',
    maxHeight: '400px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  confirmationSection: {
    marginBottom: '20px',
    padding: '20px',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    backgroundColor: '#F8FAFC'
  },
  confirmationSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  // style to apply on the <h3> inside confirmation section
  confirmationSectionHeaderTitle: {
    margin: 0,
    color: '#003366',
    fontSize: '16px',
    fontWeight: '600'
  },
  editSectionButton: {
    backgroundColor: '#4A6A8A',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  confirmationContent: {
    color: '#333333',
    fontSize: '14px'
  },
  // paragraph style for confirmation content
  confirmationContentP: {
    margin: '4px 0'
  },
  modalFooter: {
    padding: '20px 30px',
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #E1E8ED',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalCancelButton: {
    backgroundColor: '#4A6A8A',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  modalConfirmButton: {
    backgroundColor: '#22D3EE',
    color: '#003366',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700'
  },
  // Utility Styles
  charCount: {
    float: 'right',
    fontSize: '12px',
    color: '#4A6A8A',
    fontWeight: 'normal'
  },
  helpText: {
    fontSize: '12px',
    color: '#4A6A8A',
    marginTop: '6px',
    lineHeight: '1.4'
  },
  errorText: {
    color: '#e74c3c',
    fontSize: '12px',
    marginTop: '6px',
    display: 'block',
    fontWeight: '500'
  },
  suggestionsContainer: {
    position: 'relative'
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #E1E8ED',
    borderRadius: '8px',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginTop: '4px'
  },
  suggestionItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #F4F7F9',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  // hover variant for suggestion item
  suggestionItemHover: {
    backgroundColor: '#F4F7F9'
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  }
};

// Preview Styles
const previewStyles = {
  container: {
    width: '100%'
  },
  title: {
    color: '#003366',
    marginBottom: '16px',
    fontSize: '18px',
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E1E8ED',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  imageContainer: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden'
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  imageCount: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  content: {
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  listingTitle: {
    color: '#003366',
    margin: 0,
    flex: 1,
    marginRight: '12px',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.3'
  },
  price: {
    backgroundColor: '#00A79D',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    fontSize: '16px'
  },
  location: {
    color: '#4A6A8A',
    marginBottom: '12px',
    fontWeight: '600',
    fontSize: '14px'
  },
  description: {
    color: '#333333',
    lineHeight: '1.5',
    marginBottom: '16px',
    fontSize: '14px'
  },
  details: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '4px 0'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#4A6A8A'
  },
  amenities: {
    color: '#333333',
    fontSize: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #E1E8ED'
  },
  amenitiesList: {
    marginTop: '4px',
    color: '#4A6A8A'
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`, styleSheet.cssRules.length);

export default CreateFlatmateListing;