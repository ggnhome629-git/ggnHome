import React, { useState, useEffect, useMemo } from 'react';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { ChevronDown, ChevronUp, Search, User, Mail, Phone, MapPin, Briefcase, Star, Calendar } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showIdModal, setShowIdModal] = useState(false);
  const [activeIdProof, setActiveIdProof] = useState(null);
  const [viewedLeads, setViewedLeads] = useState({});
  const [loadingViewedLeads, setLoadingViewedLeads] = useState(false);

  const isMobile = useMemo(() => window.innerWidth <= 640, []);

  // Fetch viewed client leads for an agent (called on expand)
  const fetchViewedLeads = async (agentId) => {
    if (viewedLeads[agentId]) return;

    setLoadingViewedLeads(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API || ''}/api/admin/agentclientviewed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          credentials: 'include',
          body: JSON.stringify({ agentId })
        }
      );

      const data = await response.json();
      if (data && data.success) {
        setViewedLeads(prev => ({
          ...prev,
          [agentId]: data.leads || []
        }));
      }
    } catch (err) {
      console.error('Error fetching viewed leads:', err);
    } finally {
      setLoadingViewedLeads(false);
    }
  };

  // Fetch agents from API
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      });

            const response = await fetch(`${process.env.REACT_APP_Base_API || ''}/api/admin/agents?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        console.error('Agents API error', response.status, text);
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Agents API returned non-JSON:', text);
        throw new Error('Agents API returned non-JSON response');
      }

      const data = await response.json();
      if (data && data.success) {
        setAgents(data.agents);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [page, searchTerm, statusFilter]);

  // Toggle visibility status
  const toggleVisibility = async (agentId, currentStatus) => {
    try {
      const newStatus = currentStatus === '1' ? '0' : '1';
      
            const response = await fetch(`${process.env.REACT_APP_Base_API || ''}/api/admin/setvisibility/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        credentials: 'include',
        body: JSON.stringify({ visibilityStatus: newStatus })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        console.error('Visibility API error', response.status, text);
        throw new Error(`Failed to update visibility: ${response.status}`);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Visibility API returned non-JSON:', text);
        throw new Error('Visibility API returned non-JSON response');
      }

      const data = await response.json();
      if (data && data.success) {
        setAgents(agents.map(agent => 
          agent._id === agentId 
            ? { ...agent, visibilityStatus: newStatus }
            : agent
        ));
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  };

  // Approve agent (sets status -> 'active')
  const approveAgent = async (agentId) => {
    try {
// Approve
const response = await fetch(`${process.env.REACT_APP_Base_API || ''}/api/admin/approveagent/${agentId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  credentials: 'include'
  // body not required because agentId is in URL
});

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        console.error('Approve API error', response.status, text);
        throw new Error(`Failed to approve agent: ${response.status}`);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Approve API returned non-JSON:', text);
        throw new Error('Approve API returned non-JSON response');
      }

      const data = await response.json();
      if (data && data.success) {
        setAgents(prev => prev.map(a => a._id === agentId ? { ...a, status: 'active' } : a));
      }
    } catch (error) {
      console.error('Error approving agent:', error);
    }
  };

  // Suspend agent (sets status -> 'suspended')
  const suspendAgent = async (agentId) => {
    try {
      // Suspend
      const response = await fetch(`${process.env.REACT_APP_Base_API || ''}/api/admin/suspendagent/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        console.error('Suspend API error', response.status, text);
        throw new Error(`Failed to suspend agent: ${response.status}`);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Suspend API returned non-JSON:', text);
        throw new Error('Suspend API returned non-JSON response');
      }

      const data = await response.json();
      if (data && data.success) {
        setAgents(prev => prev.map(a => a._id === agentId ? { ...a, status: 'suspended' } : a));
      }
    } catch (error) {
      console.error('Error suspending agent:', error);
    }
  };

  // Reset agent password (admin)
  const resetAgentPassword = async (agentId) => {
    if (!window.confirm('Are you sure you want to reset this agent’s password?')) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API || ''}/api/admin/agents/${agentId}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }

      alert(`Password reset successfully.\nMobile: ${data.mobileNumber}`);
    } catch (err) {
      console.error('Reset password error:', err);
      alert(err.message || 'Error resetting password');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#F4F7F9',
      padding: isMobile ? '12px' : '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      maxWidth: '1200px',
      margin: '0 auto 32px',
      backgroundColor: '#003366',
      padding: isMobile ? '20px' : '32px',
      borderRadius: isMobile ? '12px' : '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    title: {
      color: '#FFFFFF',
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '700',
      margin: '0 0 8px 0'
    },
    subtitle: {
      color: '#22D3EE',
      fontSize: '16px',
      margin: 0
    },
    filterBar: {
      maxWidth: '1200px',
      margin: '0 auto 24px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      gap: '16px',
      flexWrap: 'wrap'
    },
    searchContainer: {
      flex: '1',
      minWidth: isMobile ? '100%' : '300px',
      position: 'relative'
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#4A6A8A'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 48px',
      border: '2px solid #E5E7EB',
      borderRadius: '12px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s',
      backgroundColor: '#FFFFFF'
    },
    select: {
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: '12px',
      fontSize: '16px',
      outline: 'none',
      backgroundColor: '#FFFFFF',
      cursor: 'pointer'
    },
    agentList: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    agentCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      border: '2px solid transparent'
    },
    agentCardExpanded: {
      borderColor: '#00A79D',
      boxShadow: '0 8px 16px rgba(0, 167, 157, 0.15)'
    },
    agentHeader: {
      padding: '20px 24px',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '20px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    avatar: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: '#003366',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      fontSize: '24px',
      fontWeight: '700',
      flexShrink: 0
    },
    avatarImage: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    agentInfo: {
      flex: 1,
      minWidth: 0
    },
    agentName: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#003366',
      margin: '0 0 4px 0'
    },
    agentMeta: {
      display: 'flex',
      gap: isMobile ? '8px' : '16px',
      flexWrap: 'wrap',
      fontSize: '14px',
      color: '#4A6A8A'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    statusActive: {
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    statusInactive: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B'
    },
    toggleContainer: {
      display: 'flex', marginTop: isMobile ? '8px' : '0',
      alignItems: 'center',
      gap: '12px'
    },
    approveButton: {
      padding: '8px 12px',
      marginLeft: '12px',
      backgroundColor: '#10B981',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '700'
    },
    suspendButton: {
      padding: '8px 12px',
      marginLeft: '8px',
      backgroundColor: '#EF4444',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '700'
    },
    toggleLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#333333'
    },
    toggle: {
      width: '52px',
      height: '28px',
      backgroundColor: '#E5E7EB',
      borderRadius: '14px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    toggleActive: {
      backgroundColor: '#00A79D'
    },
    toggleKnob: {
      width: '22px',
      height: '22px',
      backgroundColor: '#FFFFFF',
      borderRadius: '50%',
      position: 'absolute',
      top: '3px',
      left: '3px',
      transition: 'transform 0.3s',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
    },
    toggleKnobActive: {
      transform: 'translateX(24px)'
    },
    expandIcon: {
      color: '#4A6A8A',
      transition: 'transform 0.3s'
    },
    agentDetails: {
      padding: '0 24px 24px',
      borderTop: '1px solid #E5E7EB'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginTop: '20px'
    },
    detailSection: {
      backgroundColor: '#F4F7F9',
      padding: '16px',
      borderRadius: '12px'
    },
    detailTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    detailContent: {
      fontSize: '14px',
      color: '#333333',
      lineHeight: '1.6'
    },
    tagList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '8px'
    },
    tag: {
      padding: '4px 12px',
      backgroundColor: '#22D3EE',
      color: '#003366',
      borderRadius: '16px',
      fontSize: '13px',
      fontWeight: '500'
    },
    pagination: {
      maxWidth: '1200px',
      margin: '32px auto 0',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: isMobile ? '8px' : '12px'
    },
    pageButton: {
      padding: '10px 16px',
      backgroundColor: '#FFFFFF',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      color: '#003366',
      transition: 'all 0.2s'
    },
    pageButtonActive: {
      backgroundColor: '#003366',
      color: '#FFFFFF',
      borderColor: '#003366'
    },
    pageButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    loading: {
      textAlign: 'center',
      padding: '48px',
      color: '#4A6A8A',
      fontSize: '18px'
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (<><TopNavigationBar />
    <div style={styles.container}>
      
      <div style={styles.header}>
        <h1 style={styles.title}>Agent Management</h1>
        <p style={styles.subtitle}>Manage all registered agents and their visibility status</p>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.searchContainer}>
          <Search size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, email, phone, or area..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            onFocus={(e) => e.target.style.borderColor = '#00A79D'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          style={styles.select}
          value={sectorFilter}
          onChange={(e) => {
            setSectorFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Sectors</option>
          {[...new Set(agents.flatMap(a => a.preferredSectors || []))].map((sector, idx) => (
            <option key={idx} value={sector}>{sector}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading agents...</div>
      ) : (
        <>
          <StaggerContainer style={styles.agentList}>
            {agents
              .filter(agent => {
                if (!sectorFilter) return true;
                return Array.isArray(agent.preferredSectors) &&
                  agent.preferredSectors.includes(sectorFilter);
              })
              .map((agent) => {
              const isExpanded = expandedAgent === agent._id;
              const isVisible = agent.visibilityStatus === '1';

              return (
                <StaggerItem
                  key={agent._id}
                  style={{
                    ...styles.agentCard,
                    ...(isExpanded ? styles.agentCardExpanded : {})
                  }}
                >
                  <div
                    style={styles.agentHeader}
                    onClick={() => {
                      const next = isExpanded ? null : agent._id;
                      setExpandedAgent(next);
                      if (!isExpanded) {
                        fetchViewedLeads(agent._id);
                      }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {agent.profilePhoto ? (
                      <img src={agent.profilePhoto} alt={agent.name} style={styles.avatarImage} />
                    ) : (
                      <div style={styles.avatar}>
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={styles.agentInfo}>
                      <h3 style={styles.agentName}>{agent.name}</h3>
                      <div style={styles.agentMeta}>
                        <span style={styles.metaItem}>
                          <Mail size={14} />
                          {agent.email}
                        </span>
                        <span style={styles.metaItem}>
                          <Phone size={14} />
                          {agent.mobileNumber}
                        </span>
                        {agent.agentCode && (
                          <span style={styles.metaItem}>
                            <Briefcase size={14} />
                            {agent.agentCode}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{
                      ...styles.statusBadge,
                      ...(agent.status === 'active' ? styles.statusActive : styles.statusInactive)
                    }}>
                      {agent.status || 'N/A'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: '8px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={styles.approveButton}
                        onClick={() => approveAgent(agent._id)}
                        title="Approve agent"
                      >
                        Approve
                      </button>

                      <button
                        style={styles.suspendButton}
                        onClick={() => suspendAgent(agent._id)}
                        title="Suspend agent"
                      >
                        Suspend
                      </button>
                      <button
                        style={{
                          padding: '8px 12px',
                          marginLeft: '8px',
                          backgroundColor: '#F59E0B',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                        onClick={() => resetAgentPassword(agent._id)}
                        title="Reset Agent Password"
                      >
                        Reset Password
                      </button>
                      {agent.idProof && (
                        <button
                          style={{
                            padding: '8px 12px',
                            marginLeft: '8px',
                            backgroundColor: '#003366',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700'
                          }}
                          onClick={() => {
                            setActiveIdProof(agent.idProof);
                            setShowIdModal(true);
                          }}
                          title="View ID Proof"
                        >
                          View ID
                        </button>
                      )}
                    </div>

                    <div style={styles.toggleContainer} onClick={(e) => e.stopPropagation()}>
                      <span style={styles.toggleLabel}>Visible</span>
                      <div
                        style={{
                          ...styles.toggle,
                          ...(isVisible ? styles.toggleActive : {})
                        }}
                        onClick={() => toggleVisibility(agent._id, agent.visibilityStatus)}
                      >
                        <div style={{
                          ...styles.toggleKnob,
                          ...(isVisible ? styles.toggleKnobActive : {})
                        }} />
                      </div>
                    </div>

                    <div style={styles.expandIcon}>
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={styles.agentDetails}>
                      <div style={styles.detailsGrid}>
                        <div style={styles.detailSection}>
                          <div style={styles.detailTitle}>Agent Information</div>
                          <div style={styles.detailContent}>
                            <div><strong>Type:</strong> {agent.agentType || 'N/A'}</div>
                            <div><strong>Agency:</strong> {agent.agencyName || 'N/A'}</div>
                            <div><strong>Experience:</strong> {agent.experienceYears || 0} years</div>
                            <div><strong>Rating:</strong> {agent.rating ? `${agent.rating} ⭐` : 'Not rated'}</div>
                            <div><strong>Total Leads:</strong> {agent.totalLeadsAssigned || 0}</div>
                            <div><strong>Joined:</strong> {formatDate(agent.createdAt)}</div>
                          </div>
                        </div>
                        {agent.preferredSectors && agent.preferredSectors.length > 0 && (
                          <div style={styles.detailSection}>
                            <div style={styles.detailTitle}>Preferred Sectors</div>
                            <div style={styles.tagList}>
                              {agent.preferredSectors.map((sector, idx) => (
                                <span key={idx} style={styles.tag}>{sector}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={styles.detailSection}>
                          <div style={styles.detailTitle}>Viewed Client Leads</div>

                          {loadingViewedLeads && !viewedLeads[agent._id] && (
                            <div style={{ fontSize: '13px', color: '#4A6A8A' }}>
                              Loading viewed leads...
                            </div>
                          )}

                          {viewedLeads[agent._id] && viewedLeads[agent._id].length === 0 && (
                            <div style={{ fontSize: '13px', color: '#4A6A8A' }}>
                              No client numbers viewed yet.
                            </div>
                          )}

                          {viewedLeads[agent._id] && viewedLeads[agent._id].length > 0 && (
                            <div
                              style={{
                                display: 'grid',
                                gap: '10px',
                                maxHeight: '260px',
                                overflowY: 'auto',
                                paddingRight: '6px'
                              }}
                            >
                              {viewedLeads[agent._id].map((lead, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                    fontSize: '13px'
                                  }}
                                >
                                  <div style={{ fontWeight: 700, color: '#003366' }}>
                                    {lead.userName || 'Client'}
                                  </div>
                                  <div style={{ color: '#4A6A8A', marginTop: '2px' }}>
                                    {lead.preferredLocation || '—'} • {lead.propertyType || '—'}
                                  </div>
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#065F46' }}>
                                    📞 {lead.mobileNumber}
                                  </div>
                                  <div style={{ marginTop: '2px', fontSize: '11px', color: '#6B7280' }}>
                                    Viewed on {formatDate(lead.viewedAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageButton,
                  ...(page === 1 ? styles.pageButtonDisabled : {})
                }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span style={{ color: '#333333', fontWeight: '600' }}>
                Page {page} of {totalPages}
              </span>
              <button
                style={{
                  ...styles.pageButton,
                  ...(page === totalPages ? styles.pageButtonDisabled : {})
                }}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    {/* ID Proof Modal */}
    {showIdModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowIdModal(false)}
      >
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: '16px', color: '#003366' }}>ID Proof</h3>
          <img
            src={activeIdProof}
            alt="ID Proof"
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              borderRadius: '8px'
            }}
          />
          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <button
              onClick={() => setShowIdModal(false)}
              style={{
                padding: '8px 14px',
                background: '#00A79D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
    </>
  );
};

export default AgentManagement;