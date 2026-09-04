import React, { useState } from 'react';
import { AnimatedNumber } from '../../../components/motion';
import { useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Eye, MousePointer, MessageSquare, DollarSign, Star, Clock, Award } from 'lucide-react';
import TopNavigationBar from '../Top Navigation Bar/AgentTopNavigationBar';
import { useNavigate } from 'react-router-dom';

export default function PropertyAnalyticsAgent() {
  const [timeframe, setTimeframe] = useState('weekly');
  const { id: selectedProperty } = useParams();

  // Authorization token fallback for incognito/cookieless
  const agentToken = localStorage.getItem("agentAccessToken");

  const [metrics, setMetrics] = useState({});
  const [conversion, setConversion] = useState({});
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metricsRes = await axios.get(
          `${process.env.REACT_APP_PROPERTY_ANALYSIS_GET_METRICS}/${selectedProperty}`,
          {
            withCredentials: true,
            headers: {
              ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            },
          }
        );
        console.log('Frontend metrics received:', metricsRes.data);
        // Process metricsRes.data
        const data = metricsRes.data || {};
        // Map engagementTime into performanceOverTime
        let performanceOverTime = [];
        if (Array.isArray(data.engagementTime)) {
          performanceOverTime = data.engagementTime.map(et => ({
            time: et.time || et.day || et.period || '', // fallback for time label
            seconds: et.seconds
          }));
        }
        // Construct summary array
        const totalViews = Array.isArray(data.views) ? data.views.length : 0;
        const totalSaves = Array.isArray(data.saves) ? data.saves.length : 0;
        const totalRatings = Array.isArray(data.ratings) ? data.ratings.length : 0;
        const avgEngagement = Array.isArray(data.engagementTime) && data.engagementTime.length > 0
          ? Math.floor(data.engagementTime.reduce((sum, e) => sum + e.seconds, 0) / data.engagementTime.length)
          : 0;
        const summary = [
          { label: 'Total Views', value: totalViews },
          { label: 'Total Saves', value: totalSaves },
          { label: 'Total Ratings', value: totalRatings },
          { label: 'Avg. Engagement (s)', value: avgEngagement }
        ];
        // Compose new metrics object
        setMetrics({
          ...data,
          performanceOverTime,
          summary
        });
        console.log('Processed performanceOverTime:', performanceOverTime);
        console.log('Processed summary:', summary);

        const conversionRes = await axios.get(
          `${process.env.REACT_APP_PROPERTY_ANALYSIS_GET_CONVERSION}/${selectedProperty}/conversion`,
          {
            withCredentials: true,
            headers: {
              ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            },
          }
        );
        setConversion(conversionRes.data || {});
        console.log('Frontend conversion received:', conversionRes.data);
      } catch (err) {
        console.error('Error fetching property analytics:', err);
      }
    };

    if (selectedProperty) {
      fetchData();
    }
  }, [selectedProperty, agentToken]);

  // Stats mapped to backend data only, no static change percentages
  const stats = [
    { icon: Eye, label: 'Total Views', numericValue: metrics.views?.length || 0, decimals: 0, suffix: '', color: '#003366' },
    { icon: MousePointer, label: 'Saves', numericValue: metrics.saves?.length || 0, decimals: 0, suffix: '', color: '#4A6A8A' },
    { icon: MessageSquare, label: 'Total Enquiries', numericValue: conversion.totalLeads || 0, decimals: 0, suffix: '', color: '#00A79D' },
    { icon: DollarSign, label: 'Conversion Rate', numericValue: conversion.conversionRate || 0, decimals: 1, suffix: '%', color: '#22D3EE' }
  ];

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)', padding: '32px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { maxWidth: '1400px', margin: '0 auto 32px', textAlign: 'center' },
    title: { fontSize: '36px', fontWeight: '700', color: '#003366', marginBottom: '8px', letterSpacing: '-0.5px' },
    subtitle: { fontSize: '16px', color: '#4A6A8A', fontWeight: '400' },
    controls: { maxWidth: '1400px', margin: '0 auto 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' },
    select: { padding: '10px 16px', borderRadius: '8px', border: '2px solid #E5E7EB', background: '#FFFFFF', color: '#333333', fontSize: '14px', fontWeight: '500', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' },
    statsGrid: { maxWidth: '1400px', margin: '0 auto 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    statCard: { background: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,51,102,0.08)', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.3s', cursor: 'pointer' },
    iconWrapper: { padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    statContent: { flex: 1 },
    statLabel: { fontSize: '13px', color: '#4A6A8A', fontWeight: '500', marginBottom: '4px' },
    statValue: { fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' },
    statChange: { fontSize: '13px', fontWeight: '600' },
    chartsGrid: { maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' },
    chartCard: { background: '#FFFFFF', padding: '28px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,51,102,0.08)' },
    chartTitle: { fontSize: '18px', fontWeight: '700', color: '#003366', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#F0F9FF', color: '#003366' },
    ratingContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' },
    ratingStars: { display: 'flex', gap: '4px' },
    engagementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' },
    engagementItem: { padding: '16px', background: '#F4F7F9', borderRadius: '8px', borderLeft: '4px solid #00A79D' },
    engagementLabel: { fontSize: '13px', color: '#4A6A8A', marginBottom: '6px' },
    engagementValue: { fontSize: '22px', fontWeight: '700', color: '#003366' }
  };
  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
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
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, [agentToken]);

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];


  return (
    <div style={styles.container}>
      {/* Top Navigation Bar */}
  <div>
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 999 }}>
          <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
        </div>
        </div>
      <div style={styles.header}>
        <h1 style={styles.title}>Property Analytics Dashboard</h1>
        <p style={styles.subtitle}>Comprehensive insights into your property performance and user engagement</p>
      </div>

      <div style={styles.controls}>
        <select
          style={styles.select}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          onMouseEnter={(e) => (e.target.style.borderColor = '#00A79D')}
          onMouseLeave={(e) => (e.target.style.borderColor = '#E5E7EB')}
        >
          <option value="daily">Daily View</option>
          <option value="weekly">Weekly View</option>
        </select>
        {/* Property selection removed: property ID now comes from URL */}
      </div>

      <div style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <div key={idx} style={styles.statCard} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,51,102,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,51,102,0.08)'; }}>
            <div style={{ ...styles.iconWrapper, background: `${stat.color}15` }}>
              <stat.icon size={24} color={stat.color} strokeWidth={2.5} />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>{stat.label}</div>
              <div style={styles.statValue}>
                <AnimatedNumber value={stat.numericValue} decimals={stat.decimals} suffix={stat.suffix} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><TrendingUp size={20} color="#003366" /> Property Performance Over Time</div>
          {metrics.performanceOverTime && metrics.performanceOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey={metrics.performanceOverTime[0]?.day ? 'day' : 'period'} stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <YAxis stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                <Line type="monotone" dataKey="views" stroke="#003366" strokeWidth={3} dot={{ r: 4, fill: '#003366' }} name="Views" />
                <Line type="monotone" dataKey="saves" stroke="#00A79D" strokeWidth={3} dot={{ r: 4, fill: '#00A79D' }} name="Saves" />
                <Line type="monotone" dataKey="enquiries" stroke="#22D3EE" strokeWidth={3} dot={{ r: 4, fill: '#22D3EE' }} name="Enquiries" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 80, fontSize: 18 }}>No Data</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><MessageSquare size={20} color="#003366" /> Enquiries by Source</div>
          {metrics.sources && metrics.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.sources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || ['#003366','#4A6A8A','#00A79D','#22D3EE','#FFB800'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 80, fontSize: 18 }}>No Data</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><MousePointer size={20} color="#003366" /> Popular Amenities & Features</div>
          {metrics.amenities && metrics.amenities.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.amenities}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="feature" stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <YAxis stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
                <Bar dataKey="clicks" fill="#00A79D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 80, fontSize: 18 }}>No Data</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><Award size={20} color="#003366" /> Top Performing Listings</div>
          {metrics.topListings && metrics.topListings.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.topListings} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <YAxis dataKey="property" type="category" stroke="#4A6A8A" style={{ fontSize: '12px' }} width={120} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                <Bar dataKey="views" fill="#003366" radius={[0, 8, 8, 0]} />
                <Bar dataKey="enquiries" fill="#00A79D" radius={[0, 8, 8, 0]} />
                <Bar dataKey="bookings" fill="#22D3EE" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 80, fontSize: 18 }}>No Data</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><TrendingUp size={20} color="#003366" /> Interest Heatmap by Area</div>
          {metrics.heatmap && metrics.heatmap.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={metrics.heatmap}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="area" stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis stroke="#4A6A8A" style={{ fontSize: '12px' }} />
                <Radar name="Interest Score" dataKey="interest" stroke="#00A79D" fill="#00A79D" fillOpacity={0.6} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 80, fontSize: 18 }}>No Data</div>
          )}
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><Star size={20} color="#003366" /> User Ratings & Engagement</div>
          <div style={styles.ratingContainer}>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#003366' }}>
              {metrics.ratings?.length ? (metrics.ratings.reduce((sum, r) => sum + r.rating, 0) / metrics.ratings.length).toFixed(1) : '0'}
            </div>
            <div>
              <div style={styles.ratingStars}>
                {[1,2,3,4,5].map(star => (
                  <Star
                    key={star}
                    size={24}
                    fill={metrics.ratings?.length ? (star <= (metrics.ratings.reduce((sum, r) => sum + r.rating, 0) / metrics.ratings.length) ? '#FFB800' : '#E5E7EB') : '#E5E7EB'}
                    color={metrics.ratings?.length ? (star <= (metrics.ratings.reduce((sum, r) => sum + r.rating, 0) / metrics.ratings.length) ? '#FFB800' : '#E5E7EB') : '#E5E7EB'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '13px', color: '#4A6A8A', marginTop: '4px' }}>
                Based on {metrics.ratings?.length || 0} reviews
              </div>
            </div>
          </div>
          <div style={styles.engagementGrid}>
            <div style={styles.engagementItem}>
              <div style={styles.engagementLabel}>Repeat Viewers</div>
              <div style={styles.engagementValue}>{metrics.views?.length || 0}</div>
            </div>
            <div style={styles.engagementItem}>
              <div style={styles.engagementLabel}>Avg. Engagement</div>
              <div style={styles.engagementValue}>
                {metrics.engagementTime?.length ? Math.floor(metrics.engagementTime.reduce((sum, e) => sum + e.seconds, 0) / metrics.engagementTime.length) + 's' : '0s'}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><DollarSign size={20} color="#003366" /> Conversion Funnel</div>
          <div style={{ marginTop: '24px' }}>
            {conversion.funnel && conversion.funnel.length > 0 ? (
              conversion.funnel.map((stage, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#003366' }}>{stage.label}</span>
                    <span style={{ color: '#4A6A8A' }}>{stage.value?.toLocaleString?.() || '0'} ({stage.percent || 0}%)</span>
                  </div>
                  <div style={{ height: '12px', background: '#F4F7F9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stage.percent || 0}%`, background: stage.color || ['#003366','#4A6A8A','#00A79D','#22D3EE','#FFB800'][idx % 5], transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 40, fontSize: 18 }}>No Data</div>
            )}
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}><Clock size={20} color="#003366" /> Key Metrics Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
            {metrics.summary && metrics.summary.length > 0 ? (
              metrics.summary.map((metric, idx) => (
                <div key={idx} style={{ padding: '20px', background: '#F4F7F9', borderRadius: '10px', border: '2px solid #E5E7EB' }}>
                  <div style={{ fontSize: '13px', color: '#4A6A8A', marginBottom: '8px', fontWeight: '500' }}>{metric.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '26px', fontWeight: '700', color: '#003366' }}>{metric.value}</span>
                    {metric.badge && (
                      <span style={{ ...styles.badge, background: metric.badge.startsWith('+') ? '#ECFDF5' : '#FEF2F2', color: metric.badge.startsWith('+') ? '#10B981' : '#EF4444' }}>{metric.badge}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#4A6A8A', marginTop: 40, fontSize: 18, gridColumn: '1 / span 2' }}>No Data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}