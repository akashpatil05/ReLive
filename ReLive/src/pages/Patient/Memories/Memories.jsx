import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Memories.css"; // Page-specific styles
import Navbar from "../Navbar/Navbar"; // ✅ Import reusable Navbar

import { 
  FaSearch,
  FaShareAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaStickyNote,
  FaPlus,
  FaImage,
  FaEye
} from "react-icons/fa";
import { MdFilterList } from "react-icons/md";
import AddMemoryModal from "../../../components/AddMemoryModal";

const API_BASE = "http://127.0.0.1:8000"; 

const Memories = () => {
  // ✅ Shared State for Navbar
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All Dates");
  const [selectedTag, setSelectedTag] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);

  const [memories, setMemories] = useState([]);
  const [userName, setUserName] = useState("User");
  const [userProfilePic, setUserProfilePic] = useState(
    "https://ui-avatars.com/api/?name=User&background=8e8e93&color=fff&size=60"
  ); 

  const navigate = useNavigate();

  const tagColors = {
    Family: "#5B8DEF", Vacation: "#34C759", Holiday: "#FF9500",
    Anniversary: "#AF52DE", Birthday: "#FF3B30", Travel: "#00C7BE",
    Work: "#8E8E93", Friends: "#FF2D92",
  }; 

  const getAccess = () => localStorage.getItem("access"); 

  const formatImageUrl = (url) => {
    if (!url) return null; 
    if (/^https?:\/\//i.test(url)) return url; 
    if (url.startsWith("/")) return `${API_BASE}${url}`; 
    if (url.startsWith("media/")) return `${API_BASE}/${url}`; 
    return url; 
  };

  const fetchData = useCallback(async () => {
    const access = getAccess();
    if (!access) { setError("Authentication required"); setLoading(false); return; } 

    try {
      setLoading(true);
      const [memoriesRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/api/memories/`, { headers: { Authorization: `Bearer ${access}` } }),
        fetch(`${API_BASE}/api/auth/me/`, { headers: { Authorization: `Bearer ${access}` } }),
      ]); 

      if (memoriesRes.ok) {
        const list = await memoriesRes.json();
        const formatted = Array.isArray(list) ? list.map((m) => ({ 
          ...m, image: formatImageUrl(m.resolved_image_url || m.image_url || m.image) 
        })) : [];
        setMemories(formatted);
      } else { setError("Failed to load memories"); } 

      if (userRes.ok) {
        const me = await userRes.json();
        const nameToUse = me?.username || "User";
        setUserName(nameToUse);
        if (me?.profile_picture) setUserProfilePic(formatImageUrl(me.profile_picture));
        else setUserProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=8e8e93&color=fff&size=60`);
      } 
    } catch (err) { setError("Network error."); } finally { setLoading(false); }
  }, []); 

  useEffect(() => { fetchData(); }, [fetchData]); 

  const handleViewMemory = (memory) => navigate(`/memories/${memory.id}`, { state: { from: "memories", memory } });
  const handleEditMemory = (memory) => { setEditingMemory(memory); setAddOpen(true); };

  const handleDelete = async (memory) => {
    const access = getAccess();
    if (!access) return;
    if (!window.confirm(`Delete "${memory.title || "this memory"}"?`)) return;
    setMemories((list) => list.filter((m) => m.id !== memory.id)); 
    try {
      await fetch(`${API_BASE}/api/memories/${memory.id}/`, {
        method: "DELETE", headers: { Authorization: `Bearer ${access}` },
      });
    } catch (err) { alert("Network error."); }
  };

  const handleMemoryCreated = (newMemory) => {
    const formatted = { ...newMemory, image: formatImageUrl(newMemory.image || newMemory.resolved_image_url) };
    if (editingMemory) setMemories((prev) => prev.map(m => m.id === editingMemory.id ? formatted : m));
    else setMemories((prev) => [formatted, ...prev]);
    setAddOpen(false);
  };

  const filteredMemories = useMemo(() => {
    if (!memories.length) return [];
    return memories.filter((m) => {
      const matchesSearch = (m.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag ? m.tag === selectedTag : true; 
      const matchesDate = selectedDateFilter === "All Dates" || (m.date || "").includes(selectedDateFilter); 
      return matchesSearch && matchesTag && matchesDate;
    });
  }, [memories, searchQuery, selectedTag, selectedDateFilter]); 

  const uniqueTags = useMemo(() => [...new Set(memories.map((m) => m.tag).filter(Boolean))], [memories]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading...</p></div>;
  if (error) return <div className="error-state"><p>{error}</p><button onClick={fetchData} className="retry-btn">Retry</button></div>;

  return (
    <div className="memories-container">
      
      {/* ✅ Use Navbar Component */}
      <Navbar 
        activePage="all" 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onAddClick={() => { setEditingMemory(null); setAddOpen(true); }}
      />

      <main className="memories-main">
        <div className="memories-header">
          <div className="user-info">
            <img src={userProfilePic} alt="Profile" className="profile-pic" onError={(e) => {e.currentTarget.onerror=null; e.currentTarget.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=8e8e93&color=fff&size=60`}} />
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
            <input type="text" placeholder="Search memories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="clear-search" onClick={() => setSearchQuery("")}>×</button>}
          </div>

           <div className="quick-tags-inline">
              <button className={`tag-filter ${selectedTag === null ? 'active' : ''}`} onClick={() => setSelectedTag(null)}>All</button>
              {uniqueTags.map(tag => (
                <button key={tag} className={`tag-filter ${selectedTag === tag ? 'active' : ''}`} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}>{tag}</button>
              ))}
           </div>

          <button className={`filter-toggle ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}>
            <MdFilterList /> {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <div className="results-header">
          <h3>{filteredMemories.length} Memories</h3>
          <div className="view-options">
            <select><option>Newest First</option><option>Oldest First</option></select>
          </div>
        </div>

        {filteredMemories.length > 0 ? (
          <div className="memories-grid">
            {filteredMemories.map((memory) => (
              <div className="memory-card" key={memory.id}>
                <div className="memory-image-container clickable-image" onClick={() => handleViewMemory(memory)}>
                  {(!memory.image) ? (
                    <div className="image-placeholder"><FaImage className="placeholder-icon" /><span>No Image</span></div>
                  ) : (
                    <img src={formatImageUrl(memory.image)} alt={memory.title} loading="lazy" />
                  )}
                  <div className="image-overlay"><FaEye className="view-icon" /><span>View</span></div>
                </div>
                <div className="memory-content">
                  <h3 className="clickable-title" onClick={() => handleViewMemory(memory)}>{memory.title || "Untitled"}</h3>
                  <p className="memory-description">{memory.description}</p>
                  <div className="memory-meta">
                    <div className="memory-date"><FaCalendarAlt /><span>{memory.date}</span></div>
                    {memory.location && <div className="memory-location"><FaMapMarkerAlt /><span>{memory.location}</span></div>}
                  </div>
                  <div className="memory-footer">
                    {memory.tag && <span className="tag" style={{ backgroundColor: tagColors[memory.tag] || "#999" }}>{memory.tag}</span>}
                    <div className="memory-actions">
                      <button className="action-btn view-btn" onClick={() => handleViewMemory(memory)}><FaEye /></button>
                      <button className="action-btn edit-btn" onClick={() => handleEditMemory(memory)}>✏️</button>
                      <button className="action-btn" aria-label="Share"><FaShareAlt /></button>
                      <button className="action-btn" aria-label="Note"><FaStickyNote /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(memory)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results"><h3>No memories found</h3></div>
        )}
      </main>

      <AddMemoryModal open={addOpen} onClose={() => { setAddOpen(false); setEditingMemory(null); }} onCreated={handleMemoryCreated} editingMemory={editingMemory} />
    </div>
  );
};

export default Memories;
