import React, { useState, useEffect } from "react";
import axios from 'axios';
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useNavigate } from "react-router-dom";

const AdminPreferencesDashboard = () => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({ total: 0, loggedIn: 0, notLoggedIn: 0 });
  const accessToken = localStorage.getItem("accessToken");
  // Agents dropdown / modal state
  const [agents, setAgents] = useState([]);
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentsTotalPages, setAgentsTotalPages] = useState(0);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [openDropdownFor, setOpenDropdownFor] = useState(null); // prefId for which dropdown is open
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null); // agent object shown in modal
  const [agentDetailLoading, setAgentDetailLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    mobileNumber: "",
    bhkSize: "",
    preferredLocation: "",
  });

  useEffect(() => {
    fetchPreferences();
  }, [pagination.page, pagination.limit, filters]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      }).toString();

      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/list?${queryParams}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
        setPagination((prev) => ({
          ...prev,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        }));
        calculateStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };
  // Fetch agents paginated (20 per page)
  const fetchAgents = async (page = 1) => {
    try {
      setAgentsLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '20' }).toString();
    const res = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/agents?${params}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
      if (res.ok) {
        const json = await res.json();
        setAgents(json.agents || []);
        setAgentsPage(json.page || page);
        setAgentsTotalPages(json.pages || 0);
      } else {
        console.error('Failed to load agents', res.status);
      }
    } catch (e) {
      console.error('Error fetching agents', e);
    } finally {
      setAgentsLoading(false);
    }
  };

  const openAgentsDropdown = async (prefId) => {
    setOpenDropdownFor(prefId);
    setAssigningLeadId(prefId);
    await fetchAgents(1);
  };

  const closeAgentsDropdown = () => {
    setOpenDropdownFor(null);
    setAssigningLeadId(null);
  };

  const handleAgentClick = async (agent) => {
    setSelectedAgent({ ...agent, _leadAssigningId: assigningLeadId });
  };

  const handleFetchAgentDetails = async (agentId) => {
    try {
      setAgentDetailLoading(true);
      // We already have basic agent from list; if you need refreshed data, call the API for single agent (not provided). For now we reuse agent object.
    } finally {
      setAgentDetailLoading(false);
    }
  };

  const handleAssignAgent = async (leadId, agentId) => {
    try {
      setAssigning(true);
      await axios.post(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences/${leadId}/assign`,
        { agentId },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      // refresh preferences list and close modal/dropdown
      fetchPreferences();
      setSelectedAgent(null);
      setOpenDropdownFor(null);
      alert('Agent assigned successfully');
    } catch (err) {
      console.error('Error assigning agent', err);
      alert('Failed to assign agent');
    } finally {
      setAssigning(false);
    }
  };

  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/");
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

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  const calculateStats = (data) => {
    const total = data.length;
    const loggedIn = data.filter((pref) => pref.hasLoggedIn).length;
    const notLoggedIn = total - loggedIn;
    setStats({ total, loggedIn, notLoggedIn });
  };

  // ---------- WhatsApp helper (added) ----------
  // Default message to send via WhatsApp. Change this to whatever default text you want.
  // const defaultWhatsAppMessage = `Hello  — thanks for submitting your requirements. We’ll contact you soon with curated listings to help find your dream home in Gurgaon . Contact:  9654131789 | support@ggnhome.com | https://www.ggnhome.com`;
const defaultWhatsAppMessage = `Hello,
Thank you for submitting your property requirements. Our team will review your preferences and contact you shortly with curated listings that match your needs in Gurgaon.
For assistance, please contact: 9654131789 | support@ggnhome.com`;
  // Format a phone number into WhatsApp friendly international format (digits only, no +).
  // Heuristic: if the number has 10 digits we assume India (+91). If it already looks international (length > 10) we keep it as-is.
  const formatPhoneForWhatsApp = (num) => {
    if (!num) return null;
    // remove non-digit characters
    let digits = String(num).replace(/[^0-9]/g, '');
    if (digits.length === 0) return null;
    // if number starts with 0, strip leading zeros
    digits = digits.replace(/^0+/, '');
    // if 10 digits assume India and prepend 91
    if (digits.length === 10) digits = '91' + digits;
    return digits;
  };

  const handleOpenWhatsApp = (mobileNumber, message = defaultWhatsAppMessage) => {
    try {
      const phone = formatPhoneForWhatsApp(mobileNumber);
      if (!phone) {
        alert('Invalid phone number');
        return;
      }
      const encoded = encodeURIComponent(message || '');
      // Use wa.me which is WhatsApp's short link. It will open WhatsApp Web or app depending on platform.
      const url = `https://wa.me/${phone}?text=${encoded}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error('Error opening WhatsApp', e);
      alert('Could not open WhatsApp');
    }
  };
  // ---------- end WhatsApp helper ----------

  // Helper to render agent info (show agentCode if available, otherwise name or id)
  const renderAgentAssigned = (pref) => {
    const assigned = pref.agentAssigned;
    if (!assigned) return 'Unassigned';

    // If it's an array (multiple assigned agents)
    if (Array.isArray(assigned)) {
      if (assigned.length === 0) return 'Unassigned';
      const first = assigned[0];
      if (typeof first === 'object' && first !== null) return first.agentCode || first.name || first._id || 'Unassigned';
      return String(first);
    }

    // If it's an object
    if (typeof assigned === 'object' && assigned !== null) {
      return assigned.agentCode || assigned.name || assigned._id || 'Unassigned';
    }

    // Fallback (string id)
    return String(assigned);
  };

  const isAssignDisabledForLead = (leadId) => {
    const p = preferences.find((x) => x._id === leadId);
    return p && p.status === 'INACTIVE';
  };

  const handleMatchUsers = async () => {
    try {
      setMatching(true);
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/match-users`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const result = await response.json();

        fetchPreferences(); // Refresh the list
      }
    } catch (error) {
      console.error("Error matching users:", error);
      alert("Error matching users");
    } finally {
      setMatching(false);
    }
  };

  const formatTimeLeft = (inactiveAt) => {
    if (!inactiveAt) return null;
    try {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const inactiveSince = Date.now() - new Date(inactiveAt).getTime();
      if (inactiveSince >= thirtyDaysMs) return 'Scheduled for permanent deletion (expired)';
      const remainingMs = Math.max(0, thirtyDaysMs - inactiveSince);
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      if (remainingDays <= 1) return 'Will be deleted in less than 1 day';
      return `Will be deleted in ${remainingDays} day(s)`;
    } catch (e) {
      return null;
    }
  };


  const handleDeletePreference = async (id) => {
    if (window.confirm('Are you sure you want to delete this preference?')) {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/${id}`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          }
        );

        const text = await response.text();

        if (response.ok) {
          // server may return a message (e.g. 'marked INACTIVE' or 'permanently deleted')
          try {
            const json = JSON.parse(text || '{}');
            if (json.message) alert(json.message);
          } catch (e) {
            // not JSON
            if (text) alert(text);
          }
          fetchPreferences(); // Refresh the list
          return;
        }

        console.error('Delete failed', response.status, text);
        alert(`Delete failed: ${response.status} — ${text || 'No message'}`);
      } catch (error) {
        console.error('Error deleting preference:', error);
        alert('Error deleting preference');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Inline Styles
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
      padding: "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      background: "#FFFFFF",
      borderRadius: "16px",
      padding: "30px",
      marginBottom: "30px",
      boxShadow: "0 8px 25px rgba(0, 51, 102, 0.1)",
      border: "1px solid rgba(74, 106, 138, 0.1)",
    },
    title: {
      background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      color: "#003366",
      fontSize: "2.5rem",
      fontWeight: "700",
      marginBottom: "10px",
      textAlign: "center",
    },
    subtitle: {
      color: "#4A6A8A",
      fontSize: "1.1rem",
      textAlign: "center",
      marginBottom: "30px",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      background: "linear-gradient(135deg, #FFFFFF 0%, #F4F7F9 100%)",
      padding: "25px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "0 4px 15px rgba(0, 51, 102, 0.1)",
      border: "1px solid rgba(34, 211, 238, 0.2)",
    },
    statNumber: {
      fontSize: "2.5rem",
      fontWeight: "700",
      marginBottom: "8px",
    },
    statLabel: {
      color: "#4A6A8A",
      fontSize: "1rem",
      fontWeight: "600",
    },
    graphContainer: {
      background: "#FFFFFF",
      borderRadius: "12px",
      padding: "25px",
      marginBottom: "30px",
      boxShadow: "0 4px 15px rgba(0, 51, 102, 0.1)",
    },
    graphTitle: {
      color: "#003366",
      fontSize: "1.3rem",
      fontWeight: "600",
      marginBottom: "20px",
    },
    graphBar: {
      height: "40px",
      background: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
      borderRadius: "8px",
      marginBottom: "10px",
      position: "relative",
      overflow: "hidden",
    },
    graphBarFill: {
      height: "100%",
      background: "linear-gradient(90deg, #003366 0%, #4A6A8A 100%)",
      borderRadius: "8px",
      transition: "width 0.5s ease",
    },
    graphLabels: {
      display: "flex",
      justifyContent: "space-between",
      color: "#333333",
      fontSize: "0.9rem",
      fontWeight: "600",
    },
    controlsContainer: {
      display: "flex",
      gap: "15px",
      marginBottom: "25px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    filterInput: {
      padding: "12px 16px",
      border: "2px solid #F4F7F9",
      borderRadius: "8px",
      fontSize: "0.95rem",
      background: "#F4F7F9",
      color: "#333333",
      outline: "none",
      transition: "all 0.3s ease",
      minWidth: "200px",
    },
    filterSelect: {
      padding: "12px 16px",
      border: "2px solid #F4F7F9",
      borderRadius: "8px",
      fontSize: "0.95rem",
      background: "#F4F7F9",
      color: "#333333",
      outline: "none",
      transition: "all 0.3s ease",
      minWidth: "150px",
    },
    matchButton: {
      background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
      color: "#FFFFFF",
      border: "none",
      padding: "12px 24px",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    refreshButton: {
      background: "transparent",
      color: "#4A6A8A",
      border: "2px solid #4A6A8A",
      padding: "10px 20px",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    cardsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    card: {
      background: "#FFFFFF",
      borderRadius: "16px",
      padding: "25px",
      boxShadow: "0 8px 25px rgba(0, 51, 102, 0.1)",
      border: "1px solid rgba(74, 106, 138, 0.1)",
      position: "relative",
      transition: "all 0.3s ease",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "15px",
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      color: "#003366",
      fontSize: "1.3rem",
      fontWeight: "700",
      marginBottom: "5px",
    },
    mobileNumber: {
      color: "#4A6A8A",
      fontSize: "1rem",
      fontWeight: "600",
    },
    statusBadge: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.2rem",
      fontWeight: "bold",
    },
    statusLoggedIn: {
      background: "#00A79D",
      color: "#FFFFFF",
    },
    statusNotLoggedIn: {
      background: "#FF6B6B",
      color: "#FFFFFF",
    },
    cardContent: {
      marginBottom: "20px",
    },
    preferenceItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: "1px solid #F4F7F9",
    },
    preferenceLabel: {
      color: "#4A6A8A",
      fontSize: "0.9rem",
      fontWeight: "600",
    },
    preferenceValue: {
      color: "#333333",
      fontSize: "0.95rem",
      fontWeight: "500",
    },
    cardFooter: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "15px",
      borderTop: "2px solid #F4F7F9",
    },
    dateText: {
      color: "#4A6A8A",
      fontSize: "0.85rem",
    },
    deleteButton: {
      background: "#FF6B6B",
      color: "#FFFFFF",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "15px",
      marginTop: "30px",
    },
    paginationButton: {
      background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
      color: "#FFFFFF",
      border: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    paginationButtonDisabled: {
      background: "#4A6A8A",
      opacity: 0.5,
      cursor: "not-allowed",
    },
    pageInfo: {
      color: "#333333",
      fontSize: "1rem",
      fontWeight: "600",
    },
    loadingSpinner: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "200px",
      fontSize: "1.2rem",
      color: "#4A6A8A",
    },
    spinner: {
      width: "40px",
      height: "40px",
      border: "4px solid #F4F7F9",
      borderTop: "4px solid #22D3EE",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    keyframes: `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `,
  };

  const loggedInPercentage =
    stats.total > 0 ? (stats.loggedIn / stats.total) * 100 : 0;

  return (
    <>
      <div
        style={{
          position: "fixed",
          marginBottom: "20px",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
          backgroundColor: "#FFFFFF", // or match your navbar background
        }}
      >
        <TopNavigationBar
          user={user}
          handleLogout={handleLogout}
          navItems={navItems}
        />
      </div>
      <style>{styles.keyframes}</style>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>User Preferences Dashboard</h1>
          <p style={styles.subtitle}>
            Manage and analyze user property preferences
          </p>

          {/* Statistics Cards */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#003366" }}>
                {stats.total}
              </div>
              <div style={styles.statLabel}>Total Preferences</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#00A79D" }}>
                {stats.loggedIn}
              </div>
              <div style={styles.statLabel}>Users Logged In</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#FF6B6B" }}>
                {stats.notLoggedIn}
              </div>
              <div style={styles.statLabel}>Not Logged In</div>
            </div>
          </div>

          {/* Graph */}
          <div style={styles.graphContainer}>
            <h3 style={styles.graphTitle}>User Login Status</h3>
            <div style={styles.graphBar}>
              <div
                style={{
                  ...styles.graphBarFill,
                  width: `${loggedInPercentage}%`,
                }}
              ></div>
            </div>
            <div style={styles.graphLabels}>
              <span>Not Logged In ({stats.notLoggedIn})</span>
              <span>Logged In ({stats.loggedIn})</span>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controlsContainer}>
            <input
              type="text"
              placeholder="Filter by Mobile"
              value={filters.mobileNumber}
              onChange={(e) =>
                handleFilterChange("mobileNumber", e.target.value)
              }
              style={styles.filterInput}
            />
            <input
              type="text"
              placeholder="Filter by Location"
              value={filters.preferredLocation}
              onChange={(e) =>
                handleFilterChange("preferredLocation", e.target.value)
              }
              style={styles.filterInput}
            />
            <select
              value={filters.bhkSize}
              onChange={(e) => handleFilterChange("bhkSize", e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All BHK Sizes</option>
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
              <option value="4BHK">4 BHK</option>
              <option value="4BHK+">4+ BHK</option>
            </select>
            <button
              onClick={handleMatchUsers}
              disabled={matching}
              style={{
                ...styles.matchButton,
                ...(matching && { opacity: 0.7, cursor: "not-allowed" }),
              }}
            >
              {matching ? "🔄 Matching..." : "🔗 Match Users"}
            </button>
            <button onClick={fetchPreferences} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Preferences Cards */}
        {loading ? (
          <div style={styles.loadingSpinner}>
            <div style={styles.spinner}></div>
          </div>
        ) : (
          <>
            <div style={styles.cardsGrid}>
              {preferences.map((pref) => (
                <div key={pref._id} style={styles.card}>
                  <div style={{ ...styles.cardHeader, position: 'relative' }}>
                    <div style={styles.userInfo}>
                      <div style={styles.userName}>{pref.userName}</div>
                      <div style={styles.mobileNumber}>{pref.mobileNumber}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          ...styles.statusBadge,
                          ...(pref.hasLoggedIn
                            ? styles.statusLoggedIn
                            : styles.statusNotLoggedIn),
                        }}
                        aria-hidden
                      >
                        {pref.hasLoggedIn ? '✓' : '✕'}
                      </div>

                      {/* Circular WhatsApp button (logo only) placed next to status */}
                      <button
                        onClick={() => handleOpenWhatsApp(pref.mobileNumber)}
                        title={`Message ${pref.mobileNumber} on WhatsApp`}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          background: '#25D366',
                          padding: 0,
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M21 15a2 2 0 0 1-2 2h-1l-3 3v-3H8a5 5 0 0 1-5-5V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={styles.cardContent}>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Location:</span>
                      <span style={styles.preferenceValue}>
                        {pref.preferredLocation}
                      </span>
                    </div>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Budget:</span>
                      <span style={styles.preferenceValue}>
                        ₹{pref.budgetRange}
                      </span>
                    </div>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>BHK Size:</span>
                      <span style={styles.preferenceValue}>{pref.bhkSize}</span>
                    </div>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Property Type:</span>
                      <span style={styles.preferenceValue}>
                        {pref.propertyType}
                      </span>
                    </div>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Furnishing:</span>
                      <span style={styles.preferenceValue}>
                        {pref.furnishingLevel?.replace("-", " ") ||
                          "Not specified"}
                      </span>
                    </div>
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Move-in Date:</span>
                      <span style={styles.preferenceValue}>
                        {pref.moveInDate}
                      </span>
                    </div>
                    {/* Actual Brokerage and Agent Brokerage */}
                    <div style={styles.preferenceItem}>
                      <span style={styles.preferenceLabel}>Actual Brokerage:</span>
                      <span style={{ ...styles.preferenceValue, fontWeight: 700 }}>
                        ₹ {pref.brokerageAmount}
                      </span>
                    </div>
                    {typeof pref.brokerageAmount === 'number' && (
                      <div style={styles.preferenceItem}>
                        <span style={styles.preferenceLabel}>Agent Brokerage:</span>
                        <span style={{ ...styles.preferenceValue, fontWeight: 700, color: '#00A79D' }}>
                          ₹ {Math.max(0, Math.floor((pref.brokerageAmount - 500) / 2))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <div>
                      <div style={styles.dateText}>
                        Created: {new Date(pref.createdAt).toLocaleDateString()}
                      </div>
                      {Array.isArray(pref.agentAssigned) && pref.agentAssigned.length > 0 && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#003366'
                          }}
                        >
                          Agents Assigned: {pref.agentAssigned.length}
                        </div>
                      )}
                      {pref.status === 'INACTIVE' && (
                        <div style={{ fontSize: '0.9rem', color: '#FF6B6B', marginTop: '6px' }}>
                          {formatTimeLeft(pref.inactiveAt)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => pref.status !== 'INACTIVE' && (openDropdownFor === pref._id ? closeAgentsDropdown() : openAgentsDropdown(pref._id))}
                          disabled={pref.status === 'INACTIVE'}
                          style={{ ...styles.matchButton, padding: '8px 12px', fontSize: '0.9rem', ...(pref.status === 'INACTIVE' && { opacity: 0.6, cursor: 'not-allowed' }) }}
                        >
                          {openDropdownFor === pref._id ? 'Close Agents' : 'Assign Agent'}
                        </button>

                        {openDropdownFor === pref._id && (
                          <div style={{ position: 'absolute', right: 0, top: '42px', width: '320px', maxHeight: '300px', overflowY: 'auto', background: '#fff', border: '1px solid #E6EEF2', borderRadius: '8px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)', zIndex: 999 }}>
                            {agentsLoading ? (
                              <div style={{ padding: '16px' }}>Loading agents...</div>
                            ) : (
                              <div>
                                {agents.length === 0 ? (
                                  <div style={{ padding: '12px' }}>No agents found</div>
                                ) : (
                                  <ul style={{ listStyle: 'none', margin: 0, padding: '8px' }}>
                                    {agents.map((agent) => (
                                      <li
                                        key={agent._id}
                                        style={{
                                          padding: '8px',
                                          borderBottom: '1px solid #F4F7F9',
                                          cursor:
                                            pref.agentAssigned &&
                                            Array.isArray(pref.agentAssigned) &&
                                            pref.agentAssigned.some(a =>
                                              (typeof a === 'string' && a === agent._id) ||
                                              (typeof a === 'object' && String(a._id || a) === String(agent._id))
                                            )
                                              ? 'not-allowed'
                                              : 'pointer',
                                          background:
                                            pref.agentAssigned &&
                                            Array.isArray(pref.agentAssigned) &&
                                            pref.agentAssigned.some(a =>
                                              (typeof a === 'string' && a === agent._id) ||
                                              (typeof a === 'object' && String(a._id || a) === String(agent._id))
                                            )
                                              ? '#E2E8F0'
                                              : 'transparent',
                                          opacity:
                                            pref.agentAssigned &&
                                            Array.isArray(pref.agentAssigned) &&
                                            pref.agentAssigned.some(a =>
                                              (typeof a === 'string' && a === agent._id) ||
                                              (typeof a === 'object' && String(a._id || a) === String(agent._id))
                                            )
                                              ? 0.6
                                              : 1
                                        }}
                                        onClick={() => {
                                          const alreadyAssigned =
                                            pref.agentAssigned &&
                                            Array.isArray(pref.agentAssigned) &&
                                            pref.agentAssigned.some(a =>
                                              (typeof a === 'string' && a === agent._id) ||
                                              (typeof a === 'object' && String(a._id || a) === String(agent._id))
                                            );

                                          if (!alreadyAssigned) handleAgentClick(agent);
                                        }}
                                      >
                                        <div style={{ fontWeight: 700 }}>{agent.agentCode}</div>
                                        <div
                                          style={{
                                            fontSize: '0.9rem',
                                            color: '#4A6A8A',
                                            maxHeight: '60px',
                                            overflowY: 'auto'
                                          }}
                                        >
                                          {(agent.preferredSectors || []).join(', ')}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {/* Pagination for agents dropdown */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                                  <button disabled={agentsPage === 1} onClick={() => fetchAgents(Math.max(1, agentsPage - 1))} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>Prev</button>
                                  <div style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Page {agentsPage} / {agentsTotalPages || 1}</div>
                                  <button disabled={agentsPage === agentsTotalPages || agentsTotalPages === 0} onClick={() => fetchAgents(Math.min((agentsTotalPages || 1), agentsPage + 1))} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>Next</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => { if (pref.status !== 'INACTIVE') handleDeletePreference(pref._id); }}
                        style={{
                          ...styles.deleteButton,
                          ...(pref.status === 'INACTIVE' && { opacity: 0.5, cursor: 'not-allowed' })
                        }}
                        disabled={pref.status === 'INACTIVE'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={{
                    ...styles.paginationButton,
                    ...(pagination.page === 1 &&
                      styles.paginationButtonDisabled),
                  }}
                >
                  Previous
                </button>

                <span style={styles.pageInfo}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{
                    ...styles.paginationButton,
                    ...(pagination.page === pagination.totalPages &&
                      styles.paginationButtonDisabled),
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {/* Agent Details Modal */}
      {selectedAgent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setSelectedAgent(null)}>
          <div style={{ width: '720px', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{selectedAgent.name} ({selectedAgent.agentCode})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><strong>Email:</strong> {selectedAgent.email}</div>
              <div><strong>Mobile:</strong> {selectedAgent.mobileNumber}</div>
              <div><strong>Agency:</strong> {selectedAgent.agencyName || '—'}</div>
              <div><strong>Experience (yrs):</strong> {selectedAgent.experienceYears || '—'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Areas Covered:</strong> {(selectedAgent.areasCovered || []).join(', ')}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Preferred Sectors:</strong> {(selectedAgent.preferredSectors || []).join(', ')}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Property Types:</strong> {(selectedAgent.propertyTypes || []).join(', ')}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setSelectedAgent(null)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff' }}>Close</button>
              <button onClick={() => handleAssignAgent(assigningLeadId, selectedAgent._id)} disabled={assigning || isAssignDisabledForLead(assigningLeadId)} style={{ padding: '10px 16px', borderRadius: '8px', background: '#00A79D', color: '#fff', border: 'none', opacity: (assigning || isAssignDisabledForLead(assigningLeadId)) ? 0.6 : 1, cursor: (assigning || isAssignDisabledForLead(assigningLeadId)) ? 'not-allowed' : 'pointer' }}>{assigning ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPreferencesDashboard;
