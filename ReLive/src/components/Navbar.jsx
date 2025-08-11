import React, { useEffect, useState } from 'react';
import "./Navbar.css";

function Navbar() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(window.scrollY);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShow(false); // Hide on scroll down
      } else {
        setShow(true); // Show on scroll up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav className={`navbar ${show ? 'show' : 'hide'}`}>
      <div className="navbar-wrapper">
        <div className="navbar-brand">
          <a href="/">
            <img src="/logo.png" alt="ReLive Logo" className="navbar-logo" />
          </a>
        </div>

        <div className="navbar-right">
          <div className="navbar-links">
            <a href="/home">Home</a>
            <a href="/memories">Memories</a>
            <a href="/aboutUs">About Us</a>
            <a href="/contactUs">Contact Us</a>
          </div>
          <div className="navbar-cta">
            <a href="/auth" className="get-started-btn">Get Started</a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
