import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import doctorIcon from "../../assets/doctor.svg";
import patientIcon from "../../assets/patient.svg";
import familyIcon from "../../assets/family.svg";
import googleLogo from "../../assets/google.svg";
import showIcon from "../../assets/eye.svg";
import hideIcon from "../../assets/eye-slash.svg";

const API_BASE = "http://127.0.0.1:8000";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("patient"); // "doctor" | "patient" | "family"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleToggle = () => setIsLogin(!isLogin);
  const handleRoleChange = (selectedRole) => setRole(selectedRole);

  const fetchMeAndRedirect = async () => {
    try {
      const access = localStorage.getItem("access");
      if (!access) {
        navigate("/login");
        return;
      }
      const res = await fetch(`${API_BASE}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) {
        navigate("/login");
        return;
      }
      const me = await res.json();
      const r = me?.role || role || "patient";

      // Role-based redirect
      if (r === "family") {
        navigate("/family-dashboard", { replace: true });
      } else if (r === "doctor") {
        navigate("/doctor-dashboard", { replace: true });
      } else {
        navigate("/memories", { replace: true });
      }
    } catch {
      // Fallback if /auth/me/ fails: route as patient
      navigate("/memories", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const endpoint = isLogin
      ? `${API_BASE}/api/auth/login/`
      : `${API_BASE}/api/auth/register/`;

    // For login, backend accepts email or username via the "email" field
    const body = isLogin
      ? { email, password }
      : { username: fullName, email, password, role }; // include role on signup

    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || data?.message || "Something went wrong!");
        setLoading(false);
        return;
      }

      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      await fetchMeAndRedirect();
    } catch (err) {
      console.error("Auth error:", err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div><h1 className="auth-title">Welcome to ReLive</h1></div>
      <div className="auth-card">
        {/* Sidebar */}
        <div className="auth-sidebar">
          <h2>Select Your Role</h2>
          <div className="role-options">
            <div className={`role-option ${role === "doctor" ? "selected" : ""}`} onClick={() => handleRoleChange("doctor")}>
              <img src={doctorIcon} alt="Doctor" />
              <span>Doctor</span>
            </div>
            <div className={`role-option ${role === "patient" ? "selected" : ""}`} onClick={() => handleRoleChange("patient")}>
              <img src={patientIcon} alt="Patient" />
              <span>Patient</span>
            </div>
            <div className={`role-option ${role === "family" ? "selected" : ""}`} onClick={() => handleRoleChange("family")}>
              <img src={familyIcon} alt="Family" />
              <span>Family</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="auth-form-section">
          <h2>{isLogin ? "Login to ReLive" : "Create a ReLive Account"}</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <input
                type="text"
                placeholder="Username"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              type="text"
              placeholder={isLogin ? "Email or Username" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isLogin}
            />
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                <img src={showIcon} alt="show" style={{ display: showPassword ? "none" : "block" }} />
                <img src={hideIcon} alt="hide" style={{ display: showPassword ? "block" : "none" }} />
              </span>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : (isLogin ? "Login" : "Sign up")}
            </button>
          </form>

          <div className="divider">OR</div>

          <button className="google-btn" type="button">
            <img src={googleLogo} alt="Google" />
            Continue with Google
          </button>

          <p className="toggle-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span onClick={handleToggle}>
              {isLogin ? " Sign up" : " Login"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
