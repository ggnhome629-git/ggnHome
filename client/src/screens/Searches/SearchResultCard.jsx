import React, { useEffect, useState } from "react";
import axios from "axios";
import PropertyCard, { getPropertyBadge } from "../../components/property/PropertyCard";

const userToken = () => localStorage.getItem("accessToken");

async function fetchPropertyAnalytics(propertyId) {
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_PROPERTY_ANALYSIS_GET_METRICS}/${propertyId}`,
      {
        withCredentials: true,
        headers: {
          ...(userToken() ? { Authorization: `Bearer ${userToken()}` } : {}),
        },
      }
    );
    return res.data || {};
  } catch (err) {
    console.error("Error fetching property analytics:", err);
    return null;
  }
}

/**
 * Thin wrapper around the shared PropertyCard: owns the per-card analytics
 * fetch (views/ratings) and derives the "why this stands out" badge from it,
 * so the shared card itself stays a pure presentational component that
 * doesn't fetch anything on its own.
 */
export default function SearchResultCard({ property, layout, onClick, onSave, isSaved, onShare, onContact }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (property._id) {
      fetchPropertyAnalytics(property._id).then((data) => {
        if (!cancelled) setAnalytics(data);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [property._id]);

  const ratings = analytics?.ratings;
  const avgRating =
    Array.isArray(ratings) && ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <PropertyCard
      property={property}
      layout={layout}
      onClick={onClick}
      onSave={onSave}
      isSaved={isSaved}
      onShare={onShare}
      onContact={onContact}
      badge={getPropertyBadge(property, analytics)}
      rating={avgRating}
      views={analytics?.views?.length ?? 0}
    />
  );
}
