// React hooks for state and lifecycle
import { useState, useEffect } from 'react';
// React Router hooks for navigation and params
import { useParams, useNavigate } from 'react-router-dom';
// Icon imports
import { CreditCard, Smartphone, Building2, MapPin, Home, X, ChevronRight, DollarSign, CheckCircle } from 'lucide-react';
// Enquiry Page import
import EnquiryPage from './enquiry';
// HTTP client
import axios from 'axios';
// Top navigation bar component
import TopNavigationBar from '../Dashboard/TopNavigationBar';

// Main component for property checkout and payment
export default function PropertyCheckout() {
  // Get property ID from URL params
  const { id } = useParams();
  // Modal visibility for payment modal
  const [showPayment, setShowPayment] = useState(false); // unused, but kept for future use
  // Tracks selected payment method (future use)
  const [selectedPayment, setSelectedPayment] = useState(''); // unused, but kept for future use
  // State for property details
  const [property, setProperty] = useState(null);
  // State for selected payment option ('both', 'rent', 'deposit', 'none')
  const [paymentOption, setPaymentOption] = useState('both');
  // Modal visibility for payment modal
  const [showModal, setShowModal] = useState(false);
  // Modal visibility for payment approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  // Modal visibility for Enquiry modal
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  // State for current logged-in user
  const [user, setUser] = useState(null);
  // Navigation hook
  const navigate = useNavigate();


  // Fetch property details when component mounts or ID changes
  useEffect(() => {
    const fetchProperty = async () => {
      let res = null;

      // First try fetching from RentalProperty API
      if (process.env.REACT_APP_RENTAL_PROPERTY_DETAIL_API) {
        try {
          const rentalRes = await axios.get(`${process.env.REACT_APP_RENTAL_PROPERTY_DETAIL_API}/${id}`, { withCredentials: true });
          if (rentalRes.data && Object.keys(rentalRes.data).length > 0) {
            res = rentalRes;
          }
        } catch (err) {
          console.warn('Rental property fetch failed or not found, trying sale property...', err);
        }
      }

      // If no rental property found, try SaleProperty API
      if (!res && process.env.REACT_APP_SALE_PROPERTY_DETAIL_API) {
        try {
          const saleRes = await axios.get(`${process.env.REACT_APP_SALE_PROPERTY_DETAIL_API}/${id}`, { withCredentials: true });
          if (saleRes.data && Object.keys(saleRes.data).length > 0) {
            res = saleRes;
          }
        } catch (err) {
          console.error('Sale property fetch failed:', err);
        }
      }

      setProperty(res ? res.data : null);
    };

    fetchProperty();
  }, [id]);

  // Logout handler: clears user and redirects to login
  const handleLogout = async () => {
    // Logout endpoint configurable via .env
    await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/");
  };

  // Fetch user information on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // User info endpoint configurable via .env
        const res = await fetch(`${process.env.REACT_APP_USER_ME_API}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // Navigation bar items
  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  // Show loading state if property not loaded yet
  if (!property) return <div style={{ padding: '20px' }}>Loading property details...</div>;

  // Calculate the total amount payable based on payment option
  const calculateTotal = () => {
    // Use monthlyRent for rentals, price for sales
    const mainAmount = property.monthlyRent || property.price || 0;
    const deposit = Number(property.securityDeposit) || 0;
    if (property.monthlyRent) {
      if (paymentOption === 'both') return mainAmount + deposit;
      if (paymentOption === 'rent') return mainAmount;
      if (paymentOption === 'deposit') return deposit;
      if (paymentOption === 'none') return 0;
    } else if (property.price) {
      return mainAmount; // For SaleProperty
    }
    return 0;
  };

  // return (
  //   <div style={{ minHeight: '100vh', background: '#F4F7F9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
  //     {/* Top Header */}
  //     <TopNavigationBar navItems={navItems} user={user} handleLogout={handleLogout} />

  //     {/* Property Card */}
  //     <div style={{ padding: '12px', maxWidth: '600px', margin: '30px auto' }}>
  //       <div style={{ background: '#FFFFFF', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
  //         <div style={{ padding: '12px', display: 'flex', gap: '12px', borderBottom: '1px solid #F4F7F9' }}>
  //           <img src={property.images?.[0] || 'https://via.placeholder.com/80'} alt={property.address} style={{ width: '80px', height: '80px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #F4F7F9' }} />
  //           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
  //             <h3 style={{ color: '#333333', fontSize: '15px', fontWeight: '600', margin: 0, lineHeight: '1.3' }}>{property.address}</h3>
  //             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4A6A8A', fontSize: '13px' }}><MapPin size={14} />{property.localAmenities || 'N.A'}</div>
  //             <div style={{ color: '#4A6A8A', fontSize: '13px' }}>{property.propertyType || 'N.A'}</div>
  //           </div>
  //         </div>
  //         <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  //           <span style={{ color: '#4A6A8A', fontSize: '13px', fontWeight: '500' }}>Property Price</span>
  //           <span style={{ color: '#003366', fontSize: '18px', fontWeight: '700' }}>{property.monthlyRent ? `$${property.monthlyRent}` : 'N.A'}</span>
  //         </div>
  //       </div>

  //       {/* Payment Options */}
  //       <div style={{ background: '#FFFFFF', borderRadius: '8px', marginBottom: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
  //         <h3 style={{ color: '#003366', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Select Payment Option</h3>
  //         <select value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #4A6A8A' }}>
  //           <option value="both">Both Rent & Deposit</option>
  //           <option value="rent">Rent Only</option>
  //           <option value="deposit">Deposit Only</option>
  //           <option value="none">None</option>
  //         </select>
  //       </div>

  //       {/* Bill Details & Checkout button */}
  //       <div style={{ background: '#FFFFFF', borderRadius: '8px', marginBottom: '80px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
  //         <h3 style={{ color: '#003366', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Bill Details</h3>
  //         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
  //           {(paymentOption === 'both' || paymentOption === 'rent') && (
  //             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
  //               <span style={{ color: '#4A6A8A' }}>Monthly Rent</span>
  //               <span style={{ color: '#333333', fontWeight: '500' }}>{property.monthlyRent ? `$${property.monthlyRent}` : 'N.A'}</span>
  //             </div>
  //           )}
  //           {(paymentOption === 'both' || paymentOption === 'deposit') && (
  //             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
  //               <span style={{ color: '#4A6A8A' }}>Security Deposit</span>
  //               <span style={{ color: '#333333', fontWeight: '500' }}>{property.securityDeposit ? `$${property.securityDeposit}` : 'N.A'}</span>
  //             </div>
  //           )}
  //           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', marginTop: '12px' }}>
  //             <span>Total</span>
  //             <span>
  //               {paymentOption === 'both' && `$${(property.monthlyRent || 0) + (Number(property.securityDeposit) || 0)}`}
  //               {paymentOption === 'rent' && `$${property.monthlyRent || 0}`}
  //               {paymentOption === 'deposit' && `$${Number(property.securityDeposit) || 0}`}
  //               {paymentOption === 'none' && `$0`}
  //             </span>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Checkout Section */}
  //       <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', background: '#FFFFFF', padding: '16px 20px', boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '600px' }}>
  //         <div style={{ fontSize: '16px', fontWeight: '600', color: '#003366' }}>
  //           Total: {paymentOption === 'both' ? `$${(property.monthlyRent || 0) + (Number(property.securityDeposit) || 0)}`
  //             : paymentOption === 'rent' ? `$${property.monthlyRent || 0}`
  //             : paymentOption === 'deposit' ? `$${Number(property.securityDeposit) || 0}`
  //             : '$0'}
  //         </div>
  //         <button style={{ background: '#00A79D', color: '#fff', padding: '12px 24px', borderRadius: '6px', fontSize: '16px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
  //           onClick={() => setShowModal(true)}
  //         >
  //           Checkout
  //         </button>
  //       </div>
  //     </div>

  //     {/* Payment Modal */}
  //     {showModal && (
  //       <div style={{
  //         position: 'fixed',
  //         top: 0, left: 0, right: 0, bottom: 0,
  //         backgroundColor: 'rgba(0,0,0,0.5)',
  //         display: 'flex',
  //         justifyContent: 'center',
  //         alignItems: 'center',
  //         zIndex: 1000,
  //       }}>
  //         <div style={{
  //           background: '#fff',
  //           borderRadius: '8px',
  //           padding: '24px',
  //           width: '90%',
  //           maxWidth: '400px',
  //           position: 'relative',
  //           boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  //           textAlign: 'center',
  //         }}>
  //           <button
  //             onClick={() => setShowModal(false)}
  //             style={{
  //               position: 'absolute',
  //               top: '12px',
  //               right: '12px',
  //               background: 'transparent',
  //               border: 'none',
  //               cursor: 'pointer',
  //               color: '#333',
  //             }}
  //             aria-label="Close modal"
  //           >
  //             <X size={24} />
  //           </button>
  //           <h2 style={{ marginBottom: '16px', color: '#003366' }}>Payment Details</h2>
  //           <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
  //             Amount to Pay: ${calculateTotal()}
  //           </p>
  //           <img src="/QR Code.jpeg" alt="QR Code" style={{ marginBottom: '16px', width: '400px', height: '400px', objectFit: 'contain' }} />
  //           <button
  //             onClick={async () => {
  //               try {
  //                 // Send payment record to backend
  //                 const res = await axios.post(
  //                   'http://localhost:2000/api/payment',
  //                   {
  //                     propertyId: property._id,
  //                     amount: calculateTotal(),
  //                   },
  //                   { withCredentials: true }
  //                 );
  //                 console.log('Payment response:', res.data);
  //                 setShowModal(false);
  //                 setShowApprovalModal(true);
  //               } catch (error) {
  //                 console.error('Error sending payment:', error);
  //                 alert('Payment failed. Please try again.');
  //               }
  //             }}
  //             style={{
  //               background: '#00A79D',
  //               color: '#fff',
  //               padding: '12px 24px',
  //               borderRadius: '6px',
  //               fontSize: '16px',
  //               fontWeight: '600',
  //               border: 'none',
  //               cursor: 'pointer',
  //               marginTop: '12px',
  //             }}
  //           >
  //             Payment Done
  //           </button>
  //         </div>
  //       </div>
  //     )}

  //     {/* Approval Modal */}
  //     {showApprovalModal && (
  //       <div style={{
  //         position: 'fixed',
  //         top: 0, left: 0, right: 0, bottom: 0,
  //         backgroundColor: 'rgba(0,0,0,0.5)',
  //         display: 'flex',
  //         justifyContent: 'center',
  //         alignItems: 'center',
  //         zIndex: 1100,
  //       }}>
  //         <div style={{
  //           background: '#fff',
  //           borderRadius: '8px',
  //           padding: '24px',
  //           width: '90%',
  //           maxWidth: '400px',
  //           position: 'relative',
  //           boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  //           textAlign: 'center',
  //         }}>
  //           <button
  //             onClick={() => setShowApprovalModal(false)}
  //             style={{
  //               position: 'absolute',
  //               top: '12px',
  //               right: '12px',
  //               background: 'transparent',
  //               border: 'none',
  //               cursor: 'pointer',
  //               color: '#333',
  //             }}
  //             aria-label="Close approval modal"
  //           >
  //             <X size={24} />
  //           </button>
  //           <h2 style={{ marginBottom: '16px', color: '#003366' }}>Approval Status</h2>
  //           <p style={{ fontSize: '18px', fontWeight: '600' }}>
  //             Payment received. Waiting for owner approval.
  //           </p>
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );

  // Main return: property checkout UI
  return (
    <div style={{ minHeight: '100vh', background: '#F4F7F9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top navigation bar with user info and logout */}
      <div><TopNavigationBar navItems={navItems} user={user} handleLogout={handleLogout} /></div>

      <div style={{ padding: '24px 16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Breadcrumb navigation */}
        <div style={{ fontSize: '13px', color: '#4A6A8A', marginBottom: '20px' }}>
          Home / Properties / <span style={{ color: '#003366', fontWeight: '500' }}>Checkout</span>
        </div>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '100px' }}>
          {/* Main column for property and payment details */}
          <div>
            {/* Property Card: shows property info */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)', padding: '16px', color: '#FFFFFF' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={20} /> Property Details
                </h2>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <img 
                    src={property.images?.[0] || 'https://via.placeholder.com/120'} 
                    alt={property.Sector} 
                    style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #F4F7F9' }} 
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ color: '#003366', fontSize: '16px', fontWeight: '600', margin: 0, lineHeight: '1.4' }}>
                      {property.Sector || 'N.A'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4A6A8A', fontSize: '14px' }}>
                      <MapPin size={16} strokeWidth={2} />
                      {property.localAmenities || ''}
                    </div>
                    <div style={{ display: 'inline-block', background: '#F4F7F9', color: '#003366', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', width: 'fit-content' }}>
                      {property.propertyType || property.title || 'N.A'}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed #F4F7F9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4A6A8A', fontSize: '14px', fontWeight: '500' }}>
                    {property.monthlyRent ? 'Monthly Rent' : 'Sale Price'}
                  </span>
                  <span style={{ color: '#00A79D', fontSize: '24px', fontWeight: '700' }}>
                    {property.monthlyRent
                      ? `$${property.monthlyRent}`
                      : property.price
                        ? `$${property.price}`
                        : 'N.A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Options: choose rent/deposit/both/none (only for Rental properties) */}
            {property.monthlyRent && (
              <div style={{ background: '#FFFFFF', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)', padding: '16px', color: '#FFFFFF' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={20} /> Select Payment Option
                  </h3>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { value: 'both', label: 'Rent + Deposit' },
                      { value: 'rent', label: 'Rent Only' },
                      { value: 'deposit', label: 'Deposit Only' },
                      { value: 'none', label: 'None' }
                    ].map(option => (
                      <label 
                        key={option.value}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '14px', 
                          border: `2px solid ${paymentOption === option.value ? '#00A79D' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: paymentOption === option.value ? '#F0FDFA' : '#FFFFFF',
                          transition: 'all 0.2s',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: paymentOption === option.value ? '#003366' : '#4A6A8A'
                        }}
                      >
                        <input 
                          type="radio" 
                          value={option.value} 
                          checked={paymentOption === option.value}
                          onChange={(e) => setPaymentOption(e.target.value)}
                          style={{ marginRight: '8px', accentColor: '#00A79D' }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bill Summary: shows breakdown and total */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ background: '#003366', padding: '16px', color: '#FFFFFF' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Payment Summary</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {property.monthlyRent ? (
                    <>
                      {(paymentOption === 'both' || paymentOption === 'rent') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F4F7F9', borderRadius: '6px' }}>
                          <span style={{ color: '#4A6A8A', fontSize: '14px', fontWeight: '500' }}>Monthly Rent</span>
                          <span style={{ color: '#333333', fontSize: '16px', fontWeight: '600' }}>
                            {property.monthlyRent ? `$${property.monthlyRent}` : 'N.A'}
                          </span>
                        </div>
                      )}
                      {(paymentOption === 'both' || paymentOption === 'deposit') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F4F7F9', borderRadius: '6px' }}>
                          <span style={{ color: '#4A6A8A', fontSize: '14px', fontWeight: '500' }}>Security Deposit</span>
                          <span style={{ color: '#333333', fontSize: '16px', fontWeight: '600' }}>
                            {property.securityDeposit ? `$${property.securityDeposit}` : 'N.A'}
                          </span>
                        </div>
                      )}
                    </>
                  ) : property.price ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F4F7F9', borderRadius: '6px' }}>
                      <span style={{ color: '#4A6A8A', fontSize: '14px', fontWeight: '500' }}>Sale Price</span>
                      <span style={{ color: '#333333', fontSize: '16px', fontWeight: '600' }}>
                        {property.price ? `$${property.price}` : 'N.A'}
                      </span>
                    </div>
                  ) : null}
                  <div style={{ borderTop: '2px solid #F4F7F9', paddingTop: '16px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#003366' }}>Total Amount</span>
                      <span style={{ fontSize: '28px', fontWeight: '700', color: '#00A79D' }}>
                        ${calculateTotal()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Checkout Bar: always visible at bottom for payment/enquiry */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '2px solid #E5E7EB',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
          zIndex: 999
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '20px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '13px', color: '#4A6A8A', marginBottom: '4px' }}>Amount Payable</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#003366' }}>
                ${calculateTotal()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
                  color: '#FFFFFF',
                  padding: '14px 40px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,167,157,0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                onClick={() => setShowModal(true)}
              >
                Proceed to Pay
              </button>
              <button
                style={{
                  background: '#003366',
                  color: '#FFFFFF',
                  padding: '14px 40px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                onClick={() => setShowEnquiryModal(true)}
              >
                Enquiry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal: for QR code and confirming payment */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            width: '90%',
            maxWidth: '450px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F4F7F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4A6A8A',
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            
            <h2 style={{ marginBottom: '8px', color: '#003366', fontSize: '22px', fontWeight: '700' }}>
              Complete Payment
            </h2>
            <p style={{ color: '#4A6A8A', fontSize: '14px', marginBottom: '24px' }}>
              Scan QR code to complete the transaction
            </p>
            
            <div style={{ 
              background: '#F4F7F9', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '2px solid #E5E7EB'
            }}>
              <p style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '8px' }}>Amount to Pay</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: '#00A79D', margin: 0 }}>
                ${calculateTotal()}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              background: '#FFFFFF', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '2px solid #E5E7EB'
            }}>
              <img 
                src="/QR Code.jpeg" 
                alt="QR Code" 
                style={{ width: '100%', maxWidth: '280px', height: 'auto', objectFit: 'contain' }} 
              />
            </div>
            
            <button
              onClick={async () => {
                try {
                  const payload = {
                    propertyId: property._id,
                    amount: calculateTotal(),
                  };
                  // Payment endpoint configurable via .env
                  const res = await axios.post(
                    `${process.env.REACT_APP_PAYMENT_API}`,
                    payload,
                    { withCredentials: true }
                  );
                  // Show approval modal after success
                  setShowModal(false);
                  setShowApprovalModal(true);
                } catch (error) {
                  console.error('Error sending payment:', error);
                  alert('Payment failed. Please try again.');
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
                color: '#FFFFFF',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,167,157,0.3)'
              }}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      )}

      {/* Approval Modal: shown after payment, waiting for approval */}
      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '40px',
            width: '90%',
            maxWidth: '400px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}>
            <button
              onClick={() => setShowApprovalModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F4F7F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4A6A8A',
              }}
              aria-label="Close approval modal"
            >
              <X size={20} />
            </button>
            
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={48} color="#FFFFFF" />
            </div>
            
            <h2 style={{ marginBottom: '12px', color: '#003366', fontSize: '22px', fontWeight: '700' }}>
              Payment Received
            </h2>
            <p style={{ fontSize: '16px', color: '#4A6A8A', lineHeight: '1.6' }}>
              Your payment has been received successfully. Waiting for owner approval.
            </p>
            
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: '#F4F7F9', 
              borderRadius: '8px',
              fontSize: '14px',
              color: '#4A6A8A'
            }}>
              You will be notified once the owner approves your application.
            </div>
          </div>
        </div>
      )}
    {/* Enquiry Modal */}
    {showEnquiryModal && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200,
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            width: '90%',
            maxWidth: '600px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <button
            onClick={() => setShowEnquiryModal(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#F4F7F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#4A6A8A',
            }}
          >
            <X size={20} />
          </button>

          <EnquiryPage propertyId={property._id} />
        </div>
      </div>
    )}
    </div>
  );

}