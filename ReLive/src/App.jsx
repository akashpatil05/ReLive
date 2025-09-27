import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Landing from "./pages/Landing/Landing";
import Memories from "./pages/Patient/Memories/Memories";
import Auth from "./pages/Login/Auth";
import Family from "./pages/Patient/Family/Family";
import FamilyDashboard from "./pages/Family/Dashboard/FamilyDashboard";
import PatientMemories from './pages/Family/memories/PatientMemories';
import MemoryDetail from './pages/Patient/Memories/MemoryDetail';
import Games from './pages/Patient/Games/Games';

// Layout for pages that should include Navbar and Footer
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone pages WITHOUT Navbar/Footer */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/family" element={<Family />} />
        <Route path="/family-dashboard" element={<FamilyDashboard />} />
        <Route path="/patient-memories/:patientId" element={<PatientMemories />} />
        <Route path="/memories/:memoryId" element={<MemoryDetail />} />
        <Route path="/games" element={<Games />} />


        {/* Default pages WITH Navbar/Footer via layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
