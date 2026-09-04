import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, AlertCircle, Home, Phone, Calendar, FileText, Wrench, X, ChevronRight, Filter, Search, Edit, Save, XCircle, User, Building, RefreshCw } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useNavigate } from 'react-router-dom';
const AdminServiceTracking = () => {
    const [requests, setRequests] = useState([]);
    const[userdetails , setuserdetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
    const [totalRequests, setTotalRequests] = useState(0);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

  const serviceTypes = {
    cleaning: { icon: '🧹', label: 'Cleaning', color: '#00A79D' },
    painting: { icon: '🎨', label: 'Painting', color: '#8B5CF6' },
    termite: { icon: '🐛', label: 'Termite Control', color: '#DC2626' },
    plumbing: { icon: '🚰', label: 'Plumbing', color: '#2563EB' },
    acService: { icon: '❄️', label: 'AC Service', color: '#06B6D4' },
    carpenter: { icon: '🪚', label: 'Carpenter', color: '#D97706' },
    electrical: { icon: '⚡', label: 'Electrical', color: '#F59E0B' },
    moving: { icon: '📦', label: 'Moving', color: '#10B981' },
    pestControl: { icon: '🦟', label: 'Pest Control', color: '#EF4444' },
    other: { icon: '🔧', label: 'Other', color: '#6B7280' }
  };

  const statusConfig = {
    pending: { 
      icon: Clock, 
      label: 'Pending', 
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      description: 'Request received, awaiting assignment'
    },
    'in-progress': { 
      icon: Package, 
      label: 'In Progress', 
      color: '#00A79D',
      bgColor: '#CCFBF1',
      description: 'Service provider is working on this request'
    },
    completed: { 
      icon: CheckCircle, 
      label: 'Completed', 
      color: '#10B981',
      bgColor: '#D1FAE5',
      description: 'Service completed successfully'
    }
  };

  useEffect(() => {
    fetchServiceRequests();
  }, [currentPage, filterStatus]);

    const handleLogout = async () => {
    const accessToken = localStorage.getItem("accessToken");

    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  const fetchServiceRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const statusQuery = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/services?page=${currentPage}&limit=12${statusQuery}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch service requests');
      }

      const data = await response.json();
      setRequests(Array.isArray(data.items) ? data.items : []);
      setTotalPages(Number.isFinite(data.totalPages) ? data.totalPages : 1);
      setTotalRequests(Number.isFinite(data.total) ? data.total : (Array.isArray(data.items) ? data.items.length : 0));
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setEditData({
      userRole: request.userRole,
      propertyType: request.propertyType || '',
      propertyId: request.propertyId?._id || '',
      address: request.address,
      serviceType: request.serviceType,
      contactNumber: request.contactNumber,
      preferredDate: request.preferredDate ? new Date(request.preferredDate).toISOString().slice(0, 16) : '',
      notes: request.notes || '',
      status: request.status
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        userRole: editData.userRole,
        serviceType: editData.serviceType,
        contactNumber: editData.contactNumber,
        preferredDate: editData.preferredDate || null,
        notes: editData.notes,
        status: editData.status,
        address: editData.address
      };

      if (editData.userRole === 'owner') {
        if (editData.propertyType) payload.propertyType = editData.propertyType;
        if (editData.propertyId) payload.propertyId = editData.propertyId;
      }

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/services/${selectedRequest._id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update service request');
      }

      const data = await response.json();
      setSuccess('Service request updated successfully! ✅');
      setuserdetails(data.request.createdBy || {});
      setIsEditing(false);
      setSelectedRequest(data.request);

      // Refresh the list
      fetchServiceRequests();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (status) => {
    switch(status) {
      case 'pending': return 33;
      case 'in-progress': return 66;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         serviceTypes[req.serviceType]?.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.createdBy?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      maxWidth: '1400px',
        margin: '0 auto 32px',
      marginTop: '50px',
      background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
      borderRadius: '16px',
      padding: '32px',
      color: '#FFFFFF',
      boxShadow: '0 8px 32px rgba(0, 51, 102, 0.2)'
    },
    title: {
      fontSize: '36px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      fontSize: '16px',
      opacity: '0.9',
      margin: '0'
    },
    statsRow: {
      display: 'flex',
      gap: '16px',
      marginTop: '20px',
      flexWrap: 'wrap'
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.15)',
      padding: '12px 20px',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    statLabel: {
      fontSize: '12px',
      opacity: '0.8',
      marginBottom: '4px'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700'
    },
    controls: {
      maxWidth: '1400px',
      margin: '0 auto 24px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    searchBox: {
      flex: '1',
      minWidth: '250px',
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease',
      boxSizing: 'border-box'
    },
    searchIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#6B7280'
    },
    filterButtons: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    filterButton: (isActive, color) => ({
      padding: '10px 20px',
      border: isActive ? `2px solid ${color}` : '2px solid #E5E7EB',
      borderRadius: '8px',
      background: isActive ? color : '#FFFFFF',
      color: isActive ? '#FFFFFF' : '#4A6A8A',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }),
    refreshButton: {
      padding: '10px 20px',
      border: '2px solid #00A79D',
      borderRadius: '8px',
      background: '#00A79D',
      color: '#FFFFFF',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    requestsList: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '20px'
    },
    requestCard: {
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0, 51, 102, 0.08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: '2px solid transparent',
      position: 'relative'
    },
    adminBadge: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      background: 'linear-gradient(135deg, #003366 0%, #00A79D 100%)',
      color: '#FFFFFF',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    serviceIcon: (color) => ({
      fontSize: '32px',
      width: '56px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '12px',
      background: `${color}15`,
      border: `2px solid ${color}40`
    }),
    statusBadge: (status) => {
      const config = statusConfig[status];
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600',
        background: config?.bgColor || '#E5E7EB',
        color: config?.color || '#6B7280'
      };
    },
    cardBody: {
      marginBottom: '16px'
    },
    serviceLabel: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '8px'
    },
    infoRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      marginBottom: '8px',
      fontSize: '14px',
      color: '#4A6A8A'
    },
    userInfo: {
      background: '#F4F7F9',
      padding: '8px 12px',
      borderRadius: '6px',
      marginBottom: '12px',
      fontSize: '13px'
    },
    progressBar: {
      width: '100%',
      height: '6px',
      background: '#E5E7EB',
      borderRadius: '3px',
      overflow: 'hidden',
      marginBottom: '12px'
    },
    progressFill: (percentage, color) => ({
      width: `${percentage}%`,
      height: '100%',
      background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
      transition: 'width 0.5s ease',
      borderRadius: '3px'
    }),
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: (color) => ({
      flex: 1,
      padding: '10px',
      background: 'transparent',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      color: color,
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.3s ease',
      fontSize: '14px'
    }),
    modal: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 51, 102, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
      padding: '20px',
      backdropFilter: 'blur(4px)'
    },
    modalContent: {
      background: '#FFFFFF',
      borderRadius: '16px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 51, 102, 0.3)'
    },
    modalHeader: (status) => ({
      background: `linear-gradient(135deg, ${statusConfig[status]?.color || '#003366'} 0%, ${statusConfig[status]?.color || '#003366'}CC 100%)`,
      padding: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#FFFFFF',
      borderRadius: '16px 16px 0 0'
    }),
    modalTitle: {
      fontSize: '24px',
      fontWeight: '700',
      margin: '0'
    },
    closeButton: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background 0.3s ease',
      color: '#FFFFFF'
    },
    modalBody: {
      padding: '24px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'border-color 0.3s ease',
      outline: 'none',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'border-color 0.3s ease',
      outline: 'none',
      background: '#FFFFFF',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box'
    },
    timeline: {
      position: 'relative',
      paddingLeft: '40px',
      marginTop: '24px'
    },
    timelineItem: (isActive) => ({
      position: 'relative',
      paddingBottom: '24px',
      opacity: isActive ? 1 : 0.5
    }),
    timelineDot: (color, isActive) => ({
      position: 'absolute',
      left: '-40px',
      top: '0',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: isActive ? color : '#E5E7EB',
      border: `3px solid ${isActive ? color : '#9CA3AF'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2
    }),
    timelineLine: {
      position: 'absolute',
      left: '-29px',
      top: '24px',
      bottom: '0',
      width: '2px',
      background: '#E5E7EB'
    },
    timelineContent: {
      marginBottom: '8px'
    },
    timelineStatus: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '4px'
    },
    timelineDate: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '4px'
    },
    timelineDescription: {
      fontSize: '14px',
      color: '#4A6A8A'
    },
    detailsSection: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    detailItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px',
      background: '#F4F7F9',
      borderRadius: '8px',
      marginBottom: '8px'
    },
    detailIcon: {
      color: '#00A79D',
      flexShrink: 0
    },
    detailText: {
      fontSize: '14px',
      color: '#333333',
      lineHeight: '1.5',
      flex: 1
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px'
    },
    button: (variant) => {
      const variants = {
        primary: { bg: '#00A79D', color: '#FFFFFF' },
        secondary: { bg: 'transparent', color: '#6B7280', border: '#E5E7EB' },
        danger: { bg: '#DC2626', color: '#FFFFFF' }
      };
      const v = variants[variant] || variants.primary;
      return {
        flex: 1,
        padding: '12px 24px',
        background: v.bg,
        border: `2px solid ${v.border || v.bg}`,
        borderRadius: '8px',
        color: v.color,
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '16px'
      };
    },
    alert: (type) => ({
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: type === 'error' ? '#FEE2E2' : '#D1FAE5',
      color: type === 'error' ? '#991B1B' : '#065F46',
      border: `2px solid ${type === 'error' ? '#FCA5A5' : '#6EE7B7'}`
    }),
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      marginTop: '32px',
      maxWidth: '1400px',
      margin: '32px auto 0'
    },
    pageButton: (isActive) => ({
      padding: '10px 18px',
      border: isActive ? '2px solid #00A79D' : '2px solid #E5E7EB',
      borderRadius: '8px',
      background: isActive ? '#00A79D' : '#FFFFFF',
      color: isActive ? '#FFFFFF' : '#4A6A8A',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      fontSize: '14px'
    }),
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6B7280',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px'
    },
    emptyText: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#4A6A8A'
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#4A6A8A' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading service requests...</div>
        </div>
      </div>
    );
  }

  return (
      <div style={styles.container}>
            {/* Top Navigation Bar */}
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 999,
                    backgroundColor: "#FFFFFF" // or match your navbar background
                  }}
                >
                  <TopNavigationBar
                    user={user}
                    handleLogout={handleLogout}
                    navItems={navItems}
                  />
                </div>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Package size={40} />
          Admin Service Management
        </h1>
        <p style={styles.subtitle}>
          Manage and track all service requests across the platform
        </p>
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Requests</div>
            <div style={styles.statValue}>{totalRequests}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Pending</div>
            <div style={styles.statValue}>
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>In Progress</div>
            <div style={styles.statValue}>
              {requests.filter(r => r.status === 'in-progress').length}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Completed</div>
            <div style={styles.statValue}>
              {requests.filter(r => r.status === 'completed').length}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={20} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search by address, service type, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = '#00A79D'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <div style={styles.filterButtons}>
          <button
            style={styles.filterButton(filterStatus === 'all', '#003366')}
            onClick={() => setFilterStatus('all')}
            onMouseEnter={(e) => filterStatus !== 'all' && (e.currentTarget.style.background = '#F4F7F9')}
            onMouseLeave={(e) => filterStatus !== 'all' && (e.currentTarget.style.background = '#FFFFFF')}
          >
            <Filter size={16} />
            All
          </button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              style={styles.filterButton(filterStatus === key, config.color)}
              onClick={() => setFilterStatus(key)}
              onMouseEnter={(e) => filterStatus !== key && (e.currentTarget.style.background = '#F4F7F9')}
              onMouseLeave={(e) => filterStatus !== key && (e.currentTarget.style.background = '#FFFFFF')}
            >
              {React.createElement(config.icon, { size: 16 })}
              {config.label}
            </button>
          ))}
        </div>
        <button
          style={styles.refreshButton}
          onClick={fetchServiceRequests}
          disabled={loading}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#008C82';
            e.currentTarget.style.transform = 'rotate(180deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#00A79D';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          <RefreshCw size={16} style={{ transition: 'transform 0.3s ease' }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ ...styles.alert('error'), maxWidth: '1400px', margin: '0 auto 24px' }}>
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <div style={styles.emptyText}>No service requests found</div>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            {searchQuery ? 'Try adjusting your search criteria' : 'No requests available at this time'}
          </p>
        </div>
      ) : (
        <>
          <div style={styles.requestsList}>
            {filteredRequests.map(request => {
              const service = serviceTypes[request.serviceType];
              const status = statusConfig[request.status];
              const progress = getProgressPercentage(request.status);

              return (
                <div
                  key={request._id}
                  style={styles.requestCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 51, 102, 0.15)';
                    e.currentTarget.style.borderColor = status.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 51, 102, 0.08)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={styles.adminBadge}>ADMIN</div>
                  
                  <div style={styles.cardHeader}>
                    <div style={styles.serviceIcon(service?.color || '#6B7280')}>
                      {service?.icon || '🔧'}
                    </div>
                    <div style={styles.statusBadge(request.status)}>
                      {React.createElement(status.icon, { size: 14 })}
                      {status.label}
                    </div>
                  </div>

                  <div style={styles.userInfo}>
                    <strong>👤 User:</strong> {request.createdBy?.mobileNumber || 'Unknown'} ({request.userRole})
                    <br />
                    <strong>📧 Email:</strong> {request.createdBy?.email || 'N/A'}
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.serviceLabel}>
                      {service?.label || 'Unknown'} Service
                    </div>
                    <div style={styles.infoRow}>
                      <Home size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: '1.4' }}>{request.address}</span>
                    </div>
                    {request.propertyId && (
                      <div style={styles.infoRow}>
                        <Building size={16} style={{ flexShrink: 0 }} />
                        <span>{request.propertyId.title || 'Property'} ({request.propertyType})</span>
                      </div>
                    )}
                    <div style={styles.infoRow}>
                      <Calendar size={16} style={{ flexShrink: 0 }} />
                      <span>Requested: {formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  <div style={styles.progressBar}>
                    <div style={styles.progressFill(progress, status.color)} />
                  </div>

                  <div style={styles.actionButtons}>
                    <button
                      style={styles.actionButton('#00A79D')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(request);
                        setIsEditing(false);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00A79D';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#00A79D';
                      }}
                    >
                      View Details
                      <ChevronRight size={16} />
                    </button>
                    <button
                      style={styles.actionButton('#F59E0B')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRequest(request);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F59E0B';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#F59E0B';
                      }}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageButton(false)}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#F4F7F9')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#FFFFFF')}
              >
                Previous
              </button>
              <span style={{ padding: '10px 16px', color: '#4A6A8A', fontWeight: '600' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                style={styles.pageButton(false)}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#F4F7F9')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#FFFFFF')}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedRequest && (
        <div style={styles.modal} onClick={() => { setSelectedRequest(null); setIsEditing(false); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader(selectedRequest.status)}>
              <h2 style={styles.modalTitle}>
                {serviceTypes[selectedRequest.serviceType]?.icon} {serviceTypes[selectedRequest.serviceType]?.label} Service
              </h2>
              <button
                style={styles.closeButton}
                onClick={() => { setSelectedRequest(null); setIsEditing(false); }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {success && (
                <div style={styles.alert('success')}>
                  <CheckCircle size={24} />
                  <span>{success}</span>
                </div>
              )}

              {error && (
                <div style={styles.alert('error')}>
                  <AlertCircle size={24} />
                  <span>{error}</span>
                </div>
              )}

              {isEditing ? (
                <>
                  <div style={styles.detailsSection}>
                    <div style={styles.sectionTitle}>✏️ Edit Service Request</div>
                    
                    <div style={styles.formGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          <User size={16} />
                          User Role *
                        </label>
                        <select
                          style={styles.select}
                          value={editData.userRole}
                          onChange={(e) => setEditData({ ...editData, userRole: e.target.value })}
                          onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        >
                          <option value="owner">Owner</option>
                          <option value="renter">Renter</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          <Wrench size={16} />
                          Service Type *
                        </label>
                        <select
                          style={styles.select}
                          value={editData.serviceType}
                          onChange={(e) => setEditData({ ...editData, serviceType: e.target.value })}
                          onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        >
                          {Object.entries(serviceTypes).map(([key, service]) => (
                            <option key={key} value={key}>{service.label}</option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          <Clock size={16} />
                          Status *
                        </label>
                        <select
                          style={styles.select}
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        >
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          <Phone size={16} />
                          Contact Number *
                        </label>
                        <input
                          style={styles.input}
                          type="tel"
                          value={editData.contactNumber}
                          onChange={(e) => setEditData({ ...editData, contactNumber: e.target.value })}
                          onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                      </div>

                      {editData.userRole === 'owner' && (
                        <>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>
                              <Building size={16} />
                              Property Type
                            </label>
                            <select
                              style={styles.select}
                              value={editData.propertyType}
                              onChange={(e) => setEditData({ ...editData, propertyType: e.target.value })}
                              onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            >
                              <option value="">Select Type</option>
                              <option value="RentalProperty">Rental Property</option>
                              <option value="SaleProperty">Sale Property</option>
                            </select>
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.label}>
                              <Building size={16} />
                              Property ID
                            </label>
                            <input
                              style={{ ...styles.input, backgroundColor: '#F9FAFB', cursor: 'not-allowed' }}
                              type="text"
                              value={editData.propertyId}
                              readOnly
                              placeholder="Property ObjectId (fixed)"
                            />
                          </div>
                        </>
                      )}

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          <Calendar size={16} />
                          Preferred Date
                        </label>
                        <input
                          style={styles.input}
                          type="datetime-local"
                          value={editData.preferredDate}
                          onChange={(e) => setEditData({ ...editData, preferredDate: e.target.value })}
                          onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        <Home size={16} />
                        Address *
                      </label>
                      <input
                        style={styles.input}
                        type="text"
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        <FileText size={16} />
                        Notes
                      </label>
                      <textarea
                        style={styles.textarea}
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        placeholder="Add any additional notes or instructions..."
                        onFocus={(e) => e.target.style.borderColor = '#00A79D'}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                      />
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    <button
                      style={styles.button('primary')}
                      onClick={handleSaveEdit}
                      disabled={saving}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#008C82')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#00A79D')}
                    >
                      <Save size={20} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      style={styles.button('secondary')}
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#F4F7F9')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.background = 'transparent')}
                    >
                      <XCircle size={20} />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.detailsSection}>
                    <div style={styles.sectionTitle}>👤 User Information</div>
                    <div style={styles.detailItem}>
                      <User size={18} style={styles.detailIcon} />
                      <div style={styles.detailText}>
                        <strong>Name:</strong> {selectedRequest.createdBy?.name || 'Unknown'}
                        <br />
                        <strong>Email:</strong> {selectedRequest.createdBy?.email || 'N/A'}
                        <br />
                        <strong>Phone:</strong> {selectedRequest.createdBy?.mobileNumber || 'N/A'}
                        <br />
                        <strong>Role:</strong> <span style={{ 
                          textTransform: 'capitalize', 
                          fontWeight: '600',
                          color: selectedRequest.userRole === 'owner' ? '#00A79D' : '#8B5CF6'
                        }}>{selectedRequest.userRole}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.detailsSection}>
                    <div style={styles.sectionTitle}>📍 Service Details</div>
                    <div style={styles.detailItem}>
                      <Home size={18} style={styles.detailIcon} />
                      <div style={styles.detailText}>
                        <strong>Address:</strong><br />
                        {selectedRequest.address}
                      </div>
                    </div>
                    {selectedRequest.propertyId && (
                      <div style={styles.detailItem}>
                        <Building size={18} style={styles.detailIcon} />
                        <div style={styles.detailText}>
                          <strong>Property:</strong> {selectedRequest.propertyId.title || 'Unnamed Property'}
                          <br />
                          <strong>Type:</strong> {selectedRequest.propertyType}
                          {selectedRequest.propertyId.Sector && (
                            <>
                              <br />
                              <strong>Sector:</strong> {selectedRequest.propertyId.Sector}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={styles.detailItem}>
                      <Phone size={18} style={styles.detailIcon} />
                      <div style={styles.detailText}>
                        <strong>Contact:</strong> {selectedRequest.contactNumber}
                      </div>
                    </div>
                    {selectedRequest.preferredDate && (
                      <div style={styles.detailItem}>
                        <Calendar size={18} style={styles.detailIcon} />
                        <div style={styles.detailText}>
                          <strong>Preferred Date:</strong> {formatDate(selectedRequest.preferredDate)}
                        </div>
                      </div>
                    )}
                    {selectedRequest.notes && (
                      <div style={styles.detailItem}>
                        <FileText size={18} style={styles.detailIcon} />
                        <div style={styles.detailText}>
                          <strong>Notes:</strong><br />
                          {selectedRequest.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRequest.timeline && selectedRequest.timeline.length > 0 && (
                    <div style={styles.detailsSection}>
                      <div style={styles.sectionTitle}>📊 Request Timeline</div>
                      <div style={styles.timeline}>
                        {selectedRequest.timeline.map((item, index) => {
                          const isActive = index <= selectedRequest.timeline.length - 1;
                          const config = statusConfig[item.status] || statusConfig.pending;
                          const StatusIcon = config.icon;

                          return (
                            <div key={index} style={styles.timelineItem(isActive)}>
                              {index < selectedRequest.timeline.length - 1 && (
                                <div style={styles.timelineLine} />
                              )}
                              <div style={styles.timelineDot(config.color, isActive)}>
                                {isActive && <StatusIcon size={12} color="#FFFFFF" />}
                              </div>
                              <div style={styles.timelineContent}>
                                <div style={styles.timelineStatus}>{config.label}</div>
                                <div style={styles.timelineDate}>{formatDate(item.date)}</div>
                                <div style={styles.timelineDescription}>{item.description}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '16px',
                    background: statusConfig[selectedRequest.status].bgColor,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${statusConfig[selectedRequest.status].color}`
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#003366', marginBottom: '4px' }}>
                      Current Status
                    </div>
                    <div style={{ fontSize: '14px', color: '#4A6A8A' }}>
                      {statusConfig[selectedRequest.status].description}
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    <button
                      style={styles.button('primary')}
                      onClick={() => handleEditRequest(selectedRequest)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#008C82'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#00A79D'}
                    >
                      <Edit size={20} />
                      Edit Request
                    </button>
                    <button
                      style={styles.button('secondary')}
                      onClick={() => { setSelectedRequest(null); setIsEditing(false); }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F4F7F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceTracking;