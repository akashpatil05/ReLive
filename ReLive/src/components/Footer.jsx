import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="relive-footer">
      <div className="footer-container">
        {/* Left: Logo + description + contact */}
        <div className="footer-left">
          <img src="/logo.png" alt="ReLive Logo" className="footer-logo" />
          <p className="footer-desc">
            ReLive helps individuals with Alzheimer’s relive their most cherished memories through personalized audio, photos, and interactive storytelling.
          </p>

          <div className="footer-contact">
            <div className="contact-item">
              <img src="/icons/mail.png" alt="Mail" className="icon" />
              <span>support@relive.app</span>
            </div>
            <div className="contact-item">
              <img src="/icons/phone.png" alt="Phone" className="icon" />
              <span>+91 98765 43210</span>
            </div>
            <div className="contact-item">
              <img src="/icons/location.png" alt="Location" className="icon" />
              <span>Pune, Maharashtra, India</span>
            </div>
          </div>
        </div>

        {/* Right: Company + Resources */}
        <div className="footer-right">
          <div className="footer-column">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Contact Us</a>
            <a href="#">Features</a>
            <a href="#">Services</a>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">FAQ</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms & Conditions</a>
          </div>
        </div>
      </div>

      <div className="footer-divider"></div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} ReLive. All rights reserved.</p>
      </div>
    </footer>
  );
}
