import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaBars, 
  FaUserFriends, 
  FaGamepad, 
  FaPlus, 
  FaSignOutAlt,
  FaTimes 
} from "react-icons/fa";
import { MdOutlinePhotoAlbum } from "react-icons/md";
import "./Navbar.css"; // Import the specific CSS for Navbar

const Navbar = ({ 
  activePage, 
  collapsed, 
  setCollapsed, 
  mobileMenuOpen, 
  setMobileMenuOpen,
  onAddClick 
}) => {
  const navigate = useNavigate();

  const sidebarOptions = [
    { id: "all", icon: <MdOutlinePhotoAlbum />, label: "All Memories", path: "/memories" },
    { id: "add", icon: <FaPlus />, label: "Add Memory", action: "add" },
    { id: "family", icon: <FaUserFriends />, label: "Family", path: "/family" },
    { id: "games", icon: <FaGamepad />, label: "Games", path: "/games" },
  ];

  const handleLogout = () => {
    setMobileMenuOpen(false);
    const ok = window.confirm("Log out of ReLive?");
    if (!ok) return;
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/", { replace: true });
  };

  const handleItemClick = (item) => {
    setMobileMenuOpen(false); // Close drawer on click (mobile)

    if (item.action === "add") {
      if (onAddClick) onAddClick();
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-overlay-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        
        {/* Toggle Button: Shows 'X' if mobile menu is open, otherwise Hamburger */}
        <button 
          className="collapse-btn" 
          onClick={() => {
            if (window.innerWidth <= 768) {
              setMobileMenuOpen(false); // Close on mobile
            } else {
              setCollapsed((v) => !v); // Toggle collapse on desktop
            }
          }}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Menu Items */}
        {sidebarOptions.map((item) => (
          <div
            className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => handleItemClick(item)}
          >
            {item.icon}
            {/* Show text if: 1. Mobile menu is OPEN OR 2. Desktop is NOT collapsed */}
            {(mobileMenuOpen || !collapsed) && <span>{item.label}</span>}
          </div>
        ))}

        {/* Footer / Logout */}
        <div className="sidebar-bottom">
          <button
            className="sidebar-item"
            onClick={handleLogout}
            style={{ cursor: "pointer", background: "transparent", border: "none", padding: 0 }}
            aria-label="Logout"
            title="Logout"
          >
            <FaSignOutAlt />
            {(mobileMenuOpen || !collapsed) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Trigger Button (Sticky Hamburger) - Only visible when menu is CLOSED */}
      {!mobileMenuOpen && (
        <button 
          className="mobile-menu-trigger" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open Menu"
        >
          <FaBars />
        </button>
      )}
    </>
  );
};

export default Navbar;
