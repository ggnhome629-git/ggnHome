import React, { useState, useEffect } from "react";
import { Box, Button, Card, CardContent, Grid, Typography, Stack, TextField, Alert, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Pagination, FormControl, InputLabel, Select, MenuItem, InputAdornment, useMediaQuery, useTheme } from "@mui/material";
import { Pencil, Home, Search, Filter, Eye, Trash2, MapPin, Check, AlertCircle, Download, Plus, RefreshCw } from "lucide-react";
import { useAdminFeedback } from "./shell/adminUi";
import EditPropertyModal from "./admin.editpropertymodel";

import './admin.css';

const AdminPropertyManager = () => {
  const { confirm, notify, feedback } = useAdminFeedback();
  const [editingId, setEditingId] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE = process.env.REACT_APP_Base_API || "";
  const itemsPerPage = 10;

  // Fetch properties
  const fetchProperties = async (pageNum = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pageNum,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(filterSource !== "all" && { source: filterSource }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      });

      const response = await fetch(
        `${API_BASE}/api/admin/properties?${query}`,
        {
          headers: { Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}` },
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setProperties(data.data || []);
        setTotalPages(Math.ceil((data.meta?.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setMessage({ type: 'error', text: 'Error loading properties' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties(page);
  }, [page, searchTerm, filterSource, filterStatus]);

  // Handle search (debounced)
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  // Sync debounced search with fetch
  useEffect(() => {
    fetchProperties(page);
  }, [debouncedSearch, filterSource, filterStatus, page]);
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Delete property
  const deleteProperty = async (id, propertyTitle) => {
    if (!(await confirm({ title: "Delete property", message: `Are you sure you want to delete "${propertyTitle}"?`, confirmLabel: "Delete", danger: true }))) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}` },
        credentials: "include",
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Property deleted successfully' });
        fetchProperties(page);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete property' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Title",
      "Price",
      "Location",
      "BHK",
      "Area",
      "Source",
      "Added Date",
    ];
    const data = properties.map((p) => [
      p.title,
      p.price,
      p.location,
      p.bhk,
      p.area,
      p.source,
      new Date(p.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...data].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Box className="admin-dashboard">
      {feedback}
      <EditPropertyModal
        propertyId={editingId}
        isOpen={Boolean(editingId)}
        onClose={() => setEditingId(null)}
        onSuccess={() => { setEditingId(null); fetchProperties(page); }}
      />
      <Box className="admin-container">
        {/* Header */}
        <Box className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Box className="flex items-center gap-3">
            <Home size={28} color="#003366" />
            <Box>
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: '24px', md: '28px' }, fontWeight: 700 }}
              >
                Property Manager
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Manage all properties in database - view, edit, and delete listings
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              onClick={exportToCSV}
              size="small"
              className="btn"
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              endIcon={<Plus size={16} />}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
              className="btn"
            >
              Add Property
            </Button>
          </Stack>
        </Box>

        {/* Message Alert */}
        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 3 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label">Total Properties</Typography>
                  <Box className="stat-card-icon">
                    <Home size={20} color="#003366" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  {(totalPages * itemsPerPage).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label">Current Page</Typography>
                  <Box className="stat-card-icon teal">
                    <Filter size={20} color="#00A79D" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  {properties.length}
                </Typography>
                <Typography className="stat-card-label">of {itemsPerPage} per page</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label">NoBroker</Typography>
                  <Box className="stat-card-icon success">
                    <Check size={20} color="#10B981" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  {properties.filter((p) => p.source === 'nobroker').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card" sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box className="flex items-center justify-center">
                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={() => {
                      setSearchTerm('');
                      setFilterSource('all');
                      setFilterStatus('all');
                    }}
                    size="small"
                    className="btn-outlined"
                  >
                    Reset Filters
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card className="mb-5">
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'flex-end' }}
            >
              {/* Search */}
              <TextField
                placeholder="Search by title, location..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="#5B6B7B" />
                    </InputAdornment>
                  ),
                }}
                className="input"
                sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
              />

              {/* Source Filter */}
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                <InputLabel>Source</InputLabel>
                <Select
                  value={filterSource}
                  label="Source"
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                  }}
                  className="input"
                >
                  <MenuItem value="all">All Sources</MenuItem>
                  <MenuItem value="nobroker">NoBroker</MenuItem>
                  <MenuItem value="99acres">99acres</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </Select>
              </FormControl>

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                  className="input"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Mobile: Show cards instead of table */}
        {isMobile ? (
          <Box>
            {loading ? (
              <Stack spacing={3}>
                {[...Array(itemsPerPage)].map((_, idx) => (
                  <Card key={idx} className="p-4">
                    <Box className="skeleton skeleton-text" style={{ width: '60%' }} />
                    <Box className="flex gap-4 mt-3">
                      <Box className="skeleton skeleton-text" style={{ width: '40%', flex: 1 }} />
                      <Box className="skeleton skeleton-text" style={{ width: '30%', flex: 1 }} />
                    </Box>
                  </Card>
                ))}
              </Stack>
            ) : properties.length === 0 ? (
              <Box className="empty-state">
                <Box className="empty-state-icon">
                  <Home size={26} color="#00A79D" />
                </Box>
                <Typography className="empty-state-title">
                  No properties found
                </Typography>
                <Typography className="empty-state-description">
                  Try adjusting your search or filters
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSource('all');
                    setFilterStatus('all');
                  }}
                  className="btn-outlined"
                >
                  Clear Filters
                </Button>
              </Box>
            ) : (
              <Stack spacing={3}>
                {properties.map((property) => (
                  <Card
                    key={property._id}
                    className="card"
                    sx={{
                      p: 3,
                      '&:hover': { boxShadow: 'shadow-raised' },
                    }}
                  >
                    <Box className="flex items-start gap-4">
                      <Box
                        sx={{
                          width: 60,
                          height: 45,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Home size={24} color="#9AA7B4" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {property.title}
                        </Typography>
                        <Box className="flex items-center gap-2 text-secondary" sx={{ mb: 1 }}>
                          <MapPin size={14} />
                          <Typography
                            variant="body2"
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {property.location}
                          </Typography>
                        </Box>
                        <Box className="flex items-center gap-3 text-secondary">
                          <Typography variant="caption">
                            {new Date(property.createdAt).toLocaleDateString()}
                          </Typography>
                          <Chip
                            label={`${property.bhk} BHK`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={property.source || 'Manual'}
                            size="small"
                            color={property.source === 'nobroker' ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                      <Box className="flex flex-col items-end gap-2">
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 700, color: 'primary.main' }}
                        >
                          ₹{property.price?.toLocaleString()}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedProperty(property);
                              setShowDetails(true);
                            }}
                            aria-label="View details"
                            className="focus-ring"
                          >
                            <Eye size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setEditingId(property._id)}
                            aria-label="Edit property"
                            className="focus-ring"
                          >
                            <Pencil size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteProperty(property._id, property.title)}
                            aria-label="Delete property"
                            className="focus-ring"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          /* Desktop: Show table */
          <TableContainer component={Paper} className="table-container">
            <Table className="table">
              <TableHead>
                <TableRow>
                  <TableCell className="font-semibold">Property</TableCell>
                  <TableCell className="font-semibold">Location</TableCell>
                  <TableCell className="font-semibold table-align-right">Price</TableCell>
                  <TableCell className="font-semibold table-align-center">BHK</TableCell>
                  <TableCell className="font-semibold">Source</TableCell>
                  <TableCell className="font-semibold table-align-center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" className="py-6">
                      <Typography className="text-secondary">
                        Loading properties...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" className="py-6">
                      <Box className="empty-state">
                        <Box className="empty-state-icon">
                          <Home size={26} color="#00A79D" />
                        </Box>
                        <Typography className="empty-state-title">
                          No properties found
                        </Typography>
                        <Typography className="empty-state-description">
                          Try adjusting your search or filters
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSearchTerm('');
                            setFilterSource('all');
                            setFilterStatus('all');
                          }}
                          className="btn-outlined"
                        >
                          Clear Filters
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  properties.map((property) => (
                    <TableRow key={property._id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" className="font-semibold">
                            {property.title}
                          </Typography>
                          <Typography variant="caption" className="text-secondary">
                            {new Date(property.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center gap-2">
                          <MapPin size={14} color="#5B6B7B" />
                          <Typography variant="body2">
                            {property.location}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell className="table-align-right">
                        <Typography variant="body2" className="font-semibold">
                          ₹{property.price?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell className="table-align-center">
                        <Chip
                          label={`${property.bhk} BHK`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={property.source || 'Manual'}
                          size="small"
                          color={property.source === 'nobroker' ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ height: 24, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell className="table-align-center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedProperty(property);
                              setShowDetails(true);
                            }}
                            title="View details"
                            className="focus-ring"
                          >
                            <Eye size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setEditingId(property._id)}
                            title="Edit property"
                            className="focus-ring"
                          >
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteProperty(property._id, property.title)}
                            title="Delete property"
                            className="focus-ring"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            className="flex justify-center mt-5"
            sx={{ mt: { xs: 4, sm: 3 }, justifyContent: 'center' }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        )}

        {/* Details Dialog */}
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="sm"
          fullWidth
          TransitionComponent={undefined}
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, pt: 4, pb: 2 }}>
            Property Details
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedProperty && (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" className="text-secondary">
                    Title
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedProperty.title}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" className="text-secondary">
                    Location
                  </Typography>
                  <Box className="flex items-center gap-2">
                    <MapPin size={16} color="#5B6B7B" />
                    <Typography variant="body1">
                      {selectedProperty.location}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" className="text-secondary">
                    Price
                  </Typography>
                  <Typography variant="body1" className="font-semibold" sx={{ color: 'teal.main' }}>
                    ₹{selectedProperty.price?.toLocaleString()}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" className="text-secondary">
                        BHK
                      </Typography>
                      <Typography variant="body1">
                        {selectedProperty.bhk} BHK
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" className="text-secondary">
                        Bathrooms
                      </Typography>
                      <Typography variant="body1">
                        {selectedProperty.bath || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" className="text-secondary">
                        Area
                      </Typography>
                      <Typography variant="body1">
                        {selectedProperty.area} sq ft
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="caption" className="text-secondary">
                    Source
                  </Typography>
                  <Chip
                    label={selectedProperty.source || 'Manual'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" className="text-secondary">
                    Added On
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedProperty.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setShowDetails(false)} className="btn btn-ghost">
              Close
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => deleteProperty(selectedProperty?._id, selectedProperty?.title)}
              className="btn-danger"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Info Box */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Box className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} color="#00A79D" />
            <Typography variant="body2" className="font-semibold">
              Property Manager Features:
            </Typography>
          </Box>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '4px' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                View all properties added to database (manual and scraped)
              </Typography>
            </li>
            <li style={{ marginBottom: '4px' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Search by title, location, or other details
              </Typography>
            </li>
            <li style={{ marginBottom: '4px' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Filter by source (NoBroker, 99acres, Manual) and status
              </Typography>
            </li>
            <li style={{ marginBottom: '4px' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Export all properties to CSV for analysis
              </Typography>
            </li>
            <li>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Delete duplicate or incorrect properties with one click
              </Typography>
            </li>
          </ul>
        </Alert>
      </Box>
    </Box>
  );
};

export default AdminPropertyManager;
