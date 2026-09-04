import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, TrendingUp, Image, RefreshCw, AlertCircle, CheckCircle, Mail, MapPin, BarChart3, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const CloudinaryDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [brevoData, setBrevoData] = useState(null);
  const [locationiqData, setLocationiqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [locationiqLoading, setLocationiqLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brevoError, setBrevoError] = useState(null);
  const [locationiqError, setLocationiqError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [brevoLastRefresh, setBrevoLastRefresh] = useState(null);
  const [locationiqLastRefresh, setLocationiqLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [brevoRefreshing, setBrevoRefreshing] = useState(false);
    const [locationiqRefreshing, setLocationiqRefreshing] = useState(false);
    const navigate = useNavigate();

  // Get access token from localStorage for all protected admin API calls
  const accessToken = localStorage.getItem("accessToken");

  const BASE_API = process.env.REACT_APP_Base_API || 'http://localhost:2000';

  const fetchUsage = async (force = false) => {
    try {
      setRefreshing(true);
      const url = `${BASE_API}/api/admin/cloudinary/usage${force ? '?force=true' : ''}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setAccounts(result.data);
        setLastRefresh(result.refreshedAt);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch usage data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBrevoUsage = async () => {
    try {
      setBrevoRefreshing(true);
      const url = `${BASE_API}/api/admin/brevo/usage`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setBrevoData(result);
        setBrevoLastRefresh(new Date().toISOString());
        setBrevoError(null);
      } else {
        setBrevoError(result.message || 'Failed to fetch Brevo usage data');
      }
    } catch (err) {
      setBrevoError(err.message || 'Network error');
    } finally {
      setBrevoLoading(false);
      setBrevoRefreshing(false);
    }
  };

  const fetchLocationiqUsage = async () => {
    try {
      setLocationiqRefreshing(true);
      const url = `${BASE_API}/api/admin/locationiq/usage`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setLocationiqData(result);
        setLocationiqLastRefresh(new Date().toISOString());
        setLocationiqError(null);
      } else {
        setLocationiqError(result.message || 'Failed to fetch LocationIQ usage data');
      }
    } catch (err) {
      setLocationiqError(err.message || 'Network error');
    } finally {
      setLocationiqLoading(false);
      setLocationiqRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    fetchBrevoUsage();
    fetchLocationiqUsage();
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 ** 2);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  const MiniMetric = ({ label, value, icon: Icon, color, bgColor }) => (
    <div style={{
      backgroundColor: '#FFFFFF',
      padding: '16px',
      borderRadius: '10px',
      border: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '160px'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontSize: '18px', color: '#111827', fontWeight: '700' }}>
          {value}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ percentage, color, showLabel = true }) => {
    const getColor = () => {
      if (percentage >= 90) return '#EF4444';
      if (percentage >= 75) return '#F59E0B';
      return color;
    };

    return (
      <div style={{ width: '100%' }}>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            backgroundColor: getColor(),
            transition: 'width 0.5s ease'
          }} />
        </div>
        {showLabel && (
          <div style={{
            marginTop: '4px',
            fontSize: '11px',
            color: '#6B7280',
            textAlign: 'right',
            fontWeight: '600'
          }}>
            {percentage.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const CompactAccountCard = ({ account }) => {
    if (account.error) {
      return (
        <div style={{
          backgroundColor: '#FEF2F2',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #FCA5A5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#DC2626' }}>
                {account.cloudName}
              </div>
              <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>
                {account.error}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const creditsPercentage = (account.credits.used / account.credits.limit) * 100;
    const storagePercentage = account.storage.limit
      ? (account.storage.bytes / account.storage.limit) * 100
      : 0;

    const getStatusColor = () => {
      if (creditsPercentage >= 90) return { bg: '#FEE2E2', text: '#991B1B', badge: 'Critical' };
      if (creditsPercentage >= 75) return { bg: '#FEF3C7', text: '#92400E', badge: 'High' };
      return { bg: '#D1FAE5', text: '#065F46', badge: 'Normal' };
    };

    const status = getStatusColor();

    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #E5E7EB',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
              {account.cloudName}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              Account #{account.index + 1}
            </div>
          </div>
          <span style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '600',
            backgroundColor: status.bg,
            color: status.text
          }}>
            {status.badge}
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500' }}>Credits</span>
            <span style={{ fontSize: '11px', color: '#111827', fontWeight: '600' }}>
              {account.credits.used.toFixed(1)} / {account.credits.limit}
            </span>
          </div>
          <ProgressBar percentage={creditsPercentage} color="#10B981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
          <div>
            <div style={{ color: '#6B7280', marginBottom: '2px' }}>Storage</div>
            <div style={{ color: '#111827', fontWeight: '600' }}>{formatBytes(account.storage.bytes)}</div>
          </div>
          <div>
            <div style={{ color: '#6B7280', marginBottom: '2px' }}>Transforms</div>
            <div style={{ color: '#111827', fontWeight: '600' }}>{account.transformations.count.toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  };

  const BrevoCompactCard = ({ data }) => {
    if (!data) return null;

    const { account, usage } = data;
    const creditsUsed = account.creditsLimit - account.creditsRemaining;
    const creditsPercentage = (creditsUsed / account.creditsLimit) * 100;
    const deliveryRate = usage.sent > 0 ? (usage.delivered / usage.sent) * 100 : 0;
    const openRate = usage.delivered > 0 ? (usage.opens / usage.delivered) * 100 : 0;

    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
              {account.company}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              {account.email} • {account.planType}
            </div>
          </div>
          <Mail size={24} color="#10B981" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Email Credits</span>
            <span style={{ fontSize: '12px', color: '#111827', fontWeight: '600' }}>
              {creditsUsed.toLocaleString()} / {account.creditsLimit.toLocaleString()}
            </span>
          </div>
          <ProgressBar percentage={creditsPercentage} color="#10B981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {usage.sent.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Sent</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
              {deliveryRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Delivered</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
              {openRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Open Rate</div>
          </div>
        </div>
      </div>
    );
  };

  const LocationiqCompactCard = ({ data }) => {
    if (!data) return null;

    const { balance } = data;
    const dailyLimit = 5000;
    const used = dailyLimit - balance.day;
    const usagePercentage = (used / dailyLimit) * 100;

    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
              LocationIQ
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Geocoding API • {data.raw.status}
            </div>
          </div>
          <MapPin size={24} color="#3B82F6" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Daily Requests</span>
            <span style={{ fontSize: '12px', color: '#111827', fontWeight: '600' }}>
              {used.toLocaleString()} / {dailyLimit.toLocaleString()}
            </span>
          </div>
          <ProgressBar percentage={usagePercentage} color="#3B82F6" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {balance.day.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Remaining</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
              {balance.bonus.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Bonus</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} color="#10B981" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#6B7280', fontSize: '16px' }}>Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#FEF2F2',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #FCA5A5',
          maxWidth: '500px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <AlertCircle size={32} color="#DC2626" />
            <h2 style={{ margin: 0, color: '#DC2626', fontSize: '20px' }}>Error Loading Data</h2>
          </div>
          <p style={{ color: '#991B1B', margin: '0 0 16px 0' }}>{error}</p>
          <button
            onClick={() => fetchUsage(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalCredits = accounts.reduce((sum, acc) => sum + (acc.credits?.used || 0), 0);
  const totalStorage = accounts.reduce((sum, acc) => sum + (acc.storage?.bytes || 0), 0);
  const totalBandwidth = accounts.reduce((sum, acc) => sum + (acc.bandwidth?.bytes || 0), 0);
  const totalTransformations = accounts.reduce((sum, acc) => sum + (acc.transformations?.count || 0), 0);
  const avgCreditsUsage = accounts.length > 0
    ? accounts.reduce((sum, acc) => sum + ((acc.credits?.used || 0) / (acc.credits?.limit || 1) * 100), 0) / accounts.length
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
          <button onClick={() => navigate('/admin/usagetrack2')}>Page 2</button>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          div::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }

          div::-webkit-scrollbar-track {
            background: #F3F4F6;
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb {
            background: #9CA3AF;
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: #6B7280;
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '20px 32px'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#10B981',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart3 size={28} color="#FFFFFF" />
              </div>
              <div>
                <h1 style={{ margin: 0, color: '#111827', fontSize: '28px', fontWeight: '700' }}>
                  Usage Tracker
                </h1>
                <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
                  Real-time monitoring of Cloudinary, Brevo & LocationIQ services
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchUsage(true);
                fetchBrevoUsage();
                fetchLocationiqUsage();
              }}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: refreshing ? '#E5E7EB' : '#10B981',
                color: refreshing ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
              {refreshing ? 'Refreshing...' : 'Refresh All'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px' }}>
        {/* Executive Summary */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Activity size={24} color="#10B981" />
            <h2 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '700' }}>
              Executive Summary
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <MiniMetric
              label="Total Accounts"
              value={accounts.length}
              icon={Cloud}
              color="#10B981"
              bgColor="#D1FAE5"
            />
            <MiniMetric
              label="Avg Credits Usage"
              value={`${avgCreditsUsage.toFixed(1)}%`}
              icon={Zap}
              color="#F59E0B"
              bgColor="#FEF3C7"
            />
            <MiniMetric
              label="Total Storage"
              value={formatBytes(totalStorage)}
              icon={HardDrive}
              color="#3B82F6"
              bgColor="#DBEAFE"
            />
            <MiniMetric
              label="Total Bandwidth"
              value={formatBytes(totalBandwidth)}
              icon={TrendingUp}
              color="#8B5CF6"
              bgColor="#EDE9FE"
            />
            <MiniMetric
              label="Transformations"
              value={totalTransformations.toLocaleString()}
              icon={Image}
              color="#EC4899"
              bgColor="#FCE7F3"
            />
            <MiniMetric
              label="Total Credits"
              value={totalCredits.toFixed(1)}
              icon={CheckCircle}
              color="#10B981"
              bgColor="#D1FAE5"
            />
          </div>

          {lastRefresh && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#6B7280',
              textAlign: 'center'
            }}>
              Last updated: {new Date(lastRefresh).toLocaleString()}
            </div>
          )}
        </div>

        {/* Cloudinary Accounts */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Cloud size={24} color="#10B981" />
            <h2 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '700' }}>
              Cloudinary Media Storage
            </h2>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {accounts.length} Accounts
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {accounts.map(account => (
              <CompactAccountCard key={account.index} account={account} />
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Brevo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Mail size={24} color="#10B981" />
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '700' }}>
                Brevo Email Service
              </h2>
            </div>

            {brevoError ? (
              <div style={{
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #FCA5A5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#DC2626" />
                  <span style={{ fontSize: '14px', color: '#DC2626', fontWeight: '600' }}>
                    {brevoError}
                  </span>
                </div>
              </div>
            ) : brevoLoading ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '40px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RefreshCw size={24} color="#10B981" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <BrevoCompactCard data={brevoData} />
            )}
          </div>

          {/* LocationIQ */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <MapPin size={24} color="#3B82F6" />
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '700' }}>
                LocationIQ Geocoding
              </h2>
            </div>

            {locationiqError ? (
              <div style={{
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #FCA5A5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#DC2626" />
                  <span style={{ fontSize: '14px', color: '#DC2626', fontWeight: '600' }}>
                    {locationiqError}
                  </span>
                </div>
              </div>
            ) : locationiqLoading ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '40px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RefreshCw size={24} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <LocationiqCompactCard data={locationiqData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudinaryDashboard;