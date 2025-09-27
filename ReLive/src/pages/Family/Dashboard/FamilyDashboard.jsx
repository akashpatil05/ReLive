import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./FamilyDashboard.css";

const API_BASE = "http://127.0.0.1:8000";

const getAccess = () => localStorage.getItem("access");

const avatarInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0] ? parts[0].charAt(0) : "";
  const second = parts[1] ? parts[1].charAt(0) : "";
  return (first + second || first || "??").toUpperCase().slice(0, 2);
};

export default function FamilyDashboard() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectCode, setConnectCode] = useState("");
  const [error, setError] = useState(null);

  const role = me?.role || "family";
  const isFamily = role === "family";

  const fetchMe = useCallback(async () => {
    const access = getAccess();
    if (!access) {
      navigate("/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMe(data);
        if (data?.role && data.role !== "family") {
          navigate(data.role === "doctor" ? "/doctor-dashboard" : "/memories", { replace: true });
        }
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const fetchPatients = useCallback(async () => {
    const access = getAccess();
    if (!access) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE}/api/family-links/my-patients/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
      } else if (res.status === 404) {
        setError("API endpoint not found. Check backend URL configuration.");
        setPatients([]);
      } else if (res.status === 401) {
        navigate("/login");
        return;
      } else {
        const txt = await res.text().catch(() => "");
        setError(txt || `HTTP ${res.status}: Failed to load patients.`);
        setPatients([]);
      }
    } catch (e) {
      console.error("Network/Fetch error:", e);
      setError(`Network error: ${e.message}`);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => { 
    if (isFamily) {
      fetchPatients(); 
    }
  }, [isFamily, fetchPatients]);

  const onConnect = async () => {
    const code = connectCode.trim().toUpperCase();
    if (!code) return alert("Enter a share code");
    const access = getAccess();
    if (!access) return navigate("/login");
    
    try {
      setConnecting(true);
      const res = await fetch(`${API_BASE}/api/family-links/connect/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      const data = await res.json().catch(() => null);
      
      if (res.ok) {
        setConnectCode("");
        await fetchPatients();
        alert("Connected to patient successfully.");
      } else {
        alert(data?.detail || data?.message || "Invalid or expired code");
      }
    } catch (e) {
      console.error("Connect error:", e);
      alert("Network error");
    } finally {
      setConnecting(false);
    }
  };

  // Navigate to specific patient's memories page [web:771][web:764]
  const handlePatientMemories = (patient) => {
    navigate(`/patient-memories/${patient.id}`, { 
      state: { 
        patient: patient,
        patientName: patient.name || patient.username,
        from: "family-dashboard"
      } 
    });
  };

  // Navigate to specific patient overview
  const handlePatientOverview = (patient) => {
    navigate(`/patients/${patient.id}/overview`, { 
      state: { 
        patient: patient,
        from: "family-dashboard"
      } 
    });
  };

  const count = useMemo(() => patients.length, [patients]);

  if (loading) {
    return (
      <div className="familydash-page">
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="familydash-page">
      <header className="fd-header">
        <h1>Family Dashboard</h1>
        <p>Manage patient connections and access their memories.</p>
      </header>

      {error && (
        <div className="fd-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="panel">
        <div className="panel-title">
          <span className="emoji">🔗</span>
          <h3>Connect to a Patient</h3>
        </div>
        <div className="fd-connect-row">
          <input
            type="text"
            placeholder="Enter code e.g., 6Y8K-P2"
            value={connectCode}
            onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
          />
          <button className="btn-primary" onClick={onConnect} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
        <p className="hint">Ask the patient to generate and share the code from their Family page.</p>
      </section>

      <section className="panel">
        <div className="fd-list-header">
          <div className="panel-title">
            <span className="emoji">🧑‍⚕️</span>
            <h3>My Patients</h3>
          </div>
          <span className="count-chip">{count} {count === 1 ? "patient" : "patients"}</span>
        </div>

        <div className="fd-grid">
          {patients.map((p) => (
            <div key={p.id} className="fd-card">
              <div className="fd-avatar">
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.username || p.name || "Patient"}
                    onError={(e) => { 
                      e.currentTarget.style.display = "none"; 
                    }}
                  />
                ) : (
                  <div className="fd-avatar-fallback">{avatarInitials(p.name || p.username)}</div>
                )}
              </div>
              <div className="fd-card-main">
                <h4 className="fd-name">{p.name || p.username || "Unnamed"}</h4>
                {p.relation && <p className="fd-relation">Relation: {p.relation}</p>}
                <div className="fd-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => handlePatientOverview(p)}
                  >
                    Overview
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => handlePatientMemories(p)}
                    title={`View memories from ${p.name || p.username}`}
                  >
                    Memories
                  </button>
                </div>
              </div>
            </div>
          ))}

          {patients.length === 0 && (
            <div className="fd-empty">
              <div className="empty-icon">👪</div>
              <h4>No patients linked yet</h4>
              <p>Enter a code above to connect to a patient.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
