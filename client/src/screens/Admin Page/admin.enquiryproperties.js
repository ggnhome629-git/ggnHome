import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { staggerContainerVariants, staggerItemVariants } from "../../theme/motion";
import {
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MapPin,
  Home,
  Eye,
  MessageSquare,
  Filter,
  Download,
  User, // Added
} from "lucide-react";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AdminEnquiryProperties = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Pagination state for enquiries
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10); // fixed page size
  const [totalEnquiries, setTotalEnquiries] = useState(0);

  const isMobile = useMemo(() => window.innerWidth <= 768, []);

  const fetchEnquiries = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/enquiry?page=${page}&limit=${pageSize}`,
        {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Error fetching enquiries: ${response.statusText}`);
      }
      const data = await response.json();
      setEnquiries(data.enquiries || []);
      setTotalEnquiries(data.totalEnquiries || (Array.isArray(data.enquiries) ? data.enquiries.length : 0));
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("accessToken");
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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

  const deleteEnquiry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      // Call admin delete route (protected)
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/admin/api/deleteenquiry/${id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || `Error deleting enquiry: ${response.statusText}`);
      }

      // Remove from UI list
      setEnquiries((prev) => prev.filter((enq) => enq._id !== id));
      setTotalEnquiries((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(`Failed to delete enquiry: ${err.message}`);
      console.error('Delete enquiry failed', err);
    }
  };

  useEffect(() => {
    fetchEnquiries(currentPage);
  }, [currentPage]);

  const styles = {
    pageWrapper: {
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      paddingTop: "0px",
      overflowX: "hidden",
    },
    container: {
      maxWidth: "1400px",
      margin: "0 auto",
      padding: isMobile ? "16px 12px" : "32px 24px",
    },
    header: {
      marginBottom: "32px",
    },
    headerTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? "16px" : "0",
      marginBottom: "24px",
    },
    titleSection: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    title: {
      fontSize: isMobile ? "22px" : "32px",
      fontWeight: "700",
      color: "#0f172a",
      margin: 0,
      letterSpacing: "-0.5px",
    },
    subtitle: {
      fontSize: "15px",
      color: "#64748b",
      margin: 0,
    },
    headerActions: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
    },
    refreshButton: {
      backgroundColor: "#ffffff",
      color: "#475569",
      border: "1px solid #e2e8f0",
      padding: "10px 18px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    statsBar: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
      gap: "16px",
      padding: "20px",
      backgroundColor: "#ffffff",
      borderRadius: "14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
      border: "1px solid #e2e8f0",
    },
    statCard: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    statLabel: {
      fontSize: "13px",
      color: "#64748b",
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    statValue: {
      fontSize: isMobile ? "22px" : "28px",
      fontWeight: "800",
      color: "#020617",
    },
    mainCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      border: "1px solid #e2e8f0",
      overflow: "hidden",
    },
    tableWrapper: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      tableLayout: isMobile ? "auto" : "fixed",
    },
    thead: {
      backgroundColor: "#f8fafc",
      borderBottom: "2px solid #e2e8f0",
      display: isMobile ? "none" : "table-header-group",
    },
    th: {
      color: "#475569",
      padding: "16px 20px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      whiteSpace: "nowrap",
    },
    tr: {
      borderBottom: "1px solid #f1f5f9",
      transition: "all 0.15s ease",
      borderRadius: isMobile ? "12px" : "0",
      marginBottom: isMobile ? "16px" : "0",
      backgroundColor: isMobile ? "#f8fafc" : "#ffffff",
      boxShadow: isMobile ? "0 6px 16px rgba(15,23,42,0.06)" : "none",
    },
    td: {
      padding: isMobile ? "12px" : "20px",
      color: "#334155",
      fontSize: "14px",
      verticalAlign: "top",
      whiteSpace: "normal",
      wordBreak: "break-word",
      width: "100%",
    },
    propertyCard: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "100%",
    },
    propertyHeader: {
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      paddingBottom: "8px",
      borderBottom: "1px solid #f1f5f9",
    },
    propertyAddress: {
      fontWeight: "600",
      color: "#0f172a",
      fontSize: "14px",
      lineHeight: "1.4",
      flex: 1,
    },
    propertyDetails: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    propertyDetail: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#64748b",
    },
    propertyIcon: {
      color: "#94a3b8",
      flexShrink: 0,
    },
    price: {
      fontWeight: "700",
      color: "#10b981",
      fontSize: "16px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    userCard: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "100%",
    },
    contactRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#475569",
      padding: "6px 0",
    },
    contactIcon: {
      color: "#94a3b8",
      flexShrink: 0,
    },
    messageBox: {
      width: "100%",
    },
    messageContent: {
      backgroundColor: "#f8fafc",
      padding: "12px 14px",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      fontSize: "13px",
      lineHeight: "1.6",
      color: "#475569",
    },
    dateBox: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      fontSize: "13px",
      color: "#64748b",
      minWidth: "140px",
    },
    dateRow: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    actionButtons: {
      display: "flex",
      flexDirection: isMobile ? "row" : "column",
      gap: "10px",
      width: isMobile ? "100%" : "120px",
      alignItems: "center",
    },
    viewButton: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
      boxShadow: "0 2px 6px rgba(37,99,235,0.4)",
    },
    deleteButton: {
      backgroundColor: "#ffffff",
      color: "#dc2626",
      border: "1px solid #fecaca",
      padding: "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
    },
    loadingContainer: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "80px 20px",
      gap: "20px",
    },
    spinner: {
      width: "48px",
      height: "48px",
      border: "4px solid #f1f5f9",
      borderTop: "4px solid #3b82f6",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
    loadingText: {
      color: "#64748b",
      fontSize: "14px",
      fontWeight: "500",
    },
    emptyState: {
      textAlign: "center",
      padding: "80px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    },
    emptyIcon: {
      width: "64px",
      height: "64px",
      backgroundColor: "#f1f5f9",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "8px",
    },
    emptyTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#0f172a",
      margin: 0,
    },
    emptyDescription: {
      fontSize: "14px",
      color: "#64748b",
      margin: 0,
    },
    errorState: {
      backgroundColor: "#fef2f2",
      color: "#991b1b",
      padding: "16px 20px",
      margin: "20px",
      borderRadius: "10px",
      border: "1px solid #fee2e2",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
  };

  const keyframesStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .fade-out {
      animation: fadeOut 0.4s ease-in forwards;
    }
  `;

  return (
    <div style={styles.pageWrapper}>
      <style>{keyframesStyle}</style>
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
      {/* Spacer to push content below fixed navbar */}
      <div style={{ height: 72 }} />

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Property Enquiries</h1>
              <p style={styles.subtitle}>Manage and track all customer enquiries</p>
            </div>
            <div style={styles.headerActions}>
              <button
                style={styles.refreshButton}
                onClick={() => fetchEnquiries(currentPage)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
          
          <div style={styles.statsBar}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Enquiries</span>
              <span style={styles.statValue}>{totalEnquiries}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>This Month</span>
              <span style={styles.statValue}>
                {enquiries.filter(e => { const date = new Date(e.createdAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }).length}
              </span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Today</span>
              <span style={styles.statValue}>
                {enquiries.filter(e => { const date = new Date(e.createdAt); const now = new Date(); return date.toDateString() === now.toDateString(); }).length}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.mainCard}>
          {loadingProperty && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(255,255,255,0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999
            }}>
              <div style={styles.spinner}></div>
              <span style={styles.loadingText}>Loading property details...</span>
            </div>
          )}
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <span style={styles.loadingText}>Loading enquiries...</span>
            </div>
          )}

          {error && (
            <div style={styles.errorState}>
              <strong>⚠</strong> {error}
            </div>
          )}

          {!loading && !error && enquiries.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <MessageSquare size={32} color="#94a3b8" />
              </div>
              <h3 style={styles.emptyTitle}>No enquiries yet</h3>
              <p style={styles.emptyDescription}>
                When customers submit enquiries, they will appear here.
              </p>
            </div>
          )}

          {!loading && !error && enquiries.length > 0 && ( <React.Fragment>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                gap: 12,
                flexWrap: isMobile ? 'wrap' : 'nowrap'
              }}
            >
              <div style={{ fontSize: 14, color: '#64748b' }}>Showing page {currentPage} of {totalPages} — {totalEnquiries} enquiries total</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E0E7EE', background: currentPage <= 1 ? '#F4F7F9' : '#003366', color: '#FFFFFF', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <div style={{ fontWeight: 600, color: '#003366' }}>Page {currentPage} of {totalPages}</div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E0E7EE', background: currentPage >= totalPages ? '#F4F7F9' : '#003366', color: '#FFFFFF', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table
                style={{
                  ...styles.table,
                  display: isMobile ? "block" : "table",
                }}
              >
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>Property</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Message</th>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainerVariants}
                  style={{ display: isMobile ? "block" : "table-row-group" }}
                >
                  {enquiries.map((enquiry, index) => (
                    <motion.tr
                      key={enquiry._id}
                      variants={staggerItemVariants}
                      style={{
                        ...styles.tr,
                        display: isMobile ? "block" : "table-row",
                        padding: isMobile ? "12px 0" : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            PROPERTY
                          </div>
                        )}
                        <div style={styles.propertyCard}>
                          <div style={styles.propertyHeader}>
                            <MapPin size={16} style={styles.propertyIcon} />
                            <span style={styles.propertyAddress}>
                              {enquiry.propertyAddress || "N/A"}
                            </span>
                          </div>
                          <div style={styles.propertyDetails}>
                            <div style={styles.propertyDetail}>
                              <Home size={14} style={styles.propertyIcon} />
                              <span>{enquiry.propertyType || "N/A"}</span>
                            </div>
                            <div style={styles.price}>
                              <DollarSign size={16} />
                              {enquiry.propertyPrice ? enquiry.propertyPrice.toLocaleString() : "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Owner column */}
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            OWNER
                          </div>
                        )}
                        <div style={styles.userCard}>
                          {enquiry.owner ? (
                            <>
                              <div style={styles.contactRow}>
                                <Mail size={14} style={styles.contactIcon} />
                                <span>{enquiry.owner.email || "N/A"}</span>
                              </div>
                              <div style={styles.contactRow}>
                                <Phone size={14} style={styles.contactIcon} />
                                <span>{enquiry.owner.mobileNumber || "N/A"}</span>
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "13px" }}>No owner found</span>
                          )}
                        </div>
                      </td>
                      {/* Customer column */}
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            CUSTOMER
                          </div>
                        )}
                        <div style={styles.userCard}>
                          <div style={styles.contactRow}>
                            <Mail size={14} style={styles.contactIcon} />
                            <span>{enquiry.userEmail || "N/A"}</span>
                          </div>
                          <div style={styles.contactRow}>
                            <Phone size={14} style={styles.contactIcon} />
                            <span>{enquiry.userMobile || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            MESSAGE
                          </div>
                        )}
                        <div style={styles.messageBox}>
                          <div style={styles.messageContent}>
                            {enquiry.message || "No message provided"}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            DATE
                          </div>
                        )}
                        <div style={styles.dateBox}>
                          <div style={styles.dateRow}>
                            <Calendar size={14} style={styles.contactIcon} />
                            {new Date(enquiry.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{paddingLeft: "22px", fontSize: "12px", color: "#94a3b8"}}>
                            {new Date(enquiry.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, display: isMobile ? "block" : "table-cell" }}>
                        {isMobile && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 6,
                              borderBottom: "1px dashed #e2e8f0",
                              paddingBottom: 4,
                            }}
                          >
                            ACTIONS
                          </div>
                        )}
                        <div style={styles.actionButtons}>
                          {enquiry.propertyId && (
                            <button
                              style={styles.viewButton}
                              onClick={() => {
                                const propertyId = enquiry.propertyId;
                                const type = enquiry.propertyType;

                                if (type === "rental") {
                                  navigate(`/Rentaldetails/${propertyId}`);
                                } else if (type === "sale") {
                                  navigate(`/Saledetails/${propertyId}`);
                                } else {
                                  alert("⚠️ Could not determine property type.");
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#1d4ed8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                            >
                              <Eye size={14} />
                              View
                            </button>
                          )}
                          <button
                            style={styles.deleteButton}
                            onClick={() => deleteEnquiry(enquiry._id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#fee2e2";
                              e.currentTarget.style.borderColor = "#fecaca";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ffffff";
                              e.currentTarget.style.borderColor = "#fee2e2";
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: 12,
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}
              >
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E7EE', background: currentPage <= 1 ? '#F4F7F9' : '#003366', color: '#FFFFFF', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <div style={{ alignSelf: 'center', color: '#64748b' }}>Page {currentPage} of {totalPages}</div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E7EE', background: currentPage >= totalPages ? '#F4F7F9' : '#003366', color: '#FFFFFF', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          </React.Fragment>)}
        </div>
      </div>
    </div>
  );
};

export default AdminEnquiryProperties;