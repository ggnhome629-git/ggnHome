// import React, { useState } from 'react';
// import axios from 'axios';

// const PricePredictor = () => {
//   const [city, setCity] = useState('');
//   const [features, setFeatures] = useState({});
//   const [predictedPrice, setPredictedPrice] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const handleFeatureChange = (e) => {
//     setFeatures({
//       ...features,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     setPredictedPrice(null);

//     try {
//       const response = await axios.post(
//         'http://localhost:2000/api/predict-price',
//         { city, features },
//         { withCredentials: true }
//       );
//       setPredictedPrice(response.data.predictedPrice);
//     } catch (err) {
//       console.error('Prediction error:', err);
//       if (err.response) {
//         console.error('Response data:', err.response.data);
//         console.error('Response status:', err.response.status);
//       } else if (err.request) {
//         console.error('No response received:', err.request);
//       } else {
//         console.error('Error setting up request:', err.message);
//       }
//       setError(err.response?.data?.error || 'Failed to predict price');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui' }}>
//       <h2>Property Price Predictor</h2>
//       <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//         <label>
//           City:
//           <select value={city} onChange={(e) => setCity(e.target.value)} required>
//             <option value="">Select City</option>
//             <option value="delhi">Delhi</option>
//             <option value="gurgaon">Gurgaon</option>
//             {/* Add more cities as needed */}
//           </select>
//         </label>

//         {city && (
//           <>
//             {city === 'delhi' &&
//               ['Area', 'BHK', 'Bathroom', 'Furnishing', 'Locality', 'Parking', 'Type'].map((key) => (
//                 <label key={key}>
//                   {key}:
//                   <input
//                     type={['BHK', 'Bathroom', 'Parking', 'Area'].includes(key) ? 'number' : 'text'}
//                     name={key}
//                     value={features[key] || ''}
//                     onChange={handleFeatureChange}
//                     required
//                   />
//                 </label>
//               ))}
//             {city === 'gurgaon' &&
//               ['areaWithType', 'address'].map((key) => (
//                 <label key={key}>
//                   {key}:
//                   <input
//                     type={key === 'areaWithType' ? 'number' : 'text'}
//                     name={key}
//                     value={features[key] || ''}
//                     onChange={handleFeatureChange}
//                     required
//                   />
//                 </label>
//               ))}
//           </>
//         )}

//         <button
//           type="submit"
//           style={{
//             background: '#00A79D',
//             color: '#fff',
//             padding: '10px 20px',
//             border: 'none',
//             borderRadius: '6px',
//             cursor: 'pointer',
//             fontSize: '16px',
//             fontWeight: '600',
//           }}
//           disabled={loading}
//         >
//           {loading ? 'Predicting...' : 'Predict Price'}
//         </button>
//       </form>

//       {predictedPrice !== null && (
//         <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: '600' }}>
//           Predicted Price: ₹{predictedPrice.toLocaleString()}
//         </div>
//       )}

//       {error && (
//         <div style={{ marginTop: '20px', color: 'red', fontWeight: '500' }}>
//           {error}
//         </div>
//       )}
//     </div>
//   );
// };

// export default PricePredictor;

import React, { useState , useEffect, useRef } from 'react';
import axios from 'axios';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useNavigate } from 'react-router-dom';

const PricePredictor = () => {
  const [city, setCity] = useState('');
  const [features, setFeatures] = useState({});
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
    const [showResult, setShowResult] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const handleFeatureChange = (e) => {
    setFeatures({
      ...features,
      [e.target.name]: e.target.value,
    });
  };
  // Endpoint configurable via .env: LOGOUT_API
  const handleLogout = async () => {
    await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    // Endpoint configurable via .env: USER_ME_API
    const fetchUser = async () => {
      try {
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

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPredictedPrice(null);
    setShowResult(false);

    try {
      // Endpoint configurable via .env: PRICE_PREDICT_API
      const response = await axios.post(
        `${process.env.REACT_APP_PRICE_PREDICT_API}`,
        { city, features },
        { withCredentials: true }
      );
      setPredictedPrice(response.data.predictedPrice);
      setShowResult(true);
    } catch (err) {
      console.error('Prediction error:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error setting up request:', err.message);
      }
      setError(err.response?.data?.error || 'Failed to predict price');
    } finally {
      setLoading(false);
    }
  };

  const cityFields = {
    delhi: ['Area', 'BHK', 'Bathroom', 'Furnishing', 'Locality', 'Parking', 'Type'],
    gurgaon: ['areaWithType', 'address']
  };

  const getFieldType = (key) => {
    return ['BHK', 'Bathroom', 'Parking', 'Area', 'areaWithType'].includes(key) ? 'number' : 'text';
  };

  const formatFieldName = (key) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
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
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          
          .fade-in {
            animation: fadeIn 0.6s ease-out;
          }
          
          .input-field {
            transition: all 0.3s ease;
          }
          
          .input-field:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 167, 157, 0.3);
          }
          
          .submit-btn {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(34, 211, 238, 0.4);
          }
          
          .submit-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          
          .submit-btn.loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
          }
          
          .result-card {
            animation: fadeIn 0.8s ease-out, pulse 0.5s ease-out;
          }
          
          .city-badge {
            transition: all 0.3s ease;
          }
          
          .city-badge:hover {
            transform: scale(1.05);
          }
        `}
      </style>

      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }} className="fade-in">
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #003366 0%, #00A79D 100%)',
          padding: '40px 30px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'rgba(34, 211, 238, 0.1)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }}></div>
          
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 10px 0',
            position: 'relative',
            letterSpacing: '-0.5px'
          }}>
            Property Price Predictor
          </h1>
          <p style={{
            color: '#22D3EE',
            fontSize: '16px',
            margin: 0,
            position: 'relative',
            opacity: 0.9
          }}>
            Get instant AI-powered property valuations
          </p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '40px 30px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* City Selection */}
            <div>
              <label style={{
                display: 'block',
                color: '#333333',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                letterSpacing: '0.3px'
              }}>
                Select City
              </label>
              <select 
                value={city} 
                onChange={(e) => {
                  setCity(e.target.value);
                  setFeatures({});
                  setPredictedPrice(null);
                  setError('');
                }}
                required
                className="input-field"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #F4F7F9',
                  borderRadius: '12px',
                  background: '#F4F7F9',
                  color: '#333333',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: '500'
                }}
              >
                <option value="">Choose a city...</option>
                <option value="delhi">Delhi</option>
                <option value="gurgaon">Gurgaon</option>
              </select>
            </div>

            {/* City Badge */}
            {city && (
              <div className="city-badge" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #22D3EE 0%, #00A79D 100%)',
                borderRadius: '20px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                alignSelf: 'flex-start',
                boxShadow: '0 4px 12px rgba(34, 211, 238, 0.3)'
              }}>
                <span>📍</span>
                {city.charAt(0).toUpperCase() + city.slice(1)}
              </div>
            )}

            {/* Dynamic Fields */}
            {city && cityFields[city] && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {cityFields[city].map((key) => (
                  <div key={key}>
                    <label style={{
                      display: 'block',
                      color: '#333333',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      letterSpacing: '0.3px'
                    }}>
                      {formatFieldName(key)}
                    </label>
                    <input
                      type={getFieldType(key)}
                      name={key}
                      value={features[key] || ''}
                      onChange={handleFeatureChange}
                      required
                      placeholder={`Enter ${formatFieldName(key).toLowerCase()}`}
                      className="input-field"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        border: '2px solid #F4F7F9',
                        borderRadius: '12px',
                        background: '#F4F7F9',
                        color: '#333333',
                        outline: 'none',
                        fontWeight: '500',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !city}
              className={`submit-btn ${loading ? 'loading' : ''}`}
              style={{
                background: loading ? '#4A6A8A' : 'linear-gradient(135deg, #22D3EE 0%, #00A79D 100%)',
                color: '#FFFFFF',
                padding: '16px 32px',
                border: 'none',
                borderRadius: '12px',
                cursor: loading || !city ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '700',
                marginTop: '10px',
                boxShadow: loading || !city ? 'none' : '0 6px 20px rgba(34, 211, 238, 0.4)',
                opacity: loading || !city ? 0.6 : 1,
                letterSpacing: '0.5px'
              }}
            >
              {loading ? '⏳ Analyzing...' : '🚀 Predict Price'}
            </button>
          </form>

          {/* Result Card */}
          {showResult && predictedPrice !== null && (
            <div className="result-card" style={{
              marginTop: '32px',
              padding: '32px',
              background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0, 51, 102, 0.3)'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#22D3EE',
                fontWeight: '600',
                marginBottom: '8px',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Estimated Value
              </div>
              <div style={{
                fontSize: '42px',
                color: '#FFFFFF',
                fontWeight: '800',
                letterSpacing: '-1px'
              }}>
                ₹{predictedPrice.toLocaleString('en-IN')}
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(34, 211, 238, 0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#22D3EE',
                fontWeight: '500'
              }}>
                💡 Price calculated based on current market trends
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="fade-in" style={{
              marginTop: '24px',
              padding: '16px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricePredictor;
