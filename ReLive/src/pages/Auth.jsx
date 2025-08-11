import React, { useState } from "react";
import "./Auth.css";
import doctorIcon from "../assets/doctor.svg";
import patientIcon from "../assets/patient.svg";
import familyIcon from "../assets/family.svg";
import googleLogo from "../assets/google.svg";
import showIcon from "../assets/eye.svg";
import hideIcon from "../assets/eye-slash.svg";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("patient");

  const handleToggle = () => setIsLogin(!isLogin);

  const handleRoleChange = (selectedRole) => setRole(selectedRole);

  return (
    <div className="auth-card-container">
      <div><h1 className="auth-title">Welcome to ReLive</h1></div>
      <div className="auth-card">
        <div className="auth-sidebar">
          <h2>Select Your Role</h2>
          <div className="role-options">
            <div
              className={`role-option ${role === "doctor" ? "selected" : ""}`}
              onClick={() => handleRoleChange("doctor")}
            >
              <img src={doctorIcon} alt="Doctor" />
              <span>Doctor</span>
            </div>
            <div
              className={`role-option ${role === "patient" ? "selected" : ""}`}
              onClick={() => handleRoleChange("patient")}
            >
              <img src={patientIcon} alt="Patient" />
              <span>Patient</span>
            </div>
            <div
              className={`role-option ${role === "family" ? "selected" : ""}`}
              onClick={() => handleRoleChange("family")}
            >
              <img src={familyIcon} alt="Family" />
              <span>Family</span>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <h2>{isLogin ? "Login to ReLive" : "Create a ReLive Account"}</h2>
          <form className="auth-form">
            {!isLogin && <input type="text" placeholder="Full Name" required />}
            <input type="email" placeholder="Email" required />
          <div className="password-field">
            <input type={showPassword ? "text" : "password"} placeholder="Password" required />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
             <img
               src={showPassword ? hideIcon : showIcon}
               alt={showPassword ? "Hide" : "Show"}
            />
            </span>
          </div>
            <button type="submit">{isLogin ? "Login" : "Sign up"}</button>
          </form>

          <div className="divider">OR</div>

          <button className="google-btn"><img src={googleLogo} alt="Google" />Continue with Google</button>

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
