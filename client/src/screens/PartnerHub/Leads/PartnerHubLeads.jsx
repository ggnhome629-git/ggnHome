import React, { useEffect, useState } from 'react';
import { Box, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Skeleton } from '@mui/material';
import { MessageSquare, Phone, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerHubLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    fetchLeads();
  }, [filter, pagination.page]);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('partnerAccessToken');
      if (!token) {
        navigate('/partner/login');
        return;
      }

      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        status: filter === 'all' ? 'all' : filter,
      });

      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/partner/leads?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        if (res.status === 401) navigate('/partner/login');
        throw new Error('Failed to fetch leads');
      }

      const data = await res.json();
      setLeads(data.enquiries || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId) => {
    try {
      const token = localStorage.getItem('partnerAccessToken');
      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/partner/leads/${leadId}/status`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ responded: true, response: responseText }),
        }
      );

      if (!res.ok) throw new Error('Failed to update status');
      setOpenDialog(false);
      setResponseText('');
      fetchLeads();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const maskPhone = (phone) => phone ? phone.replace(/(\d{2})(\d{2})/, 'xx$2') : 'N/A';

  if (error) return <Container sx={{ py: 4 }}><Typography color="error">{error}</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>Leads & Enquiries</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>Manage all customer inquiries for your properties</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Paper sx={{ flex: 1, p: 3, borderRadius: '12px', backgroundColor: filter === 'all' ? '#eff6ff' : '#fff', cursor: 'pointer', borderLeft: filter === 'all' ? '4px solid #3b82f6' : '1px solid #e5e7eb' }} onClick={() => setFilter('all')}>
          <Stack direction="row" spacing={2} alignItems="center">
            <MessageSquare size={24} color="#3b82f6" />
            <Box><Typography variant="caption" sx={{ color: '#6b7280' }}>Total Leads</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{pagination.total}</Typography></Box>
          </Stack>
        </Paper>
        <Paper sx={{ flex: 1, p: 3, borderRadius: '12px', backgroundColor: filter === 'new' ? '#fef3c7' : '#fff', cursor: 'pointer', borderLeft: filter === 'new' ? '4px solid #f59e0b' : '1px solid #e5e7eb' }} onClick={() => setFilter('new')}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Clock size={24} color="#f59e0b" />
            <Box><Typography variant="caption" sx={{ color: '#6b7280' }}>New Leads</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{leads.filter(l => !l.responded).length}</Typography></Box>
          </Stack>
        </Paper>
        <Paper sx={{ flex: 1, p: 3, borderRadius: '12px', backgroundColor: filter === 'responded' ? '#d1fae5' : '#fff', cursor: 'pointer', borderLeft: filter === 'responded' ? '4px solid #10b981' : '1px solid #e5e7eb' }} onClick={() => setFilter('responded')}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckCircle size={24} color="#10b981" />
            <Box><Typography variant="caption" sx={{ color: '#6b7280' }}>Responded</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{leads.filter(l => l.responded).length}</Typography></Box>
          </Stack>
        </Paper>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f9fafb' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Property</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
              : leads.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="textSecondary">No leads found</Typography></TableCell></TableRow>
              : leads.map(lead => (
                <TableRow key={lead._id} sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{lead.name}</TableCell>
                  <TableCell><Stack spacing={0.5}><Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Phone size={14} />{maskPhone(lead.mobile)}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>{lead.email || 'No email'}</Typography></Stack></TableCell>
                  <TableCell><Typography variant="body2" sx={{ color: '#3b82f6', fontWeight: 600 }}>{lead.propertyId?.title || 'Property'}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>{lead.propertyId?.Sector}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.message || 'No message'}</Typography></TableCell>
                  <TableCell><Chip label={lead.responded ? 'Responded' : 'New'} size="small" sx={{ backgroundColor: lead.responded ? '#d1fae5' : '#fee2e2', color: lead.responded ? '#065f46' : '#991b1b', fontWeight: 600 }} /></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: '#6b7280' }}>{new Date(lead.createdAt).toLocaleDateString('en-IN')}</Typography></TableCell>
                  <TableCell>{!lead.responded && <Button size="small" startIcon={<MessageSquare size={14} />} onClick={() => { setSelectedLead(lead); setOpenDialog(true); }} sx={{ color: '#3b82f6', fontWeight: 600, textTransform: 'none' }}>Respond</Button>}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Respond to {selectedLead?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>Property: {selectedLead?.propertyId?.title}</Typography>
          <TextField fullWidth multiline rows={4} label="Your Response" value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response here..." sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleUpdateStatus(selectedLead._id)} disabled={!responseText} sx={{ backgroundColor: '#3b82f6' }}>Send Response</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PartnerHubLeads;
