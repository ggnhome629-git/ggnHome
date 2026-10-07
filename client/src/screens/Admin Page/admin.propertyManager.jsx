import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  TextField,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import {
  Home,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MapPin,
  DollarSign,
  SquareFeet,
  Users,
  Calendar,
  Check,
  AlertCircle,
  Download,
  Plus,
} from "lucide-react";

const AdminPropertyManager = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("");

  const API_BASE = process.env.REACT_APP_Base_API || "http://localhost:5000";
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
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
      setMessage("Error loading properties");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties(page);
  }, [page, searchTerm, filterSource, filterStatus]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Delete property
  const deleteProperty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });

      if (response.ok) {
        setMessage("✓ Property deleted successfully");
        fetchProperties(page);
      } else {
        setMessage("✗ Failed to delete property");
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Home size={28} color="#003366" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Property Manager
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Manage all properties in database - view, edit, and delete listings
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* Message Alert */}
      {message && (
        <Alert
          severity={message.startsWith("✓") ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Total Properties
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {(totalPages * itemsPerPage).toLocaleString()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Current Page
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "info.main" }}
                >
                  {properties.length}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  of {itemsPerPage} per page
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  NoBroker
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  {properties.filter((p) => p.source === "nobroker").length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1} sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={exportToCSV}
                  size="small"
                >
                  Export CSV
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            spacing={2}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "flex-end" }}
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
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />

            {/* Source Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={filterSource}
                label="Source"
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="nobroker">NoBroker</MenuItem>
                <MenuItem value="99acres">99acres</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
              </Select>
            </FormControl>

            {/* Reset Filters */}
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm("");
                setFilterSource("all");
                setFilterStatus("all");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Property</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Price
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
                BHK
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Loading properties...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No properties found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property._id} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {property.title?.substring(0, 40)}...
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {new Date(property.createdAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <MapPin size={14} color="#666" />
                      <Typography variant="body2">
                        {property.location?.substring(0, 25)}...
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ₹{property.price?.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${property.bhk} BHK`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={property.source || "Manual"}
                      size="small"
                      color={property.source === "nobroker" ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedProperty(property);
                          setShowDetails(true);
                        }}
                        title="View details"
                      >
                        <Eye size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteProperty(property._id)}
                        title="Delete property"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Property Details</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedProperty && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Title
                </Typography>
                <Typography variant="body1">{selectedProperty.title}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Location
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MapPin size={16} />
                  <Typography variant="body1">{selectedProperty.location}</Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Price
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ₹{selectedProperty.price?.toLocaleString()}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    BHK
                  </Typography>
                  <Typography variant="body1">{selectedProperty.bhk} BHK</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Bathrooms
                  </Typography>
                  <Typography variant="body1">{selectedProperty.bath || "N/A"}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Area
                  </Typography>
                  <Typography variant="body1">
                    {selectedProperty.area} sq ft
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Source
                </Typography>
                <Chip
                  label={selectedProperty.source || "Manual"}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Added On
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedProperty.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => deleteProperty(selectedProperty?._id)}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ℹ️ Property Manager Features:
          </Typography>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              <Typography variant="caption">
                View all properties added to database (manual and scraped)
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Search by title, location, or other details
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Filter by source (NoBroker, 99acres, Manual) and status
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Export all properties to CSV for analysis
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Delete duplicate or incorrect properties with one click
              </Typography>
            </li>
          </ul>
        </Stack>
      </Alert>
    </Box>
  );
};

export default AdminPropertyManager;
