import React, { useState, useMemo } from "react";
import "./Memories.css";
import { 
  FaBars, 
  FaUserFriends, 
  FaTags, 
  FaCog, 
  FaPlus, 
  FaStickyNote, 
  FaSearch,
  FaHeart,
  FaGamepad,
  FaShareAlt,
  FaCalendarAlt,
  FaMapMarkerAlt
} from "react-icons/fa";
import { MdOutlinePhotoAlbum, MdFilterList } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";

const Memories = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All Dates");
  const [selectedPeopleFilter, setSelectedPeopleFilter] = useState("All People");
  const [selectedEventFilter, setSelectedEventFilter] = useState("All Events");
  const [selectedTag, setSelectedTag] = useState(null);
  const [likedMemories, setLikedMemories] = useState(new Set());

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Sidebar options with paths
  const sidebarOptions = [
    { icon: <MdOutlinePhotoAlbum />, label: "All Memories", path: "/memories", active: true },
    { icon: <FaPlus />, label: "Add Memory", path: "/memories/add" },
    { icon: <FaUserFriends />, label: "Family", path: "/memories/family" },
    { icon: <FaTags />, label: "Tags", path: "/memories/tags" },
    { icon: <FaGamepad />, label: "Games", path: "/dashboard/games" },
  ];

  const tagColors = {
    Family: "#5B8DEF",
    Vacation: "#34C759",
    Holiday: "#FF9500",
    Anniversary: "#AF52DE",
    Birthday: "#FF3B30",
    Travel: "#00C7BE",
    Work: "#8E8E93",
    Friends: "#FF2D92"
  };

  const memories = [
    {
      id: 1,
      title: "Mom's 75th Birthday",
      date: "March 15, 2024",
      tag: "Family",
      people: ["Mom", "Dad", "Sarah"],
      location: "Home",
      image: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=400&h=300&fit=crop&crop=center",
      description: "A wonderful celebration with the whole family"
    },
    {
      id: 2,
      title: "Beach Vacation",
      date: "February 28, 2024",
      tag: "Vacation",
      people: ["Sarah", "John"],
      location: "Malibu",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&crop=center",
      description: "Perfect sunny day at the beach"
    },
    {
      id: 3,
      title: "Christmas Morning",
      date: "December 25, 2023",
      tag: "Holiday",
      people: ["Family"],
      location: "Home",
      image: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=300&fit=crop&crop=center",
      description: "Magical Christmas morning with loved ones"
    },
    {
      id: 4,
      title: "50th Anniversary",
      date: "November 12, 2023",
      tag: "Anniversary",
      people: ["Grandparents", "Family"],
      location: "Restaurant",
      image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=300&fit=crop&crop=center",
      description: "Celebrating 50 years of love"
    },
    {
      id: 5,
      title: "College Graduation",
      date: "May 20, 2023",
      tag: "Birthday",
      people: ["Sarah", "Friends"],
      location: "University",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop&crop=center",
      description: "Finally graduated! So proud of this moment"
    },
    {
      id: 6,
      title: "Paris Trip",
      date: "August 10, 2023",
      tag: "Travel",
      people: ["Sarah", "Best Friend"],
      location: "Paris, France",
      image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop&crop=center",
      description: "Amazing adventure in the city of lights"
    }
  ];

  const toggleLike = (memoryId) => {
    const newLikedMemories = new Set(likedMemories);
    if (newLikedMemories.has(memoryId)) {
      newLikedMemories.delete(memoryId);
    } else {
      newLikedMemories.add(memoryId);
    }
    setLikedMemories(newLikedMemories);
  };

  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
      const matchesSearch = memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          memory.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = selectedTag ? memory.tag === selectedTag : true;
      
      const matchesDateFilter = selectedDateFilter === "All Dates" || 
                               (selectedDateFilter === "2024" && memory.date.includes("2024")) ||
                               (selectedDateFilter === "2023" && memory.date.includes("2023"));
      
      const matchesPeopleFilter = selectedPeopleFilter === "All People" ||
                                memory.people.some(person => person.toLowerCase().includes(selectedPeopleFilter.toLowerCase()));
      
      const matchesEventFilter = selectedEventFilter === "All Events" ||
                               memory.tag === selectedEventFilter;
      
      return matchesSearch && matchesTag && matchesDateFilter && matchesPeopleFilter && matchesEventFilter;
    });
  }, [memories, searchQuery, selectedTag, selectedDateFilter, selectedPeopleFilter, selectedEventFilter]);

  const uniqueTags = [...new Set(memories.map(memory => memory.tag))];

  return (
    <div className="memories-container">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <button className="collapse-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
        {sidebarOptions.map((item, index) => (
          <Link 
            to={item.path} 
            key={index} 
            className={`sidebar-item ${item.active ? 'active' : ''}`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
        
        {!collapsed && (
          <div className="tags-section">
            <h4>Quick Filters</h4>
            <div className="tag-filters">
              <button 
                className={`tag-filter ${selectedTag === null ? 'active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {uniqueTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter ${selectedTag === tag ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: selectedTag === tag ? tagColors[tag] : 'transparent',
                    borderColor: tagColors[tag],
                    color: selectedTag === tag ? 'white' : tagColors[tag]
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
          <Link to="/settings" className="sidebar-item">
            <FaCog />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      <main className="memories-main">
        <div className="memories-header">
          <div className="user-info">
            <img
              src="https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=60&h=60&fit=crop&crop=face"
              alt="Profile"
              className="profile-pic"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/60x60/667eea/white?text=S";
              }}
            />
            <div>
              <h2>Welcome back, Sarah!</h2>
              <p>You have {memories.length} beautiful memories saved</p>
            </div>
          </div>
          <button className="add-memory-btn">
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
          </div>
          <select 
            value={selectedDateFilter} 
            onChange={(e) => setSelectedDateFilter(e.target.value)}
          >
            <option>All Dates</option>
            <option>2024</option>
            <option>2023</option>
          </select>
          <select 
            value={selectedPeopleFilter} 
            onChange={(e) => setSelectedPeopleFilter(e.target.value)}
          >
            <option>All People</option>
            <option>Family</option>
            <option>Friends</option>
            <option>Sarah</option>
          </select>
          <select 
            value={selectedEventFilter} 
            onChange={(e) => setSelectedEventFilter(e.target.value)}
          >
            <option>All Events</option>
            {uniqueTags.map(tag => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="results-header">
          <h3>
            {filteredMemories.length === memories.length 
              ? `All Memories (${memories.length})`
              : `Found ${filteredMemories.length} memories`
            }
          </h3>
          <button className="filter-toggle">
            <MdFilterList /> Filters
          </button>
        </div>

        <div className="memories-grid">
          {filteredMemories.map((memory) => (
            <div className="memory-card" key={memory.id}>
              <div className="memory-image-container">
                <img 
                  src={memory.image} 
                  alt={memory.title}
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/400x300/667eea/white?text=${encodeURIComponent(memory.title.substring(0, 10))}`;
                  }}
                />
                <button 
                  className={`like-btn ${likedMemories.has(memory.id) ? 'liked' : ''}`}
                  onClick={() => toggleLike(memory.id)}
                >
                  <FaHeart />
                </button>
              </div>
              
              <div className="memory-content">
                <h3>{memory.title}</h3>
                <p className="memory-description">{memory.description}</p>
                
                <div className="memory-meta">
                  <div className="memory-date">
                    <FaCalendarAlt />
                    <span>{memory.date}</span>
                  </div>
                  <div className="memory-location">
                    <FaMapMarkerAlt />
                    <span>{memory.location}</span>
                  </div>
                </div>

                <div className="memory-footer">
                  <span
                    className="tag"
                    style={{ backgroundColor: tagColors[memory.tag] }}
                  >
                    {memory.tag}
                  </span>
                  
                  <div className="memory-actions">
                    <button className="action-btn">
                      <FaShareAlt />
                    </button>
                    <button className="action-btn">
                      <FaStickyNote />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMemories.length === 0 && (
          <div className="no-results">
            <h3>No memories found</h3>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Memories;
