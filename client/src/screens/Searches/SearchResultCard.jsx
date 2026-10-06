import React from "react";
import PropertyCard, { getPropertyBadge } from "../../components/property/PropertyCard";

/**
 * Search result card. View counts and ratings arrive with the search response
 * (`viewCount`, `avgRating`), so a page of results costs one request in total
 * instead of one extra analytics call per card.
 */
export default function SearchResultCard({ property, layout, onClick, onSave, isSaved, onShare, onContact }) {
  const views = Number(property.viewCount) || 0;
  const rating = property.avgRating ?? null;

  return (
    <PropertyCard
      property={property}
      layout={layout}
      onClick={onClick}
      onSave={onSave}
      isSaved={isSaved}
      onShare={onShare}
      onContact={onContact}
      badge={getPropertyBadge(property, { views, ratings: rating ?? 0 })}
      rating={rating}
      views={views}
    />
  );
}
