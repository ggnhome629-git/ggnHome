import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  Grid,
  Typography,
  TextField,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { ChevronDown, ChevronUp, Search, Mail, Phone } from 'lucide-react';
import { useAdminFeedback } from "./shell/adminUi";
const AgentManagement = () => {
  const { confirm, notify, feedback } = useAdminFeedback();
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
    if (!(await confirm({ title: 'Reset password', message: 'Are you sure you want to reset this agent’s password?', confirmLabel: 'Reset', danger: true }))) return;

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

      notify(`Password reset successfully. Mobile: ${data.mobileNumber}`, 'success');
    } catch (err) {
      console.error('Reset password error:', err);
      notify(err.message || 'Error resetting password', 'error');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'active': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' };
      case 'inactive': return { bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' };
      case 'suspended': return { bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' };
      default: return { bg: 'rgba(100, 116, 139, 0.16)', color: '#475569' };
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AG';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <Box className="admin-dashboard">
      {feedback}
      <Box className="admin-container">
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            borderRadius: { xs: 2, md: 3 },
            p: { xs: 3, md: 5 },
            mb: 4,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography
            variant="h1"
            sx={{ color: 'white', fontSize: { xs: '24px', md: '32px' }, fontWeight: 700, mb: 1 }}
          >
            Agent Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'cyan.main', fontSize: '16px', mb: 0 }}>
            Manage all registered agents and their visibility status
          </Typography>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 4, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search by name, email, phone, or area..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="#5B6B7B" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                SelectProps={{ native: true }}
                sx={{ minWidth: 130 }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                label="Sector"
                value={sectorFilter}
                onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }}
                SelectProps={{ native: true }}
                sx={{ minWidth: 130 }}
              >
                <option value="">All Sectors</option>
                {[...new Set(agents.flatMap(a => a.preferredSectors || []))].map((sector, idx) => (
                  <option key={idx} value={sector}>{sector}</option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <CircularProgress size={32} />
            </Box>
            <Typography variant="h6">Loading agents...</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {agents
                .filter(agent => {
                  if (!sectorFilter) return true;
                  return Array.isArray(agent.preferredSectors) &&
                    agent.preferredSectors.includes(sectorFilter);
                })
                .map((agent) => {
                  const isExpanded = expandedAgent === agent._id;
                  const isVisible = agent.visibilityStatus === '1';
                  const statusColors = getStatusChipColor(agent.status);

                  return (
                    <Card
                      key={agent._id}
                      className={isExpanded ? '' : 'card'}
                      sx={{
                        border: isExpanded ? '2px solid #00A79D' : '2px solid transparent',
                        boxShadow: isExpanded ? '0 8px 16px rgba(0, 167, 157, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          p: { xs: 3, sm: 4 },
                          display: 'flex',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 2, sm: 3 },
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => {
                          const next = isExpanded ? null : agent._id;
                          setExpandedAgent(next);
                          if (!isExpanded) {
                            fetchViewedLeads(agent._id);
                          }
                        }}
                      >
                        {/* Avatar */}
                        {agent.profilePhoto ? (
                          <Avatar
                            src={agent.profilePhoto}
                            sx={{ width: 64, height: 64, flexShrink: 0 }}
                          />
                        ) : (
                          <Avatar
                            sx={{
                              width: 64,
                              height: 64,
                              bgcolor: 'primary.main',
                              fontSize: '1.5rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(agent.name)}
                          </Avatar>
                        )}

                        {/* Agent Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                            {agent.name}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Mail size={14} />
                              {agent.email}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone size={14} />
                              {agent.mobileNumber}
                            </Box>
                            {agent.agentCode && (
                              <Chip
                                label={agent.agentCode}
                                size="small"
                                sx={{ height: 22, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Status + Actions */}
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mr: 2 }}>
                          <Chip
                            label={agent.status || 'N/A'}
                            size="small"
                            sx={{
                              bgcolor: statusColors.bg,
                              color: statusColors.color,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              height: 24,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>

                        {/* Expand Icon */}
                        <Box sx={{ color: 'text.secondary', transition: 'transform 0.3s' }}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </Box>
                      </Box>

                      {/* Actions Row */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        gap: 1,
                        px: { xs: 3, sm: 0 },
                        pb: { xs: 2, sm: 0 },
                        borderTop: { xs: '1px solid', sm: 'none' },
                        borderColor: 'divider',
                      }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => approveAgent(agent._id)}
                          sx={{ bgcolor: 'success.main' }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => suspendAgent(agent._id)}
                          sx={{ bgcolor: 'error.main' }}
                        >
                          Suspend
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ bgcolor: 'warning.main' }}
                          onClick={() => resetAgentPassword(agent._id)}
                        >
                          Reset Password
                        </Button>
                        {agent.idProof && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setActiveIdProof(agent.idProof);
                              setShowIdModal(true);
                            }}
                          >
                            View ID
                          </Button>
                        )}

                        {/* Visibility Toggle */}
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Visible</Typography>
                          <Box
                            onClick={() => toggleVisibility(agent._id, agent.visibilityStatus)}
                            sx={{
                              width: 52,
                              height: 28,
                              bgcolor: isVisible ? 'teal.main' : 'grey.300',
                              borderRadius: 14,
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background-color 0.3s',
                            }}
                          >
                            <Box
                              sx={{
                                width: 22,
                                height: 22,
                                bgcolor: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: 3,
                                left: isVisible ? 27 : 3,
                                transition: 'transform 0.3s',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                              }} />
                          </Box>
                        </Box>
                      </Box>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4, borderTop: '1px solid divider' }}>
                          <Grid container spacing={{ xs: 2, sm: 4 }} sx={{ mt: 3 }}>
                            {/* Agent Information */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Box className="card" sx={{ p: 3 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'primary.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    mb: 2,
                                  }}
                                >
                                  Agent Information
                                </Typography>
                                <Box sx={{ fontSize: '0.875rem', color: 'text.primary', lineHeight: 2 }}>
                                  <div><strong>Type:</strong> {agent.agentType || 'N/A'}</div>
                                  <div><strong>Agency:</strong> {agent.agencyName || 'N/A'}</div>
                                  <div><strong>Experience:</strong> {agent.experienceYears || 0} years</div>
                                  <div><strong>Rating:</strong> {agent.rating ? `${agent.rating} ★` : 'Not rated'}</div>
                                  <div><strong>Total Leads:</strong> {agent.totalLeadsAssigned || 0}</div>
                                  <div><strong>Joined:</strong> {formatDate(agent.createdAt)}</div>
                                </Box>
                              </Box>
                            </Grid>

                            {/* Preferred Sectors */}
                            {agent.preferredSectors && agent.preferredSectors.length > 0 && (
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Box className="card" sx={{ p: 3 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: 'primary.main',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      mb: 2,
                                    }}
                                  >
                                    Preferred Sectors
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {agent.preferredSectors.map((sector, idx) => (
                                      <Chip
                                        key={idx}
                                        label={sector}
                                        size="small"
                                        sx={{
                                          bgcolor: 'rgba(34, 211, 238, 0.12)',
                                          color: 'primary.main',
                                          fontWeight: 500,
                                          fontSize: '0.75rem',
                                          height: 26,
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              </Grid>
                            )}

                            {/* Viewed Client Leads */}
                            <Grid size={{ xs: 12 }}>
                              <Box className="card" sx={{ p: 3 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'primary.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    mb: 2,
                                  }}
                                >
                                  Viewed Client Leads
                                </Typography>

                                {loadingViewedLeads && !viewedLeads[agent._id] && (
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Loading viewed leads...
                                  </Typography>
                                )}

                                {viewedLeads[agent._id] && viewedLeads[agent._id].length === 0 && (
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No client numbers viewed yet.
                                  </Typography>
                                )}

                                {viewedLeads[agent._id] && viewedLeads[agent._id].length > 0 && (
                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gap: 1.5,
                                      maxHeight: 260,
                                      overflowY: 'auto',
                                      '&::-webkit-scrollbar': { width: 6 },
                                      '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'divider' },
                                    }}
                                  >
                                    {viewedLeads[agent._id].map((lead, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          bgcolor: 'background.paper',
                                          border: '1px solid',
                                          borderColor: 'divider',
                                          borderRadius: 1.5,
                                          p: 1.5,
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        <Typography sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                                          {lead.userName || 'Client'}
                                        </Typography>
                                        <Typography sx={{ color: 'text.secondary', mb: 0.5 }}>
                                          {lead.preferredLocation || '—'} • {lead.propertyType || '—'}
                                        </Typography>
                                        <Typography sx={{ color: 'success.main', mb: 0.5, fontSize: '0.7rem' }}>
                                          📞 {lead.mobileNumber}
                                        </Typography>
                                        <Typography sx={{ color: 'grey.600', fontSize: '0.65rem' }}>
                                          Viewed on {formatDate(lead.viewedAt)}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Card>
                  );
                })}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{
                mt: 4,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
              }}>
                <Button
                  size="small"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={page === 1 ? 'btn btn-ghost' : 'btn btn-outlined'}
                  sx={{
                    minWidth: 80,
                    bgcolor: page === 1 ? 'action.hover' : 'primary.main',
                    color: page === 1 ? 'text.secondary' : 'white',
                  }}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outlined"
                  sx={{
                    minWidth: 80,
                    bgcolor: page === totalPages ? 'action.hover' : 'primary.main',
                    color: page === totalPages ? 'text.secondary' : 'white',
                  }}
                >
                  Next
                </Button>
              </Box>
            )}
          </>
        )}

        {/* ID Proof Modal */}
        {showIdModal && (
          <Dialog
            open={showIdModal}
            onClose={() => setShowIdModal(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ pt: 4, fontWeight: 700 }}>
              ID Proof
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <img
                src={activeIdProof}
                alt="ID Proof"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: 2,
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setShowIdModal(false)} className="btn btn-primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  );
};

export default AgentManagement;