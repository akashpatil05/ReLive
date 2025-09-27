import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  const testimonials = [
    {
      quote: `"I just migrated from Calendly to Cal.com"`,
      img: "https://i.pravatar.cc/40?img=1",
      name: "Kent C. Dodds",
      role: "Founder of EpicWeb.dev",
    },
    {
      quote: `"Cal.com just makes sense for our remote team."`,
      img: "https://i.pravatar.cc/40?img=2",
      name: "Ant Wilson",
      role: "CTO, Supabase",
    },
    {
      quote: `"This is the easiest way I’ve ever scheduled meetings!"`,
      img: "https://i.pravatar.cc/40?img=3",
      name: "Jane Doe",
      role: "Product Manager",
    },
    {
      quote: `"Cal.com fits seamlessly into our team’s workflow."`,
      img: "https://i.pravatar.cc/40?img=4",
      name: "Michael Scott",
      role: "Regional Manager",
    },
    {
      quote: `"A brilliant tool. Highly recommend."`,
      img: "https://i.pravatar.cc/40?img=5",
      name: "Sarah Kim",
      role: "UX Designer",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="landing-container">
      {/* ===== HERO ===== */}
      <section className="hero-section">
        <div className="hero-left">
          <h1>Relive Your Memories</h1>
          <p>
            A beautiful way to help Alzheimer's patients remember, relive, and reconnect
            with their lives through digital memory books.
          </p>
          <div className="hero-buttons">
            <button className="btn-black" onClick={() => navigate("/auth")}>
              Get Started
            </button>
            <button className="btn-white" onClick={() => navigate("/about")}>
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-right">
          <img
            src="https://media.istockphoto.com/id/1463632241/vector/doctor-examine-and-treat-human-brain-and-nervous-system.jpg?s=612x612&w=0&k=20&c=yrPIjD9GlxabcR7M0HPOU1RqXvErVUEEHLV7KJyganA="
            alt="Hero Visual"
          />
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="features-section">
        <h2>Designed for Everyone</h2>
        <p className="features-desc">
          Our platform ensures that everyone young or old can contribute and cherish memories.
        </p>
        <div className="feature-cards">
          <div className="feature-card">
            <img src="/icons/upload-photo.png" alt="Photo Upload" />
            <h3>Easy Photo Upload</h3>
            <p>Add meaningful photos quickly from your gallery or device.</p>
          </div>
          <div className="feature-card">
            <img src="/icons/voice-recording.png" alt="Voice Recordings" />
            <h3>Voice Recordings</h3>
            <p>Record or upload audio to preserve voices, stories, and feelings.</p>
          </div>
          <div className="feature-card">
            <img src="/icons/family-sharing.png" alt="Family Sharing" />
            <h3>Family Sharing</h3>
            <p>Collaborate with loved ones to build and view the memory book together.</p>
          </div>
        </div>
      </section>

      {/* ===== ACCESSIBILITY ===== */}
      <section className="accessibility-section">
        <h2>Built for Accessibility</h2>
        <div className="accessibility-features">
          <div className="accessibility-item">
            <img src="/icons/text-size.png" alt="Text Size" />
            <div>
              <h4>Adjustable Text Size</h4>
              <p>Read easily with flexible font options and contrast themes.</p>
            </div>
          </div>
          <div className="accessibility-item">
            <img src="/icons/voice-nav.png" alt="Voice Navigation" />
            <div>
              <h4>Voice Navigation</h4>
              <p>Navigate using voice commands or narration features for ease.</p>
            </div>
          </div>
          <div className="accessibility-item">
            <img src="/icons/multi-lang.png" alt="Multilingual" />
            <div>
              <h4>Multilingual Support</h4>
              <p>Use the platform in your preferred language for everyone at home.</p>
            </div>
          </div>
          <div className="accessibility-item">
            <img src="/icons/simple-ui.png" alt="Simple UI" />
            <div>
              <h4>Simple, Clean Interface</h4>
              <p>Focused, distraction-free interface for elderly and caregivers alike.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIAL CAROUSEL ===== */}
      <section className="testimonial-section">
        <h1>Don’t take our word for it</h1>
        <p className="subtitle">
          Our users are our best ambassadors. Discover why we're the top choice
          for scheduling meetings.
        </p>
        <div className="carousel">
          <div className="carousel-track">
            {testimonials.map((t, i) => (
              <div
                className={`slide ${
                  i === current
                    ? "active"
                    : i === (current - 1 + testimonials.length) % testimonials.length
                    ? "left"
                    : i === (current + 1) % testimonials.length
                    ? "right"
                    : ""
                }`}
                key={i}
              >
                <div className="quote">{t.quote}</div>
                <div className="author">
                  <img src={t.img} alt={t.name} />
                  <div className="author-info">
                    <strong>{t.name}</strong>
                    <br />
                    {t.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="final-cta-section">
        <h2>Start Creating Memories Today</h2>
        <p>Join families who are already preserving their precious moments.</p>
        <div className="hero-buttons">
          <button className="btn-black" onClick={() => navigate("/auth")}>
            Get Started
          </button>
          <button className="btn-white" onClick={() => navigate("/demo")}>
            View Demo
          </button>
        </div>
      </section>
    </div>
  );
};

export default Landing;