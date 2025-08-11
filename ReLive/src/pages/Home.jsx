import React, { useState, useEffect } from "react";
import "./Home.css";

const Home = () => {
  const [quote, setQuote] = useState("");
  
  const quotes = [
    "Memories are timeless treasures of the heart.",
    "The heart never forgets, even when the mind does.",
    "Every moment matters, cherish it.",
    "Love leaves a memory no one can steal."
  ];

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="home-hero animate-fadeIn">
        <div className="hero-text">
          <h1>Welcome to <span className="brand">ReLive</span></h1>
          <p>Preserve, cherish, and relive precious moments.</p>
          <div className="hero-buttons">
            <button className="primary-btn ripple">View Memories</button>
            <button className="secondary-btn ripple">Add Memory</button>
          </div>
        </div>
        <div className="hero-image floating">
          <img
            src="https://cdn-icons-png.flaticon.com/512/194/194938.png"
            alt="Family Illustration"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          {[
            { img: "https://cdn-icons-png.flaticon.com/512/747/747376.png", label: "All Memories" },
            { img: "https://cdn-icons-png.flaticon.com/512/992/992651.png", label: "Family" },
            { img: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png", label: "Tags" },
            { img: "https://cdn-icons-png.flaticon.com/512/126/126472.png", label: "Settings" }
          ].map((action, i) => (
            <div className="action-card pop" key={i}>
              <img src={action.img} alt={action.label} />
              <p>{action.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Quote */}
      <section className="daily-quote animate-fadeIn">
        <blockquote>“{quote}”</blockquote>
      </section>

      {/* Upcoming Events */}
      <section className="upcoming-events slide-up">
        <h2>Upcoming Events</h2>
        <ul>
          <li><span>12 Aug 2025</span> – Grandma's Birthday 🎂</li>
          <li><span>20 Aug 2025</span> – Family Picnic 🏞</li>
          <li><span>05 Sep 2025</span> – Anniversary 💐</li>
        </ul>
      </section>

      {/* Family Activity Feed */}
      <section className="family-feed slide-up">
        <h2>Family Activity</h2>
        <div className="feed-list">
          <div className="feed-item">
            <img src="https://placekitten.com/50/50" alt="User" />
            <p><strong>Anna</strong> added a new memory “Summer at the Lake”.</p>
          </div>
          <div className="feed-item">
            <img src="https://placekitten.com/51/50" alt="User" />
            <p><strong>John</strong> tagged you in “Picnic 2024”.</p>
          </div>
        </div>
      </section>

      {/* Recent Memories */}
      <section className="recent-memories fade-in">
        <h2>Recent Memories</h2>
        <div className="memory-grid">
          {[1, 2, 3].map((n) => (
            <div className="memory-card lift" key={n}>
              <img src={`https://placekitten.com/30${n}/200`} alt="Memory" />
              <div className="memory-info">
                <h3>Memory {n}</h3>
                <span>July {n * 3}, 2025</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
