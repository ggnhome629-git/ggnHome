import React from 'react';
import { Home, Target, Rocket, Brain, MapPin, Shield, Gift, Users, Award, Lock } from 'lucide-react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useAuth } from '../../Context/AuthContext';
import { useEffect } from 'react';  
import { useNavigate } from 'react-router-dom';


export default function AboutPage() {
  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#333333',
      lineHeight: '1.6',
    },
    hero: {
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(0, 51, 102, 0.85) 0%, rgba(74, 106, 138, 0.85) 100%)',
      color: '#FFFFFF',
      padding: '80px 20px',
      textAlign: 'center',
      overflow: 'hidden',
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 51, 102, 0.5)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex: 1,
    },
    heroContent: {
      position: 'relative',
      zIndex: 2,
      maxWidth: '1200px',
      margin: '0 auto',
      opacity: 0,
      animation: 'fadeIn 1.5s ease forwards',
    },
    heroTitle: {
      fontSize: '56px',
      fontWeight: '800',
      marginBottom: '20px',
      lineHeight: '1.2',
      textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
      display: 'inline-block',
      position: 'relative',
      paddingBottom: '10px',
    },
    animatedUnderline: {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: '50%',
      width: '0%',
      height: '4px',
      backgroundColor: '#22D3EE',
      borderRadius: '2px',
      transform: 'translateX(-50%)',
      animation: 'underlineExpand 2s ease forwards',
    },
    heroSubtitle: {
      fontSize: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      opacity: '0.95',
    },
    section: {
      padding: '60px 20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    sectionAlt: {
      backgroundColor: '#F4F7F9',
    },
    sectionTitle: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '40px',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '30px',
      marginTop: '40px',
    },
    card: {
      backgroundColor: '#FFFFFF',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 51, 102, 0.1)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer',
    },
    cardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 15px rgba(0, 167, 157, 0.2)',
    },
    cardIcon: {
      width: '50px',
      height: '50px',
      backgroundColor: '#00A79D',
      color: '#FFFFFF',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
    },
    cardTitle: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '15px',
    },
    cardText: {
      color: '#333333',
      lineHeight: '1.7',
    },
    highlight: {
      backgroundColor: '#22D3EE',
      color: '#003366',
      padding: '3px 8px',
      borderRadius: '4px',
      fontWeight: '600',
    },
    valuesList: {
      listStyle: 'none',
      padding: '0',
    },
    valueItem: {
      backgroundColor: '#FFFFFF',
      padding: '20px',
      marginBottom: '15px',
      borderLeft: '4px solid #00A79D',
      fontSize: '18px',
    },
    featureBox: {
      backgroundColor: '#FFFFFF',
      padding: '25px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '2px solid #22D3EE',
    },
    featureTitle: {
      color: '#003366',
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    ctaSection: {
      background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
      color: '#FFFFFF',
      padding: '80px 20px',
      textAlign: 'center',
    },
    ctaTitle: {
      fontSize: '36px',
      fontWeight: '700',
      marginBottom: '20px',
    },
    ctaText: {
      fontSize: '18px',
      marginBottom: '30px',
      maxWidth: '700px',
      margin: '0 auto 30px',
    },
    button: {
      backgroundColor: '#003366',
      color: '#FFFFFF',
      padding: '15px 40px',
      fontSize: '18px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      marginTop: '20px',
    },
    '@keyframes fadeIn': {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    '@keyframes underlineExpand': {
      from: { width: '0%' },
      to: { width: '50%' },
    },
  };
   const { user } = useAuth();
  const navigate = useNavigate();



  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  const [hoveredCard, setHoveredCard] = React.useState(null);

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 999, backgroundColor: "#FFFFFF" }}>
        <TopNavigationBar  navItems={navItems} />
      </div>
      <div style={{ ...styles.container, paddingTop: "80px" }}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroOverlay}></div>
        <div style={styles.heroContent}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏙️</div>
          <h1 style={styles.heroTitle}>
            About GgnHomes
            <span style={styles.animatedUnderline}></span>
          </h1>
          <p style={styles.heroSubtitle}>
            Where Gurgaon Finds Its Next Home — A transparent, technology-driven property discovery platform built exclusively for Gurgaon
          </p>
        </div>
      </div>

      {/* Vision & Mission */}
      <div style={styles.section}>
        <div style={styles.grid}>
          <div 
            style={{...styles.card, ...(hoveredCard === 'vision' && styles.cardHover)}}
            onMouseEnter={() => setHoveredCard('vision')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardIcon}>
              <Target size={28} />
            </div>
            <h3 style={styles.cardTitle}>💡 Our Vision</h3>
            <p style={styles.cardText}>
              To make property renting and buying in Gurgaon a process that's not just convenient — but <span style={styles.highlight}>trustworthy, rewarding, and secure</span>. Every Gurgaon resident should feel confident when signing a lease, closing a deal, or finding their next home.
            </p>
          </div>

          <div 
            style={{...styles.card, ...(hoveredCard === 'mission' && styles.cardHover)}}
            onMouseEnter={() => setHoveredCard('mission')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardIcon}>
              <Rocket size={28} />
            </div>
            <h3 style={styles.cardTitle}>🚀 Our Mission</h3>
            <p style={styles.cardText}>
              To provide the most accurate and personalized property search experience using next-generation AI, ensure 100% verified listings, offer legal and documentation support, and create a rewarding journey through our exclusive <span style={styles.highlight}>ggnHomes Goodies & Rewards</span> program.
            </p>
          </div>
        </div>
      </div>

      {/* AI-Powered Section */}
      <div style={{...styles.section, ...styles.sectionAlt}}>
        <h2 style={styles.sectionTitle}>
          <Brain size={40} color="#00A79D" />
          Powered by AI, Built for Humans
        </h2>
        <div style={styles.featureBox}>
          <p style={{...styles.cardText, fontSize: '18px', marginBottom: '20px'}}>
            Our standout feature is <span style={styles.highlight}>AI-Driven Smart Search</span> — a system that truly understands user intent.
          </p>
          <p style={{...styles.cardText, fontSize: '16px', fontStyle: 'italic', marginBottom: '20px'}}>
            "I need a 3BHK near Sector 46 for rent with good schools nearby"
          </p>
          <p style={styles.cardText}>
            Our AI doesn't just keyword match — it analyzes your preferences, intent, and comfort factors, returning properties with a match percentage score based on your unique needs. The more you interact, the smarter it becomes.
          </p>
        </div>
      </div>

      {/* Gurgaon Focus */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <MapPin size={40} color="#00A79D" />
          Focused on Gurgaon — and Only Gurgaon
        </h2>
        <div style={styles.card}>
          <p style={{...styles.cardText, fontSize: '18px', textAlign: 'center'}}>
            Unlike national platforms that scatter their attention across hundreds of cities, ggnHomes is <span style={styles.highlight}>proudly Gurgaon-first</span>. Because we believe local expertise matters. Our team lives and works here. We know every sector, every block, every new project launch, and every rental trend in the city.
          </p>
        </div>
      </div>

      {/* Verified & Legal */}
      <div style={{...styles.section, ...styles.sectionAlt}}>
        <h2 style={styles.sectionTitle}>
          <Shield size={40} color="#00A79D" />
          Verified, Transparent, and Legal
        </h2>
        <div style={styles.grid}>
          {[
            { icon: '✅', title: 'Verified Property Listings', text: 'Every post is checked for authenticity' },
            { icon: '🧾', title: 'Secure Legal Agreements', text: 'Professionally drafted contracts that protect both sides' },
            { icon: '🔒', title: 'Security Deposit Protection', text: 'Ensuring tenants get rightful refunds' },
            { icon: '⚖️', title: 'Legal Consultation Support', text: 'Partnership with top property lawyers' },
          ].map((item, idx) => (
            <div 
              key={idx}
              style={{...styles.card, ...(hoveredCard === `legal-${idx}` && styles.cardHover)}}
              onMouseEnter={() => setHoveredCard(`legal-${idx}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{fontSize: '40px', marginBottom: '15px'}}>{item.icon}</div>
              <h4 style={styles.cardTitle}>{item.title}</h4>
              <p style={styles.cardText}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards Program */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Gift size={40} color="#00A79D" />
          Rewards, Goodies & Recognition
        </h2>
        <div style={styles.grid}>
          <div style={styles.featureBox}>
            <h3 style={styles.featureTitle}>
              🌟 For Tenants & Buyers
            </h3>
            <p style={styles.cardText}>
              When you close a deal through ggnHomes, we send you a curated <span style={styles.highlight}>ggnHomes Goodie Box 🎁</span> filled with useful home-start essentials and personalized surprises to mark your milestone.
            </p>
          </div>

          <div style={styles.featureBox}>
            <h3 style={styles.featureTitle}>
              🏠 For Property Owners & Agents
            </h3>
            <ul style={{...styles.cardText, paddingLeft: '20px'}}>
              <li>✅ Exclusive ggnHomes Certified Seller Badge</li>
              <li>✅ Priority listing visibility</li>
              <li>✅ Special Goodies & Digital Rewards</li>
              <li>✅ Access to verified partner network</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div style={{...styles.section, ...styles.sectionAlt}}>
        <h2 style={styles.sectionTitle}>
          <Award size={40} color="#00A79D" />
          Our Core Values
        </h2>
        <ul style={styles.valuesList}>
          {[
            'Transparency First — Every detail, price, and policy stays honest',
            'User-Centric Design — We build for clarity, simplicity, and trust',
            'Innovation in Every Click — From AI to legal automation, we evolve constantly',
            'Local Expertise — Gurgaon isn\'t just our market; it\'s our home',
            'Community Focus — Making renting and buying in Gurgaon safer for everyone',
          ].map((value, idx) => (
            <li key={idx} style={styles.valueItem}>{value}</li>
          ))}
        </ul>
      </div>

      {/* What Makes Us Different */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Users size={40} color="#00A79D" />
          What Makes Us Different
        </h2>
        <div style={styles.grid}>
          {[
            { title: 'Hyperlocal Focus', desc: '100% of our listings are from Gurgaon' },
            { title: 'Smart Recommendations', desc: 'AI learns your taste, budget, and comfort zone' },
            { title: 'Legal-Backed Confidence', desc: 'Get your rental agreement securely through us' },
            { title: 'Rewarding Deals', desc: 'Earn goodies and perks for verified transactions' },
            { title: 'Zero Commission Posting', desc: 'List your property for free with full visibility' },
          ].map((item, idx) => (
            <div 
              key={idx}
              style={{...styles.card, ...(hoveredCard === `diff-${idx}` && styles.cardHover)}}
              onMouseEnter={() => setHoveredCard(`diff-${idx}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h4 style={styles.cardTitle}>{item.title}</h4>
              <p style={styles.cardText}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our Promise */}
      <div style={{...styles.section, ...styles.sectionAlt}}>
        <h2 style={styles.sectionTitle}>
          <Lock size={40} color="#00A79D" />
          Our Promise to You
        </h2>
        <div style={styles.card}>
          <ul style={{...styles.cardText, fontSize: '18px', paddingLeft: '30px'}}>
            <li>Your data stays private and encrypted</li>
            <li>No spam. No hidden charges</li>
            <li>Every property you see is authentic and verified</li>
            <li>Every agreement you sign is secure and legally valid</li>
          </ul>
        </div>
      </div>

    
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes underlineExpand {
            from { width: 0%; }
            to { width: 50%; }
          }
        `}
      </style>
      <footer style={{
        background: "linear-gradient(135deg, #003366 0%, #004b6b 100%)",
        color: "#FFFFFF",
        padding: "3rem 1.5rem",
        textAlign: "center",
        marginTop: "3rem"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h3 style={{ fontWeight: "800", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
            ggnHomes – Find Your Dream Home
          </h3>
          <p style={{ fontSize: "0.9rem", color: "#D1E7FF", marginBottom: "1.5rem", maxWidth: "700px", margin: "0 auto" }}>
            Explore thousands of verified listings, connect directly with owners, and make your next move with confidence.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <a href="/" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Home</a>
            <a href="/about" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>About</a>
            <a href="/support" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Contact</a>
            <a href="/add-property" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Post Property</a>
          </div>

          {/* Contact info: phone + email */}
          <div style={{ marginBottom: '1.25rem', color: '#D1E7FF', fontSize: '0.95rem' }}>
            <div>Phone: <a href="tel:+919654131789" style={{ color: '#FFFFFF', fontWeight: 700, textDecoration: 'none' }}>+91 96541 31789</a></div>
            <div style={{ marginTop: 6 }}>Email: <a href="mailto:support@ggnhome.com" style={{ color: '#FFFFFF', fontWeight: 700, textDecoration: 'none' }}>support@ggnhome.com</a></div>
          </div>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: "1rem",
            fontSize: "0.8rem",
            color: "#B0C4DE"
          }}>
            © {new Date().getFullYear()} ggnHomes. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}