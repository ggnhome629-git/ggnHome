import React, { useState, useEffect } from 'react';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { Search, Phone, Mail, User, Calendar, TrendingUp, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useNavigate } from 'react-router-dom';


const CallbackRequestsDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);

  // Filter states
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCallbackRequests();
  }, [status, dateRange, sortBy, order, page]);

  const fetchCallbackRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (status) queryParams.append('status', status);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (dateRange) queryParams.append('dateRange', dateRange);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (order) queryParams.append('order', order);
      queryParams.append('page', page);
      queryParams.append('limit', limit);

      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        process.env.REACT_APP_ADMIN_CALLBACK_REQUESTS_API + '?' + queryParams,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch callback requests');
      }

      const data = await response.json();
      setRequests(data.data || []);
      setMetadata(data.metadata || null);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching callback requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Reset to first page and let the effect fetch results
    setPage(1);
  };

  const toggleRequestExpansion = (id) => {
    setExpandedRequest(expandedRequest === id ? null : id);
  };
  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'resolved':
        return '#4CAF50';
      case 'in-progress':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)',
      padding: '30px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      maxWidth: '1600px',
      margin: '0 auto 30px',
      textAlign: 'center'
    },
    title: {
      fontSize: '40px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '10px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
    },
    subtitle: {
      fontSize: '16px',
      color: '#4A6A8A',
      fontWeight: '400'
    },
    statsContainer: {
      maxWidth: '1600px',
      margin: '0 auto 30px',
      marginBottom: '40px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px'
    },
    statCard: {
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 51, 102, 0.1)',
      textAlign: 'center',
      border: '2px solid transparent',
      transition: 'all 0.3s ease'
    },
    statCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 20px rgba(0, 51, 102, 0.15)',
      borderColor: '#22D3EE'
    },
    statValue: {
      fontSize: '36px',
      fontWeight: '700',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#4A6A8A',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    filtersContainer: {
      maxWidth: '1600px',
      margin: '0 auto 30px',
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 51, 102, 0.1)'
    },
    filtersTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#4A6A8A',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: '2px solid #E0E7EE',
      fontSize: '14px',
      fontWeight: '500',
      color: '#333333',
      transition: 'all 0.3s ease',
      outline: 'none',
      background: '#F4F7F9'
    },
    select: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: '2px solid #E0E7EE',
      fontSize: '14px',
      fontWeight: '500',
      color: '#333333',
      transition: 'all 0.3s ease',
      outline: 'none',
      background: '#F4F7F9',
      cursor: 'pointer'
    },
    searchContainer: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-end'
    },
    searchButton: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(0, 167, 157, 0.3)'
    },
    refreshButton: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: '2px solid #003366',
      background: 'transparent',
      color: '#003366',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    requestsContainer: {
      maxWidth: '1600px',
      margin: '0 auto'
    },
    requestCard: {
      background: '#FFFFFF',
      borderRadius: '12px',
      marginBottom: '16px',
      boxShadow: '0 4px 12px rgba(0, 51, 102, 0.1)',
      overflow: 'hidden',
      border: '2px solid transparent',
      transition: 'all 0.3s ease'
    },
    requestCardActive: {
      borderColor: '#22D3EE',
      boxShadow: '0 6px 20px rgba(34, 211, 238, 0.2)'
    },
    requestHeader: {
      padding: '20px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)',
      borderBottom: '1px solid #E0E7EE'
    },
    requestHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1
    },
    requestAvatar: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      fontSize: '20px',
      fontWeight: '700'
    },
    requestInfo: {
      flex: 1
    },
    requestName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '4px'
    },
    requestPhone: {
      fontSize: '14px',
      color: '#4A6A8A',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    statusBadge: {
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    expandButton: {
      background: 'transparent',
      border: 'none',
      color: '#003366',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      transition: 'all 0.3s ease'
    },
    requestDetails: {
      padding: '0',
      maxHeight: '0',
      overflow: 'hidden',
      transition: 'all 0.4s ease'
    },
    requestDetailsExpanded: {
      maxHeight: '1000px',
      padding: '24px'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px'
    },
    detailItem: {
      background: '#F4F7F9',
      padding: '16px',
      borderRadius: '10px',
      border: '1px solid #E0E7EE'
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#4A6A8A',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    detailValue: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#333333',
      wordBreak: 'break-word'
    },
    issueSection: {
      marginTop: '16px',
      padding: '16px',
      background: '#FFF9E6',
      borderRadius: '10px',
      border: '2px solid #FFE082'
    },
    issueLabel: {
      fontSize: '13px',
      fontWeight: '700',
      color: '#F57C00',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    issueText: {
      fontSize: '15px',
      color: '#333333',
      lineHeight: '1.6'
    },
    pagination: {
      maxWidth: '1600px',
      margin: '30px auto',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px'
    },
    paginationButton: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: '2px solid #003366',
      background: '#FFFFFF',
      color: '#003366',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    paginationButtonActive: {
      background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
      color: '#FFFFFF',
      borderColor: '#003366'
    },
    paginationInfo: {
      fontSize: '14px',
      color: '#4A6A8A',
      fontWeight: '500'
    },
    loading: {
      textAlign: 'center',
      fontSize: '18px',
      color: '#4A6A8A',
      padding: '100px 20px'
    },
    error: {
      textAlign: 'center',
      fontSize: '16px',
      color: '#DC2626',
      padding: '50px 20px',
      background: '#FEE2E2',
      borderRadius: '12px',
      maxWidth: '600px',
      margin: '50px auto'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
      color: '#4A6A8A',
      fontSize: '16px'
    },
    trendChart: {
      maxWidth: '1600px',
      margin: '30px auto',
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 51, 102, 0.1)'
    },
    trendTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          Loading callback requests...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <strong>Error:</strong> {error}
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
          marginBottom: "20px",
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
      <div style={{ height: 72 }} />

      {/* Statistics */}
      {metadata && (
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#003366' }}>
              {metadata.totalRequests || 0}
            </div>
            <div style={styles.statLabel}>Total Requests</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#FF9800' }}>
              {metadata.pendingCount || 0}
            </div>
            <div style={styles.statLabel}>Pending</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#2196F3' }}>
              {metadata.inProgressCount || 0}
            </div>
            <div style={styles.statLabel}>In Progress</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#4CAF50' }}>
              {metadata.resolvedCount || 0}
            </div>
            <div style={styles.statLabel}>Resolved</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <h3 style={styles.filtersTitle}>
          <Filter size={20} />
          Filters & Search
        </h3>
        <div style={styles.filtersGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Sort By</label>
            <select
              style={styles.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Order</label>
            <select
              style={styles.select}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        <div style={styles.searchContainer}>
          <div style={{ ...styles.inputGroup, flex: 1 }}>
            <label style={styles.label}>Search</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Search by name, phone, email, or issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button style={styles.searchButton} onClick={handleSearch}>
            <Search size={18} />
            Search
          </button>
          <button style={styles.refreshButton} onClick={() => fetchCallbackRequests()}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Requests List */}
      <StaggerContainer style={styles.requestsContainer}>
        {requests.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📞</div>
            <p>No callback requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <StaggerItem
              key={request._id}
              style={{
                ...styles.requestCard,
                ...(expandedRequest === request._id ? styles.requestCardActive : {})
              }}
            >
              <div
                style={styles.requestHeader}
                onClick={() => toggleRequestExpansion(request._id)}
              >
                <div style={styles.requestHeaderLeft}>
                  <div style={styles.requestAvatar}>
                    {request.name ? request.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={styles.requestInfo}>
                    <div style={styles.requestName}>{request.name || 'Unknown'}</div>
                     {/* Role badge */}
    <div style={{
      padding: '6px 10px',
      borderRadius: 12,
      background: '#E6F0FF',
      color: '#003366',
      fontWeight: 700,
      fontSize: 12,
      textTransform: 'capitalize'
    }}>
      {request.userRole ? request.userRole : 'Unknown'}
    </div>
                    <div style={styles.requestPhone}>
                      <Phone size={14} />
                      {request.phone || 'No phone'}
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: getStatusColor(request.status)
                    }}
                  >
                    {request.status || 'pending'}
                  </span>
                </div>
                <button style={styles.expandButton}>
                  {expandedRequest === request._id ? (
                    <ChevronUp size={24} />
                  ) : (
                    <ChevronDown size={24} />
                  )}
                </button>
              </div>

              <div
                style={{
                  ...styles.requestDetails,
                  ...(expandedRequest === request._id ? styles.requestDetailsExpanded : {})
                }}
              >
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>
                      <User size={14} />
                      Full Name
                    </div>
                    <div style={styles.detailValue}>{request.name || 'N/A'}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>
                      <Phone size={14} />
                      Phone Number
                    </div>
                    <div style={styles.detailValue}>{request.phone || 'N/A'}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>
                      <Mail size={14} />
                      Email Address
                    </div>
                    <div style={styles.detailValue}>{request.email || 'N/A'}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>
                      <Calendar size={14} />
                      Created At
                    </div>
                    <div style={styles.detailValue}>{formatDate(request.createdAt)}</div>
                  </div>
                  {request.updatedAt && (
                    <div style={styles.detailItem}>
                      <div style={styles.detailLabel}>
                        <Calendar size={14} />
                        Last Updated
                      </div>
                      <div style={styles.detailValue}>{formatDate(request.updatedAt)}</div>
                    </div>
                  )}
                </div>

                {request.issue && (
                  <div style={styles.issueSection}>
                    <div style={styles.issueLabel}>Issue / Message</div>
                    <div style={styles.issueText}>{request.issue}</div>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))
        )}
      </StaggerContainer>

      {/* Pagination */}
      {metadata && metadata.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.paginationButton, ...(page === 1 ? {} : {}) }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span style={styles.paginationInfo}>
            Page {metadata.page} of {metadata.totalPages}
          </span>
          <button
            style={styles.paginationButton}
            onClick={() => setPage((p) => Math.min(metadata.totalPages, p + 1))}
            disabled={page === metadata.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CallbackRequestsDashboard;