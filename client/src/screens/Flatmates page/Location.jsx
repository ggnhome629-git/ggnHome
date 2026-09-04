import React, { useState, useEffect } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

const Location = ({ setUserLocation }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userLocationState, setUserLocationState] = useState(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // The reverse geocoding API URL can be configured via .env file
          const res = await fetch(
            `${process.env.REACT_APP_REVERSE_GEOCODE_API}?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          const loc = {
            latitude,
            longitude,
            city: data.address.city || data.address.town || data.address.village || data.address.city_district || data.address.county || data.address.state_district || data.address.state || null,
            area: data.address.suburb || data.address.neighbourhood || data.address.village || data.address.city_district || data.address.county || data.address.state_district || data.address.state || null,
            village: data.address.village || null,
            city_district: data.address.city_district || null,
            county: data.address.county || null,
            state_district: data.address.state_district || null,
            state: data.address.state || null
          };

          // console.log("Reverse geocoding full address:", data.address);

          if (loc.area || loc.city) {
            if (typeof setUserLocation === "function") {
              setUserLocation(loc); // send location to dashboard
              setUserLocationState(loc);
            //   setShowModal(true);
            } else {
              console.warn("setUserLocation is not a function. Cannot lift location to parent.");
            }
          } else {
            console.warn("Could not determine valid area or city from location.");
          }
        } catch (err) {
          console.error("Error fetching location name:", err);
        }

        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    handleGetLocation();
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <FaMapMarkerAlt color="#00A79D" size={28} />
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "400px",
              position: "relative",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
            <h2 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <FaMapMarkerAlt color="#00A79D" size={22} />
              Get My Current Location
            </h2>
            <p style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
              We’ll need your permission to access location to show nearby properties.
            </p>
            <button
              onClick={handleGetLocation}
              style={{
                background: "#00A79D",
                color: "#fff",
                padding: "10px 20px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {loading ? "Getting Location..." : "Get Current Location"}
            </button>

            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

            {/* Optionally display full location details inside modal */}
{userLocationState && (
  <div style={{ fontSize: "14px", color: "#555", marginTop: "10px", textAlign: "left" }}>
    {userLocationState.city && <p>City: {userLocationState.city}</p>}
    {userLocationState.area && <p>Area: {userLocationState.area}</p>}
    {userLocationState.village && <p>Village: {userLocationState.village}</p>}
    {userLocationState.city_district && <p>City District: {userLocationState.city_district}</p>}
    {userLocationState.county && <p>County: {userLocationState.county}</p>}
    {userLocationState.state_district && <p>State District: {userLocationState.state_district}</p>}
    {userLocationState.state && <p>State: {userLocationState.state}</p>}
    {userLocationState.latitude && <p>Latitude: {userLocationState.latitude}</p>}
    {userLocationState.longitude && <p>Longitude: {userLocationState.longitude}</p>}
  </div>

)}        

          </div>
        </div>
      )}
    </div>
  );
};

export default Location;