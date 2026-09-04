import React, { useEffect, useState } from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix for missing Leaflet marker icons in React builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// 🏢 Custom icons for different place types
const icons = {
  metro: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [25, 25],
  }),
  park: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
    iconSize: [25, 25],
  }),
  market: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081973.png",
    iconSize: [25, 25],
  }),
  hospital: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
    iconSize: [25, 25],
  }),
  school: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/891/891462.png",
    iconSize: [25, 25],
  }),
  mall: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2897/2897883.png",
    iconSize: [25, 25],
  }),
  bank: L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/599/599995.png",
    iconSize: [25, 25],
  }),
};

const MapsIntegration = ({ sector, type }) => {
  const [apiKey, setApiKey] = useState(null);
  const [map, setMap] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);

  const mapContainerId = "mapContainer-" + sector;

  useEffect(() => {
    if (sector) {
      fetchApiKey();
    }
  }, [sector]);

  const fetchApiKey = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_Base_API}/api/locationqapi`
      );
      setApiKey(response.data.apiKey);
      
     
    } catch (err) {
      console.error("Error fetching LocationIQ API key:", err);
    }
  };

  useEffect(() => {
    if (apiKey && sector) {
      initMap();
    }
    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, [apiKey, sector]);

  useEffect(() => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 300);
    }
  }, [map]);

  const initMap = async () => {
    if (map) return; // Prevent reinitialization

    const mapInstance = L.map(mapContainerId, {
      center: [28.4595, 77.0266], // Center at Gurgaon, Haryana
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

    L.tileLayer(
      `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`,
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(mapInstance);

    // Force Leaflet to recalculate size after map renders
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 300);

    // Fetch coordinates for the given sector using LocationIQ
    try {
      const geocodeRes = await axios.get(
        `https://us1.locationiq.com/v1/search.php`,
        {
          params: {
            key: apiKey,
            q: `Sector ${sector}, Gurgaon, Haryana`,
            format: "json",
          },
        }
      );

      console.log("Geocode Response:", geocodeRes.data);

      if (geocodeRes.data && geocodeRes.data.length > 0) {
        const { lat, lon } = geocodeRes.data[0];
        const location = [parseFloat(lat), parseFloat(lon)];
        console.log("Using Coordinates:", location);
        mapInstance.setView(location, 15);

        L.marker(location)
          .addTo(mapInstance)
          .bindPopup(
            `<b>Sector ${sector}</b><br>Type: ${type}<br>Gurgaon, Haryana`
          )
          .openPopup();

        // Get nearby places (expanded to show metro, malls, hospitals, parks, etc.)
        const nearbyRes = await axios.get(
          `https://us1.locationiq.com/v1/nearby.php`,
          {
            params: {
              key: apiKey,
              lat,
              lon,
              tag: "restaurant,market,supermarket,atm,park,store,bank,hospital,mall,metro_station,school,university",
              radius: 2500,
              format: "json",
            },
          }
        );

        console.log("Nearby Places Response:", nearbyRes.data);

        nearbyRes.data.forEach((place) => {
          if (place.lat && place.lon) {
            const popupText = `
              <b>${place.name || "Unnamed Place"}</b><br>
              ${place.type ? `Type: ${place.type}` : ""}
            `;
            let selectedIcon = L.Icon.Default.prototype;
            if (place.type && place.type.includes("metro")) selectedIcon = icons.metro;
            else if (place.type && place.type.includes("park")) selectedIcon = icons.park;
            else if (place.type && (place.type.includes("market") || place.type.includes("store"))) selectedIcon = icons.market;
            else if (place.type && place.type.includes("hospital")) selectedIcon = icons.hospital;
            else if (place.type && (place.type.includes("school") || place.type.includes("university"))) selectedIcon = icons.school;
            else if (place.type && place.type.includes("mall")) selectedIcon = icons.mall;
            else if (place.type && (place.type.includes("bank") || place.type.includes("atm"))) selectedIcon = icons.bank;

            L.marker([place.lat, place.lon], { icon: selectedIcon })
              .addTo(mapInstance)
              .bindPopup(popupText);
          }
        });
        setNearbyPlaces(nearbyRes.data);
      } else {
        console.warn(`Sector ${sector} not found on map.`);
        const fallbackCoords = [28.4595, 77.0266]; // Gurgaon center
        mapInstance.setView(fallbackCoords, 13);

        L.popup()
          .setLatLng(fallbackCoords)
          .setContent(`<b>Sector ${sector}</b> not found on map. Displaying Gurgaon center.`)
          .openOn(mapInstance);
      }
    } catch (err) {
      console.error("Error fetching map data:", err);
    }

    setMap(mapInstance);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        id={mapContainerId}
        style={{
          width: "100%",
          height: "70%",
        }}
      />

      <div
        style={{
          height: "30%",
          overflowY: "auto",
          padding: "10px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", color: "#003366" }}>Nearby Places</h4>
        {nearbyPlaces.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {nearbyPlaces.map((place, index) => (
              <li
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                <img
                  src={
                    place.type?.includes("metro")
                      ? icons.metro.options.iconUrl
                      : place.type?.includes("park")
                      ? icons.park.options.iconUrl
                      : place.type?.includes("market") || place.type?.includes("store")
                      ? icons.market.options.iconUrl
                      : place.type?.includes("hospital")
                      ? icons.hospital.options.iconUrl
                      : place.type?.includes("school") || place.type?.includes("university")
                      ? icons.school.options.iconUrl
                      : place.type?.includes("mall")
                      ? icons.mall.options.iconUrl
                      : place.type?.includes("bank") || place.type?.includes("atm")
                      ? icons.bank.options.iconUrl
                      : "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png"
                  }
                  alt="icon"
                  style={{ width: 18, height: 18, marginRight: 8 }}
                />
                <b>{place.name || "Unnamed Place"}</b>&nbsp;
                <span style={{ color: "gray" }}>
                  ({place.type?.replace("_", " ") || "unknown"})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "gray", fontSize: "13px" }}>No nearby places found.</p>
        )}
      </div>
    </div>
  );
};

export default MapsIntegration;