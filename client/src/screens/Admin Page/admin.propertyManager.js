import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { StaggerContainer, StaggerItem } from "../../components/motion";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import EditPropertyModal from "./admin.editpropertymodel";
import TopNavigationBar from "../Dashboard/TopNavigationBar";

/**
 * Helper: normalize listing type to canonical values "rental" or "sale"
 */
const normalizeListingType = (val) => {
  if (val === null || val === undefined) return null;
  const v = String(val).trim().toLowerCase();
  if (!v) return null;
  if (v === 'rental' || v === 'rent' || v === 'r') return 'rental';
  if (v === 'sale' || v === 'sell' || v === 's') return 'sale';
  if (v.includes('rent')) return 'rental';
  if (v.includes('sale')) return 'sale';
  return null;
};

/**
 * Helper: pick best date field from a property and return a Date object
 */
const getPropertyDate = (p) => {
  const candidates = [p.createdAt, p.postedAt, p.updatedAt, p.datePosted, p.created_at];
  for (const c of candidates) {
    if (c) {
      const d = new Date(c);
      if (!isNaN(d)) return d;
    }
  }
  return new Date(0);
};

const AdminPropertyManager = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, notReviewed: 0, active: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const PROPERTIES_PER_PAGE = 10;
  const [user, setUser] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // NEW: "all" | "active" | "pending" | "reviewed"
  const navigate = useNavigate();
  const isMobile = useMemo(() => window.innerWidth <= 768, []);
  const styles = useMemo(() => getStyles(isMobile), [isMobile]);

  // Get access token from localStorage for all protected admin API calls
  const accessToken = localStorage.getItem("accessToken");

  const fetchAllProperties = async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_Base_API}/api/properties?page=${page}&limit=${PROPERTIES_PER_PAGE}&sortBy=createdAt&order=desc`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      const data = response.data || {};
      const pageProperties = Array.isArray(data.properties) ? data.properties : [];
      const total = typeof data.total === 'number' ? data.total : pageProperties.length;

      // Normalize and ensure newest-first
      const normalized = pageProperties
        .map(p => {
          const canonicalType = normalizeListingType(p.defaultpropertytype || p.propertyType);
          return {
            ...p,
            isReviewed: !!p.isReviewed,
            defaultpropertytype: canonicalType || (p.defaultpropertytype || p.propertyType || null),
          };
        })
        .sort((a, b) => getPropertyDate(b) - getPropertyDate(a)); // newest first

      setProperties(normalized);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || page);

      const reviewed = normalized.filter(p => p.isReviewed);
      const notReviewed = normalized.filter(p => !p.isReviewed);
      setStats({
        total: total,
        reviewed: reviewed.length,
        notReviewed: notReviewed.length,
        active: normalized.filter(p => p.isActive).length
      });
    } catch (err) {
      console.error("Error loading properties:", err);
      setError("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProperties(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  const toggleActive = async (propertyId) => {
    try {
      const property = properties.find((p) => p._id === propertyId);
      if (!property) return;

      const newIsActive = !property.isActive;
      const payload = { isActive: newIsActive, isPostedNew: false };

      const res = await axios.patch(
        `${process.env.REACT_APP_Base_API}/api/admin/property/${propertyId}/toggle-active`,
        payload,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      const updatedFromServer = res.data && (res.data.property || res.data);

      setProperties((prev) => {
        const updated = prev.map((p) =>
          p._id === propertyId
            ? { ...p, ...(updatedFromServer && typeof updatedFromServer === 'object' ? updatedFromServer : { isActive: newIsActive, isPostedNew: false }) }
            : p
        );

        const activeCount = updated.filter((p) => p.isActive).length;
        setStats((s) => ({ ...s, active: activeCount }));

        return updated;
      });
    } catch (err) {
      console.error('Error toggling active state:', err);
      toast.error('Failed to toggle active state');
    }
  };

  const toggleReview = async (propertyId) => {
    try {
      const property = properties.find((p) => p._id === propertyId);
      if (!property) return;

      const res = await axios.patch(
        `${process.env.REACT_APP_Base_API}/api/admin/property/${propertyId}/toggle-review`,
        {},
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      const reviewRecord = res.data?.reviewRecord;
      const newIsReviewed = reviewRecord ? !!reviewRecord.isReviewed : !property.isReviewed;

      const updatedProperty = {
        ...property,
        isReviewed: newIsReviewed,
        isPostedNew: false,
      };

      setProperties((prev) => prev.map((p) => (p._id === propertyId ? updatedProperty : p)));

      setStats((prev) => ({
        ...prev,
        reviewed: Math.max(0, prev.reviewed + (newIsReviewed ? 1 : -1)),
        notReviewed: Math.max(0, prev.notReviewed + (newIsReviewed ? -1 : 1)),
      }));
    } catch (err) {
      console.error('Error toggling review status:', err);
      toast.error('Failed to toggle review status');
    }
  };

  const openDeleteModal = (propertyId) => {
    setDeletingPropertyId(propertyId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeletingPropertyId(null);
    setShowDeleteModal(false);
  };

  const confirmDelete = async () => {
    if (!deletingPropertyId) return;
    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_Base_API}/api/admin/delete-property/${deletingPropertyId}`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      setProperties((prev) => prev.filter((p) => p._id !== deletingPropertyId));
      setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      toast.success('Property deleted successfully');
    } catch (err) {
      console.error('Error deleting property:', err);
      toast.error('Failed to delete property. See console for details.');
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  // NEW: compute filtered list based on filterStatus
  const getFilteredProperties = () => {
    if (!properties || properties.length === 0) return [];
    switch (filterStatus) {
      case "active":
        return properties.filter(p => p.isActive);
      case "pending":
        return properties.filter(p => !p.isReviewed);
      case "reviewed":
        return properties.filter(p => p.isReviewed);
      case "all":
      default:
        return properties;
    }
  };

  const filteredProperties = getFilteredProperties();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading properties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "12px" }}>
          <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="2"/>
          <path d="M12 8v4m0 4h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p style={styles.errorText}>{error}</p>
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
          backgroundColor: "#FFFFFF",
        }}
      >
        <TopNavigationBar
          user={user}
          handleLogout={handleLogout}
          navItems={["For Buyers","For Tenants","For Owners","For Dealers / Builders","Insights"]}
        />
      </div>

      <div style={{ height: 72 }} />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>Property Management</h1>
          <p style={styles.subtitle}>
            Showing {filteredProperties.length} of {stats.total} properties
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <p style={styles.statNumber}>{stats.notReviewed}</p>
              <p style={styles.statLabel}>Pending</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statNumber}>{stats.reviewed}</p>
              <p style={styles.statLabel}>Reviewed</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statNumber}>{stats.active}</p>
              <p style={styles.statLabel}>Active</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statNumber}>{stats.total}</p>
              <p style={styles.statLabel}>Total</p>
            </div>
          </div>

          {/* NEW: Filter / Sort header */}
          <div style={styles.filterBar}>
            <span style={styles.filterLabel}>Sort / Filter:</span>
            <div style={styles.filterButtons}>
              <button
                onClick={() => setFilterStatus("all")}
                style={{ ...styles.filterButton, ...(filterStatus === "all" ? styles.filterButtonActive : {}) }}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                style={{ ...styles.filterButton, ...(filterStatus === "active" ? styles.filterButtonActive : {}) }}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("pending")}
                style={{ ...styles.filterButton, ...(filterStatus === "pending" ? styles.filterButtonActive : {}) }}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus("reviewed")}
                style={{ ...styles.filterButton, ...(filterStatus === "reviewed" ? styles.filterButtonActive : {}) }}
              >
                Reviewed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Single list of properties */}
      <StaggerContainer style={styles.listContainer}>
        {filteredProperties.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No properties found.</p>
          </div>
        ) : (
          filteredProperties.map((property) => (
            <StaggerItem key={property._id} style={styles.listItem} className="admin-list-item">
              <div style={styles.left}>
                <div style={styles.thumbWrap}>
                  {property.images && property.images.length > 0 ? (
                    <img src={property.images[0]} alt="Property" style={styles.thumbnail} />
                  ) : (
                    <div style={styles.noImage}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#4A6A8A" strokeWidth="2"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div style={styles.info}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <h4 style={styles.title}>{property.propertyType || property.title || 'Untitled'}</h4>
                    <div style={styles.badges}>
                      <span style={{
                        ...styles.compactBadge,
                        background: property.defaultpropertytype === "rental" ? "#D1FAE5" : "#FED7AA",
                        color: property.defaultpropertytype === "rental" ? "#065F46" : "#92400E"
                      }}>
                        {property.defaultpropertytype === "rental" ? "Rental" : property.defaultpropertytype === "sale" ? "Sale" : String(property.defaultpropertytype || 'N/A')}
                      </span>
                      <span style={{
                        ...styles.compactBadge,
                        background: property.isActive ? "#D1FAE5" : "#FEE2E2",
                        color: property.isActive ? "#065F46" : "#991B1B"
                      }}>
                        {property.isActive ? "Active" : "Inactive"}
                      </span>
                      <span style={{
                        ...styles.compactBadge,
                        background: property.isReviewed ? "#E0E7FF" : "#DBEAFE",
                        color: property.isReviewed ? "#374151" : "#003366"
                      }}>
                        {property.isReviewed ? "Reviewed" : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.meta}>
                    <span style={styles.metaText}>{property.address || "N/A"}</span>
                    <span style={styles.metaText}>• {property.purpose || '—'}</span>
                    <span style={styles.metaText}>• Listing: {property.ownerType || 'N.A'}</span>
                    <span style={styles.metaText}>• Posted: {property.createdAt ? new Date(property.createdAt).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>

              <div style={styles.actions}>
                <button
                  onClick={() => toggleActive(property._id)}
                  style={{
                    ...styles.actionButton,
                    background: property.isActive ? "#FEE2E2" : "#D1FAE5",
                    color: property.isActive ? "#DC2626" : "#00A79D"
                  }}
                  title={property.isActive ? "Deactivate Property" : "Activate Property"}
                >
                  {property.isActive ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => toggleReview(property._id)}
                  style={{
                    ...styles.actionButton,
                    background: property.isReviewed ? "#E0E7FF" : "#DBEAFE",
                    color: property.isReviewed ? "#374151" : "#003366"
                  }}
                  title={property.isReviewed ? "Unmark Reviewed" : "Mark Reviewed"}
                >
                  {property.isReviewed ? "Unmark Review" : "Mark Reviewed"}
                </button>

                <button
                  onClick={() => { setEditingPropertyId(property._id); setIsEditModalOpen(true); }}
                  style={{ ...styles.actionButton, background: "#FEF3C7", color: "#92400E" }}
                  title="Edit Property"
                >
                  Edit
                </button>

                <button
                  onClick={() => openDeleteModal(property._id)}
                  style={{ ...styles.actionButton, background: "#FEE2E2", color: "#DC2626" }}
                  title="Delete Property"
                >
                  Delete
                </button>
              </div>
            </StaggerItem>
          ))
        )}
      </StaggerContainer>

      {/* Pagination */}
      <div style={styles.pagination}>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={styles.pageButton}
        >
          Prev
        </button>
        <span style={{ margin: "0 12px", color: "#4A6A8A" }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          style={styles.pageButton}
        >
          Next
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: 0, color: '#003366' }}>Confirm Delete</h3>
            <p style={{ color: '#4A6A8A', marginTop: 8 }}>
              This property will be deleted from our database. To keep it in the database, mark the property as inactive instead.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={closeDeleteModal} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#FFF' }} disabled={isDeleting}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#FFF' }} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {isEditModalOpen && (
        <EditPropertyModal
          isOpen={isEditModalOpen}
          propertyId={editingPropertyId}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            fetchAllProperties();
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Styles
const getStyles = (isMobile) => ({
  container: {
    minHeight: "100vh",
    background: "#F4F7F9",
    padding: isMobile ? "12px" : "24px",
  },
  header: {
    background: "#FFFFFF",
    borderRadius: "14px",
    padding: isMobile ? "16px" : "24px",
    marginBottom: "16px",
    boxShadow: "0 8px 24px rgba(0, 51, 102, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: isMobile ? "flex-start" : "center",
    flexDirection: isMobile ? "column" : "row",
    gap: "16px",
  },
  mainTitle: {
    fontSize: isMobile ? "22px" : "28px",
    fontWeight: "700",
    color: "#003366",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#4A6A8A",
    margin: 0,
  },
  statsContainer: {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, auto)",
    gap: "12px",
  },
  statCard: {
    background: "linear-gradient(135deg, #003366 0%, #2563eb 100%)",
    padding: "14px 16px",
    borderRadius: "10px",
    minWidth: "80px",
    textAlign: "center",
    transition: "transform .2s ease, box-shadow .2s ease",
    boxShadow: "0 4px 14px rgba(0,0,0,.12)",
  },
  statNumber: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#FFFFFF",
    margin: "0 0 2px 0",
  },
  statLabel: {
    fontSize: "11px",
    color: "#E0E7EE",
    margin: 0,
    fontWeight: "500",
  },
  // NEW: filter bar styles
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: "#4A6A8A",
    fontWeight: 600,
  },
  filterButtons: {
    display: "flex",
    gap: 8,
  },
  filterButton: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #E5E7EB",
    background: "#FFF",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    color: "#003366",
  },
  filterButtonActive: {
    background: "#003366",
    color: "#FFF",
    border: "1px solid #003366"
  },
  listContainer: {
    background: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  listItem: {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: isMobile ? "flex-start" : "center",
    borderBottom: "1px solid #F4F7F9",
    padding: "12px",
    borderRadius: "12px",
    transition: "background .2s ease, box-shadow .2s ease",
  },
  left: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    flex: 1,
  },
  thumbWrap: {
    flexShrink: 0,
  },
  thumbnail: {
    width: isMobile ? "100%" : "120px",
    height: isMobile ? "180px" : "80px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  noImage: {
    width: isMobile ? "100%" : "120px",
    height: isMobile ? "180px" : "80px",
    background: "#F4F7F9",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#003366",
    margin: 0,
    display: "inline-block"
  },
  badges: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  compactBadge: {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  meta: {
    marginTop: 8,
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    color: "#4A6A8A",
  },
  actions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: isMobile ? "wrap" : "nowrap",
    width: isMobile ? "100%" : "auto",
  },
  actionButton: {
    border: "none",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    flex: isMobile ? "1 1 calc(50% - 8px)" : "none",
    transition: "transform .15s ease, box-shadow .15s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,.12)",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px 0",
    gap: 8,
  },
  pageButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#003366",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#F4F7F9",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #E5E7EB",
    borderTop: "4px solid #003366",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "20px",
    fontSize: "16px",
    color: "#4A6A8A",
    fontWeight: "500",
  },
  emptyState: {
    padding: "40px 12px",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "14px",
    color: "#4A6A8A",
    margin: 0,
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#F4F7F9",
    padding: "20px",
  },
  errorText: {
    fontSize: "16px",
    color: "#DC2626",
    fontWeight: "500",
  },
});

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalStyle = {
  background: '#FFF',
  padding: 20,
  borderRadius: 10,
  maxWidth: 560,
  width: '90%',
  boxShadow: '0 6px 24px rgba(0,0,0,0.16)'
};

// Add keyframes for spinner animation and enhanced hover style
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .admin-list-item:hover {
    background: #F8FAFF;
    box-shadow: 0 6px 18px rgba(0,0,0,.06);
  }
`;
document.head.appendChild(styleSheet);

export default AdminPropertyManager;