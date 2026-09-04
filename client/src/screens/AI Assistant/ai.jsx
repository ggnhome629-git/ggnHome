import { useState , useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Building2, TrendingUp, CheckCircle } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import {useAuth} from "../../Context/AuthContext";

export default function PropertySearchInterface() {
  const [started, setStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
   const { user } = useAuth();
  const navigate = useNavigate();

  const handleStart = () => { setStarted(true); };


  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setTimeout(() => {
      if (option === 'Rental') {
        navigate('/AIassistant-Rent');
      } else if (option === 'Sale') {
        navigate('/AIassistant-Sale');
      }
    }, 500);
  };

  // Responsive styles for buttons
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
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
          
          navItems={navItems}
        />
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>GgnHomes Property Search</h1>
          <p style={{ fontSize: '1.25rem', color: '#F4F7F9', lineHeight: '1.8', opacity: 0.9 }}>We will help you find the perfect property for rent or sale, and guide you through every step of your property search journey.</p>
        </div>

        {!started ? (
          <div style={{ position: 'relative', marginBottom: '4rem' }}>
            <motion.button
              onClick={handleStart}
              animate={{
                boxShadow: [
                  '0 20px 60px rgba(0,0,0,0.4), 0 0 0 0 rgba(34,211,238,0.4)',
                  '0 20px 60px rgba(0,0,0,0.4), 0 0 0 18px rgba(34,211,238,0)',
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              style={{ width: '180px', height: '180px', borderRadius: '20px', background: 'linear-gradient(145deg, #333333, #4A6A8A)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
            >
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22D3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(34,211,238,0.5)' }}>
                <div style={{ width: '28px', height: '36px', borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '20px solid #003366', transform: 'rotate(-90deg)', marginLeft: '4px' }}></div>
              </div>
              <span style={{ color: '#F4F7F9', fontSize: '1rem', fontWeight: '600', letterSpacing: '1px' }}>Press To Start</span>
            </motion.button>
          </div>
        ) : (
          <StaggerContainer style={{ display: 'flex', gap: '3rem', marginBottom: '4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StaggerItem
              onClick={() => handleOptionSelect('Rental')}
              whileHover={{ y: -8, boxShadow: '0 12px 40px rgba(34,211,238,0.3)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: isMobile ? '200px' : '280px', padding: isMobile ? '1.5rem' : '2.5rem', borderRadius: '16px', background: selectedOption === 'Rental' ? '#00A79D' : 'rgba(255,255,255,0.1)', border: '2px solid #22D3EE', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
            >
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#22D3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Home size={36} color="#003366" /></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '0.75rem' }}>Rental Property</h3>
              <p style={{ fontSize: '0.95rem', color: '#F4F7F9', lineHeight: '1.6', opacity: 0.9 }}>Search for properties available for rent with flexible terms and conditions</p>
            </StaggerItem>

            <StaggerItem
              onClick={() => handleOptionSelect('Sale')}
              whileHover={{ y: -8, boxShadow: '0 12px 40px rgba(34,211,238,0.3)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: isMobile ? '200px' : '280px', padding: isMobile ? '1.5rem' : '2.5rem', borderRadius: '16px', background: selectedOption === 'Sale' ? '#00A79D' : 'rgba(255,255,255,0.1)', border: '2px solid #22D3EE', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
            >
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#22D3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Building2 size={36} color="#003366" /></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '0.75rem' }}>Sale Property</h3>
              <p style={{ fontSize: '0.95rem', color: '#F4F7F9', lineHeight: '1.6', opacity: 0.9 }}>Browse properties available for purchase and find your dream home</p>
            </StaggerItem>
          </StaggerContainer>
        )}

        <StaggerContainer style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          maxWidth: '1200px',
          marginTop: '2rem',
          justifyContent: 'center'
        }}>
          <StaggerItem style={{
            flex: isMobile ? '0 1 calc(50% - 1rem)' : '1',
            textAlign: 'center',
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(34,211,238,0.2)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: isMobile ? '50px' : '60px',
              height: isMobile ? '50px' : '60px',
              borderRadius: '12px',
              background: '#22D3EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 15px rgba(34,211,238,0.3)'
            }}>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.75rem',
                fontWeight: '700',
                color: '#003366'
              }}>01</div>
            </div>
            <h4 style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#22D3EE',
              marginBottom: '0.5rem',
              letterSpacing: '1px'
            }}>EXPERT GUIDANCE</h4>
            <p style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#F4F7F9',
              lineHeight: '1.6',
              opacity: 0.8
            }}>Our team of property experts will guide you through the entire search process</p>
          </StaggerItem>

          <StaggerItem style={{
            flex: isMobile ? '0 1 calc(50% - 1rem)' : '1',
            textAlign: 'center',
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(34,211,238,0.2)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: isMobile ? '50px' : '60px',
              height: isMobile ? '50px' : '60px',
              borderRadius: '12px',
              background: '#22D3EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 15px rgba(34,211,238,0.3)'
            }}>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.75rem',
                fontWeight: '700',
                color: '#003366'
              }}>02</div>
            </div>
            <h4 style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#22D3EE',
              marginBottom: '0.5rem',
              letterSpacing: '1px'
            }}>VERIFIED LISTINGS</h4>
            <p style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#F4F7F9',
              lineHeight: '1.6',
              opacity: 0.8
            }}>Browse through verified property listings with accurate details and pricing</p>
          </StaggerItem>

          <StaggerItem style={{
            flex: isMobile ? '0 1 calc(50% - 1rem)' : '1',
            textAlign: 'center',
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(34,211,238,0.2)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: isMobile ? '50px' : '60px',
              height: isMobile ? '50px' : '60px',
              borderRadius: '12px',
              background: '#22D3EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 15px rgba(34,211,238,0.3)'
            }}>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.75rem',
                fontWeight: '700',
                color: '#003366'
              }}>03</div>
            </div>
            <h4 style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#22D3EE',
              marginBottom: '0.5rem',
              letterSpacing: '1px'
            }}>94% SUCCESS RATE</h4>
            <p style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#F4F7F9',
              lineHeight: '1.6',
              opacity: 0.8
            }}>Property seekers using our platform have a higher chance of finding their ideal property</p>
          </StaggerItem>
        </StaggerContainer>
      </main>
    </div>
  );
}