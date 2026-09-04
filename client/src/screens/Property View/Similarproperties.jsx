import React, { useEffect, useState } from "react";
import axios from "axios";
import PropertyCarousel from "../../components/property/PropertyCarousel";

/**
 * "Similar properties" for the detail page. Same sector first, then nearby
 * sector numbers, then whatever's left, deduped and capped — always
 * excluding the property being viewed (previously it could recommend a
 * property to itself).
 */
const SimilarProperties = ({ sector, currentPropertyId }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_Base_API}/api/activeproperties?limit=40`);
        const all = (res.data || []).filter((p) => String(p._id) !== String(currentPropertyId));

        const sameSector = all.filter(
          (p) => p.Sector && sector && p.Sector.toLowerCase().includes(sector.toLowerCase())
        );

        const sectorNum = parseInt(sector?.match(/\d+/)?.[0] || 0, 10);
        const nearby = all.filter((p) => {
          if (sameSector.includes(p)) return false;
          const propSectorNum = parseInt(p.Sector?.match(/\d+/)?.[0] || 0, 10);
          return Math.abs(propSectorNum - sectorNum) <= 2 && propSectorNum !== sectorNum;
        });

        const rest = all.filter((p) => !sameSector.includes(p) && !nearby.includes(p));

        if (!cancelled) {
          setProperties([...sameSector, ...nearby, ...rest].slice(0, 12));
        }
      } catch (error) {
        console.error("Error loading similar properties:", error);
        if (!cancelled) setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [sector, currentPropertyId]);

  if (loading) return null;

  return (
    <PropertyCarousel
      title="Similar properties"
      subtitle="Based on this listing's sector and nearby areas"
      properties={properties}
      requireAuth={false}
      emptyTitle="No similar properties yet"
      emptyDescription="We couldn't find other active listings nearby right now."
    />
  );
};

export default SimilarProperties;
