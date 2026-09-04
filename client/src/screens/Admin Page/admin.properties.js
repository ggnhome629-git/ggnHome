import { useState, useEffect } from "react";
import axios from "axios";
import { Check, X, Home, Gift, Bell, CheckCircle, XCircle, Clock, User, DollarSign, Calendar, AlertCircle } from "lucide-react";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useNavigate } from "react-router-dom";

export default function AdminProperties() {
  const [activeTab, setActiveTab] = useState("approvals");
  const [approvals, setApprovals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Always get access token from localStorage for protected admin APIs
  const accessToken = localStorage.getItem("accessToken");


  // Fetch approved payments for rewards tab
  useEffect(() => {
    if (activeTab === "rewards") {
      fetchApprovedPayments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "approvals") {
      fetchPendingPayments();
    }
  }, [activeTab]);


  const fetchApprovedPayments = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_ADMIN_APPROVED_PAYMENTS_API}`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      const rewardsData = response.data.map((p, index) => ({
        id: index + 1,
        paymentId: p._id,
        email: p.resident?.email || "N/A",
        residentName: p.resident?.name || "N/A",
        residentId: p.resident?._id,
        propertyName: p.property?.title || "N/A",
        amount: p.amount,
        createdAt: p.createdAt,
        points: 0,
        tier: "New",
        eligible: true,
      }));
      setRewards(rewardsData);
      console.log("Approved payments fetched for rewards:", rewardsData);
    } catch (error) {
      console.error("Error fetching approved payments:", error);
      setError("Error fetching approved payments");
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_ADMIN_PENDING_PAYMENTS_API}`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      setApprovals(response.data);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      setError("Error fetching pending payments");
    }
  };

  const handleApproval = async (id, action) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_ADMIN_UPDATE_PAYMENT_STATUS_API}`,
        { paymentId: id, status: action },
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      fetchPendingPayments();
      // No rewards update here; rewards are fetched dynamically when rewards tab is opened
    } catch (error) {
      console.error("Error updating payment status:", error);
      setError("Error updating payment status");
    }
  };

  const distributeReward = async (id) => {
    try {
      const selectedReward = rewards.find((item) => item.id === id);
      if (!selectedReward) return;

      await axios.post(
        `${process.env.REACT_APP_ADMIN_DISTRIBUTE_REWARD_API}`,
        { email: selectedReward.email },
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      setRewards(
        rewards.map((item) =>
          item.id === id ? { ...item, eligible: false } : item
        )
      );

      alert(`Reward distributed successfully to ${selectedReward.email}`);
    } catch (error) {
      console.error("Error distributing reward:", error);
      alert("Failed to distribute reward.");
    }
  };


  const handleLogout = async () => {
    await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
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
        const res = await fetch(`${process.env.REACT_APP_USER_ME_API}`, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) {
        
          setUser(data);
        } else {
          navigate("/login"); // redirect if not logged in
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login"); // redirect on error
      }
    };
    fetchUser();
  }, [navigate]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#F4F7F9",
    },
    header: {
      backgroundColor: "#003366",
      color: "#FFFFFF",
      padding: "30px 40px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
    },
    headerTitle: {
      fontSize: "32px",
      fontWeight: "bold",
      marginBottom: "8px",
      margin: 0
    },
    headerSubtitle: {
      fontSize: "16px",
      opacity: 0.9,
      margin: 0
    },
    navTabs: {
      background: "#FFFFFF",
      padding: "0 40px",
      display: "flex",
      gap: "10px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      borderBottom: "2px solid #E5E7EB"
    },
    tab: (active) => ({
      background: "transparent",
      color: active ? "#003366" : "#4A6A8A",
      border: "none",
      padding: "15px 25px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "600",
      borderBottom: active ? "3px solid #00A79D" : "3px solid transparent",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "-2px"
    }),
    content: {
      padding: "40px"
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "30px"
    },
    statCard: {
      backgroundColor: "#FFFFFF",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      display: "flex",
      alignItems: "center",
      gap: "16px"
    },
    statIcon: (bgColor) => ({
      width: "56px",
      height: "56px",
      borderRadius: "12px",
      backgroundColor: bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#FFFFFF"
    }),
    statContent: {
      flex: 1
    },
    statLabel: {
      fontSize: "14px",
      color: "#4A6A8A",
      marginBottom: "4px"
    },
    statValue: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#003366"
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
      gap: "20px"
    },
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      transition: "transform 0.2s, box-shadow 0.2s"
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
      paddingBottom: "16px",
      borderBottom: "2px solid #F4F7F9"
    },
    cardHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#003366"
    },
    statusBadge: (status) => ({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "600",
      backgroundColor: status === 'pending' ? '#FEF3C7' : '#D1FAE5',
      color: status === 'pending' ? '#92400E' : '#065F46'
    }),
    cardBody: {
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    },
    infoRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px"
    },
    infoLabel: {
      color: "#4A6A8A",
      fontWeight: "500"
    },
    infoValue: {
      color: "#333333",
      fontWeight: "600",
      marginLeft: "auto"
    },
    cardActions: {
      display: "flex",
      gap: "12px",
      marginTop: "20px",
      paddingTop: "16px",
      borderTop: "2px solid #F4F7F9"
    },
    approveButton: {
      flex: 1,
      backgroundColor: "#00A79D",
      color: "#FFFFFF",
      border: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "background-color 0.3s"
    },
    rejectButton: {
      flex: 1,
      backgroundColor: "#EF4444",
      color: "#FFFFFF",
      border: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "background-color 0.3s"
    },
    distributeButton: (eligible) => ({
      width: "100%",
      backgroundColor: eligible ? "#00A79D" : "#E5E7EB",
      color: eligible ? "#FFFFFF" : "#9CA3AF",
      border: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: eligible ? "pointer" : "not-allowed",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "background-color 0.3s"
    }),
    error: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      color: "#4A6A8A",
      gridColumn: "1 / -1"
    },
    emptyIcon: {
      marginBottom: "16px",
      color: "#00A79D"
    },
    propertiesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "20px"
    },
    propertyCard: {
      background: "#FFFFFF",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      transition: "all 0.3s ease"
    },
    propertyImage: {
      width: "100%",
      height: "180px",
      objectFit: "cover",
      borderRadius: "8px",
      marginBottom: "12px"
    },
    uploadSection: {
      backgroundColor: "#FFFFFF",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
    }
  };

  return (
    <div style={styles.container}>
      <TopNavigationBar navItems={navItems} user={user} handleLogout={handleLogout} />

      {/* Navigation Tabs */}
      <div style={styles.navTabs}>
        {[
          { id: "approvals", label: "Approvals", icon: Bell },
          { id: "rewards", label: "Rewards", icon: Gift },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={styles.tab(activeTab === tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {error && (
          <div style={styles.error}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <>
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statIcon('#FCD34D')}>
                  <Clock size={28} />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Pending Payments</div>
                  <div style={styles.statValue}>{approvals.length}</div>
                </div>
              </div>
            </div>

            <div style={styles.grid}>
              {approvals.length > 0 ? (
                approvals.map((approval) => (
                  <div key={approval._id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardHeaderLeft}>
                        <User size={20} style={{ color: '#00A79D' }} />
                        <span style={styles.cardTitle}>{approval.resident?.name || approval.residentName || 'N/A'}</span>
                      </div>
                      <div style={styles.statusBadge('pending')}>
                        <Clock size={14} />
                        <span>PENDING</span>
                      </div>
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.infoRow}>
                        <Home size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Property:</span>
                        <span style={styles.infoValue}>{approval.property?.title || approval.propertyName || 'N/A'}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <DollarSign size={16} style={{ color: '#00A79D' }} />
                        <span style={styles.infoLabel}>Amount:</span>
                        <span style={styles.infoValue}>₹{approval.amount?.toLocaleString() || 'N/A'}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <Calendar size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Method:</span>
                        <span style={styles.infoValue}>{approval.paymentMethod || 'N/A'}</span>
                      </div>

                      {approval.resident?.email && (
                        <div style={styles.infoRow}>
                          <User size={16} style={{ color: '#4A6A8A' }} />
                          <span style={styles.infoLabel}>Email:</span>
                          <span style={styles.infoValue}>{approval.resident.email}</span>
                        </div>
                      )}
                    </div>

                    {approval.status === "pending" && (
                      <div style={styles.cardActions}>
                        <button
                          style={styles.approveButton}
                          onClick={() => handleApproval(approval._id, "approved")}
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          style={styles.rejectButton}
                          onClick={() => handleApproval(approval._id, "rejected")}
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>
                  <Clock size={48} style={styles.emptyIcon} />
                  <p>No pending payments</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Rewards Tab */}
        {activeTab === "rewards" && (
          <>
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statIcon('#22D3EE')}>
                  <Gift size={28} />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Approved Payments</div>
                  <div style={styles.statValue}>{rewards.length}</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon('#00A79D')}>
                  <CheckCircle size={28} />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Eligible for Rewards</div>
                  <div style={styles.statValue}>{rewards.filter(r => r.eligible).length}</div>
                </div>
              </div>
            </div>

            <div style={styles.grid}>
              {rewards.length > 0 ? (
                rewards.map((reward) => (
                  <div key={reward.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardHeaderLeft}>
                        <User size={20} style={{ color: '#00A79D' }} />
                        <span style={styles.cardTitle}>{reward.residentName}</span>
                      </div>
                      <div style={styles.statusBadge('approved')}>
                        <CheckCircle size={14} />
                        <span>APPROVED</span>
                      </div>
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.infoRow}>
                        <Home size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Property:</span>
                        <span style={styles.infoValue}>{reward.propertyName}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <DollarSign size={16} style={{ color: '#00A79D' }} />
                        <span style={styles.infoLabel}>Amount:</span>
                        <span style={styles.infoValue}>₹{reward.amount?.toLocaleString() || 'N/A'}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <Calendar size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Date:</span>
                        <span style={styles.infoValue}>{formatDate(reward.createdAt)}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <User size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Email:</span>
                        <span style={styles.infoValue}>{reward.email}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <Gift size={16} style={{ color: '#4A6A8A' }} />
                        <span style={styles.infoLabel}>Tier:</span>
                        <span style={styles.infoValue}>{reward.tier}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "2px solid #F4F7F9" }}>
                      <button
                        onClick={() => distributeReward(reward.id)}
                        disabled={!reward.eligible}
                        style={styles.distributeButton(reward.eligible)}
                      >
                        <Gift size={16} />
                        {reward.eligible ? "Distribute Reward" : "Reward Distributed"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>
                  <Gift size={48} style={styles.emptyIcon} />
                  <p>No approved payments</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}