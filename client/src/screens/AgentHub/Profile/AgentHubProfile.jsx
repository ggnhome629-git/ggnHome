import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Skeleton,
  Alert,
} from '@mui/material';
import { User, Mail, Phone, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgentHubProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('agentAccessToken');
      if (!token) {
        navigate('/agent/login');
        return;
      }

      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/hub/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) navigate('/agent/login');
        throw new Error('Failed to fetch profile');
      }

      const data = await res.json();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('agentAccessToken');
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/hub/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          profilePhoto: formData.profilePhoto,
        }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      const data = await res.json();
      setProfile(data.agent);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error updating profile:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 4 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
          Agent Profile
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Manage your agent account and preferences
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Profile Card */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e5e7eb', mb: 4 }}>
        <CardContent>
          <Stack spacing={4}>
            {/* Profile Avatar & Basic Info */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ xs: 'center', sm: 'flex-start' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    backgroundColor: '#3b82f6',
                    fontSize: '2.5rem',
                    mb: 2,
                  }}
                  src={profile?.profilePhoto}
                >
                  {profile?.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {profile?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  {profile?.agentType?.replace('-', ' ').toUpperCase()}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Mobile Number
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone size={16} />
                      {profile?.mobileNumber}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: profile?.status === 'active' ? '#10b981' : '#f59e0b',
                        textTransform: 'capitalize',
                      }}
                    >
                      {profile?.status}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Agent Rating
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star size={16} color="#f59e0b" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {profile?.rating?.toFixed(1)} / 5.0 ({profile?.ratingsCount} reviews)
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            </Stack>

            {/* Divider */}
            <Box sx={{ height: 1, backgroundColor: '#e5e7eb' }} />

            {/* Editable Fields */}
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Personal Information
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData?.name || ''}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <User size={18} style={{ marginRight: 8, color: '#9ca3af' }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: !editing ? '#f9fafb' : '#fff',
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData?.email || ''}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <Mail size={18} style={{ marginRight: 8, color: '#9ca3af' }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: !editing ? '#f9fafb' : '#fff',
                      },
                    }}
                  />
                </Stack>
              </Box>

              {/* Additional Info */}
              {profile?.agencyName && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Agency Information
                  </Typography>
                  <TextField
                    fullWidth
                    label="Agency Name"
                    value={profile?.agencyName}
                    disabled
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                      },
                    }}
                  />
                </Box>
              )}

              {profile?.sectorsCovered?.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Sectors Covered
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {profile?.sectorsCovered?.join(', ')}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              {editing ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditing(false);
                      setFormData(profile);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{ backgroundColor: '#3b82f6' }}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setEditing(true)}
                  sx={{ backgroundColor: '#3b82f6' }}
                >
                  Edit Profile
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card sx={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Account Settings
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: '1px solid #e5e7eb' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Change Password
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Update your account password
                </Typography>
              </Box>
              <Button variant="outlined" size="small" disabled>
                Coming Soon
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Logout
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Sign out from your account
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => {
                  localStorage.removeItem('agentAccessToken');
                  navigate('/agent/login');
                }}
              >
                Logout
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AgentHubProfile;
