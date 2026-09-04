import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, Clock, CheckCircle, AlertCircle, Home, Phone, Calendar, 
  FileText, Wrench, X, ChevronRight, Filter, Search, Download, 
  Edit, MessageCircle, Star, User, MoreVertical, Trash2, Sparkles, 
  MapPin, Shield, Zap, Truck, Eye, MessageSquare, ArrowUpDown,
  ChevronLeft, ChevronRight as ChevronRightIcon, Plus
} from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Footer from '../Dashboard/Footer';

// Design tokens
const DESIGN_TOKENS = {
  colors: {
    primary: '#003366',
    secondary: '#4A6A8A',
    accent: '#00A79D',
    cyan: '#22D3EE',
    background: '#F4F7F9',
    white: '#FFFFFF',
    charcoal: '#333333',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: {
      50: '#F9FAFB',
      100: '#F4F7F9',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 51, 102, 0.1)',
    md: '0 4px 12px rgba(0, 51, 102, 0.08)',
    lg: '0 8px 24px rgba(0, 51, 102, 0.06)',
    xl: '0 16px 48px rgba(0, 51, 102, 0.04)'
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
      '4xl': '36px'
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  }
};

const ServiceTrackingSystem = () => {
  // Hybrid auth: use accessToken from localStorage for Authorization header (in addition to cookies)
  const userToken = localStorage.getItem("accessToken");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
   const { user } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [favorites, setFavorites] = useState(new Set());
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  // Service types with Lucide icons
  const serviceTypes = {
    cleaning: { icon: Sparkles, label: 'Cleaning', color: DESIGN_TOKENS.colors.accent },
    painting: { icon: Edit, label: 'Painting', color: '#8B5CF6' },
    termite: { icon: Shield, label: 'Termite Control', color: DESIGN_TOKENS.colors.error },
    plumbing: { icon: Wrench, label: 'Plumbing', color: '#2563EB' },
    acService: { icon: Zap, label: 'AC Service', color: '#06B6D4' },
    carpenter: { icon: Package, label: 'Carpenter', color: '#D97706' },
    electrical: { icon: Zap, label: 'Electrical', color: DESIGN_TOKENS.colors.warning },
    moving: { icon: Truck, label: 'Moving', color: DESIGN_TOKENS.colors.success },
    pestControl: { icon: Shield, label: 'Pest Control', color: '#EF4444' },
    other: { icon: Wrench, label: 'Other', color: DESIGN_TOKENS.colors.gray[500] }
  };

  const statusConfig = {
    pending: { 
      icon: Clock, 
      label: 'Pending', 
      color: DESIGN_TOKENS.colors.warning,
      bgColor: '#FEF3C7',
      description: 'Request received, awaiting assignment'
    },
    'in-progress': { 
      icon: Package, 
      label: 'In Progress', 
      color: DESIGN_TOKENS.colors.accent,
      bgColor: '#CCFBF1',
      description: 'Service provider is working on your request'
    },
    completed: { 
      icon: CheckCircle, 
      label: 'Completed', 
      color: DESIGN_TOKENS.colors.success,
      bgColor: '#D1FAE5',
      description: 'Service completed successfully'
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  // Load user & requests from API
  const loadUser = async () => {
    try {
      const res = await fetch(process.env.REACT_APP_USER_ME_API, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(Boolean(data?.role === 'admin' || data?.isAdmin));
      }
    } catch (e) {
      // ignore user load failure
    }
  };

  const loadRequests = async (nextPage = 1, options = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', String(limit));
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (options.serviceType) params.set('serviceType', options.serviceType);

      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/services?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load service requests');
      const data = await res.json();
      setRequests(Array.isArray(data.items) ? data.items : []);
      setTotalPages(Number(data.totalPages || 1));
      setPage(Number(data.page || nextPage));
    } catch (e) {
      setRequests([]);
      showToast('Failed to load service requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser().finally(() => loadRequests(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filterStatus changes
  useEffect(() => {
    loadRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  // Client-side filtering and sorting
  const filteredRequests = useMemo(() => {
    let filtered = (requests || []).filter(req => {
      const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
      const matchesSearch = req.address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           serviceTypes[req.serviceType]?.label.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    // Client-side sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, filterStatus, debouncedSearch, sortBy]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getProgressPercentage = (status) => {
    switch(status) {
      case 'pending': return 33;
      case 'in-progress': return 66;
      case 'completed': return 100;
      default: return 0;
    }
  };

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Optimistic status update
  const updateRequestStatus = async (requestId, newStatus) => {
    const previousRequests = [...requests];
    
    // Optimistic update
    setRequests(prev => prev.map(req => 
      req._id === requestId ? { ...req, status: newStatus } : req
    ));

    try {
      const statusToSend = newStatus;
      const base = `${process.env.REACT_APP_Base_API}`;
      const url = isAdmin
        ? `${base}/api/admin/services/${requestId}/status`
        : `${base}/api/services/${requestId}/status`;
      
      const res = await fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ status: statusToSend }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      showToast('Status updated successfully', 'success');
      if (selectedRequest && selectedRequest._id === requestId) {
        setSelectedRequest(prev => prev ? { 
          ...prev, 
          status: statusToSend, 
          timeline: [...(prev.timeline || []), { 
            status: statusToSend, 
            date: new Date().toISOString(), 
            description: 'Status updated' 
          }] 
        } : prev);
      }
    } catch (err) {
      // Revert on error
      setRequests(previousRequests);
      showToast('Failed to update status', 'error');
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Service Type', 'Address', 'Status', 'Contact', 'Requested Date', 'Preferred Date'];
    const csvData = filteredRequests.map(req => [
      serviceTypes[req.serviceType]?.label,
      req.address,
      statusConfig[req.status]?.label,
      req.contactNumber,
      formatDate(req.createdAt),
      req.preferredDate ? formatDate(req.preferredDate) : 'Not specified'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-requests-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    showToast('CSV exported successfully', 'success');
  };

  return (
    <div className="service-tracking-app">
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 999 }}>
          <TopNavigationBar  navItems={navItems} />
        </div>
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="app-container">
        {/* Header */}
        <div className="app-header">
          <div className="header-content">
            <div className="header-text">
              <Package className="header-icon" />
              <div>
                <h1 className="page-title">Service Requests</h1>
                <p className="page-subtitle">Monitor the status of all your service requests in real-time</p>
              </div>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-number">{filteredRequests.length}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {filteredRequests.filter(r => r.status === 'pending').length}
                </span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="search-controls">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search by address or service type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="control-group">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="control-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="status">By Status</option>
              </select>

              <button 
                onClick={exportToCSV}
                className="control-button secondary"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="quick-filters">
            <div className="filter-chips">
              <button
                className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All Requests
                <span className="chip-count">{requests.length}</span>
              </button>
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    className={`filter-chip ${filterStatus === key ? 'active' : ''}`}
                    onClick={() => setFilterStatus(key)}
                  >
                    <Icon size={14} />
                    {config.label}
                    <span className="chip-count">
                      {requests.filter(r => r.status === key).length}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="view-controls">
              <button 
                className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                Grid
              </button>
              <button 
                className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="skeleton-container">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton-icon"></div>
                  <div className="skeleton-badge"></div>
                </div>
                <div className="skeleton-content">
                  <div className="skeleton-line skeleton-title"></div>
                  <div className="skeleton-line skeleton-text"></div>
                  <div className="skeleton-line skeleton-text"></div>
                </div>
                <div className="skeleton-footer">
                  <div className="skeleton-progress"></div>
                  <div className="skeleton-button"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Requests Grid/List */}
        {!loading && filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Package size={64} />
            </div>
            <h3>No service requests found</h3>
            <p>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search criteria or filters' 
                : 'Create your first service request to get started'
              }
            </p>
            <button className="primary-button" onClick={() => navigate('/servicesCreate')}>
              <Plus size={16} />
              Create Service Request
            </button>
          </div>
        ) : (
          !loading && (
            <div className={`requests-container ${viewMode}`}>
              {filteredRequests.map(request => {
                const service = serviceTypes[request.serviceType];
                const status = statusConfig[request.status];
                const ServiceIcon = service.icon;
                const StatusIcon = status.icon;
                const progress = getProgressPercentage(request.status);

                return (
                  <div 
                    key={request._id}
                    className="request-card"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="card-header">
                      <div className="service-badge">
                        <ServiceIcon size={18} />
                        <span>{service.label}</span>
                      </div>
                      <div className="card-actions">
                        <button 
                          className={`favorite-btn ${favorites.has(request._id) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavorites(prev => {
                              const newFavorites = new Set(prev);
                              if (newFavorites.has(request._id)) {
                                newFavorites.delete(request._id);
                              } else {
                                newFavorites.add(request._id);
                              }
                              return newFavorites;
                            });
                          }}
                        >
                          <Star size={16} fill={favorites.has(request._id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>

                    <div className="card-content">
                      <h3 className="request-title">{service.label} Service</h3>
                      
                      <div className="info-row">
                        <MapPin size={16} />
                        <span className="truncate">{request.address}</span>
                      </div>
                      
                      <div className="info-row">
                        <Calendar size={16} />
                        <span title={formatDate(request.createdAt)}>
                          {getRelativeTime(request.createdAt)}
                        </span>
                      </div>

                      {request.preferredDate && (
                        <div className="info-row">
                          <Clock size={16} />
                          <span>Preferred: {formatDate(request.preferredDate)}</span>
                        </div>
                      )}

                      {request.notes && (
                        <div className="info-row">
                          <FileText size={16} />
                          <span className="truncate">{request.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-footer">
                      <div className={`status-badge status-${request.status}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </div>
                      
                      <div className="progress-indicator">
                        <div 
                          className="progress-bar"
                          style={{ 
                            width: `${progress}%`,
                            backgroundColor: status.color
                          }}
                        />
                      </div>
                    </div>

                    <button className="view-details-btn">
                      View Details
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-button"
              onClick={() => page > 1 && loadRequests(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`page-button ${page === pageNum ? 'active' : ''}`}
                    onClick={() => loadRequests(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              className="pagination-button"
              onClick={() => page < totalPages && loadRequests(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRightIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={updateRequestStatus}
          serviceTypes={serviceTypes}
          statusConfig={statusConfig}
          formatDate={formatDate}
          isAdmin={isAdmin}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          statusUpdating={statusUpdating}
          updateError={updateError}
          updateSuccess={updateSuccess}
        />
      )}

      <Footer isMobile={isMobile} user={user} />

      <style jsx>{`
        .service-tracking-app {
          min-height: 100vh;
          background: ${DESIGN_TOKENS.colors.background};
          font-family: ${DESIGN_TOKENS.typography.fontFamily};
          padding-top: 80px;
        }

        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: ${DESIGN_TOKENS.spacing.xl};
        }

        /* Header */
        .app-header {
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.xl};
          box-shadow: ${DESIGN_TOKENS.shadows.md};
          margin-bottom: ${DESIGN_TOKENS.spacing.xl};
          overflow: hidden;
        }

        .header-content {
          background: linear-gradient(135deg, ${DESIGN_TOKENS.colors.primary} 0%, ${DESIGN_TOKENS.colors.secondary} 100%);
          color: ${DESIGN_TOKENS.colors.white};
          padding: ${DESIGN_TOKENS.spacing.xxl};
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: ${DESIGN_TOKENS.spacing.lg};
        }

        .header-text {
          display: flex;
          align-items: flex-start;
          gap: ${DESIGN_TOKENS.spacing.lg};
          flex: 1;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: ${DESIGN_TOKENS.typography.sizes['3xl']};
          font-weight: ${DESIGN_TOKENS.typography.weights.bold};
          margin: 0 0 ${DESIGN_TOKENS.spacing.sm} 0;
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: ${DESIGN_TOKENS.typography.sizes.lg};
          opacity: 0.9;
          margin: 0;
          font-weight: ${DESIGN_TOKENS.typography.weights.normal};
        }

        .header-stats {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.lg};
        }

        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.15);
          padding: ${DESIGN_TOKENS.spacing.lg};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          backdrop-filter: blur(10px);
          min-width: 100px;
        }

        .stat-number {
          display: block;
          font-size: ${DESIGN_TOKENS.typography.sizes['2xl']};
          font-weight: ${DESIGN_TOKENS.typography.weights.bold};
          line-height: 1;
          margin-bottom: ${DESIGN_TOKENS.spacing.xs};
        }

        .stat-label {
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          opacity: 0.9;
        }

        /* Controls */
        .controls-section {
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          box-shadow: ${DESIGN_TOKENS.shadows.sm};
          padding: ${DESIGN_TOKENS.spacing.lg};
          margin-bottom: ${DESIGN_TOKENS.spacing.xl};
        }

        .search-controls {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.lg};
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: ${DESIGN_TOKENS.spacing.lg};
        }

        .search-box {
          flex: 1;
          min-width: 300px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: ${DESIGN_TOKENS.spacing.md};
          top: 50%;
          transform: translateY(-50%);
          color: ${DESIGN_TOKENS.colors.gray[400]};
        }

        .search-input {
          width: 100%;
          padding: ${DESIGN_TOKENS.spacing.md} ${DESIGN_TOKENS.spacing.md} ${DESIGN_TOKENS.spacing.md} 44px;
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.base};
          transition: all 0.2s ease;
          background: ${DESIGN_TOKENS.colors.white};
        }

        .search-input:focus {
          outline: none;
          border-color: ${DESIGN_TOKENS.colors.accent};
          box-shadow: 0 0 0 3px ${DESIGN_TOKENS.colors.accent}20;
        }

        .control-group {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.md};
          align-items: center;
          flex-wrap: wrap;
        }

        .control-select {
          padding: ${DESIGN_TOKENS.spacing.md};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          background: ${DESIGN_TOKENS.colors.white};
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .control-select:focus {
          outline: none;
          border-color: ${DESIGN_TOKENS.colors.accent};
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.md} ${DESIGN_TOKENS.spacing.lg};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          background: ${DESIGN_TOKENS.colors.white};
          color: ${DESIGN_TOKENS.colors.charcoal};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-button:hover {
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.accent};
        }

        .control-button.secondary {
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.accent};
        }

        .control-button.secondary:hover {
          background: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
        }

        /* Quick Filters */
        .quick-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: ${DESIGN_TOKENS.spacing.md};
        }

        .filter-chips {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.sm};
          flex-wrap: wrap;
        }

        .filter-chip {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          background: ${DESIGN_TOKENS.colors.white};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-chip.active {
          background: ${DESIGN_TOKENS.colors.accent};
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
        }

        .filter-chip:hover:not(.active) {
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.accent};
        }

        .chip-count {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: ${DESIGN_TOKENS.borderRadius.sm};
          font-size: ${DESIGN_TOKENS.typography.sizes.xs};
          font-weight: ${DESIGN_TOKENS.typography.weights.bold};
        }

        .filter-chip.active .chip-count {
          background: rgba(255, 255, 255, 0.3);
        }

        .view-controls {
          display: flex;
          background: ${DESIGN_TOKENS.colors.gray[100]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          padding: ${DESIGN_TOKENS.spacing.xs};
        }

        .view-toggle {
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md};
          border: none;
          background: transparent;
          color: ${DESIGN_TOKENS.colors.gray[600]};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          cursor: pointer;
          border-radius: ${DESIGN_TOKENS.borderRadius.sm};
          transition: all 0.2s ease;
        }

        .view-toggle.active {
          background: ${DESIGN_TOKENS.colors.white};
          color: ${DESIGN_TOKENS.colors.accent};
          box-shadow: ${DESIGN_TOKENS.shadows.sm};
        }

        /* Request Cards */
        .requests-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: ${DESIGN_TOKENS.spacing.lg};
        }

        .requests-container.list {
          display: flex;
          flex-direction: column;
          gap: ${DESIGN_TOKENS.spacing.md};
        }

        .request-card {
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          box-shadow: ${DESIGN_TOKENS.shadows.sm};
          padding: ${DESIGN_TOKENS.spacing.lg};
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
        }

        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: ${DESIGN_TOKENS.shadows.lg};
          border-color: ${DESIGN_TOKENS.colors.accent}20;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .service-badge {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm};
          background: ${DESIGN_TOKENS.colors.gray[50]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          color: ${DESIGN_TOKENS.colors.gray[700]};
        }

        .card-actions {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.xs};
        }

        .favorite-btn {
          padding: ${DESIGN_TOKENS.spacing.xs};
          border: none;
          background: transparent;
          color: ${DESIGN_TOKENS.colors.gray[400]};
          cursor: pointer;
          border-radius: ${DESIGN_TOKENS.borderRadius.sm};
          transition: all 0.2s ease;
        }

        .favorite-btn.active,
        .favorite-btn:hover {
          color: ${DESIGN_TOKENS.colors.warning};
        }

        .card-content {
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .request-title {
          font-size: ${DESIGN_TOKENS.typography.sizes.lg};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.primary};
          margin: 0 0 ${DESIGN_TOKENS.spacing.md} 0;
          line-height: 1.3;
        }

        .info-row {
          display: flex;
          align-items: flex-start;
          gap: ${DESIGN_TOKENS.spacing.sm};
          margin-bottom: ${DESIGN_TOKENS.spacing.sm};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.gray[600]};
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.md};
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.xs};
          padding: ${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          font-size: ${DESIGN_TOKENS.typography.sizes.xs};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
        }

        .status-pending {
          background: ${statusConfig.pending.bgColor};
          color: ${statusConfig.pending.color};
        }

        .status-in-progress {
          background: ${statusConfig['in-progress'].bgColor};
          color: ${statusConfig['in-progress'].color};
        }

        .status-completed {
          background: ${statusConfig.completed.bgColor};
          color: ${statusConfig.completed.color};
        }

        .progress-indicator {
          flex: 1;
          max-width: 100px;
          height: 4px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.5s ease;
          border-radius: 2px;
        }

        .view-details-btn {
          width: 100%;
          padding: ${DESIGN_TOKENS.spacing.sm};
          background: transparent;
          border: 2px solid ${DESIGN_TOKENS.colors.accent};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          color: ${DESIGN_TOKENS.colors.accent};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: ${DESIGN_TOKENS.spacing.xxl};
          color: ${DESIGN_TOKENS.colors.gray[500]};
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.xl};
          box-shadow: ${DESIGN_TOKENS.shadows.sm};
        }

        .empty-icon {
          margin-bottom: ${DESIGN_TOKENS.spacing.lg};
          color: ${DESIGN_TOKENS.colors.gray[300]};
        }

        .empty-state h3 {
          font-size: ${DESIGN_TOKENS.typography.sizes.xl};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          margin: 0 0 ${DESIGN_TOKENS.spacing.sm} 0;
        }

        .empty-state p {
          margin: 0 0 ${DESIGN_TOKENS.spacing.lg} 0;
          font-size: ${DESIGN_TOKENS.typography.sizes.base};
          color: ${DESIGN_TOKENS.colors.gray[500]};
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.md} ${DESIGN_TOKENS.spacing.lg};
          background: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
          border: none;
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.base};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .primary-button:hover {
          background: #00857a;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.md};
          margin-top: ${DESIGN_TOKENS.spacing.xl};
          flex-wrap: wrap;
        }

        .pagination-button {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          background: ${DESIGN_TOKENS.colors.white};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-button:hover:not(:disabled) {
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.accent};
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-numbers {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.xs};
        }

        .page-button {
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          background: ${DESIGN_TOKENS.colors.white};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .page-button.active {
          background: ${DESIGN_TOKENS.colors.accent};
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
        }

        .page-button:hover:not(.active) {
          border-color: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.accent};
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 100px;
          right: ${DESIGN_TOKENS.spacing.xl};
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.sm};
          padding: ${DESIGN_TOKENS.spacing.md} ${DESIGN_TOKENS.spacing.lg};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.medium};
          z-index: 1000;
          animation: slideIn 0.3s ease;
          box-shadow: ${DESIGN_TOKENS.shadows.lg};
        }

        .toast-success {
          background: ${DESIGN_TOKENS.colors.success};
          color: ${DESIGN_TOKENS.colors.white};
        }

        .toast-error {
          background: ${DESIGN_TOKENS.colors.error};
          color: ${DESIGN_TOKENS.colors.white};
        }

        /* Skeleton Loader */
        .skeleton-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: ${DESIGN_TOKENS.spacing.lg};
        }

        .skeleton-card {
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          padding: ${DESIGN_TOKENS.spacing.lg};
          box-shadow: ${DESIGN_TOKENS.shadows.sm};
        }

        .skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .skeleton-icon {
          width: 40px;
          height: 40px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          animation: pulse 2s infinite;
        }

        .skeleton-badge {
          width: 80px;
          height: 24px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          animation: pulse 2s infinite;
        }

        .skeleton-content {
          display: flex;
          flex-direction: column;
          gap: ${DESIGN_TOKENS.spacing.sm};
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .skeleton-line {
          height: 16px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.sm};
          animation: pulse 2s infinite;
        }

        .skeleton-title {
          width: 70%;
          height: 20px;
        }

        .skeleton-text {
          width: 90%;
        }

        .skeleton-text:last-child {
          width: 60%;
        }

        .skeleton-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.md};
        }

        .skeleton-progress {
          flex: 1;
          height: 4px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: 2px;
          animation: pulse 2s infinite;
        }

        .skeleton-button {
          width: 100px;
          height: 32px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

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

        /* Responsive Design */
        @media (max-width: 768px) {
          .app-container {
            padding: ${DESIGN_TOKENS.spacing.md};
          }

          .header-content {
            padding: ${DESIGN_TOKENS.spacing.xl};
            flex-direction: column;
            text-align: center;
          }

          .header-text {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .header-stats {
            justify-content: center;
            width: 100%;
          }

          .search-controls {
            flex-direction: column;
          }

          .search-box {
            min-width: auto;
          }

          .control-group {
            justify-content: space-between;
            width: 100%;
          }

          .quick-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-chips {
            justify-content: center;
          }

          .view-controls {
            align-self: center;
          }

          .requests-container.grid {
            grid-template-columns: 1fr;
          }

          .pagination {
            flex-direction: column;
          }

          .page-numbers {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
};

// Enhanced Modal Component
const RequestDetailModal = ({ 
  request, 
  onClose, 
  onStatusUpdate, 
  serviceTypes, 
  statusConfig, 
  formatDate, 
  isAdmin,
  selectedStatus,
  setSelectedStatus,
  statusUpdating,
  updateError,
  updateSuccess
}) => {
  const service = serviceTypes[request.serviceType];
  const status = statusConfig[request.status];
  const ServiceIcon = service.icon;
  const StatusIcon = status.icon;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <ServiceIcon size={24} />
            <div>
              <h2 className="modal-title">{service.label} Service</h2>
              <p className="modal-subtitle">Request ID: {request._id}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3 className="section-title">Service Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <Home size={18} className="detail-icon" />
                <div className="detail-content">
                  <label>Address</label>
                  <p>{request.address}</p>
                </div>
              </div>
              <div className="detail-item">
                <Phone size={18} className="detail-icon" />
                <div className="detail-content">
                  <label>Contact Number</label>
                  <p>{request.contactNumber}</p>
                </div>
              </div>
              {request.preferredDate && (
                <div className="detail-item">
                  <Calendar size={18} className="detail-icon" />
                  <div className="detail-content">
                    <label>Preferred Date</label>
                    <p>{formatDate(request.preferredDate)}</p>
                  </div>
                </div>
              )}
              <div className="detail-item">
                <Calendar size={18} className="detail-icon" />
                <div className="detail-content">
                  <label>Requested Date</label>
                  <p>{formatDate(request.createdAt)}</p>
                </div>
              </div>
              {request.notes && (
                <div className="detail-item full-width">
                  <FileText size={18} className="detail-icon" />
                  <div className="detail-content">
                    <label>Additional Notes</label>
                    <p>{request.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">Request Timeline</h3>
            <div className="timeline">
              {(request.timeline && request.timeline.length > 0) ? (
                request.timeline.map((item, index) => {
                  const isActive = index <= request.timeline.length - 1;
                  const config = statusConfig[item.status];
                  const TimelineIcon = config.icon;

                  return (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker">
                        <div className="timeline-dot" style={{ backgroundColor: config.color }}>
                          <TimelineIcon size={12} color="#FFFFFF" />
                        </div>
                        {index < request.timeline.length - 1 && <div className="timeline-line" />}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-status">{config.label}</div>
                        <div className="timeline-date">{formatDate(item.date)}</div>
                        <div className="timeline-description">{item.description}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="timeline-empty">
                  <p>No updates recorded for this request yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="status-section">
            <div className="current-status" style={{ backgroundColor: status.bgColor, borderLeftColor: status.color }}>
              <div className="status-header">
                <StatusIcon size={20} color={status.color} />
                <div>
                  <div className="status-title">Current Status</div>
                  <div className="status-label">{status.label}</div>
                </div>
              </div>
              <p className="status-description">{status.description}</p>
            </div>

            
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: ${DESIGN_TOKENS.spacing.md};
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: ${DESIGN_TOKENS.colors.white};
          border-radius: ${DESIGN_TOKENS.borderRadius.xl};
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          box-shadow: ${DESIGN_TOKENS.shadows.xl};
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: ${DESIGN_TOKENS.spacing.xl};
          border-bottom: 1px solid ${DESIGN_TOKENS.colors.gray[200]};
        }

        .modal-title-section {
          display: flex;
          align-items: flex-start;
          gap: ${DESIGN_TOKENS.spacing.md};
        }

        .modal-title {
          margin: 0 0 ${DESIGN_TOKENS.spacing.xs} 0;
          font-size: ${DESIGN_TOKENS.typography.sizes.xl};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.primary};
        }

        .modal-subtitle {
          margin: 0;
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.gray[500]};
        }

        .modal-close {
          padding: ${DESIGN_TOKENS.spacing.sm};
          border: none;
          background: ${DESIGN_TOKENS.colors.gray[100]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          cursor: pointer;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }

        .modal-close:hover {
          background: ${DESIGN_TOKENS.colors.gray[200]};
        }

        .modal-body {
          padding: ${DESIGN_TOKENS.spacing.xl};
        }

        .detail-section {
          margin-bottom: ${DESIGN_TOKENS.spacing.xl};
        }

        .section-title {
          font-size: ${DESIGN_TOKENS.typography.sizes.lg};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.primary};
          margin: 0 0 ${DESIGN_TOKENS.spacing.lg} 0;
          padding-bottom: ${DESIGN_TOKENS.spacing.sm};
          border-bottom: 2px solid ${DESIGN_TOKENS.colors.gray[100]};
        }

        .detail-grid {
          display: flex;
          flex-direction: column;
          gap: ${DESIGN_TOKENS.spacing.md};
        }

        .detail-item {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.md};
          padding: ${DESIGN_TOKENS.spacing.md};
          background: ${DESIGN_TOKENS.colors.gray[50]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-icon {
          color: ${DESIGN_TOKENS.colors.accent};
          flex-shrink: 0;
          margin-top: 2px;
        }

        .detail-content label {
          display: block;
          font-size: ${DESIGN_TOKENS.typography.sizes.xs};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: ${DESIGN_TOKENS.spacing.xs};
        }

        .detail-content p {
          margin: 0;
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.charcoal};
          line-height: 1.5;
        }

        .timeline {
          position: relative;
        }

        .timeline-item {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.md};
          padding: ${DESIGN_TOKENS.spacing.md} 0;
        }

        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .timeline-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 2;
        }

        .timeline-line {
          flex: 1;
          width: 2px;
          background: ${DESIGN_TOKENS.colors.gray[200]};
          margin: ${DESIGN_TOKENS.spacing.xs} 0;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-status {
          font-size: ${DESIGN_TOKENS.typography.sizes.base};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.primary};
          margin-bottom: ${DESIGN_TOKENS.spacing.xs};
        }

        .timeline-date {
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.gray[500]};
          margin-bottom: ${DESIGN_TOKENS.spacing.xs};
        }

        .timeline-description {
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          line-height: 1.5;
        }

        .timeline-empty {
          text-align: center;
          padding: ${DESIGN_TOKENS.spacing.xl};
          color: ${DESIGN_TOKENS.colors.gray[500]};
          font-style: italic;
        }

        .status-section {
          display: flex;
          flex-direction: column;
          gap: ${DESIGN_TOKENS.spacing.lg};
        }

        .current-status {
          padding: ${DESIGN_TOKENS.spacing.lg};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
          border-left: 4px solid;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: ${DESIGN_TOKENS.spacing.md};
          margin-bottom: ${DESIGN_TOKENS.spacing.sm};
        }

        .status-title {
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-label {
          font-size: ${DESIGN_TOKENS.typography.sizes.lg};
          font-weight: ${DESIGN_TOKENS.typography.weights.bold};
          color: ${DESIGN_TOKENS.colors.primary};
        }

        .status-description {
          margin: 0;
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          color: ${DESIGN_TOKENS.colors.gray[600]};
          line-height: 1.5;
        }

        .status-update {
          padding: ${DESIGN_TOKENS.spacing.lg};
          background: ${DESIGN_TOKENS.colors.gray[50]};
          border-radius: ${DESIGN_TOKENS.borderRadius.lg};
        }

        .update-label {
          display: block;
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          color: ${DESIGN_TOKENS.colors.primary};
          margin-bottom: ${DESIGN_TOKENS.spacing.md};
        }

        .update-controls {
          display: flex;
          gap: ${DESIGN_TOKENS.spacing.md};
          align-items: center;
          flex-wrap: wrap;
        }

        .status-select {
          flex: 1;
          min-width: 150px;
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md};
          border: 2px solid ${DESIGN_TOKENS.colors.gray[200]};
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          background: ${DESIGN_TOKENS.colors.white};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          cursor: pointer;
        }

        .update-button {
          padding: ${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.lg};
          background: ${DESIGN_TOKENS.colors.accent};
          color: ${DESIGN_TOKENS.colors.white};
          border: none;
          border-radius: ${DESIGN_TOKENS.borderRadius.md};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          font-weight: ${DESIGN_TOKENS.typography.weights.semibold};
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .update-button:hover:not(:disabled) {
          background: #00857a;
        }

        .update-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .update-error {
          color: ${DESIGN_TOKENS.colors.error};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          margin-top: ${DESIGN_TOKENS.spacing.sm};
        }

        .update-success {
          color: ${DESIGN_TOKENS.colors.success};
          font-size: ${DESIGN_TOKENS.typography.sizes.sm};
          margin-top: ${DESIGN_TOKENS.spacing.sm};
        }

        @media (max-width: 768px) {
          .modal-content {
            margin: ${DESIGN_TOKENS.spacing.md};
          }

          .modal-header {
            padding: ${DESIGN_TOKENS.spacing.lg};
          }

          .modal-body {
            padding: ${DESIGN_TOKENS.spacing.lg};
          }

          .update-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .status-select {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default ServiceTrackingSystem;