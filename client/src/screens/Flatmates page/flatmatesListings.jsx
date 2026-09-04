import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import TopNavigationBar from '../Flatmates page/TopNavigationBar';
import { useNavigate , useLocation } from "react-router-dom";

const FlatmatesListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const location = useLocation();
  const [filters, setFilters] = useState({
    active: false,
    inactive: false,
    gender: "any",
    furnished: "all",
    minBudget: 0,
    maxBudget: 50000,
    occupancyWanted: 0,
    search: "",
    moveInBefore: null,
  });
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [averageRent, setAverageRent] = useState(0);

  const colors = {
    prussianBlue: "#003366",
    slateBlue: "#4A6A8A",
    teal: "#00A79D",
    cyan: "#22D3EE",
    alabaster: "#F4F7F9",
    white: "#FFFFFF",
    darkCharcoal: "#333333",
  };

  const [user, setUser] = useState(null);
  // Hybrid auth: get token from localStorage for use in authenticated API calls
  const userToken = localStorage.getItem("accessToken");
  const appendRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Update active filters for chips
  useEffect(() => {
    const chips = [];
    if (filters.active) chips.push({ key: "active", label: "Active Only" });
    if (filters.inactive) chips.push({ key: "inactive", label: "Inactive Only" });
    if (filters.gender !== "any") chips.push({ key: "gender", label: `Gender: ${filters.gender}` });
    if (filters.furnished !== "all") chips.push({ key: "furnished", label: filters.furnished === "furnished" ? "Furnished" : "Unfurnished" });
    if (filters.minBudget > 0 || filters.maxBudget < 50000) {
      chips.push({ key: "budget", label: `₹${filters.minBudget} - ₹${filters.maxBudget}` });
    }
    if (filters.occupancyWanted > 0) chips.push({ key: "occupancy", label: `${filters.occupancyWanted}+ Beds` });
    if (filters.moveInBefore) chips.push({ key: "moveIn", label: `Move by ${new Date(filters.moveInBefore).toLocaleDateString()}` });
    setActiveFilters(chips);
  }, [filters]);

  // Calculate average rent from displayed listings
  useEffect(() => {
    if (listings.length > 0) {
      const totalRent = listings.reduce((sum, listing) => {
        const min = listing.budget?.min || 0;
        const max = listing.budget?.max || 0;
        const avgRent = min && max ? (min + max) / 2 : min || max || 0;
        return sum + avgRent;
      }, 0);
      const avgRent = Math.round(totalRent / listings.length);
      setAverageRent(avgRent);
    } else {
      setAverageRent(0);
    }
  }, [listings]);

  const matchesFilters = (listing) => {
    if (!listing) return false;

    if (filters.gender && filters.gender !== "any") {
      if (listing.preferredGender && listing.preferredGender !== "any") {
        if (listing.preferredGender !== filters.gender) return false;
      }
    }

    if (filters.furnished === "furnished" && listing.furnished !== true) return false;
    if (filters.furnished === "unfurnished" && listing.furnished !== false) return false;

    const lmin = listing.budget?.min ?? 0;
    const lmax = listing.budget?.max ?? 0;
    if (typeof filters.minBudget === "number" && typeof filters.maxBudget === "number") {
      if (lmax < filters.minBudget) return false;
      if (lmin > filters.maxBudget) return false;
    }

    if (filters.occupancyWanted && filters.occupancyWanted > 0) {
      if ((listing.occupancyWanted || 0) < filters.occupancyWanted) return false;
    }

    if (filters.moveInBefore) {
      const filterDate = new Date(filters.moveInBefore);
      const listingDate = listing.moveInDate ? new Date(listing.moveInDate) : null;
      if (!listingDate) return false;
      if (listingDate > filterDate) return false;
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      const hay = [listing.title, listing.description, listing.city, listing.area]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  };

  const buildParamsFromFilters = (pageToFetch) => {
    const params = { page: pageToFetch, limit };

    if (filters.active && !filters.inactive) {
      params.onlyActive = true;
    } else if (!filters.active && filters.inactive) {
      params.onlyActive = false;
    }

    if (filters.gender && filters.gender !== "any") {
      params.preferredGender = filters.gender;
    }

    if (filters.furnished === "furnished") params.furnished = true;
    if (filters.furnished === "unfurnished") params.furnished = false;

    if (typeof filters.minBudget === "number") params.minBudget = filters.minBudget;
    if (typeof filters.maxBudget === "number") params.maxBudget = filters.maxBudget;

    if (filters.occupancyWanted && filters.occupancyWanted > 0) {
      params.occupancyWanted = filters.occupancyWanted;
    }

    if (filters.search && filters.search.trim().length > 0) {
      params.q = filters.search.trim();
    }

    if (filters.moveInBefore) {
      params.moveInBefore = filters.moveInBefore;
    }

    return params;
  };

  const fetchListings = async (opts = {}) => {
    if (loading) return;
    try {
      setLoading(true);

      const pageToFetch = typeof opts.page === "number" ? opts.page : page;
      const shouldAppend = !!opts.append || !!appendRef.current;

      const params = buildParamsFromFilters(pageToFetch);

      const response = await axios.get(
        `${process.env.REACT_APP_Base_API}/api/flatmates/user/listings`,
        {
          withCredentials: true,
          params,
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        }
      );

      if (response && response.data && response.data.success) {
        const items = response.data.data.items || [];
        const totalRes = response.data.data.total || 0;

        const filtered = items.filter((it) => matchesFilters(it));

        if (shouldAppend) {
          setListings((prev) => [...prev, ...filtered]);
        } else {
          setListings(filtered);
        }

        const anyActiveFilters =
          filters.search?.trim() ||
          filters.gender !== "any" ||
          filters.furnished !== "all" ||
          filters.minBudget > 0 ||
          filters.maxBudget < 50000 ||
          (filters.occupancyWanted && filters.occupancyWanted > 0) ||
          filters.moveInBefore ||
          filters.active ||
          filters.inactive;
        setTotal(anyActiveFilters ? filtered.length : totalRes);

        if (appendRef.current) appendRef.current = false;
      } else {
        if (!shouldAppend) setListings([]);
        setTotal(0);
      }
    } catch (error) {
      if (!appendRef.current) setListings([]);
      setTotal(0);
      if (appendRef.current) appendRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchListings({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const removeFilter = (filterKey) => {
    switch (filterKey) {
      case "active":
        setFilters((prev) => ({ ...prev, active: false }));
        break;
      case "inactive":
        setFilters((prev) => ({ ...prev, inactive: false }));
        break;
      case "gender":
        setFilters((prev) => ({ ...prev, gender: "any" }));
        break;
      case "furnished":
        setFilters((prev) => ({ ...prev, furnished: "all" }));
        break;
      case "budget":
        setFilters((prev) => ({ ...prev, minBudget: 0, maxBudget: 50000 }));
        break;
      case "occupancy":
        setFilters((prev) => ({ ...prev, occupancyWanted: 0 }));
        break;
      case "moveIn":
        setFilters((prev) => ({ ...prev, moveInBefore: null }));
        break;
      default:
        break;
    }
  };

  const listingRentValue = (listing) => {
    const min = listing.budget?.min || 0;
    const max = listing.budget?.max || 0;
    return min && max ? (min + max) / 2 : min || max || 0;
  };

  const handleDelete = async (id, desiredActiveParam) => {
    if (!id) return;

    const current = listings.find((l) => l._id === id);
    const desiredActive =
      typeof desiredActiveParam !== "undefined"
        ? Boolean(desiredActiveParam)
        : !Boolean(current?.isActive);

    const confirmMsg = desiredActive
      ? "Are you sure you want to activate this listing?"
      : "Are you sure you want to deactivate (soft-delete) this listing?";

    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    try {
      setLoading(true);
      const resp = await axios.delete(
        `${process.env.REACT_APP_Base_API}/api/flatmates/listings/${id}?active=${desiredActive}`,
        {
          withCredentials: true,
        }
      );

      if (resp && resp.data && resp.data.success) {
        setListings((prev) => prev.filter((l) => l._id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        window.alert((resp && resp.data && resp.data.message) || "Failed to update listing state");
      }
    } catch (err) {
      console.error("Toggle listing error:", err);
      window.alert("Error updating listing");
    } finally {
      setLoading(false);
    }
  };

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "rent_low":
          return listingRentValue(a) - listingRentValue(b);
        case "rent_high":
          return listingRentValue(b) - listingRentValue(a);
        case "nearest":
          return (a.distance || 0) - (b.distance || 0);
        default:
          return 0;
      }
    });
  }, [listings, sortBy]);

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div style={styles.skeletonCard}>
      <div style={styles.skeletonHeader}>
        <div style={styles.skeletonBadge}></div>
        <div style={styles.skeletonBadge}></div>
      </div>
      <div style={styles.skeletonProfile}>
        <div style={styles.skeletonAvatar}></div>
        <div style={styles.skeletonText}>
          <div style={styles.skeletonLine}></div>
          <div style={styles.skeletonLine}></div>
        </div>
      </div>
      <div style={styles.skeletonDetails}>
        <div style={styles.skeletonLine}></div>
        <div style={styles.skeletonLine}></div>
        <div style={styles.skeletonLine}></div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.navWrapper}>
        <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
      </div>

      {/* Hero Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Manage Your Flatmates Listings</h1>
          <p style={styles.subtitle}>Get Perfect Flatmate Partner</p>
        </div>
        <div style={styles.headerStats}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{total}</span>
            <span style={styles.statLabel}>
              {total === 1 ? 'Active Listing' : 'Active Listings'}
            </span>
          </div>
          <div style={styles.statDivider}></div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>
              {averageRent > 0 ? `₹${Math.round(averageRent / 1000)}K` : '—'}
            </span>
            <span style={styles.statLabel}>Avg. Monthly Rent</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div style={styles.searchSection}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search by location, title, or preferences..."
            style={styles.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              style={styles.clearSearchButton}
              onClick={() => {
                setSearchInput("");
                setFilters((prev) => ({ ...prev, search: "" }));
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.viewToggleButton,
              ...(viewMode === "grid" ? styles.viewToggleButtonActive : {}),
            }}
            onClick={() => setViewMode("grid")}
          >
            <span style={styles.viewIcon}>▦</span> Grid
          </button>
          <button
            style={{
              ...styles.viewToggleButton,
              ...(viewMode === "list" ? styles.viewToggleButtonActive : {}),
            }}
            onClick={() => setViewMode("list")}
          >
            <span style={styles.viewIcon}>☰</span> List
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      {activeFilters.length > 0 && (
        <div style={styles.filterChips}>
          <span style={styles.filterChipsLabel}>Active Filters:</span>
          {activeFilters.map((chip) => (
            <div key={chip.key} style={styles.filterChip}>
              <span>{chip.label}</span>
              <button
                style={styles.filterChipClose}
                onClick={() => removeFilter(chip.key)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            style={styles.clearAllChip}
            onClick={() =>
              setFilters({
                active: false,
                inactive: false,
                gender: "any",
                furnished: "all",
                minBudget: 0,
                maxBudget: 50000,
                occupancyWanted: 0,
                search: "",
                moveInBefore: null,
              })
            }
          >
            Clear All
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterSection}>
          <button
            style={{
              ...styles.filterButton,
              ...(filters.active ? styles.filterButtonActive : {}),
            }}
            onClick={() => handleFilterChange("active", !filters.active)}
          >
            <span style={styles.filterButtonIcon}>✓</span> Active
          </button>

          <button
            style={{
              ...styles.filterButton,
              ...(filters.inactive ? styles.filterButtonActive : {}),
            }}
            onClick={() => handleFilterChange("inactive", !filters.inactive)}
          >
            <span style={styles.filterButtonIcon}>✕</span> Inactive
          </button>
        </div>

        <div style={styles.filterSection}>
          <select
            style={styles.filterSelect}
            value={filters.gender}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
          >
            <option value="any">Any Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <select
            style={styles.filterSelect}
            value={filters.furnished}
            onChange={(e) => handleFilterChange("furnished", e.target.value)}
          >
            <option value="all">Any Furnishing</option>
            <option value="furnished">Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>

          <select
            style={styles.filterSelect}
            value={filters.occupancyWanted}
            onChange={(e) => handleFilterChange("occupancyWanted", Number(e.target.value))}
          >
            <option value={0}>Any Occupancy</option>
            <option value={1}>1 Bed</option>
            <option value={2}>2 Beds</option>
            <option value={3}>3 Beds</option>
            <option value={4}>4+ Beds</option>
          </select>

          <div style={styles.budgetInputs}>
            <input
              type="number"
              placeholder="Min ₹"
              style={styles.budgetInput}
              value={filters.minBudget}
              onChange={(e) => handleFilterChange("minBudget", Number(e.target.value || 0))}
            />
            <span style={styles.budgetDivider}>—</span>
            <input
              type="number"
              placeholder="Max ₹"
              style={styles.budgetInput}
              value={filters.maxBudget}
              onChange={(e) => handleFilterChange("maxBudget", Number(e.target.value || 0))}
            />
          </div>

          <select
            style={styles.filterSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="rent_low">Lowest Rent</option>
            <option value="rent_high">Highest Rent</option>
            <option value="nearest">Nearest</option>
          </select>
        </div>
      </div>

      {/* Insights Bar */}
      <div style={styles.insightsBar}>
        <div style={styles.insightCard}>
          <span style={styles.insightIcon}>💡</span>
          <span>
            {averageRent > 0 
              ? `Average rent: ₹${averageRent.toLocaleString('en-IN')}/month`
              : 'Average rent: Calculating...'
            }
          </span>
        </div>
        <div style={styles.insightCard}>
          <span style={styles.insightIcon}>📊</span>
          <span>
            {total > 0 
              ? `${total} listing${total !== 1 ? 's' : ''} available`
              : 'No listings to display'
            }
          </span>
        </div>
        <div style={styles.insightCard}>
          <span style={styles.insightIcon}>⚡</span>
          <span>New: Self-verify with photos</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.listingsContainer}>
          {loading && listings.length === 0 ? (
            <div style={viewMode === "grid" ? styles.gridView : styles.listView}>
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : sortedListings.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3 style={styles.emptyTitle}>No flatmates found</h3>
              <p style={styles.emptyText}>Try adjusting your filters or search terms</p>
              <button
                style={styles.emptyButton}
                onClick={() =>
                  setFilters({
                    active: false,
                    inactive: false,
                    gender: "any",
                    furnished: "all",
                    minBudget: 0,
                    maxBudget: 50000,
                    occupancyWanted: 0,
                    search: "",
                    moveInBefore: null,
                  })
                }
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div style={viewMode === "grid" ? styles.gridView : styles.listView}>
              {sortedListings.map((listing) => (
                <div
                  key={listing._id}
                  style={{
                    ...styles.listingCard,
                    ...(hoveredCard === listing._id ? styles.listingCardHover : {}),
                  }}
                  onMouseEnter={() => setHoveredCard(listing._id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Image Section */}
                  <div style={styles.cardImageContainer}>
                    {listing.photos && listing.photos.length > 0 && listing.photos[0].url ? (
                      <img
                        src={listing.photos[0].url}
                        alt={listing.title || "Listing"}
                        style={styles.cardImage}
                        loading="lazy"
                      />
                    ) : (
                      <div style={styles.cardImagePlaceholder}>
                        <span style={styles.placeholderIcon}>🏠</span>
                      </div>
                    )}
                    
                    {/* Badges Overlay */}
                    <div style={styles.cardBadges}>
                      {listing.isPostedNew && (
                        <span style={styles.badgeNew}>NEW</span>
                      )}
                      {listing.moveInDate && new Date(listing.moveInDate) <= new Date() && (
                        <span style={styles.badgeImmediate}>Immediate</span>
                      )}
                    </div>

                    {/* Beds Available */}
                    <div style={styles.bedsAvailable}>
                      {(() => {
                        const bedsLeft = Math.max(0, (listing.occupancyWanted || 0) - (listing.currentOccupants || 0));
                        return `${bedsLeft} Bed${bedsLeft !== 1 ? 's' : ''} Left`;
                      })()}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={styles.cardContent}>
                    {/* Title and Views */}
                    <div style={styles.cardTitleRow}>
                      <h3 style={styles.cardTitle}>{listing.title || "Untitled Listing"}</h3>
                      <span style={styles.cardViews}>
                        <span style={styles.viewsIcon}>👁</span> {typeof listing.views === "number" ? listing.views : 0}
                      </span>
                    </div>

                    {/* Location */}
                    <div style={styles.cardLocation}>
                      <span style={styles.locationIcon}>📍</span>
                      <span>
                        {listing.city || "Unknown"}
                        {listing.area ? `, ${listing.area}` : ""}
                      </span>
                    </div>

                    {/* Budget */}
                    <div style={styles.cardBudget}>
                      <span style={styles.budgetAmount}>
                        ₹{(listing.budget?.min || 0).toLocaleString('en-IN')} - ₹{(listing.budget?.max || 0).toLocaleString('en-IN')}
                      </span>
                      <span style={styles.budgetLabel}>/month</span>
                    </div>

                    {/* Property Details Grid */}
                    <div style={styles.detailsGrid}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>👥</span>
                        <span style={styles.detailText}>
                          {listing.preferredGender
                            ? listing.preferredGender.charAt(0).toUpperCase() + listing.preferredGender.slice(1)
                            : "Any"}
                        </span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>🛏️</span>
                        <span style={styles.detailText}>{listing.occupancyWanted || 1} Wanted</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>🏠</span>
                        <span style={styles.detailText}>{listing.furnished ? "Furnished" : "Unfurnished"}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>📅</span>
                        <span style={styles.detailText}>
                          {listing.moveInDate ? new Date(listing.moveInDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Flexible"}
                        </span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {listing.amenities && listing.amenities.length > 0 && (
                      <div style={styles.cardAmenities}>
                        {listing.amenities.slice(0, 4).map((amenity, index) => (
                          <span key={index} style={styles.amenityTag}>
                            {amenity === "wifi" && "📶 Wi-Fi"}
                            {amenity === "ac" && "❄️ AC"}
                            {amenity === "balcony" && "🌿 Balcony"}
                            {amenity === "parking" && "🅿️ Parking"}
                            {amenity === "maid" && "🧹 Maid"}
                            {!["wifi", "ac", "balcony", "parking", "maid"].includes(amenity) && amenity}
                          </span>
                        ))}
                        {listing.amenities.length > 4 && (
                          <span style={styles.amenityMore}>+{listing.amenities.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Description Preview */}
                    {listing.description && (
                      <p style={styles.cardDescription}>
                        {listing.description.length > 100
                          ? listing.description.substring(0, 100) + "..."
                          : listing.description}
                      </p>
                    )}

                    {/* Owner Info */}
                    <div style={styles.ownerInfo}>
                      <div style={styles.ownerAvatar}>
                        {listing.ownerId?.name
                          ? listing.ownerId.name.charAt(0).toUpperCase()
                          : listing.ownerId?.email
                          ? listing.ownerId.email.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div style={styles.ownerDetails}>
                        <span style={styles.ownerName}>
                          {listing.ownerId?.name || listing.ownerId?.email?.split('@')[0] || "Owner"}
                        </span>
                        <span style={styles.ownerContact}>
                          {listing.contactMethods?.phone && listing.ownerId?.mobileNumber
                            ? listing.ownerId.mobileNumber
                            : listing.contactMethods?.email && listing.ownerId?.email
                            ? listing.ownerId.email
                            : "Contact via platform"}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={styles.statusBadge}>
                      <span
                        style={{
                          ...styles.statusIndicator,
                          backgroundColor: listing.isActive ? colors.teal : colors.slateBlue,
                        }}
                      ></span>
                      <span style={styles.statusText}>{listing.isActive ? "Active" : "Inactive"}</span>
                    </div>

                    {/* Action Buttons */}
                    <div style={styles.cardActions}>
                      {listing.isActive ? (
                        <button
                          style={styles.deactivateButton}
                          onClick={() => handleDelete(listing._id, false)}
                        >
                          <span style={styles.actionIcon}>🗑️</span> Deactivate
                        </button>
                      ) : (
                        <button
                          style={styles.activateButton}
                          onClick={() => handleDelete(listing._id, true)}
                        >
                          <span style={styles.actionIcon}>✅</span> Activate
                        </button>
                      )}
                              <button style={styles.viewButton} onClick={() => navigate(`/flatmatesearchpropertymodal/${listing._id}`, { state: { background: location } })}>
                                  
                        <span style={styles.actionIcon} >👁️</span> View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(page <= 1 ? styles.paginationButtonDisabled : {}),
                }}
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ← Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(page >= Math.ceil(total / limit) ? styles.paginationButtonDisabled : {}),
                }}
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Safety Tips */}
          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>
              <span style={styles.sidebarIcon}>🛡️</span> Safety Tips
            </h3>
            <ul style={styles.tipsList}>
              <li>Always meet in public first</li>
              <li>Verify documents & references</li>
              <li>Discuss house rules upfront</li>
              <li>Use secure payment methods</li>
              <li>Trust your instincts</li>
            </ul>
          </div>

          {/* Quick Stats */}
          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>
              <span style={styles.sidebarIcon}>📊</span> Quick Stats
            </h3>
            <div style={styles.statsList}>
              <div style={styles.sidebarStat}>
                <span style={styles.sidebarStatValue}>{total}</span>
                <span style={styles.sidebarStatLabel}>
                  {total === 1 ? 'Total Listing' : 'Total Listings'}
                </span>
              </div>
              <div style={styles.sidebarStat}>
                <span style={styles.sidebarStatValue}>
                  {averageRent > 0 ? `₹${(averageRent / 1000).toFixed(1)}K` : '—'}
                </span>
                <span style={styles.sidebarStatLabel}>Avg. Rent</span>
              </div>
              <div style={styles.sidebarStat}>
                <span style={styles.sidebarStatValue}>
                  {listings.filter(l => l.isActive).length}
                </span>
                <span style={styles.sidebarStatLabel}>Active Now</span>
              </div>
            </div>
          </div>

          {/* Map View CTA */}
          <div style={styles.sidebarCard}>
            <button style={styles.mapButton}>
              <span style={styles.mapIcon}>🗺️</span>
              <div>
                <div style={styles.mapButtonTitle}>View on Map</div>
                <div style={styles.mapButtonSubtitle}>Explore nearby listings</div>
              </div>
            </button>
          </div>

          {/* Promo Banner */}
          <div style={styles.promoBanner}>
            <div style={styles.promoIcon}>✨</div>
            <div style={styles.promoContent}>
              <h4 style={styles.promoTitle}>Premium Verification</h4>
              <p style={styles.promoText}>Get verified to gain more trust</p>
              <button style={styles.promoButton}>Learn More</button>
            </div>
          </div>
        </div>
      </div>

      {/* Load More Button */}
      {total > listings.length && (
        <div style={styles.loadMoreSection}>
          <button
            style={styles.loadMoreButton}
            onClick={() => {
              const next = page + 1;
              appendRef.current = true;
              setPage(next);
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More Listings"}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    backgroundColor: "#F4F7F9",
    minHeight: "100vh",
    paddingBottom: "60px",
  },
  navWrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 999,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  header: {
    marginTop: "80px",
    background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
    padding: "60px 40px",
    borderRadius: "0 0 24px 24px",
    boxShadow: "0 8px 32px rgba(0,51,102,0.15)",
    color: "#FFFFFF",
  },
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto 30px",
  },
  title: {
    fontSize: "42px",
    fontWeight: "700",
    margin: "0 0 12px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "18px",
    margin: "0",
    opacity: "0.95",
    fontWeight: "400",
  },
  headerStats: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "40px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statNumber: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#22D3EE",
  },
  statLabel: {
    fontSize: "14px",
    opacity: "0.9",
    marginTop: "4px",
  },
  statDivider: {
    width: "1px",
    height: "40px",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  searchSection: {
    maxWidth: "1400px",
    margin: "30px auto",
    padding: "0 40px",
    display: "flex",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchContainer: {
    flex: "1",
    minWidth: "300px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    padding: "4px",
    transition: "box-shadow 0.3s ease",
  },
  searchIcon: {
    fontSize: "20px",
    padding: "0 16px",
    color: "#4A6A8A",
  },
  searchInput: {
    flex: "1",
    border: "none",
    outline: "none",
    padding: "14px 8px",
    fontSize: "15px",
    color: "#333333",
    backgroundColor: "transparent",
  },
  clearSearchButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#4A6A8A",
    cursor: "pointer",
    padding: "8px 16px",
    fontSize: "18px",
    transition: "color 0.2s ease",
  },
  viewToggle: {
    display: "flex",
    gap: "8px",
    backgroundColor: "#FFFFFF",
    padding: "4px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  viewToggleButton: {
    padding: "10px 20px",
    border: "none",
    backgroundColor: "transparent",
    color: "#4A6A8A",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  viewToggleButtonActive: {
    backgroundColor: "#22D3EE",
    color: "#FFFFFF",
  },
  viewIcon: {
    fontSize: "16px",
  },
  filterChips: {
    maxWidth: "1400px",
    margin: "0 auto 20px",
    padding: "0 40px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
  },
  filterChipsLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#003366",
  },
  filterChip: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#FFFFFF",
    padding: "8px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    color: "#333333",
    border: "1px solid #E0E6EB",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  filterChipClose: {
    backgroundColor: "transparent",
    border: "none",
    color: "#4A6A8A",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0",
    lineHeight: "1",
  },
  clearAllChip: {
    backgroundColor: "#003366",
    color: "#FFFFFF",
    border: "none",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  filterBar: {
    maxWidth: "1400px",
    margin: "0 auto 25px",
    padding: "20px 40px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  filterSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "10px 18px",
    border: "1px solid #E0E6EB",
    backgroundColor: "#F4F7F9",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333333",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  filterButtonActive: {
    backgroundColor: "#00A79D",
    color: "#FFFFFF",
    borderColor: "#00A79D",
  },
  filterButtonIcon: {
    fontSize: "12px",
  },
  filterSelect: {
    padding: "10px 14px",
    border: "1px solid #E0E6EB",
    borderRadius: "10px",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
    color: "#333333",
    outline: "none",
    transition: "border-color 0.3s ease",
  },
  budgetInputs: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  budgetInput: {
    width: "100px",
    padding: "10px 14px",
    border: "1px solid #E0E6EB",
    borderRadius: "10px",
    backgroundColor: "#FFFFFF",
    fontSize: "14px",
    color: "#333333",
    outline: "none",
  },
  budgetDivider: {
    color: "#4A6A8A",
    fontSize: "14px",
  },
  insightsBar: {
    maxWidth: "1400px",
    margin: "0 auto 30px",
    padding: "0 40px",
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
  },
  insightCard: {
    flex: "1",
    minWidth: "200px",
    backgroundColor: "#FFFFFF",
    padding: "16px 20px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    borderLeft: "3px solid #22D3EE",
  },
  insightIcon: {
    fontSize: "20px",
  },
  mainContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 40px",
    display: "flex",
    gap: "30px",
    alignItems: "flex-start",
  },
  listingsContainer: {
    flex: "3",
  },
  gridView: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "24px",
  },
  listView: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  listingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "1px solid #E0E6EB",
  },
  listingCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
  },
  cardImageContainer: {
    position: "relative",
    width: "100%",
    height: "220px",
    overflow: "hidden",
    backgroundColor: "#F4F7F9",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.5s ease",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0E6EB",
  },
  placeholderIcon: {
    fontSize: "64px",
    opacity: "0.4",
  },
  cardBadges: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  badgeNew: {
    backgroundColor: "#22D3EE",
    color: "#FFFFFF",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    boxShadow: "0 2px 8px rgba(34, 211, 238, 0.3)",
  },
  badgeImmediate: {
    backgroundColor: "#FF6B6B",
    color: "#FFFFFF",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    boxShadow: "0 2px 8px rgba(255, 107, 107, 0.3)",
  },
  bedsAvailable: {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    backgroundColor: "rgba(0, 51, 102, 0.9)",
    color: "#FFFFFF",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    backdropFilter: "blur(8px)",
  },
  cardContent: {
    padding: "20px",
  },
  cardTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    gap: "12px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#003366",
    margin: "0",
    lineHeight: "1.3",
    flex: "1",
  },
  cardViews: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    color: "#4A6A8A",
    whiteSpace: "nowrap",
  },
  viewsIcon: {
    fontSize: "14px",
  },
  cardLocation: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#4A6A8A",
    fontSize: "14px",
    marginBottom: "14px",
  },
  locationIcon: {
    fontSize: "16px",
  },
  cardBudget: {
    marginBottom: "16px",
  },
  budgetAmount: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#00A79D",
  },
  budgetLabel: {
    fontSize: "14px",
    color: "#4A6A8A",
    marginLeft: "4px",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#F4F7F9",
    borderRadius: "12px",
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  detailIcon: {
    fontSize: "16px",
  },
  detailText: {
    fontSize: "13px",
    color: "#333333",
    fontWeight: "500",
  },
  cardAmenities: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
  amenityTag: {
    backgroundColor: "#E8F4F8",
    color: "#003366",
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "500",
  },
  amenityMore: {
    backgroundColor: "#F4F7F9",
    color: "#4A6A8A",
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "500",
  },
  cardDescription: {
    fontSize: "14px",
    color: "#4A6A8A",
    lineHeight: "1.6",
    marginBottom: "16px",
  },
  ownerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    backgroundColor: "#F4F7F9",
    borderRadius: "12px",
    marginBottom: "16px",
  },
  ownerAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#003366",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
  },
  ownerDetails: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  ownerName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#003366",
  },
  ownerContact: {
    fontSize: "12px",
    color: "#4A6A8A",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  statusIndicator: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  statusText: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#333333",
  },
  cardActions: {
    display: "flex",
    gap: "10px",
  },
  deactivateButton: {
    flex: "1",
    padding: "12px",
    border: "1px solid #E0E6EB",
    backgroundColor: "#FFF5F5",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#FF6B6B",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  activateButton: {
    flex: "1",
    padding: "12px",
    border: "1px solid #E0E6EB",
    backgroundColor: "#E6FFEF",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#00A79D",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  viewButton: {
    flex: "1",
    padding: "12px",
    border: "none",
    backgroundColor: "#003366",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#FFFFFF",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  actionIcon: {
    fontSize: "14px",
  },
  sidebar: {
    flex: "1",
    minWidth: "280px",
    position: "sticky",
    top: "100px",
  },
  sidebarCard: {
    backgroundColor: "#FFFFFF",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #E0E6EB",
  },
  sidebarTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#003366",
    margin: "0 0 16px 0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sidebarIcon: {
    fontSize: "20px",
  },
  tipsList: {
    margin: "0",
    paddingLeft: "20px",
    color: "#4A6A8A",
    fontSize: "14px",
    lineHeight: "2",
    listStyleType: "none",
  },
  statsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sidebarStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#F4F7F9",
    borderRadius: "12px",
  },
  sidebarStatValue: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#003366",
  },
  sidebarStatLabel: {
    fontSize: "13px",
    color: "#4A6A8A",
    marginTop: "4px",
  },
  mapButton: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#003366",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "transform 0.3s ease",
  },
  mapIcon: {
    fontSize: "24px",
  },
  mapButtonTitle: {
    fontSize: "16px",
    fontWeight: "600",
  },
  mapButtonSubtitle: {
    fontSize: "12px",
    opacity: "0.9",
    marginTop: "2px",
  },
  promoBanner: {
    backgroundColor: "linear-gradient(135deg, #22D3EE 0%, #00A79D 100%)",
    background: "linear-gradient(135deg, #22D3EE 0%, #00A79D 100%)",
    padding: "24px",
    borderRadius: "16px",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 4px 16px rgba(34, 211, 238, 0.2)",
  },
  promoIcon: {
    fontSize: "32px",
  },
  promoContent: {
    flex: "1",
  },
  promoTitle: {
    margin: "0 0 6px 0",
    fontSize: "16px",
    fontWeight: "700",
  },
  promoText: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    opacity: "0.95",
  },
  promoButton: {
    backgroundColor: "#FFFFFF",
    color: "#00A79D",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 40px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "20px",
    opacity: "0.6",
  },
  emptyTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#003366",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "16px",
    color: "#4A6A8A",
    marginBottom: "24px",
  },
  emptyButton: {
    padding: "12px 28px",
    backgroundColor: "#00A79D",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "40px",
    padding: "20px",
  },
  paginationButton: {
    padding: "12px 24px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E0E6EB",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#003366",
    transition: "all 0.3s ease",
  },
  paginationButtonDisabled: {
    opacity: "0.5",
    cursor: "not-allowed",
  },
  pageInfo: {
    fontSize: "14px",
    color: "#4A6A8A",
    fontWeight: "500",
  },
  loadMoreSection: {
    textAlign: "center",
    marginTop: "40px",
    padding: "0 40px",
  },
  loadMoreButton: {
    padding: "14px 32px",
    backgroundColor: "#FFFFFF",
    border: "2px solid #00A79D",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: "#00A79D",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #E0E6EB",
  },
  skeletonHeader: {
    height: "220px",
    backgroundColor: "#E0E6EB",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  skeletonBadge: {
    width: "60px",
    height: "20px",
    backgroundColor: "#E0E6EB",
    borderRadius: "10px",
    margin: "12px",
  },
  skeletonProfile: {
    display: "flex",
    padding: "20px",
    gap: "12px",
  },
  skeletonAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#E0E6EB",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  skeletonText: {
    flex: "1",
  },
  skeletonLine: {
    height: "12px",
    backgroundColor: "#E0E6EB",
    borderRadius: "6px",
    marginBottom: "8px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  skeletonDetails: {
    padding: "0 20px 20px",
  },
};

export default FlatmatesListings;