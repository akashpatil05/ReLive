import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./Family.css";

const API_BASE = "http://127.0.0.1:8000";

// Enhanced getAccess function with token refresh [web:646]
const getAccess = async () => {
  const access = localStorage.getItem("access");
  if (!access) return null;

  // Check if token is expired [web:646]
  try {
    const payload = JSON.parse(atob(access.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // If token expires in next 5 minutes, refresh it
    if (payload.exp && payload.exp - now < 300) {
      console.log("Token expiring soon, refreshing...");
      return await refreshToken();
    }
  } catch (e) {
    console.log("Token decode error, refreshing...");
    return await refreshToken();
  }

  return access;
};

// Token refresh function [web:643]
const refreshToken = async () => {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) {
    // No refresh token, redirect to login
    localStorage.clear();
    window.location.href = "/login";
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access", data.access);
      if (data.refresh) {
        localStorage.setItem("refresh", data.refresh);
      }
      console.log("✅ Token refreshed successfully");
      return data.access;
    } else {
      // Refresh failed, redirect to login
      localStorage.clear();
      window.location.href = "/login";
      return null;
    }
  } catch (e) {
    console.error("Token refresh error:", e);
    localStorage.clear();
    window.location.href = "/login";
    return null;
  }
};

// Enhanced API request function with automatic token refresh [web:652]
const apiRequest = async (url, options = {}) => {
  const access = await getAccess();
  if (!access) return null;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${access}`,
    },
  });

  // If 401, try refreshing token once [web:647]
  if (response.status === 401) {
    console.log("Got 401, attempting token refresh...");
    const newAccess = await refreshToken();
    if (newAccess) {
      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccess}`,
        },
      });
    }
  }

  return response;
};

const formatImageUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  if (url.startsWith("media/")) return `${API_BASE}/${url}`;
  return url;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Boundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="panel error-panel">
          <h3>This section failed to render</h3>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const initials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  const first = String(parts[0]).charAt(0) || "";
  const second = parts.length > 1 ? String(parts[1]).charAt(0) : "";
  const out = (first + second).toUpperCase().slice(0, 2);
  return out || "??";
};

const statusBadge = (status) => {
  const s = (status || "CONNECTED").toUpperCase();
  if (s === "PENDING") return { label: "Pending", cls: "badge badge-pending" };
  if (s === "REVOKED") return { label: "Revoked", cls: "badge badge-revoked" };
  return { label: "Connected", cls: "badge badge-connected" };
};

export default function Family() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [me, setMe] = useState(null);
  const role = me?.role || "patient";
  const isPatient = role === "patient";
  const isFamilyUser = role === "family";

  // Connect code states
  const [shareCode, setShareCode] = useState(null);
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [connectCode, setConnectCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiRequest(`${API_BASE}/api/auth/me/`);
      if (!res) return;
      
      if (res.ok) {
        const data = await res.json();
        setMe(data);
      } else {
        setMe({ role: "patient" });
      }
    } catch {
      setMe({ role: "patient" });
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = isFamilyUser 
        ? `${API_BASE}/api/family-links/my-patients/`
        : `${API_BASE}/api/family-members/`;
        
      const res = await apiRequest(endpoint);
      if (!res) return;
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      
      const normalized = Array.isArray(data)
        ? data.map((m) => ({
            ...m,
            avatar: formatImageUrl(m.avatar),
            status: m.status || "CONNECTED",
          }))
        : [];
      setMembers(normalized);
    } catch (e) {
      console.error("Family fetch error:", e);
      setError(e.message || "Failed to load family members");
    } finally {
      setLoading(false);
    }
  }, [isFamilyUser]);

  const fetchCode = useCallback(async () => {
    if (!isPatient) return;
    try {
      setCodeLoading(true);
      const res = await apiRequest(`${API_BASE}/api/family-links/code/`);
      if (!res) return;
      
      if (res.ok) {
        const data = await res.json();
        setShareCode(data?.code || null);
        setCodeExpiry(data?.expires_at || null);
      } else if (res.status === 404) {
        setShareCode(null);
        setCodeExpiry(null);
      }
    } catch (e) {
      console.error("Fetch code error:", e);
    } finally {
      setCodeLoading(false);
    }
  }, [isPatient]);

  const createOrRotateCode = async () => {
    try {
      setCodeLoading(true);
      const res = await apiRequest(`${API_BASE}/api/family-links/create-code/`, {
        method: "POST",
      });
      if (!res) return;
      
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setShareCode(data?.code || null);
        setCodeExpiry(data?.expires_at || null);
      } else {
        alert(data?.detail || "Failed to create code");
      }
    } catch (e) {
      console.error("Create code error:", e);
      alert("Network error");
    } finally {
      setCodeLoading(false);
    }
  };

  const revokeCode = async () => {
    const ok = window.confirm("Revoke the current share code?");
    if (!ok) return;
    try {
      setCodeLoading(true);
      const res = await apiRequest(`${API_BASE}/api/family-links/code/`, {
        method: "DELETE",
      });
      if (!res) return;
      
      if (res.status === 204) {
        setShareCode(null);
        setCodeExpiry(null);
      } else {
        const t = await res.text().catch(() => "");
        alert(t || "Failed to revoke code");
      }
    } catch (e) {
      console.error("Revoke code error:", e);
      alert("Network error");
    } finally {
      setCodeLoading(false);
    }
  };

  const connectWithCode = async () => {
    if (!connectCode.trim()) return alert("Enter a share code");
    try {
      setConnecting(true);
      const res = await apiRequest(`${API_BASE}/api/family-links/connect/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: connectCode.trim() }),
      });
      if (!res) return;
      
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setConnectCode("");
        alert("Connected to patient successfully.");
        await fetchMembers();
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

  const onRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.name || "this member"}?`)) return;
    
    const prevMembers = Array.isArray(members) ? [...members] : [];
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    
    try {
      const res = await apiRequest(`${API_BASE}/api/family-members/${member.id}/`, {
        method: "DELETE",
      });
      if (!res || !res.ok) throw new Error("Failed to remove member");
    } catch (e) {
      setMembers(prevMembers);
      console.error("Remove member error:", e);
      setError(e.message);
    }
  };

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { if (isPatient) fetchCode(); }, [isPatient, fetchCode]);

  const memberCount = useMemo(() => (Array.isArray(members) ? members.length : 0), [members]);

  if (loading) {
    return (
      <div className="family-page">
        <div className="loading-center">
          <div className="spinner" aria-label="Loading"></div>
          <p>Loading connection info…</p>
        </div>
      </div>
    );
  }

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <div className="family-page">
      <div className="family-header">
        <h1>Family Connections</h1>
        <p>Connect with your loved ones using share codes</p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="tab-content">
        <ErrorBoundary>
          <section className="panel connect-panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="emoji" aria-hidden="true">🔗</span>
                <h3>Connect via Code</h3>
              </div>
              <p className="panel-subtitle">
                {isPatient ? "Share this code with family members" : "Enter a code to connect with a patient"}
              </p>
            </div>

            {isPatient && (
              <div className="code-section">
                <div className="code-row">
                  {shareCode ? (
                    <>
                      <div className="code-box" aria-live="polite">
                        <span className="code-label">Your code</span>
                        <div className="code-value">{shareCode}</div>
                        {codeExpiry && <div className="code-exp">Expires: {new Date(codeExpiry).toLocaleString()}</div>}
                      </div>
                      <div className="code-actions">
                        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(shareCode)}>Copy Code</button>
                        <button className="btn-warning" onClick={createOrRotateCode} disabled={codeLoading}>Rotate Code</button>
                        <button className="btn-danger-light" onClick={revokeCode} disabled={codeLoading}>Revoke</button>
                      </div>
                    </>
                  ) : (
                    <div className="no-code">
                      <p>You don't have an active share code</p>
                      <button className="btn-primary" onClick={createOrRotateCode} disabled={codeLoading}>Generate Code</button>
                    </div>
                  )}
                </div>

                <div className="instructions">
                  <h4>How to share:</h4>
                  <ol>
                    <li>Share this code with your family members</li>
                    <li>They can enter it in their Connect to Patient section</li>
                    <li>Once connected, they'll appear in your family members list below</li>
                  </ol>
                </div>
              </div>
            )}

            {isFamilyUser && (
              <div className="connect-section">
                <div className="connect-form">
                  <label htmlFor="connectCode">Enter patient's code</label>
                  <div className="connect-input-row">
                    <input
                      id="connectCode"
                      type="text"
                      placeholder="e.g., 6Y8K-P2"
                      value={connectCode}
                      onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
                    />
                    <button className="btn-primary" onClick={connectWithCode} disabled={connecting}>
                      {connecting ? "Connecting..." : "Connect"}
                    </button>
                  </div>
                  <p className="hint">Ask the patient to share the code from their Family page.</p>
                </div>

                <div className="instructions">
                  <h4>How to connect:</h4>
                  <ol>
                    <li>Ask the patient for their share code</li>
                    <li>Enter the code in the field above</li>
                    <li>Click Connect to establish the relationship</li>
                  </ol>
                </div>
              </div>
            )}
          </section>

          <section className="panel members-panel">
            <div className="panel-header">
              <div className="panel-title">
                <span className="emoji" aria-hidden="true">👪</span>
                <h3>{isFamilyUser ? "Connected Patients" : "Family Members"}</h3>
              </div>
              <span className="count-chip">{memberCount} {memberCount === 1 ? "connection" : "connections"}</span>
            </div>

            <div className="family-grid">
              {safeMembers.map((m) => {
                const badge = statusBadge(m.status);
                return (
                  <div className="family-card" key={m.id}>
                    <div className="avatar">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name || "Family member"}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : null}
                      <div className="avatar-fallback">{initials(m.name || m.username)}</div>
                    </div>

                    <div className="card-main">
                      <div className="name-row">
                        <h4 className="name">{m.name || m.username || "Unnamed"}</h4>
                        <span className={badge.cls}>{badge.label}</span>
                      </div>
                      <p className="relation">{m.relation || "Connected"}</p>

                      {isPatient && (
                        <div className="card-actions">
                          <button
                            className="btn-danger-light"
                            onClick={() => onRemoveMember(m)}
                            aria-label={`Remove ${m.name || m.username || "member"}`}
                          >
                            <span className="trash" aria-hidden="true">🗑️</span> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {safeMembers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">👪</div>
                  <h4>No connections yet</h4>
                  <p>{isFamilyUser ? "Connect to a patient using a code above." : "Share your code above to connect with family members."}</p>
                </div>
              )}
            </div>
          </section>
        </ErrorBoundary>
      </div>
    </div>
  );
}
