import React, { useState, useEffect } from 'react';
import { Activity, Database, Newspaper, RefreshCw, AlertCircle } from 'lucide-react';

const AdminUsageDashboard = () => {
  const [mongoUsage, setMongoUsage] = useState(null);
  const [gnewsUsage, setGNewsUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accessToken = localStorage.getItem("accessToken");

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [mongoResponse, gnewsResponse] = await Promise.all([
        fetch(process.env.REACT_APP_Base_API + "/api/admin/mongo/usage", {
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }),
        fetch(process.env.REACT_APP_Base_API + "/api/admin/gnews/usage", {
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }),
      ]);

      if (!mongoResponse.ok || !gnewsResponse.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const mongoData = await mongoResponse.json();
      const gnewsData = await gnewsResponse.json();

      setMongoUsage(mongoData);
      setGNewsUsage(gnewsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px'
  };

  const titleStyle = {
    color: '#ffffff',
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '10px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const subtitleStyle = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
    fontWeight: '400'
  };

  const dashboardStyle = {
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  };

  const cardHoverStyle = {
    transform: 'translateY(-4px)',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)'
  };

  const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0f0f0'
  };

  const iconWrapperStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px'
  };

  const cardTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0'
  };

  const statRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f7fafc'
  };

  const statLabelStyle = {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500'
  };

  const statValueStyle = {
    fontSize: '16px',
    color: '#2d3748',
    fontWeight: '600'
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: '#ffffff',
    color: '#667eea',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s',
    margin: '0 auto'
  };

  const errorStyle = {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '12px',
    padding: '16px',
    color: '#c53030',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '600px',
    margin: '0 auto'
  };

  const loadingStyle = {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: '18px',
    padding: '40px'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <Activity size={48} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <AlertCircle size={24} />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Admin Usage Dashboard</h1>
        <p style={subtitleStyle}>Monitor your MongoDB and GNews API usage</p>
      </div>

      <div style={dashboardStyle}>
        <div style={gridStyle}>
          {/* MongoDB Usage Card */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ ...iconWrapperStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Database size={24} color="#ffffff" />
              </div>
              <h2 style={cardTitleStyle}>MongoDB Usage</h2>
            </div>
            
            {mongoUsage && (
              <div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Total Documents</span>
                  <span style={statValueStyle}>{formatNumber(mongoUsage.totalDocuments || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Total Collections</span>
                  <span style={statValueStyle}>{formatNumber(mongoUsage.totalCollections || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Database Size</span>
                  <span style={statValueStyle}>{formatBytes(mongoUsage.dataSize || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Storage Size</span>
                  <span style={statValueStyle}>{formatBytes(mongoUsage.storageSize || 0)}</span>
                </div>
                <div style={{ ...statRowStyle, borderBottom: 'none' }}>
                  <span style={statLabelStyle}>Index Size</span>
                  <span style={statValueStyle}>{formatBytes(mongoUsage.indexSize || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* GNews Usage Card */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ ...iconWrapperStyle, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <Newspaper size={24} color="#ffffff" />
              </div>
              <h2 style={cardTitleStyle}>GNews API Usage</h2>
            </div>
            
            {gnewsUsage && (
              <div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Requests Today</span>
                  <span style={statValueStyle}>{formatNumber(gnewsUsage.requestsToday || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Daily Limit</span>
                  <span style={statValueStyle}>{formatNumber(gnewsUsage.dailyLimit || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Remaining Requests</span>
                  <span style={statValueStyle}>{formatNumber(gnewsUsage.remaining || 0)}</span>
                </div>
                <div style={statRowStyle}>
                  <span style={statLabelStyle}>Usage Percentage</span>
                  <span style={statValueStyle}>
                    {((gnewsUsage.requestsToday / gnewsUsage.dailyLimit) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ ...statRowStyle, borderBottom: 'none' }}>
                  <span style={statLabelStyle}>Last Reset</span>
                  <span style={statValueStyle}>
                    {gnewsUsage.lastReset ? new Date(gnewsUsage.lastReset).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          style={buttonStyle}
          onClick={fetchUsageData}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          <RefreshCw size={20} />
          Refresh Data
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminUsageDashboard;