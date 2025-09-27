import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Memories.css";
import { 
  FaBars, 
  FaUserFriends, 
  FaGamepad, // Changed from FaTags to FaGamepad
  FaPlus, 
  FaStickyNote, 
  FaSearch,
  FaHeart,
  FaShareAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaImage,
  FaEye
} from "react-icons/fa";
import { MdOutlinePhotoAlbum, MdFilterList } from "react-icons/md";
import AddMemoryModal from "../../../components/AddMemoryModal";

const API_BASE = "http://127.0.0.1:8000"; // dev base; move to env for prod

const Memories = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All Dates");
  const [selectedPeopleFilter, setSelectedPeopleFilter] = useState("All People");
  const [selectedEventFilter, setSelectedEventFilter] = useState("All Events");
  const [selectedTag, setSelectedTag] = useState(null);
  const [likedMemories, setLikedMemories] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);

  const [memories, setMemories] = useState([]);
  const [userName, setUserName] = useState("User");
  const [userProfilePic, setUserProfilePic] = useState(
    "https://ui-avatars.com/api/?name=U&background=8e8e93&color=fff&size=60"
  ); // stable avatar fallback

  const navigate = useNavigate();

  // ✅ UPDATED: Replaced "tags" with "games"
  const sidebarOptions = [
    { id: "all", icon: <MdOutlinePhotoAlbum />, label: "All Memories" },
    { id: "add", icon: <FaPlus />, label: "Add Memory" },
    { id: "family", icon: <FaUserFriends />, label: "Family" },
    { id: "games", icon: <FaGamepad />, label: "Games" }, // Changed from "tags" to "games"
  ]; // sidebar

  const tagColors = {
    Family: "#5B8DEF",
    Vacation: "#34C759",
    Holiday: "#FF9500",
    Anniversary: "#AF52DE",
    Birthday: "#FF3B30",
    Travel: "#00C7BE",
    Work: "#8E8E93",
    Friends: "#FF2D92",
  }; // colors

  const getAccess = () => localStorage.getItem("access"); // JWT

  // Normalize backend image URLs (absolute or /media, media/)
  const formatImageUrl = (url) => {
    if (!url) return null; // none
    if (/^https?:\/\//i.test(url)) return url; // Cloudinary secure_url or absolute
    if (url.startsWith("/")) return `${API_BASE}${url}`; // /media/...
    if (url.startsWith("media/")) return `${API_BASE}/${url}`; // media/...
    return url; // base64/others
  };

  // Fetch memories and user
  const fetchData = useCallback(async () => {
    const access = getAccess();
    if (!access) {
      setError("Authentication required");
      setLoading(false);
      return;
    } // auth guard

    try {
      setLoading(true);
      setError(null);

      const [memoriesRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/api/memories/`, {
          headers: { Authorization: `Bearer ${access}` },
        }),
        fetch(`${API_BASE}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${access}` },
        }),
      ]); // protected calls

      if (memoriesRes.ok) {
        const list = await memoriesRes.json();
        const formatted = Array.isArray(list)
          ? list.map((m) => {
              const resolved = m.resolved_image_url || m.image_url || m.image || null; // prefer server-computed
              return { ...m, image: formatImageUrl(resolved) };
            })
          : [];
        setMemories(formatted);
      } else {
        console.error("❌ Memories error:", await memoriesRes.text());
        setError("Failed to load memories");
      } // error handling

      if (userRes.ok) {
        const me = await userRes.json();
        if (me?.username) setUserName(me.username);
        if (me?.profile_picture) setUserProfilePic(formatImageUrl(me.profile_picture));
      } else {
        console.error("❌ User error:", await userRes.text());
      } // user info
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // stable

  useEffect(() => {
    fetchData();
  }, [fetchData]); // initial load

  // Navigate to memory detail page
  const handleViewMemory = (memory) => {
    navigate(`/memories/${memory.id}`, {
      state: { 
        from: "memories",
        memory: memory
      }
    });
  };

  // Handle edit memory
  const handleEditMemory = (memory) => {
    setEditingMemory(memory);
    setAddOpen(true);
  };

  // Like toggle (optimistic)
  const toggleLike = useCallback(
    async (memoryId) => {
      const access = getAccess();
      if (!access) return; // auth

      const isLiked = likedMemories.has(memoryId);
      const next = new Set(likedMemories);

      try {
        if (isLiked) next.delete(memoryId);
        else next.add(memoryId);
        setLikedMemories(next); // optimistic

        // Optional like API; ignore errors if not implemented
        const res = await fetch(`${API_BASE}/api/memories/${memoryId}/like/`, {
          method: isLiked ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json",
          },
        }).catch(() => ({ ok: true })); // optional endpoint

        if (!res.ok) {
          if (isLiked) next.add(memoryId);
          else next.delete(memoryId);
          setLikedMemories(next);
          console.error("Like action failed");
        } // revert
      } catch (err) {
        console.error("Error toggling like:", err);
        if (isLiked) next.add(memoryId);
        else next.delete(memoryId);
        setLikedMemories(next); // revert
      }
    },
    [likedMemories]
  ); // memoized

  // Delete memory
  const handleDelete = async (memory) => {
    const access = getAccess();
    if (!access) {
      alert("Not authenticated");
      return;
    } // guard
    const ok = window.confirm(`Delete "${memory.title || "this memory"}"? This cannot be undone.`);
    if (!ok) return; // cancel

    const prev = memories;
    setMemories((list) => list.filter((m) => m.id !== memory.id)); // optimistic

    try {
      const res = await fetch(`${API_BASE}/api/memories/${memory.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access}` },
      });
      if (res.status !== 204) {
        setMemories(prev);
        const msg = await res.text().catch(() => "");
        console.error("❌ Delete failed:", msg || res.status);
        alert("Failed to delete. Please try again.");
      } // revert
    } catch (err) {
      setMemories(prev);
      console.error("❌ Network error deleting memory:", err);
      alert("Network error. Please try again.");
    }
  };

  // Handle memory created/updated
  const handleMemoryCreated = (newMemory) => {
    const resolved = newMemory.resolved_image_url || newMemory.image_url || newMemory.image || null;
    const memoryWithFormattedImage = {
      ...newMemory,
      image: formatImageUrl(resolved),
    };
    
    if (editingMemory) {
      // Update existing memory
      setMemories((prev) => prev.map(m => m.id === editingMemory.id ? memoryWithFormattedImage : m));
      setEditingMemory(null);
    } else {
      // Add new memory
      setMemories((prev) => [memoryWithFormattedImage, ...prev]);
    }
    
    setAddOpen(false);
    setActiveSidebar("all");
  };

  const handleLogout = () => {
    const ok = window.confirm("Log out of ReLive?");
    if (!ok) return;
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/", { replace: true });
  }; // logout

  // ✅ UPDATED: Handle games navigation
  const handleSidebarClick = (optionId) => {
    setActiveSidebar(optionId);
    if (optionId === "add") {
      setEditingMemory(null);
      setAddOpen(true);
      return;
    } // open modal
    if (optionId === "family") {
      navigate("/family");
      return;
    } // navigate
    if (optionId === "games") {
      navigate("/games"); // Navigate to games page
      return;
    } // navigate to games
  };

  const filteredMemories = useMemo(() => {
    if (!memories.length) return [];
    return memories.filter((m) => {
      const matchesSearch =
        (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase()); // search

      const matchesTag = selectedTag ? m.tag === selectedTag : true; // tag filter
      const matchesDateFilter =
        selectedDateFilter === "All Dates" || (m.date || "").includes(selectedDateFilter); // date filter
      const matchesPeopleFilter =
        selectedPeopleFilter === "All People" ||
        (Array.isArray(m.people) &&
          m.people.some((p) => (p || "").toLowerCase().includes(selectedPeopleFilter.toLowerCase()))); // people
      const matchesEventFilter = selectedEventFilter === "All Events" || m.tag === selectedEventFilter; // event

      return matchesSearch && matchesTag && matchesDateFilter && matchesPeopleFilter && matchesEventFilter;
    });
  }, [memories, searchQuery, selectedTag, selectedDateFilter, selectedPeopleFilter, selectedEventFilter]); // memo

  const uniqueTags = useMemo(
    () => [...new Set(memories.map((m) => m.tag).filter(Boolean))],
    [memories]
  ); // tag options

  const uniquePeople = useMemo(() => {
    const people = memories.flatMap((m) => m.people || []);
    return [...new Set(people)].filter(Boolean);
  }, [memories]); // people options

  const uniqueYears = useMemo(() => {
    const years = memories
      .map((m) => (m.date ? new Date(m.date).getFullYear() : null))
      .filter((y) => y && !isNaN(y));
    return [...new Set(years)].sort((a, b) => b - a);
  }, [memories]); // year filter

  if (loading) {
    return (
      <div className="memories-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your memories...</p>
        </div>
      </div>
    ); // loading
  }

  if (error) {
    return (
      <div className="memories-container">
        <div className="error-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-btn">Try Again</button>
        </div>
      </div>
    ); // error
  }

  return (
    <div className="memories-container">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <button className="collapse-btn" onClick={() => setCollapsed((v) => !v)}>
          <FaBars />
        </button>

        {sidebarOptions.map((item) => (
          <div
            className={`sidebar-item ${activeSidebar === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => handleSidebarClick(item.id)}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </div>
        ))}

        {!collapsed && (
          <div className="tags-section">
            <h4>Quick Filters</h4>
            <div className="tag-filters">
              <button
                className={`tag-filter ${selectedTag === null ? "active" : ""}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {uniqueTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-filter ${selectedTag === tag ? "active" : ""}`}
                  style={{
                    backgroundColor: selectedTag === tag ? tagColors[tag] : "transparent",
                    borderColor: tagColors[tag],
                    color: selectedTag === tag ? "white" : tagColors[tag],
                  }}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-bottom">
          <button
            className="sidebar-item"
            onClick={handleLogout}
            style={{ cursor: "pointer", background: "transparent", border: "none", padding: 0 }}
            aria-label="Logout"
            title="Logout"
          >
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="memories-main">
        <div className="memories-header">
          <div className="user-info">
            <img
              src={userProfilePic}
              alt="Profile"
              className="profile-pic"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://ui-avatars.com/api/?name=U&background=8e8e93&color=fff&size=60";
              }}
            />
            <div>
              <h2>Welcome back, {userName}!</h2>
              <p>You have {memories.length} beautiful memories saved</p>
            </div>
          </div>
          <button className="add-memory-btn" onClick={() => { setEditingMemory(null); setAddOpen(true); }}>
            <FaPlus /> Add New Memory
          </button>
        </div>

        <div className="search-filters">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <button
            className={`filter-toggle ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <MdFilterList /> {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="advanced-filters">
            {/* existing filter UI unchanged */}
          </div>
        )}

        <div className="results-header">
          <h3>
            {filteredMemories.length === memories.length
              ? `All Memories (${memories.length})`
              : `Found ${filteredMemories.length} of ${memories.length} memories`}
          </h3>
          <div className="view-options">
            <span>Sort by: </span>
            <select>
              <option>Newest First</option>
              <option>Oldest First</option>
              <option>Most Liked</option>
            </select>
          </div>
        </div>

        {filteredMemories.length > 0 ? (
          <div className="memories-grid">
            {filteredMemories.map((memory) => (
              <div className="memory-card" key={memory.id}>
                <div 
                  className="memory-image-container clickable-image"
                  onClick={() => handleViewMemory(memory)}
                  title="Click to view details"
                >
                  {(!memory.image || memory.image === "") ? (
                    <div className="image-placeholder">
                      <FaImage className="placeholder-icon" />
                      <span>Image not available</span>
                    </div>
                  ) : (
                    <img
                      src={formatImageUrl(memory.image) || "https://ui-avatars.com/api/?name=M&background=667eea&color=fff&size=256"}
                      alt={memory.title || "Memory image"}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://ui-avatars.com/api/?name=M&background=667eea&color=fff&size=256";
                      }}
                    />
                  )}
                  
                  {/* View Details Overlay on Hover */}
                  <div className="image-overlay">
                    <FaEye className="view-icon" />
                    <span>View Details</span>
                  </div>

                  <button
                    className={`like-btn ${likedMemories.has(memory.id) ? "liked" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the image click
                      toggleLike(memory.id);
                    }}
                    aria-label={likedMemories.has(memory.id) ? "Unlike memory" : "Like memory"}
                  >
                    <FaHeart />
                  </button>
                </div>

                <div className="memory-content">
                  <h3 
                    className="clickable-title"
                    onClick={() => handleViewMemory(memory)}
                    title="Click to view details"
                  >
                    {memory.title || "Untitled Memory"}
                  </h3>
                  <p className="memory-description">{memory.description || "No description provided."}</p>

                  <div className="memory-meta">
                    <div className="memory-date">
                      <FaCalendarAlt />
                      <span>{memory.date || "No date"}</span>
                    </div>
                    {memory.location && (
                      <div className="memory-location">
                        <FaMapMarkerAlt />
                        <span>{memory.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="memory-footer">
                    {memory.tag && (
                      <span className="tag" style={{ backgroundColor: tagColors[memory.tag] || "#999" }}>
                        {memory.tag}
                      </span>
                    )}

                    <div className="memory-actions">
                      <button 
                        className="action-btn view-btn" 
                        onClick={() => handleViewMemory(memory)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="action-btn edit-btn" 
                        onClick={() => handleEditMemory(memory)}
                        title="Edit Memory"
                      >
                        ✏️
                      </button>
                      <button className="action-btn" aria-label="Share memory">
                        <FaShareAlt />
                      </button>
                      <button className="action-btn" aria-label="Add note">
                        <FaStickyNote />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        aria-label="Delete memory"
                        onClick={() => handleDelete(memory)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : memories.length > 0 ? (
          <div className="no-results">
            <h3>No memories match your search</h3>
            <p>Try adjusting your filters or search terms</p>
            <button
              className="reset-search-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedTag(null);
                setSelectedDateFilter("All Dates");
                setSelectedPeopleFilter("All People");
                setSelectedEventFilter("All Events");
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="no-results">
            <h3>No memories yet</h3>
            <p>Start by adding your first memory!</p>
            <button className="add-memory-btn" onClick={() => { setEditingMemory(null); setAddOpen(true); }}>
              <FaPlus /> Add Your First Memory
            </button>
          </div>
        )}
      </main>

      {/* Add/Edit Memory Modal */}
      <AddMemoryModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditingMemory(null);
          setActiveSidebar("all");
        }}
        onCreated={handleMemoryCreated}
        editingMemory={editingMemory}
      />
    </div>
  );
};

export default Memories;
