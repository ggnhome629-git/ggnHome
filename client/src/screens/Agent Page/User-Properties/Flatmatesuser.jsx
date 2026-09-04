import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useNavigate } from "react-router-dom";

const FlatmatesListings = () => {
  // Filters intentionally matched to the Flatmate mongoose model
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
    const [filters, setFilters] = useState({
    active: false, // maps to isActive (false by default so we show both unless tab selected)
    inactive: false, // show inactive listings tab when set
    gender: "any", // maps to preferredGender: 'male' | 'female' | 'any'
    furnished: "all", // 'all' | 'furnished' | 'unfurnished' -> maps to furnished boolean
    minBudget: 0,
    maxBudget: 50000,
    occupancyWanted: 0, // 0 means any
    search: "",
    moveInBefore: null, // optional ISO date string
  });
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState("newest");

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
  // Read agent token once for Authorization header fallback
  const agentToken = localStorage.getItem("agentAccessToken");
  const appendRef = useRef(false);
  const navigate = useNavigate();
  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
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
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];
    // Client-side matcher to ensure only truly matching listings are shown
const matchesFilters = (listing) => {
  if (!listing) return false;

//   // active filter (if active toggle is on, require isActive true)
//   if (filters.active && typeof listing.isActive === 'boolean' && !listing.isActive) return false;
//   if (filters.inactive && typeof listing.isActive === 'boolean' && listing.isActive) return false;

  // gender / preferredGender: listing.preferredGender is 'male' | 'female' | 'any'
  if (filters.gender && filters.gender !== 'any') {
    if (listing.preferredGender && listing.preferredGender !== 'any') {
      if (listing.preferredGender !== filters.gender) return false;
    } // if listing prefers 'any', consider it matching any gender
  }

  // furnished
  if (filters.furnished === 'furnished' && listing.furnished !== true) return false;
  if (filters.furnished === 'unfurnished' && listing.furnished !== false) return false;

  // budget overlap: require listing.max >= minBudget AND listing.min <= maxBudget
  const lmin = listing.budget?.min ?? 0;
  const lmax = listing.budget?.max ?? 0;
  if (typeof filters.minBudget === 'number' && typeof filters.maxBudget === 'number') {
    if (lmax < filters.minBudget) return false; // listing completely below requested min
    if (lmin > filters.maxBudget) return false; // listing completely above requested max
  }

  // occupancyWanted (if set > 0): listing should offer at least this many beds wanted
  if (filters.occupancyWanted && filters.occupancyWanted > 0) {
    if ((listing.occupancyWanted || 0) < filters.occupancyWanted) return false;
  }

  // moveInBefore: listing.moveInDate must be <= filter date
  if (filters.moveInBefore) {
    const filterDate = new Date(filters.moveInBefore);
    const listingDate = listing.moveInDate ? new Date(listing.moveInDate) : null;
    if (!listingDate) return false;
    if (listingDate > filterDate) return false;
  }

  // search: check title, description, city, area
  if (filters.search && filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    const hay = [listing.title, listing.description, listing.city, listing.area]
      .filter(Boolean)
      .join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true; // passed all checks
};

  // Build query params from filters that match backend schema
  const buildParamsFromFilters = (pageToFetch) => {
    const params = { page: pageToFetch, limit };

    // isActive mapping
    if (filters.active && !filters.inactive) {
      params.onlyActive = true;
    } else if (!filters.active && filters.inactive) {
      params.onlyActive = false;
    } else {
      // if both true or both false, don't send onlyActive so backend decides
    }

    // preferredGender
    if (filters.gender && filters.gender !== "any") {
      params.preferredGender = filters.gender; // 'male' | 'female'
    }

    // furnished
    if (filters.furnished === "furnished") params.furnished = true;
    if (filters.furnished === "unfurnished") params.furnished = false;

    // budget
    if (typeof filters.minBudget === "number") params.minBudget = filters.minBudget;
    if (typeof filters.maxBudget === "number") params.maxBudget = filters.maxBudget;

    // occupancyWanted (only if > 0)
    if (filters.occupancyWanted && filters.occupancyWanted > 0) {
      params.occupancyWanted = filters.occupancyWanted;
    }

    // search term (should match backend q/search semantics)
    if (filters.search && filters.search.trim().length > 0) {
      params.q = filters.search.trim();
    }

    // Move-in date filter: match listings with moveInDate <= moveInBefore
    if (filters.moveInBefore) {
      params.moveInBefore = filters.moveInBefore;
    }

    return params;
  };

  // Fetch listings from API (supports append for "Load More")
  const fetchListings = async (opts = {}) => {
    if (loading) return;
    try {
      setLoading(true);

      // If opts.page is provided use it, otherwise use current page state
      const pageToFetch = typeof opts.page === "number" ? opts.page : page;
      // Determine whether we should append results instead of replacing
      const shouldAppend = !!opts.append || !!appendRef.current;

      const params = buildParamsFromFilters(pageToFetch);
// Always log params for debugging in browser console
// eslint-disable-next-line no-console
// console.log("fetchListings params:", params, "append:", shouldAppend);

      const response = await axios.get(
        `${process.env.REACT_APP_Base_API}/api/flatmates/user/listings`,
        {
          withCredentials: true,
          params,
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
        }
      );
// console.log("fetchListings response raw:", response?.data);

          if (response && response.data && response.data.success) {
        const items = response.data.data.items || [];
        const totalRes = response.data.data.total || 0;

        // Apply client-side filtering to ensure only matched listings are shown
        const filtered = items.filter((it) => matchesFilters(it));
        const excluded = items.filter((it) => !matchesFilters(it));

        // Debugging: log counts and details so we can see why items are excluded
        // (This will appear in browser console)
        try {
          // unique ids and a compact representation of each excluded item
        //   console.debug('fetchListings: server returned', items.length, 'items. filtered->', filtered.length, 'excluded->', excluded.length);
          if (items.length > 0 && excluded.length > 0) {
            // console.debug('fetchListings: excluded items detail:', excluded.map(it => ({
            //   id: it._id,
            //   title: it.title && it.title.substring ? it.title.substring(0,60) : it.title,
            //   isActive: typeof it.isActive === 'undefined' ? 'undefined' : it.isActive,
            //   minBudget: it.budget && it.budget.min ? it.budget.min : null,
            //   maxBudget: it.budget && it.budget.max ? it.budget.max : null,
            //   occupancyWanted: it.occupancyWanted || null,
            //   furnished: typeof it.furnished === 'boolean' ? it.furnished : null,
            //   moveInDate: it.moveInDate || null,
            // })));
          }
        } catch (dbgErr) {
          // ignore debug errors
          // eslint-disable-next-line no-console
        //   console.error('Debug logging failed', dbgErr);
        }

        if (shouldAppend) {
          setListings((prev) => [...prev, ...filtered]);
        } else {
          setListings(filtered);
        }
        // set total to filtered length when filters are active, otherwise use backend total
        const anyActiveFilters = (
          filters.search?.trim() ||
          filters.gender !== 'any' ||
          filters.furnished !== 'all' ||
          filters.minBudget > 0 ||
          filters.maxBudget < 50000 ||
          (filters.occupancyWanted && filters.occupancyWanted > 0) ||
          filters.moveInBefore ||
          filters.active ||
          filters.inactive
        );
        setTotal(anyActiveFilters ? filtered.length : totalRes);

        // Clear appendRef after successful append
       


        // Clear appendRef after successful append
        if (appendRef.current) appendRef.current = false;
      } else {
        if (!shouldAppend) setListings([]);
        setTotal(0);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
    //   console.error("Error fetching listings:", error?.message || error);
      if (error && error.response) {
        // eslint-disable-next-line no-console
        // console.error("Response status:", error.response.status);
        // // eslint-disable-next-line no-console
        // console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        // // eslint-disable-next-line no-console
        // console.error("Request params:", JSON.stringify(error.config?.params, null, 2));
      }

      if (!appendRef.current) setListings([]);
      setTotal(0);
      if (appendRef.current) appendRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // When filters change reset to first page and fetch
    setPage(1);
    fetchListings({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  // Utility to get a single-number rent value for sorting
  const listingRentValue = (listing) => {
    const min = listing.budget?.min || 0;
    const max = listing.budget?.max || 0;
    return min && max ? (min + max) / 2 : min || max || 0;
  };

  // Toggle listing active state (soft-delete / activate). Confirms with user, calls backend and updates UI on success.
  // Accepts optional desiredActive boolean. If omitted, toggles the current state server-side.
  const handleDelete = async (id, desiredActiveParam) => {
    if (!id) return;

    // Determine desired active state: prefer explicit param, otherwise toggle based on current listing in UI
    const current = listings.find((l) => l._id === id);
    const desiredActive = typeof desiredActiveParam !== 'undefined' ? Boolean(desiredActiveParam) : !Boolean(current?.isActive);

    const actionVerb = desiredActive ? 'activate' : 'deactivate';
    const confirmMsg = desiredActive
      ? 'Are you sure you want to activate this listing?'
      : 'Are you sure you want to deactivate (soft-delete) this listing?';

    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    try {
      setLoading(true);
      // call API with explicit desired state so server sets it predictably
      const resp = await axios.delete(
        `${process.env.REACT_APP_Base_API}/api/flatmates/listings/${id}?active=${desiredActive}`,
        {
          withCredentials: true,
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
        }
      );

      if (resp && resp.data && resp.data.success) {
        // Update UI: if deactivated, remove from active list (we rely on filters/inactive tab to view them)
        if (!desiredActive) {
          // if currently showing active list, remove the item; if showing inactive tab, it shouldn't be visible here
          setListings((prev) => prev.filter((l) => l._id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
        } else {
          // activated: if we're viewing inactive tab, remove from that list; if viewing active list, add it back
          // We'll remove from current list so UI refresh will reflect server state when filters re-run
          setListings((prev) => prev.filter((l) => l._id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
        }
      } else {
        window.alert((resp && resp.data && resp.data.message) || 'Failed to update listing state');
      }
    } catch (err) {
      console.error('Toggle listing error:', err);
      window.alert('Error updating listing');
    } finally {
      setLoading(false);
    }
  };

  // Sort listings based on selected option
  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "rent_low":
        return listingRentValue(a) - listingRentValue(b);
      case "rent_high":
        return listingRentValue(b) - listingRentValue(a);
      case "nearest":
        // Assuming distance property exists
        return (a.distance || 0) - (b.distance || 0);
      default:
        return 0;
    }
  });

  return (
    <div style={styles.container}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
        }}
      >
        <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Flatmates Listings</h1>
        <p style={styles.subtitle}>Find your perfect roommate match</p>
      </div>

      {/* Top Controls */}
      <div style={styles.topControls}>
        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by location, title or preferences..."
            style={styles.searchInput}
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <button
            style={styles.searchButton}
            onClick={() => fetchListings({ page: 1 })}
          >
            <span style={styles.searchIcon}>🔍</span>
          </button>
        </div>

        {/* View Toggle */}
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.viewToggleButton,
              backgroundColor: viewMode === "grid" ? colors.cyan : colors.alabaster,
            }}
            onClick={() => setViewMode("grid")}
          >
            ▦ Grid
          </button>
          <button
            style={{
              ...styles.viewToggleButton,
              backgroundColor: viewMode === "list" ? colors.cyan : colors.alabaster,
            }}
            onClick={() => setViewMode("list")}
          >
            ☰ List
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Showing:</span>

          <button
            style={{
              ...styles.filterButton,
              backgroundColor: filters.active ? colors.teal : colors.alabaster,
              color: filters.active ? colors.white : colors.darkCharcoal,
            }}
            onClick={() => handleFilterChange("active", !filters.active)}
          >
            ✓ Active
          </button>

          <button
            style={styles.filterButton}
            onClick={() =>
              setFilters({
                active: true,
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
            ✕ Clear All Filters
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
            <option value={1}>1 Bed Wanted</option>
            <option value={2}>2 Beds Wanted</option>
            <option value={3}>3 Beds Wanted</option>
            <option value={4}>4+ Beds Wanted</option>
          </select>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              placeholder="Min"
              style={{ ...styles.filterSelect, width: 90 }}
              value={filters.minBudget}
              onChange={(e) => handleFilterChange("minBudget", Number(e.target.value || 0))}
            />
            <input
              type="number"
              placeholder="Max"
              style={{ ...styles.filterSelect, width: 90 }}
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

      {/* Stats and Insights */}
      <div style={styles.insightsBar}>
        <div style={styles.totalCount}>
          <strong>{total}</strong> Flatmates Listings
        </div>
        <div style={styles.insightCard}>💡 Average rent in your area: ₹12,500/month</div>
        <button style={styles.verifyButton}>📸 NEW: Self Verify by uploading photos with location data</button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Listings Grid/List */}
        <div style={styles.listingsContainer}>
          {loading ? (
            <div style={styles.loading}>Loading listings...</div>
          ) : sortedListings.length === 0 ? (
            <div style={styles.noResults}>No flatmate listings found. Try adjusting your filters.</div>
          ) : (
            <div style={viewMode === "grid" ? styles.gridView : styles.listView}>
              {sortedListings.map((listing) => (
                <div key={listing._id} style={styles.listingCard}>
                  {/* Card Header with Badges */}
                  <div style={styles.cardHeader}>
                    <div style={styles.badgeContainer}>
                      {listing.isPostedNew && <span style={styles.badgeNew}>NEW</span>}
                      {listing.moveInDate && new Date(listing.moveInDate) <= new Date() && (
                        <span style={styles.badgeImmediate}>🏃 Immediate Move-In</span>
                      )}
                    </div>

                    <span style={styles.occupancyBadge}>
                      {Math.max(0, (listing.occupancyWanted || 0) - (listing.currentOccupants || 0))} Bed{(Math.max(0, (listing.occupancyWanted || 0) - (listing.currentOccupants || 0)) !== 1) ? 's' : ''} Left
                    </span>
                  </div>

                  {/* Profile Image and Basic Info */}
                  <div style={styles.profileSection}>
                    <div style={styles.avatar}>
                      {listing.photos && listing.photos.length > 0 && listing.photos[0].url ? (
                        <img src={listing.photos[0].url} alt={listing.title || 'Listing'} style={styles.avatarImage} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>🏠</div>
                      )}
                    </div>

                    <div style={styles.profileInfo}>
                      <h3 style={styles.profileName}>{listing.title || 'Untitled Listing'}</h3>

                      <div style={styles.profileDetails}>
                        <span>📧 {listing.ownerId && listing.ownerId.name ? listing.ownerId.name : (listing.ownerId && listing.ownerId.email ? listing.ownerId.email : 'Owner')}</span>
                        <span>📞 {listing.ownerId && listing.ownerId.mobileNumber ? listing.ownerId.mobileNumber : 'Hidden'}</span>

                        <span>🛏️ Wants {listing.occupancyWanted || '1'}</span>
                        <span>👥 Prefers: {listing.preferredGender ? listing.preferredGender.charAt(0).toUpperCase() + listing.preferredGender.slice(1) : 'Any'}</span>
                        <span>👀 {typeof listing.views === 'number' ? listing.views : 0} views</span>
                      </div>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div style={styles.propertyDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>📍 Location:</span>
                      <span>{(listing.city || 'Unknown') + (listing.area ? ', ' + listing.area : '')}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>🏠 Furnishing:</span>
                      <span>{listing.furnished ? 'Furnished' : 'Unfurnished'}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>💰 Budget:</span>
                      <span style={styles.rentAmount}>
                        {listing.budget ? (`₹${listing.budget.min || 0} - ₹${listing.budget.max || 0}`) : 'Not specified'}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>📅 Move-in:</span>
                      <span>{listing.moveInDate ? new Date(listing.moveInDate).toLocaleDateString() : 'Flexible'}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>☎️ Contact Methods:</span>
                      <span>
                        {listing.contactMethods && listing.contactMethods.phone ? 'Phone' : ''}
                        {listing.contactMethods && listing.contactMethods.phone && listing.contactMethods.email ? ' • ' : ''}
                        {listing.contactMethods && listing.contactMethods.email ? 'Email' : ''}
                        {!listing.contactMethods && 'Hidden'}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Status:</span>
                      <span>{listing.isActive ? 'Active' : 'Inactive'}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Posted:</span>
                      <span>{listing.createdAt ? new Date(listing.createdAt).toLocaleString() : 'Unknown'}</span>
                    </div>

                    {listing.description && (
                      <div style={{ marginTop: 10 }}>{listing.description}</div>
                    )}
                  </div>

                  {/* Amenities */}
                  <div style={styles.amenities}>
                    {listing.amenities && listing.amenities.map((amenity, index) => (
                      <span key={index} style={styles.amenityBadge}>
                        {amenity === 'wifi' && '📶 Wi-Fi'}
                        {amenity === 'ac' && '❄️ AC'}
                        {amenity === 'balcony' && '🌿 Balcony'}
                        {amenity === 'parking' && '🅿️ Parking'}
                        {amenity === 'maid' && '🧹 Maid'}
                        {!['wifi','ac','balcony','parking','maid'].includes(amenity) && amenity}
                      </span>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div style={styles.actionButtons}>
                    {listing.isActive ? (
                      <button
                        style={styles.actionButton}
                        onClick={() => handleDelete(listing._id, false)}
                      >
                        🗑️ Delete
                      </button>
                    ) : (
                      <button
                        style={{ ...styles.actionButton, backgroundColor: '#E6FFEF', borderColor: '#00A79D' }}
                        onClick={() => handleDelete(listing._id, true)}
                      >
                        ✅ Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div style={styles.pagination}>
              <button
                style={styles.paginationButton}
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ← Previous
              </button>
              <span style={styles.pageInfo}>Page {page} of {Math.ceil(total / limit)}</span>
              <button
                style={styles.paginationButton}
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
          {/* Tips Banner */}
          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>🏠 Roommate Safety Tips</h3>
            <ul style={styles.tipsList}>
              <li>Always meet in public first</li>
              <li>Verify documents and references</li>
              <li>Discuss house rules upfront</li>
              <li>Use secure payment methods</li>
              <li>Trust your instincts</li>
            </ul>
          </div>

          {/* Recommended Carousel */}
          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>⭐ Recommended for You</h3>
            <div style={styles.recommendedCarousel}>
              <div style={styles.recommendedItem}>
                <strong>Similar budget & location</strong>
                <p>Check out listings near you</p>
              </div>
            </div>
          </div>

          {/* Map View Option */}
          <div style={styles.sidebarCard}>
            <button style={styles.mapViewButton}>🗺️ View on Map</button>
            <p style={styles.sidebarText}>Explore flatmates near key areas</p>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div style={styles.loadMoreSection}>
        <button
          style={styles.loadMoreButton}
          onClick={() => {
            const next = page + 1;
            appendRef.current = true;
            setPage(next);
          }}
        >
          Load More Properties
        </button>
        <div style={styles.promoBanner}>
          <strong>Connect with thousands of verified buyers & tenants</strong>
        </div>
      </div>
    </div>
  );
};

// styles kept identical to original file for brevity
const styles = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "20px",
    backgroundColor: "#F4F7F9",
    minHeight: "100vh",
    color: "#333333",
  },
  header: {
    marginTop: "80px",
    marginBottom: "30px",
    borderBottom: "2px solid #00A79D",
    paddingBottom: "15px",
  },
  title: {
    color: "#003366",
    margin: "0",
    fontSize: "28px",
    fontWeight: "700",
  },
  subtitle: {
    color: "#4A6A8A",
    margin: "5px 0 0 0",
    fontSize: "16px",
  },
  topControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  searchContainer: {
    display: "flex",
    flex: "1",
    maxWidth: "500px",
  },
  searchInput: {
    flex: "1",
    padding: "12px 15px",
    border: `1px solid #4A6A8A`,
    borderRight: "none",
    borderRadius: "4px 0 0 4px",
    fontSize: "14px",
  },
  searchButton: {
    backgroundColor: "#00A79D",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "0 4px 4px 0",
    cursor: "pointer",
  },
  searchIcon: {
    fontSize: "16px",
  },
  viewToggle: {
    display: "flex",
    gap: "5px",
  },
  viewToggleButton: {
    padding: "8px 15px",
    border: `1px solid #4A6A8A`,
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
  filterBar: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    border: `1px solid #E0E6EB`,
  },
  filterSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  filterLabel: {
    fontWeight: "600",
    color: "#003366",
  },
  filterButton: {
    padding: "8px 15px",
    border: `1px solid #4A6A8A`,
    backgroundColor: "#F4F7F9",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  filterSelect: {
    padding: "8px 12px",
    border: `1px solid #4A6A8A`,
    borderRadius: "4px",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  insightsBar: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    borderLeft: `4px solid #22D3EE`,
  },
  totalCount: {
    fontSize: "16px",
    color: "#003366",
    fontWeight: "600",
  },
  insightCard: {
    backgroundColor: "#F4F7F9",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#4A6A8A",
  },
  verifyButton: {
    backgroundColor: "transparent",
    border: `2px dashed #00A79D`,
    padding: "10px 15px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#00A79D",
    fontSize: "14px",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
    marginBottom: "30px",
  },
  listingsContainer: {
    flex: "3",
  },
  gridView: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "20px",
  },
  listView: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  listingCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    border: `1px solid #E0E6EB`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
    ":hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  badgeContainer: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  badgeVerified: {
    backgroundColor: "#00A79D",
    color: "white",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  badgeNew: {
    backgroundColor: "#22D3EE",
    color: "white",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  badgeImmediate: {
    backgroundColor: "#FF6B6B",
    color: "white",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  occupancyBadge: {
    backgroundColor: "#F4F7F9",
    color: "#003366",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: `1px solid #E0E6EB`,
  },
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    overflow: "hidden",
    backgroundColor: "#F4F7F9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    fontSize: "24px",
  },
  profileInfo: {
    flex: "1",
  },
  profileName: {
    margin: "0 0 8px 0",
    color: "#003366",
    fontSize: "18px",
  },
  profileDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px",
    fontSize: "14px",
    color: "#4A6A8A",
  },
  propertyDetails: {
    marginBottom: "15px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "14px",
  },
  detailLabel: {
    fontWeight: "600",
    color: "#003366",
  },
  rentAmount: {
    color: "#00A79D",
    fontWeight: "700",
    fontSize: "16px",
  },
  amenities: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "15px",
  },
  amenityBadge: {
    backgroundColor: "#F4F7F9",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#4A6A8A",
  },
  compatibilitySection: {
    marginBottom: "15px",
  },
  compatibilityLabel: {
    fontSize: "14px",
    color: "#4A6A8A",
    marginBottom: "5px",
  },
  compatibilityBar: {
    height: "6px",
    backgroundColor: "#E0E6EB",
    borderRadius: "3px",
    overflow: "hidden",
  },
  compatibilityFill: {
    height: "100%",
    borderRadius: "3px",
  },
  actionButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionButton: {
    flex: "1",
    padding: "8px 12px",
    border: `1px solid #4A6A8A`,
    backgroundColor: "white",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    minWidth: "80px",
  },
  sidebar: {
    flex: "1",
    minWidth: "250px",
  },
  sidebarCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: `1px solid #E0E6EB`,
  },
  sidebarTitle: {
    color: "#003366",
    margin: "0 0 15px 0",
    fontSize: "16px",
  },
  tipsList: {
    margin: "0",
    paddingLeft: "20px",
    color: "#4A6A8A",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  recommendedCarousel: {
    backgroundColor: "#F4F7F9",
    padding: "15px",
    borderRadius: "6px",
  },
  recommendedItem: {
    fontSize: "14px",
  },
  mapViewButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#003366",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "10px",
  },
  sidebarText: {
    fontSize: "13px",
    color: "#4A6A8A",
    textAlign: "center",
    margin: "0",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    color: "#4A6A8A",
    fontSize: "16px",
  },
  noResults: {
    textAlign: "center",
    padding: "40px",
    color: "#4A6A8A",
    fontSize: "16px",
    backgroundColor: "white",
    borderRadius: "10px",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "30px",
    padding: "20px",
  },
  paginationButton: {
    padding: "10px 20px",
    backgroundColor: "#F4F7F9",
    border: `1px solid #4A6A8A`,
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  pageInfo: {
    color: "#4A6A8A",
    fontSize: "14px",
  },
  bottomActions: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginTop: "30px",
    flexWrap: "wrap",
  },
  resetButton: {
    padding: "12px 25px",
    backgroundColor: "#F4F7F9",
    border: `1px solid #4A6A8A`,
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  postButton: {
    padding: "12px 25px",
    backgroundColor: "#00A79D",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  searchButtonAlt: {
    padding: "12px 25px",
    backgroundColor: "#22D3EE",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  lawsButton: {
    padding: "12px 25px",
    backgroundColor: "#4A6A8A",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  floatingButton: {
    position: "fixed",
    bottom: "30px",
    right: "30px",
    padding: "15px 25px",
    backgroundColor: "#003366",
    color: "white",
    border: "none",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: "1000",
  },
  loadMoreSection: {
    textAlign: "center",
    marginTop: "40px",
  },
  loadMoreButton: {
    padding: "12px 30px",
    backgroundColor: "#F4F7F9",
    border: `2px solid #00A79D`,
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#00A79D",
    fontWeight: "600",
    marginBottom: "20px",
  },
  promoBanner: {
    backgroundColor: "#E8F4F8",
    padding: "20px",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#003366",
  },
};

export default FlatmatesListings;
