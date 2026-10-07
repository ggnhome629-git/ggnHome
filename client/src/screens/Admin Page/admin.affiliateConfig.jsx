import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Alert,
  IconButton,
} from "@mui/material";
import { Plus, Edit2, Trash2, Copy, Check } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Affiliate Portal Configuration
 * Manage affiliate portals and property link mappings (normal vs affiliate links)
 */
export default function AffiliateConfig() {
  const [portals, setPortals] = useState([
    { id: 1, name: "99acres", baseUrl: "https://www.99acres.com", active: true },
    { id: 2, name: "NoBroker", baseUrl: "https://www.nobroker.in", active: true },
  ]);
  const [properties, setProperties] = useState([
    { id: "prop1", title: "3 BHK in Sec 46", normalLink: "/Rentaldetails/prop1", affiliateLink: "https://www.99acres.com/listing/123", portal: "99acres" },
  ]);
  const [openPortalDialog, setOpenPortalDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [editingPortal, setEditingPortal] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [copied, setCopied] = useState(null);
  const [newPortal, setNewPortal] = useState({ name: "", baseUrl: "", active: true });
  const [newProperty, setNewProperty] = useState({ title: "", normalLink: "", affiliateLink: "", portal: "99acres" });

  const handleAddPortal = async () => {
    if (!newPortal.name || !newPortal.baseUrl) return;
    const portal = { id: Date.now(), ...newPortal };
    setPortals([...portals, portal]);
    setNewPortal({ name: "", baseUrl: "", active: true });
    setOpenPortalDialog(false);
  };

  const handleDeletePortal = (id) => {
    setPortals(portals.filter((p) => p.id !== id));
  };

  const handleAddProperty = async () => {
    if (!newProperty.title || !newProperty.normalLink || !newProperty.affiliateLink) return;
    const prop = { id: Date.now(), ...newProperty };
    setProperties([...properties, prop]);
    setNewProperty({ title: "", normalLink: "", affiliateLink: "", portal: "99acres" });
    setOpenLinkDialog(false);
  };

  const handleDeleteProperty = (id) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontSize: "1.25rem", fontWeight: 700, color: "primary.main", mb: 1 }}>
            Affiliate Portal Configuration
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Manage affiliate portals and link mappings for properties
          </Typography>
        </Box>

        {/* Alert */}
        <Alert severity="warning">
          Configure affiliate portals and property links here. Changes are synced to database immediately.
        </Alert>

        {/* Portals Section */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontSize: "1.1rem", fontWeight: 700, color: "primary.main" }}>
              Affiliate Portals
            </Typography>
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setOpenPortalDialog(true)}>
              Add Portal
            </Button>
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: `${radii.lg}px`, mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "rgba(0,51,102,0.04)" }}>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Portal Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Base URL</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portals.map((portal) => (
                  <TableRow key={portal.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{portal.name}</TableCell>
                    <TableCell sx={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{portal.baseUrl}</TableCell>
                    <TableCell>
                      <Box sx={{ px: 1.5, py: 0.5, backgroundColor: portal.active ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)", color: portal.active ? "#10B981" : "#6B7280", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600, display: "inline-block" }}>
                        {portal.active ? "✓ Active" : "✗ Inactive"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => { setEditingPortal(portal); setOpenPortalDialog(true); }}>
                          <Edit2 size={14} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeletePortal(portal.id)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider />

        {/* Property Links Section */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontSize: "1.1rem", fontWeight: 700, color: "primary.main" }}>
              Property Link Mappings
            </Typography>
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setOpenLinkDialog(true)}>
              Add Link
            </Button>
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: `${radii.lg}px` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "rgba(0,51,102,0.04)" }}>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Property</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Normal Link</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Affiliate Link</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Portal</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.map((prop) => (
                  <TableRow key={prop.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{prop.title}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {prop.normalLink.slice(0, 30)}...
                        </Typography>
                        <IconButton size="small" onClick={() => handleCopyLink(prop.normalLink)}>
                          {copied === prop.normalLink ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {prop.affiliateLink.slice(0, 30)}...
                        </Typography>
                        <IconButton size="small" onClick={() => handleCopyLink(prop.affiliateLink)}>
                          {copied === prop.affiliateLink ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {prop.portal}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => { setEditingProperty(prop); setOpenLinkDialog(true); }}>
                          <Edit2 size={14} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteProperty(prop.id)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>

      {/* Add Portal Dialog */}
      <Dialog open={openPortalDialog} onClose={() => { setOpenPortalDialog(false); setEditingPortal(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Add Affiliate Portal</DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Stack spacing={2}>
            <TextField fullWidth label="Portal Name" placeholder="e.g., 99acres" value={newPortal.name} onChange={(e) => setNewPortal({ ...newPortal, name: e.target.value })} />
            <TextField fullWidth label="Base URL" placeholder="https://example.com" value={newPortal.baseUrl} onChange={(e) => setNewPortal({ ...newPortal, baseUrl: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPortalDialog(false); setEditingPortal(null); }}>Cancel</Button>
          <Button onClick={handleAddPortal} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={openLinkDialog} onClose={() => { setOpenLinkDialog(false); setEditingProperty(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Add Property Link Mapping</DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Stack spacing={2}>
            <TextField fullWidth label="Property Title" placeholder="e.g., 3 BHK in Sector 46" value={newProperty.title} onChange={(e) => setNewProperty({ ...newProperty, title: e.target.value })} />
            <TextField fullWidth label="Normal Link" placeholder="/Rentaldetails/prop-id" value={newProperty.normalLink} onChange={(e) => setNewProperty({ ...newProperty, normalLink: e.target.value })} />
            <TextField fullWidth label="Affiliate Link" placeholder="https://portal.com/listing/..." value={newProperty.affiliateLink} onChange={(e) => setNewProperty({ ...newProperty, affiliateLink: e.target.value })} />
            <TextField select label="Portal" value={newProperty.portal} onChange={(e) => setNewProperty({ ...newProperty, portal: e.target.value })} SelectProps={{ native: true }}>
              <option value="99acres">99acres</option>
              <option value="nobroker">NoBroker</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenLinkDialog(false); setEditingProperty(null); }}>Cancel</Button>
          <Button onClick={handleAddProperty} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
