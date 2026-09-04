import axios from "axios";
import { useState, useEffect } from 'react';
import { Award, Gift, ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import Footer from "../Dashboard/Footer";

export default function RewardsPage() {
  const [notifications, setNotifications] = useState([]);
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 968 : false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [justArrived, setJustArrived] = useState(false);
  const navigate = useNavigate();
  const userToken = localStorage.getItem("accessToken");

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 968);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  useEffect(() => {
    const fetchReward = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_CHECK_ELIGIBILITY_API}`,
          {
            withCredentials: true,
            headers: {
              ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
            },
          }
        );
        if (res.data && res.data.reward) {
          const reward = res.data.reward;
          const formLinkMatch = reward.message.match(/https:\/\/docs\.google\.com\/forms[^\s)]+/);
          const formLink = formLinkMatch ? formLinkMatch[0] : null;

          setNotifications([{
            id: reward._id,
            title: "Reward",
            description: reward.message,
            type: "gift",
            time: reward.distributedAt
              ? new Date(reward.distributedAt).toLocaleString()
              : "N/A",
            read: reward.viewed || false,
            isActive: reward.isActive,
            formLink,
          }]);
          const isNewActive = !!(reward.isActive && !reward.viewed);
          setJustArrived(isNewActive);
          setBoxOpen(false);
          if (isNewActive) {
            setTimeout(() => setBoxOpen(true), 800);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reward:', err);
        setLoading(false);
      }
    };
    fetchReward();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="background-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
        </div>
        <div className="spinner"></div>
        <p className="loading-text">Loading Your Rewards...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #0a2540 0%, #1a365d 100%);
            color: #FFFFFF;
            font-family: 'Inter', system-ui, sans-serif;
            flex-direction: column;
            position: relative;
            overflow: hidden;
          }
          .background-circles {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          .circle {
            position: absolute;
            border-radius: 50%;
            animation: pulse 4s ease-in-out infinite;
          }
          .circle-1 {
            top: 20%;
            left: 10%;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%);
          }
          .circle-2 {
            bottom: 10%;
            right: 15%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(0,167,157,0.15) 0%, transparent 70%);
            animation-delay: 2s;
          }
          .spinner {
            border: 4px solid rgba(34,211,238,0.3);
            border-top: 4px solid #22D3EE;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            box-shadow: 0 0 30px rgba(34,211,238,0.3);
          }
          .loading-text {
            margin-top: 20px;
            font-size: 18px;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: #e2e8f0;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      {/* Top Navigation Bar */}
      <div className="navbar-fixed">
        <TopNavigationBar
          
          navItems={navItems}
        />
      </div>

      {/* Background Elements */}
      <div className="background-elements">
        <div className="bg-element bg-element-1"></div>
        <div className="bg-element bg-element-2"></div>
      </div>

      <div className="rewards-container">
        {/* Main Reward Section */}
        {notifications.length > 0 && notifications[0].isActive ? (
          <div className="reward-banner active">
            {/* Visual Section */}
            <div 
              className="visual-section"
              onClick={() => { if (notifications[0]?.isActive) setBoxOpen((v) => !v); }}
            >
              {/* Animated Background Elements */}
              <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="sparkle" style={{
                    top: `${20 + i * 10}%`,
                    left: `${10 + i * 8}%`,
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>

              {/* Animated Gift Box */}
              <div className="gift-box-container">
                <div className="gift-box">
                  {/* Box Base */}
                  <div className="box-base">
                    <div className="ribbon horizontal"></div>
                    <div className="ribbon vertical"></div>
                  </div>

                  {/* Box Lid */}
                  <div className={`box-lid ${boxOpen ? 'open' : ''}`} />

                  {/* Reward Content */}
                  <div className={`reward-content ${boxOpen ? 'visible' : ''}`}>
                    <div className="reward-badge">🎉 New Reward Unlocked</div>
                    <div className="reward-description">
                      {notifications[0]?.description || 'Goodies worth ₹1,000 await you!'}
                    </div>
                    <button
                      className="claim-btn"
                      disabled={!notifications[0]?.isActive}
                      onClick={() => {
                        if (notifications[0]?.isActive) {
                          window.open('https://forms.gle/pVCWgpoXdaoY6qnm9', '_blank');
                        }
                      }}
                    >
                      Claim Now
                    </button>
                  </div>

                  {/* Confetti Effect */}
                  {boxOpen && (
                    <div className="confetti-container">
                      {[...Array(14)].map((_, i) => (
                        <div key={i} className="confetti" />
                      ))}
                    </div>
                  )}
                </div>

                {justArrived && (
                  <div className="hint-text">
                    Tap the box to view your reward
                  </div>
                )}

                <div className="decorative-text">
                  ✨ Exclusive Goodies Await ✨
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="content-section">
              <div className="content-wrapper">
                <div className="reward-tag">
                  🎁 NEW REWARD
                </div>

                <h1 className="reward-title">
                  Here's something special for you!
                </h1>

                <p className="reward-description-text">
                  {notifications[0].description}
                </p>

                <div className="reward-meta">
                  <p>
                    <strong>Distributed:</strong> {notifications[0].time}
                  </p>
                </div>

                <button
                  className="primary-btn"
                  disabled={!notifications[0].isActive}
                  onClick={() => {
                    if (notifications[0].isActive) {
                      window.open('https://forms.gle/pVCWgpoXdaoY6qnm9', "_blank");
                    }
                  }}
                >
                  <span>Claim Your Reward</span>
                  {notifications[0].isActive && <ArrowRight className="btn-icon" />}
                </button>
              </div>
            </div>
          </div>
        ) : notifications.length > 0 && !notifications[0].isActive ? (
          <div className="reward-state expired">
            <Gift className="state-icon" />
            <h2>Reward Expired</h2>
            <p>This reward is no longer active. Please check back later for new goodies!</p>
          </div>
        ) : (
          <div className="reward-state empty">
            <div className="icon-container">
              <Award className="state-icon" />
              <div className="icon-border"></div>
            </div>
            <h2>No Rewards Yet</h2>
            <p>Keep completing tasks to unlock exclusive rewards and goodies!</p>
          </div>
        )}

        {/* Action Cards */}
        <div className="action-cards">
          <div className="action-card primary">
            <div className="card-bg-element"></div>
            <div className="card-icon">🏠</div>
            <h3>Post Your Property</h3>
            <p>List your property in minutes</p>
          </div>

          <div className="action-card secondary">
            <div className="card-icon">🛠️</div>
            <h3>Support</h3>
            <p>Need help? Contact support</p>
          </div>

          <div className="action-card accent">
            <div className="card-bg-element"></div>
            <div className="card-icon">🎁</div>
            <h3>Goodies Worth ₹1,000</h3>
            <p>Exclusive for verified users</p>
          </div>
        </div>
      </div>

      <Footer isMobile={isMobile} user={user} />

      <style jsx>{`
        .rewards-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-family: 'Inter', system-ui, sans-serif;
          margin-top: 80px;
          position: relative;
          overflow: hidden;
        }

        .navbar-fixed {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 999;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .background-elements {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bg-element {
          position: absolute;
          border-radius: 50%;
          animation: float 8s ease-in-out infinite;
          pointer-events: none;
        }

        .bg-element-1 {
          top: 15%;
          left: 5%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%);
        }

        .bg-element-2 {
          bottom: 10%;
          right: 10%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(0,167,157,0.08) 0%, transparent 70%);
          animation-delay: 3s;
        }

        .rewards-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          position: relative;
          z-index: 1;
        }

        /* Active Reward Banner */
        .reward-banner.active {
          background: #FFFFFF;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,51,102,0.08);
          display: flex;
          min-height: 500px;
          position: relative;
          border: 1px solid rgba(226,232,240,0.8);
          margin-bottom: 50px;
        }

        .visual-section {
          flex: 0 0 50%;
          background: linear-gradient(135deg, #0a2540 0%, #1e40af 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .visual-section:hover {
          transform: translateY(-2px);
        }

        .floating-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }

        .shape-1 {
          top: 15%;
          left: 10%;
          width: 120px;
          height: 120px;
          background: rgba(34,211,238,0.1);
        }

        .shape-2 {
          bottom: 20%;
          right: 15%;
          width: 90px;
          height: 90px;
          background: rgba(0,167,157,0.1);
          animation-delay: 2s;
        }

        .shape-3 {
          top: 40%;
          right: 20%;
          width: 60px;
          height: 60px;
          background: rgba(244,247,249,0.05);
          animation-delay: 4s;
        }

        .sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #22D3EE;
          animation: twinkle 2s ease-in-out infinite;
          box-shadow: 0 0 10px #22D3EE;
        }

        .gift-box-container {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .gift-box {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 25px 50px rgba(0,0,0,0.25));
        }

        .box-base {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 260px;
          height: 140px;
          border-radius: 16px;
          background: linear-gradient(135deg, #00A79D 0%, #22D3EE 100%);
          border: 3px solid rgba(255,255,255,0.2);
          overflow: hidden;
        }

        .ribbon {
          position: absolute;
          background: rgba(255,255,255,0.3);
        }

        .ribbon.horizontal {
          top: 46%;
          left: 0;
          right: 0;
          height: 8px;
        }

        .ribbon.vertical {
          left: 50%;
          top: 0;
          bottom: 0;
          width: 8px;
          transform: translateX(-50%);
        }

        .box-lid {
          position: absolute;
          bottom: 140px;
          left: 50%;
          transform-origin: left bottom;
          transform: translateX(-50%) rotateX(0deg);
          transition: transform 900ms cubic-bezier(0.2, 0.75, 0.25, 1);
          width: 270px;
          height: 42px;
          border-radius: 12px;
          background: #0a2540;
          border: 3px solid rgba(255,255,255,0.2);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .box-lid.open {
          transform: translateX(-50%) rotateX(78deg) translateY(-6px);
        }

        .reward-content {
          position: absolute;
          bottom: 150px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          padding: 16px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 12px 28px rgba(0,0,0,0.2);
          opacity: 0;
          pointer-events: none;
          transition: opacity 700ms ease 200ms;
        }

        .reward-content.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .reward-badge {
          font-size: 13px;
          font-weight: 700;
          color: #0a2540;
          margin-bottom: 8px;
        }

        .reward-description {
          font-size: 14px;
          color: #334155;
          margin-bottom: 12px;
          line-height: 1.4;
          max-height: 110px;
          overflow: auto;
        }

        .claim-btn {
          background: linear-gradient(135deg, #00A79D 0%, #22D3EE 100%);
          color: #FFFFFF;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(34,211,238,0.3);
          letter-spacing: 0.3px;
          transition: all 0.3s ease;
        }

        .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(34,211,238,0.4);
        }

        .confetti-container {
          position: absolute;
          bottom: 160px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .confetti {
          position: absolute;
          width: 6px;
          height: 12px;
          background: #22D3EE;
          left: ${(Math.random() * 180 - 90).toFixed(0)}px;
          transform: rotate(${(Math.random() * 360).toFixed(0)}deg);
          border-radius: 2px;
          animation: confetti-fall 1.2s ease-out forwards;
        }

        .confetti:nth-child(3n) { background: #00A79D; }
        .confetti:nth-child(3n+1) { background: #F4F7F9; }

        .hint-text {
          margin-top: 16px;
          color: #FFFFFF;
          font-size: 14px;
          text-align: center;
          opacity: 0.9;
        }

        .decorative-text {
          position: absolute;
          bottom: 50px;
          left: 0;
          right: 0;
          text-align: center;
          color: #FFFFFF;
          font-size: 18px;
          font-weight: 700;
          opacity: 0.9;
          text-shadow: 0 0 20px rgba(34,211,238,0.6);
          animation: glow 2s ease-in-out infinite;
        }

        .content-section {
          flex: 0 0 50%;
          padding: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #FFFFFF;
          position: relative;
        }

        .content-wrapper {
          max-width: 400px;
          margin: 0 auto;
          width: 100%;
        }

        .reward-tag {
          display: inline-block;
          background: linear-gradient(135deg, #00A79D 0%, #22D3EE 100%);
          color: #FFFFFF;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(34,211,238,0.3);
          animation: pulse 2s ease-in-out infinite;
          letter-spacing: 0.5px;
        }

        .reward-title {
          font-size: 36px;
          font-weight: 800;
          color: #0a2540;
          margin: 0 0 24px 0;
          line-height: 1.2;
          background: linear-gradient(135deg, #0a2540 0%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .reward-description-text {
          font-size: 16px;
          color: #475569;
          line-height: 1.7;
          margin: 0 0 32px 0;
        }

        .reward-meta {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 32px;
          border-left: 4px solid #22D3EE;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .reward-meta p {
          font-size: 14px;
          color: #475569;
          margin: 0;
          font-weight: 500;
        }

        .reward-meta strong {
          color: #0a2540;
        }

        .primary-btn {
          background: linear-gradient(135deg, #00A79D 0%, #22D3EE 100%);
          color: #FFFFFF;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(34,211,238,0.3);
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 300px;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(34,211,238,0.4);
        }

        .primary-btn:disabled {
          background: #cbd5e0;
          color: #718096;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-icon {
          width: 20px;
          height: 20px;
        }

        /* Reward States */
        .reward-state {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 80px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
          margin-bottom: 50px;
        }

        .reward-state.expired .state-icon {
          color: #cbd5e0;
        }

        .reward-state.empty .state-icon {
          color: #475569;
        }

        .state-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
        }

        .reward-state h2 {
          font-size: 28px;
          font-weight: 700;
          color: #0a2540;
          margin-bottom: 12px;
        }

        .reward-state p {
          font-size: 16px;
          color: #64748b;
        }

        .icon-container {
          position: relative;
          display: inline-block;
          margin-bottom: 28px;
        }

        .icon-border {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 2px dashed #22D3EE;
          transform: translate(-50%, -50%);
          animation: rotate 20s linear infinite;
        }

        /* Action Cards */
        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .action-card {
          padding: 32px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .action-card.primary {
          background: linear-gradient(135deg, #0a2540 0%, #1e40af 100%);
          color: #FFFFFF;
          box-shadow: 0 10px 30px rgba(10,37,64,0.2);
        }

        .action-card.secondary {
          background: #FFFFFF;
          color: #0a2540;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
        }

        .action-card.accent {
          background: linear-gradient(135deg, #00A79D 0%, #22D3EE 100%);
          color: #FFFFFF;
          box-shadow: 0 10px 30px rgba(34,211,238,0.2);
        }

        .action-card:hover {
          transform: translateY(-4px);
        }

        .action-card.primary:hover {
          box-shadow: 0 15px 40px rgba(10,37,64,0.3);
        }

        .action-card.secondary:hover {
          box-shadow: 0 15px 40px rgba(0,0,0,0.1);
          border-color: #22D3EE;
        }

        .action-card.accent:hover {
          box-shadow: 0 15px 40px rgba(34,211,238,0.3);
        }

        .card-bg-element {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }

        .action-card.primary .card-bg-element {
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
        }

        .action-card.accent .card-bg-element {
          bottom: -40px;
          left: -40px;
          width: 150px;
          height: 150px;
        }

        .card-icon {
          font-size: 40px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .action-card h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }

        .action-card p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
          position: relative;
          z-index: 1;
        }

        .action-card.secondary p {
          color: #64748b;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        @keyframes glow {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; text-shadow: 0 0 30px rgba(34,211,238,0.8); }
        }

        @keyframes confetti-fall {
          0% { opacity: 0; transform: translateY(0) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-120px) rotate(360deg); }
        }

        @keyframes rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Responsive Design */
        @media (max-width: 968px) {
          .reward-banner.active {
            flex-direction: column;
          }
          .visual-section {
            flex: 0 0 100%;
            min-height: 350px;
          }
          .content-section {
            flex: 0 0 100%;
            padding: 40px 30px;
          }
          .gift-box {
            width: 220px;
            height: 220px;
          }
          .box-base {
            width: 200px;
            height: 120px;
          }
          .box-lid {
            width: 210px;
            height: 36px;
            bottom: 120px;
          }
          .reward-content {
            bottom: 130px;
            width: 180px;
            padding: 10px;
          }
        }

        @media (max-width: 640px) {
          .rewards-container {
            padding: 20px 16px;
          }
          .reward-title {
            font-size: 28px;
          }
          .content-section {
            padding: 32px 24px;
          }
          .reward-state {
            padding: 60px 32px;
          }
          .action-card {
            padding: 24px;
            min-height: 160px;
          }
        }
      `}</style>
    </div>
  );
}