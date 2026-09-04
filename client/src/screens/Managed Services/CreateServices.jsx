import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Home, User, Phone, Calendar, FileText, Wrench, ChevronLeft } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import {useAuth} from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Footer from '../Dashboard/Footer';

const ServiceRequestApp = () => {
  const userToken = localStorage.getItem("accessToken");
  const [userRole, setUserRole] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
   const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    propertyId: '',
    propertyType: '',
    address: '',
    serviceType: '',
    contactNumber: '',
    preferredDate: '',
    notes: '',
    status: 'pending'
  });

  

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  const serviceTypes = [
    { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { value: 'painting', label: 'Painting', icon: '🎨' },
    { value: 'termite', label: 'Termite Control', icon: '🐛' },
    { value: 'plumbing', label: 'Plumbing', icon: '🚰' },
    { value: 'acService', label: 'AC Service', icon: '❄️' },
    { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
    { value: 'electrical', label: 'Electrical', icon: '⚡' },
    { value: 'moving', label: 'Moving', icon: '📦' },
    { value: 'pestControl', label: 'Pest Control', icon: '🦟' },
    { value: 'other', label: 'Other', icon: '🔧' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#F59E0B' },
    { value: 'in-progress', label: 'In Progress', color: '#00A79D' },
    { value: 'completed', label: 'Completed', color: '#10B981' }
  ];

  useEffect(() => {
    if (userRole === 'owner') {
      fetchProperties();
    }
  }, [userRole, currentPage]);

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/properties/my?page=${currentPage}&limit=10`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch properties');

      const data = await response.json();
      setProperties(data.properties);
      setTotalPages(Math.ceil(data.total / data.limit));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (e) => {
    const selectedProperty = properties.find(p => p._id === e.target.value);
    if (selectedProperty) {
      setFormData({
        ...formData,
        propertyId: selectedProperty._id,
        propertyType: selectedProperty.propertyCategory === 'rental' ? 'RentalProperty' : 'SaleProperty',
        address: selectedProperty.address || selectedProperty.location || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userRole) {
      setError('Please select your role (Owner or Renter).');
      return;
    }
    if (!formData.serviceType) {
      setError('Please select a service type.');
      return;
    }
    if (!formData.contactNumber) {
      setError('Please enter a contact number.');
      return;
    }
    if (userRole === 'owner') {
      if (!formData.propertyId || !formData.propertyType) {
        setError('Please choose a property to continue.');
        return;
      }
    } else {
      if (!formData.address || !formData.address.trim()) {
        setError('Please enter your full address.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        userRole,
        serviceType: formData.serviceType,
        contactNumber: formData.contactNumber,
        preferredDate: formData.preferredDate,
        notes: formData.notes,
        status: formData.status
      };

      if (userRole === 'owner') {
        payload.propertyId = formData.propertyId;
        payload.propertyType = formData.propertyType;
      } else {
        payload.address = formData.address;
      }

      const response = await fetch(`${process.env.REACT_APP_Base_API}/api/createservices`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to submit service request');

      setSuccess('Service request submitted successfully!');
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setFormData({
        propertyId: '',
        propertyType: '',
        address: '',
        serviceType: '',
        contactNumber: '',
        preferredDate: '',
        notes: '',
        status: 'pending'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userRole) {
    return (
      <div className="service-request-app">
        <TopNavigationBar  navItems={navItems} />
        
        <div className="app-container">
          <div className="role-selection-card">
            <div className="card-header">
              <Wrench className="header-icon" />
              <h1 className="page-title">Service Request</h1>
              <p className="page-subtitle">Professional Property Services at Your Fingertips</p>
            </div>
            
            <div className="role-selection">
              <h2 className="section-title">Select Your Role</h2>
              <div className="role-grid">
                <div 
                  className="role-card"
                  onClick={() => setUserRole('owner')}
                >
                  <Home className="role-icon" />
                  <h3 className="role-title">Property Owner</h3>
                  <p className="role-description">Request services for your properties</p>
                </div>
                
                <div 
                  className="role-card"
                  onClick={() => setUserRole('renter')}
                >
                  <User className="role-icon" />
                  <h3 className="role-title">Renter</h3>
                  <p className="role-description">Request services for your rental</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer isMobile={isMobile} user={user} />

        <style jsx>{`
          .service-request-app {
            min-height: 100vh;
            background: #F4F7F9;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          .app-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 120px 24px 80px;
          }

          .role-selection-card {
            background: #FFFFFF;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 51, 102, 0.08);
            border: 1px solid rgba(0, 51, 102, 0.06);
            overflow: hidden;
          }

          .card-header {
            background: #003366;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }

          .header-icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 16px;
          }

          .page-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            line-height: 1.2;
          }

          .page-subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
            font-weight: 400;
          }

          .role-selection {
            padding: 48px 40px;
          }

          .section-title {
            text-align: center;
            color: #003366;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 32px 0;
          }

          .role-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
          }

          .role-card {
            background: #FFFFFF;
            border: 2px solid #F4F7F9;
            border-radius: 12px;
            padding: 32px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .role-card:hover {
            border-color: #00A79D;
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0, 167, 157, 0.12);
          }

          .role-icon {
            width: 48px;
            height: 48px;
            color: #00A79D;
            margin: 0 auto 16px;
          }

          .role-title {
            color: #003366;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .role-description {
            color: #4A6A8A;
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
          }

          @media (max-width: 768px) {
            .app-container {
              padding: 100px 16px 60px;
            }

            .card-header {
              padding: 32px 24px;
            }

            .page-title {
              font-size: 24px;
            }

            .role-selection {
              padding: 32px 24px;
            }

            .role-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="service-request-app">
      <TopNavigationBar  navItems={navItems} />
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="app-container">
        <div className="service-card">
          <div className="card-header">
            <Wrench className="header-icon" />
            <h1 className="page-title">Service Request</h1>
            <p className="page-subtitle">
              {userRole === 'owner' ? 'Property Owner Portal' : 'Renter Portal'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="form-content">
            <button
              type="button"
              onClick={() => setUserRole(null)}
              className="back-button"
            >
              <ChevronLeft size={16} />
              Change Role
            </button>

            {error && (
              <div className="alert error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert success">
                <CheckCircle size={20} />
                <span>{success}</span>
              </div>
            )}

            <div className="form-sections">
              {userRole === 'owner' && (
                <div className="form-section">
                  <h3 className="section-title">Property Information</h3>
                  
                  <div className="form-group">
                    <label className="form-label">
                      <Home size={18} />
                      Select Property
                    </label>
                    
                    <div className="property-selection">
                      <button
                        type="button"
                        onClick={() => setShowPropPicker(true)}
                        className="property-button"
                      >
                        {formData.propertyId ? 'Change Property' : 'Choose Property'}
                      </button>

                      {formData.propertyId && (
                        <div className="selected-property">
                          <img
                            src={(properties.find(p => p._id === formData.propertyId)?.images?.[0]) || '/default-property.jpg'}
                            alt="Selected property"
                            className="property-thumbnail"
                            onError={(e) => { 
                              if (e.currentTarget.src.indexOf('/default-property.jpg') === -1) { 
                                e.currentTarget.src = '/default-property.jpg'; 
                              } 
                            }}
                          />
                          <div className="property-info">
                            <div className="property-name">
                              {properties.find(p => p._id === formData.propertyId)?.title || 'Unnamed Property'}
                            </div>
                            <div className="property-type">
                              {formData.propertyType === 'RentalProperty' ? 'Rental' : 'Sale'}
                            </div>
                          </div>
                          <div className="property-address">
                            {formData.address || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Home size={18} />
                      Property Address
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={formData.address}
                      readOnly
                      placeholder="Address will be auto-filled"
                    />
                  </div>
                </div>
              )}

              {userRole === 'renter' && (
                <div className="form-section">
                  <h3 className="section-title">Property Information</h3>
                  
                  <div className="form-group">
                    <label className="form-label">
                      <Home size={18} />
                      Full Address
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your complete address"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3 className="section-title">Service Details</h3>
                
                <div className="form-group">
                  <label className="form-label">
                    <Wrench size={18} />
                    Service Type
                  </label>
                  <select
                    className="form-select"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a service type</option>
                    {serviceTypes.map(service => (
                      <option key={service.value} value={service.value}>
                        {service.icon} {service.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Phone size={18} />
                    Contact Number
                  </label>
                  <input
                    className="form-input"
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your contact number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={18} />
                    Preferred Date
                  </label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                  />
                </div>

                {(formData.serviceType === 'other' || formData.notes) && (
                  <div className="form-group">
                    <label className="form-label">
                      <FileText size={18} />
                      {formData.serviceType === 'other' ? 'Service Details' : 'Additional Notes'}
                    </label>
                    <textarea
                      className="form-textarea"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Describe the service you need or add any special instructions..."
                      required={formData.serviceType === 'other'}
                      rows={4}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    <Clock size={18} />
                    Request Status
                  </label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <div className="status-badge">
                    Current Status: {statusOptions.find(s => s.value === formData.status)?.label}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Service Request'}
            </button>
          </form>
        </div>
      </div>

      {/* Property Picker Modal */}
      {showPropPicker && (
        <div className="modal-overlay" onClick={() => setShowPropPicker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Select Property</h3>
              <button
                onClick={() => setShowPropPicker(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="search-controls">
                <input
                  type="text"
                  placeholder="Search by title or address..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="search-input"
                />
                
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="page-button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="page-button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="properties-grid">
                {(properties || [])
                  .filter(p => {
                    const q = propertySearch.trim().toLowerCase();
                    if (!q) return true;
                    const title = (p.title || p.propertyName || '').toLowerCase();
                    const addr = (p.address || p.location || p.Sector || '').toLowerCase();
                    return title.includes(q) || addr.includes(q);
                  })
                  .map((p) => (
                    <button
                      key={p._id}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          propertyId: p._id,
                          propertyType: p.propertyCategory === 'rental' ? 'RentalProperty' : 'SaleProperty',
                          address: p.address || p.location || p.Sector || ''
                        });
                        setShowPropPicker(false);
                      }}
                      className="property-card"
                    >
                      <img
                        src={p.images?.[0] || '/default-property.jpg'}
                        alt={p.title || p.propertyName || 'Property image'}
                        className="property-image"
                        onError={(e) => {
                          if (e.currentTarget.src.indexOf('/default-property.jpg') === -1) {
                            e.currentTarget.src = '/default-property.jpg';
                          }
                        }}
                      />
                      <div className="property-content">
                        <div className="property-header">
                          <div className="property-title">
                            {p.title || p.propertyName || 'Unnamed Property'}
                          </div>
                          <div className={`property-category ${p.propertyCategory}`}>
                            {p.propertyCategory === 'rental' ? 'Rental' : 'Sale'}
                          </div>
                        </div>
                        <div className="property-address">
                          {p.address || p.location || p.Sector || 'Address not specified'}
                        </div>
                        <div className="property-features">
                          {typeof p.bedrooms !== 'undefined' && <span>{p.bedrooms} BR</span>}
                          {typeof p.bathrooms !== 'undefined' && <span>{p.bathrooms} BA</span>}
                          {p.totalArea?.sqft && <span>{p.totalArea.sqft} sqft</span>}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              {properties.length === 0 && (
                <div className="empty-state">No properties found</div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer isMobile={isMobile} user={user} />

      <style jsx>{`
        .service-request-app {
          min-height: 100vh;
          background: #F4F7F9;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .app-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 120px 24px 80px;
        }

        .service-card {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 51, 102, 0.08);
          border: 1px solid rgba(0, 51, 102, 0.06);
          overflow: hidden;
        }

        .card-header {
          background: #003366;
          color: #FFFFFF;
          padding: 40px;
          text-align: center;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          margin: 0 auto 16px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
          font-weight: 400;
        }

        .form-content {
          padding: 40px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 2px solid #4A6A8A;
          color: #4A6A8A;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 24px;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: #4A6A8A;
          color: #FFFFFF;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .alert.error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        .alert.success {
          background: #F0FDF4;
          color: #166534;
          border: 1px solid #BBF7D0;
        }

        .form-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          color: #003366;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #F4F7F9;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #003366;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          transition: border-color 0.2s ease;
          background: #FFFFFF;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #00A79D;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .property-selection {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .property-button {
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          background: #FFFFFF;
          color: #003366;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .property-button:hover {
          border-color: #00A79D;
        }

        .selected-property {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #F8FAFC;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }

        .property-thumbnail {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          background: #E5E7EB;
        }

        .property-info {
          flex: 1;
          min-width: 0;
        }

        .property-name {
          font-weight: 600;
          color: #003366;
          margin-bottom: 4px;
        }

        .property-type {
          display: inline-block;
          padding: 4px 8px;
          background: #00A79D;
          color: #FFFFFF;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .property-address {
          color: #4A6A8A;
          font-size: 14px;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          background: #00A79D;
          color: #FFFFFF;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 8px;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background: #00A79D;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 24px;
        }

        .submit-button:hover:not(:disabled) {
          background: #00857a;
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 900px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .modal-title {
          color: #003366;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #4A6A8A;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .modal-close:hover {
          background: #F4F7F9;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .search-controls {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          font-size: 16px;
        }

        .search-input:focus {
          outline: none;
          border-color: #00A79D;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-button {
          padding: 8px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 6px;
          background: #FFFFFF;
          color: #4A6A8A;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .page-button:hover:not(:disabled) {
          border-color: #00A79D;
          color: #00A79D;
        }

        .page-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          color: #4A6A8A;
          font-weight: 500;
        }

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .property-card {
          text-align: left;
          background: #FFFFFF;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .property-card:hover {
          border-color: #00A79D;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 167, 157, 0.1);
        }

        .property-image {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 12px;
          background: #F4F7F9;
        }

        .property-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .property-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .property-title {
          font-weight: 600;
          color: #003366;
          margin: 0;
          flex: 1;
        }

        .property-category {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #FFFFFF;
          flex-shrink: 0;
        }

        .property-category.rental {
          background: #00A79D;
        }

        .property-category.sale {
          background: #4A6A8A;
        }

        .property-address {
          color: #4A6A8A;
          font-size: 14px;
          line-height: 1.4;
        }

        .property-features {
          display: flex;
          gap: 12px;
          color: #6B7280;
          font-size: 12px;
        }

        .empty-state {
          text-align: center;
          color: #6B7280;
          padding: 40px;
          font-style: italic;
        }

        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #E5E7EB;
          border-top: 4px solid #00A79D;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .app-container {
            padding: 100px 16px 60px;
          }

          .card-header {
            padding: 32px 24px;
          }

          .form-content {
            padding: 24px;
          }

          .modal-body {
            padding: 16px;
          }

          .search-controls {
            flex-direction: column;
          }

          .pagination-controls {
            justify-content: space-between;
          }

          .properties-grid {
            grid-template-columns: 1fr;
          }

          .selected-property {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .property-info {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ServiceRequestApp;