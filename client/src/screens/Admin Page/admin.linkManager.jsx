import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { Copy, Trash2, Edit2, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Link Manager - Manage affiliate link mappings
 * Maps internal property links to affiliate portal links with live updates
 */
export default function LinkManager() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({});
  const [formData, setFormData] = useState({ propertyId: "", normalLink: "", affiliateLink: "", active: true });

  // Simulate loading links
  useEffect(() => {
    const loadLinks = async () => {
      try {
        setLoading(true);
        // In production: const res = await fetch('/api/admin/affiliate-links');
        // For now, load from localStorage or show empty
        const saved = localStorage.getItem("affiliateLinks");
        if (saved) {
          setLinks(JSON.parse(saved));
        }
        setTimeout(() => setLoading(false), 300);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadLinks();
  }, []);

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.propertyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.normalLink?.includes(searchTerm) ||
      link.affiliateLink?.includes(searchTerm);
    return matchesSearch;
  });

  const handleOpenDialog = (link = null) => {
    if (link) {
      setEditingId(link.id);
      setFormData(link);
    } else {
      setEditingId(null);
      setFormData({ propertyId: "", normalLink: "", affiliateLink: "", active: true });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({ propertyId: "", normalLink: "", affiliateLink: "", active: true });
  };

  const handleSave = async () => {
    if (!formData.propertyId || !formData.normalLink || !formData.affiliateLink) {
      alert("Please fill in all fields");
      return;
    }

    const newLinks = editingId
      ? links.map((l) => (l.id === editingId ? { ...formData, id: editingId } : l))
      : [...links, { ...formData, id: Date.now().toString() }];

    setLinks(newLinks);
    localStorage.setItem("affiliateLinks", JSON.stringify(newLinks));
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this link mapping?")) {
      const newLinks = links.filter((l) => l.id !== id);
      setLinks(newLinks);
      localStorage.setItem("affiliateLinks", JSON.stringify(newLinks));
    }
  };

  const handleCopyLink = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback({ ...copyFeedback, [id]: true });
    setTimeout(() => setCopyFeedback({ ...copyFeedback, [id]: false }), 2000);
  };

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontSize: "1.25rem", fontWeight: 700, color: "primary.main", mb: 1 }}>
            Link Manager
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Manage affiliate link mappings. Each property can have a normal link and an affiliate link for portal redirects.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              size="small"
              placeholder="Search by property ID or link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => handleOpenDialog()}
              sx={{ whiteSpace: "nowrap" }}
            >
              Add Link
            </Button>
          </Stack>
        </Box>

        {/* Links Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "background.default" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Property ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Normal Link</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Affiliate Link</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {links.length === 0 ? "No link mappings yet. Click 'Add Link' to create one." : "No matching links found."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>{link.propertyId}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {link.normalLink}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyLink(link.normalLink, `normal-${link.id}`)}
                          sx={{ p: 0.5 }}
                        >
                          {copyFeedback[`normal-${link.id}`] ? (
                            <CheckCircle size={16} color="#10B981" />
                          ) : (
                            <Copy size={16} color="#9CA3AF" />
                          )}
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {link.affiliateLink}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyLink(link.affiliateLink, `affiliate-${link.id}`)}
                          sx={{ p: 0.5 }}
                        >
                          {copyFeedback[`affiliate-${link.id}`] ? (
                            <CheckCircle size={16} color="#10B981" />
                          ) : (
                            <Copy size={16} color="#9CA3AF" />
                          )}
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={link.active ? "Active" : "Inactive"}
                        color={link.active ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(link)}
                          sx={{ color: "primary.main" }}
                        >
                          <Edit2 size={14} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(link.id)}
                          sx={{ color: "error.main" }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Info Box */}
        <Card sx={{ backgroundColor: "rgba(0,167,157,0.06)", border: "1px solid", borderColor: "#00A79D" }}>
          <CardContent>
            <Stack direction="row" spacing={2}>
              <AlertCircle size={18} color="#00A79D" style={{ flexShrink: 0, marginTop: 2 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main", mb: 1 }}>
                  Link Mapping Guide
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.6 }}>
                  • <strong>Property ID:</strong> Unique identifier for the property (e.g., PROP-12345)
                  <br />
                  • <strong>Normal Link:</strong> The internal ggnHome property page link
                  <br />
                  • <strong>Affiliate Link:</strong> The external portal link (99acres, NoBroker, etc.)
                  <br />
                  • Active links are used for redirects on the public portal
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId ? "Edit Link Mapping" : "Add Link Mapping"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="Property ID"
              size="small"
              fullWidth
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              placeholder="e.g., PROP-12345"
            />
            <TextField
              label="Normal Link"
              size="small"
              fullWidth
              value={formData.normalLink}
              onChange={(e) => setFormData({ ...formData, normalLink: e.target.value })}
              placeholder="e.g., https://ggnhome.com/property/123"
            />
            <TextField
              label="Affiliate Link"
              size="small"
              fullWidth
              value={formData.affiliateLink}
              onChange={(e) => setFormData({ ...formData, affiliateLink: e.target.value })}
              placeholder="e.g., https://99acres.com/property/abc123"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
