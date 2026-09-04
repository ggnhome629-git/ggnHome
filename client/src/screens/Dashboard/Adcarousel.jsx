import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const images = [
  '/Ad/Ad1.jpg',
  // '/Ad/Ad2.jpg',
  '/Ad/ad3.jpg',
  '/Ad/ad4.jpg'
];

const backgroundImage = "/Dashboard.jpg";

function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);


 useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, 4000); // scroll every 1 second

  return () => clearInterval(interval);
}, []); // empty dependency array

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((currentIndex - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((currentIndex + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const goToSlide = (index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  return (
    <div style={{
      width: '100%',
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundBlendMode: 'overlay',
      position: 'relative',
      padding: window.innerWidth < 600 ? '28px 12px' : '48px 16px',
      boxSizing: 'border-box',
      marginTop: "0px",
      borderTop: 'none',
      backgroundColor: 'transparent',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: window.innerWidth < 600 ? '150px' : '250px',
    }}>
      
     
{/* Center Glossy CTA */}
<motion.div
  role="button"
  aria-label="Open goodies offer details"
  className="animated-cta-box"
  initial={{ opacity: 0, y: 16, scale: 0.96 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.6, ease: [0, 0, 0.2, 1], delay: 0.15 }}
  style={{
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: window.innerWidth < 600 ? '10px 16px' : '16px 28px',
    borderRadius: '16px',
    cursor: 'pointer',
    userSelect: 'none',
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
    boxSizing: 'border-box',
    maxWidth: 'min(92%, 640px)',
    textAlign: 'center',
  }}
>
  <span className="twinkle-star" aria-hidden>✨</span>
    <span
      onClick={(e) => { e.stopPropagation(); setShowOfferModal(true); }}
      style={{
        cursor: 'pointer',
        fontSize: 'clamp(0.85rem, 2.6vw, 1.9rem)',
        fontWeight: '900',
        letterSpacing: '0.2px',
        lineHeight: 1.3,
        color: '#333333',
      }}
    >
      Register with us, Deal with us & Get Rewarded up to ₹1,000.
    </span>
  <span className="twinkle-star" aria-hidden>✨</span>
</motion.div>
      {showOfferModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offerModalTitle"
          onClick={() => setShowOfferModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(96vw, 780px)',
              maxHeight: '86vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              color: '#333333',
              borderRadius: 14,
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              border: '1px solid #E5E7EB',
              padding: '18px',
            }}
          >
            <div className="offer-header">
              
              <div>
                <div className="title-row">
                   <button
                onClick={() => setShowOfferModal(false)}
                aria-label="Close"
                className="offer-close"
              >
                ✕
              </button>
                  
                  <h2 id="offerModalTitle">Your Secure Move, Rewarded</h2>
                </div>
                <p className="subtitle">Safe, transparent, and guided from search to signing — with a welcome gift on us.</p>
              </div>
             
            </div>

            <div className="offer-body">
              <p className="lead"><strong>At ggnHome</strong>, we believe finding a new home in Gurgaon should be both secure and rewarding. We don't just connect you to a listing; we ensure your entire journey — from searching to signing — is built on trust.</p>

              <h3 className="section-heading">We've Got You Covered</h3>
              <p>Your peace of mind is our top priority. Unlike other platforms, we actively protect your interests by handling the complex negotiations and legal details.</p>
              <ul className="offer-list">
                <li><strong>Strong, Secure Agreements:</strong> Every rental or sale agreement is thoroughly reviewed, transparent, and crafted to be strong and fair — protecting your rights as a tenant or buyer.</li>
                <li><strong>Expert Negotiation:</strong> Our team manages the direct negotiations with the owner, handling the tough conversations so you can focus on your new home.</li>
                <li><strong>Complete Confidence:</strong> Sign your lease or purchase agreement knowing a professional has secured your new beginning.</li>
              </ul>

              <h3 className="section-heading">Get Your Welcome Reward!</h3>
              <div className="callout">
                <p><strong>Here's the Deal:</strong> When you successfully close any rent or sale deal through the ggnHome website, we will send you a welcome package.</p>
              </div>
              <div className="callout success">
                <p><strong>Your Gift:</strong> Enjoy a fantastic selection of goodies, on us, worth up to ₹1,000!</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowOfferModal(false)}
                style={{ background: '#00A79D', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Explore Properties
              </button>
              <button
                onClick={() => setShowOfferModal(false)}
                style={{ background: '#F4F7F9', color: '#003366', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

<style>{`
.twinkle-star {
  color: #22D3EE;
  animation: twinkle 1.8s ease-in-out infinite alternate;
  font-size: 1rem;
}
@keyframes twinkle {
  0% { opacity: 0.5; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1.1); }
}

.animated-cta-box {
  border: 1px solid rgba(34, 211, 238, 0.4);
}

/* Modal typography and layout */
.offer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.title-badge {
  background: linear-gradient(180deg, #22D3EE, #00A79D);
  color: #FFFFFF; font-weight: 800; font-size: 0.7rem;
  padding: 4px 8px; border-radius: 999px; letter-spacing: 0.2px;
}
.offer-header h2 { margin: 0; font-size: 1.25rem; font-weight: 900; color: #003366; letter-spacing: -0.2px; }
.subtitle { margin: 6px 0 0; color: #4A6A8A; font-size: 0.9rem; }
.offer-close { background: #F4F7F9; border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-weight: 700; color: #333333; }

.offer-body { font-size: 0.98rem; line-height: 1.7; color: #333333; }
.lead { font-size: 1rem; color: #1f2937; }
.section-heading { margin: 14px 0 8px; font-size: 1rem; color: #003366; font-weight: 800; }
.offer-list { margin: 0 0 12px 0; padding: 0; list-style: none; }
.offer-list li { position: relative; padding-left: 24px; margin: 8px 0; }
.offer-list li::before {
  content: ""; position: absolute; left: 0; top: 8px; width: 12px; height: 12px; border-radius: 3px;
  background: linear-gradient(180deg, #22D3EE, #00A79D);
}
.callout { background: #F4F7F9; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 12px; margin: 8px 0; }
.callout.success { border-color: #00A79D; background: linear-gradient(180deg, #F4F7F9, #EFFFFD); }

/* Mobile-friendly modal text sizing */
@media (max-width: 600px) {
  .offer-header h2 { font-size: 1.05rem; }
  .subtitle { font-size: 0.85rem; }
  .offer-body { font-size: 0.95rem; }
}
/* Enhanced typing CTA */
.enhanced-typing {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(0, 52, 102, 0.55);
  box-shadow: 0 0 14px rgba(0, 167, 157, 0.6), 0 0 30px rgba(34, 211, 238, 0.35);
  animation: glowPulse 2.2s ease-in-out infinite alternate;
  border: 2px solid transparent;
  border-image: linear-gradient(180deg, #22D3EE, #00A79D) 1;
}

@keyframes glowPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.35);
  }
  100% {
    transform: scale(1.05);
    box-shadow: 0 0 22px rgba(0, 167, 157, 0.75);
  }
}
`}</style>

export default AdCarousel;