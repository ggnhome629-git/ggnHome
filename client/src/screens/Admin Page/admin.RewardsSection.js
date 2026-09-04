import React, { useState, useEffect } from 'react';
import { Award, Send, RotateCcw, Mail, MessageSquare, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useNavigate } from 'react-router-dom';

export default function AdminRewardsSection() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('Congratulations! You have unlocked a special reward from GGNHome. Our team appreciates your engagement and support!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [distributedList, setDistributedList] = useState([]);
    const [focusedField, setFocusedField] = useState(null);

    const [user, setUser] = useState(null);
    
  const navigate = useNavigate();

  const adminId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?._id || null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [email, message]);

    
    
const handleLogout = async () => {
    const accessToken = localStorage.getItem("accessToken");
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
        const accessToken = localStorage.getItem("accessToken");
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

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
  const validate = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleDistribute = async () => {
    setError(null);
    setSuccess(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        message: message ? message.trim() : undefined,
        adminId: adminId || undefined,
      };

      const accessToken = localStorage.getItem("accessToken");

      const res = await fetch(process.env.REACT_APP_ADMIN_DISTRIBUTE_REWARD_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data?.success) {
        setSuccess(data.message || 'Reward distributed');
        const entry = data.reward || { email: payload.email, message: payload.message, distributedAt: new Date().toISOString() };
        setDistributedList(prev => [entry, ...prev]);
        setEmail('');
        setMessage('');
      } else {
        setError(data?.message || 'Unexpected response from server');
      }
    } catch (err) {
      console.error('Distribute error', err);
      const serverMsg = err.message || 'Server error';
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)', padding: '90px 20px' }}>
          {/* Top Navigation Bar */}
      <div
        style={{
          position: "fixed",
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
      {/* Floating particles animation */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              background: i % 3 === 0 ? '#22D3EE' : i % 3 === 1 ? '#00A79D' : '#FFFFFF',
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-30px) translateX(20px); }
          50% { transform: translateY(-60px) translateX(-20px); }
          75% { transform: translateY(-30px) translateX(20px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .reward-card {
          animation: slideIn 0.5s ease-out;
        }
        .input-focus {
          transition: all 0.3s ease;
        }
        .input-focus:focus {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(34, 211, 238, 0.3);
        }
        .button-hover {
          transition: all 0.3s ease;
        }
        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 167, 157, 0.4);
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(244,247,249,0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: '40px',
          marginBottom: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,167,157,0.4)',
              animation: 'pulse 3s ease-in-out infinite'
            }}>
              <Award size={32} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ margin: 0, color: '#003366', fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' }}>
                Rewards Dashboard
              </h1>
              <p style={{ margin: '8px 0 0 0', color: '#4A6A8A', fontSize: 16 }}>
                Distribute rewards to your valued users
              </p>
            </div>
          </div>
        </div>

        {/* Main Distribution Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(244,247,249,0.98) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.3)',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Sparkles size={24} color="#00A79D" />
            <h2 style={{ margin: 0, color: '#003366', fontSize: 24, fontWeight: 700 }}>
              Distribute New Reward
            </h2>
          </div>

          <div style={{ display: 'grid', gap: 24 }}>
            {/* Email Input */}
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#003366',
                marginBottom: 10
              }}>
                <Mail size={18} color="#00A79D" />
                Recipient Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="user@example.com"
                className="input-focus"
                style={{ 
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: focusedField === 'email' ? '2px solid #00A79D' : '2px solid #E5E7EB',
                  fontSize: 15,
                  outline: 'none',
                  background: '#FFFFFF',
                  color: '#333333',
                  boxShadow: focusedField === 'email' ? '0 4px 12px rgba(0,167,157,0.2)' : 'none'
                }}
              />
            </div>

            {/* Message Input */}
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#003366',
                marginBottom: 10
              }}>
                <MessageSquare size={18} color="#00A79D" />
                Reward Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                placeholder="Add a personalized message..."
                className="input-focus"
                style={{ 
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: focusedField === 'message' ? '2px solid #00A79D' : '2px solid #E5E7EB',
                  fontSize: 15,
                  outline: 'none',
                  background: '#FFFFFF',
                  color: '#333333',
                  minHeight: 120,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxShadow: focusedField === 'message' ? '0 4px 12px rgba(0,167,157,0.2)' : 'none'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleDistribute}
                disabled={loading}
                className="button-hover"
                style={{ 
                  background: loading ? '#4A6A8A' : 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  border: 'none',
                  borderRadius: 12,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(0,167,157,0.3)',
                  flex: 1,
                  justifyContent: 'center'
                }}
              >
                <Send size={18} />
                {loading ? 'Distributing...' : 'Distribute Reward'}
              </button>

              <button
                onClick={() => { 
                  setEmail('');
                  setMessage('');
                  setError(null);
                  setSuccess(null);
                }}
                className="button-hover"
                style={{ 
                  background: '#F4F7F9',
                  color: '#003366',
                  padding: '14px 28px',
                  border: '2px solid #E5E7EB',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <RotateCcw size={18} />
                Reset
              </button>
            </div>

            {/* Feedback Messages */}
            {error && (
              <div style={{ 
                background: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
                padding: '14px 18px',
                borderRadius: 12,
                border: '2px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'slideIn 0.3s ease-out'
              }}>
                <AlertCircle size={20} color="#DC2626" />
                <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 14 }}>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                background: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)',
                padding: '14px 18px',
                borderRadius: 12,
                border: '2px solid #6EE7B7',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'slideIn 0.3s ease-out'
              }}>
                <CheckCircle size={20} color="#059669" />
                <span style={{ color: '#059669', fontWeight: 600, fontSize: 14 }}>{success}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recently Distributed List */}
        {distributedList.length > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(244,247,249,0.98) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: 40,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <CheckCircle size={24} color="#00A79D" />
              <h3 style={{ margin: 0, color: '#003366', fontSize: 22, fontWeight: 700 }}>
                Recently Distributed
              </h3>
              <span style={{ 
                background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                marginLeft: 'auto'
              }}>
                {distributedList.length}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {distributedList.map((r, i) => (
                <div
                  key={i}
                  className="reward-card"
                  style={{ 
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F4F7F9 100%)',
                    padding: 20,
                    borderRadius: 12,
                    border: '2px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                    animationDelay: `${i * 0.1}s`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,167,157,0.15)';
                    e.currentTarget.style.borderColor = '#00A79D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700,
                      color: '#003366',
                      fontSize: 15,
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Mail size={16} color="#00A79D" />
                      {r.email || r.userId || (r.user && r.user.email)}
                    </div>
                    <div style={{ fontSize: 13, color: '#4A6A8A', lineHeight: 1.5 }}>
                      {r.message || 'No message'}
                    </div>
                  </div>
                  <div style={{ 
                    textAlign: 'right',
                    color: '#4A6A8A',
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#F4F7F9',
                    padding: '8px 14px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap'
                  }}>
                    {r.distributedAt ? new Date(r.distributedAt).toLocaleString() : 'Just now'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}