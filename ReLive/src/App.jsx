import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Memories from "./pages/Memories";
import Auth from "./pages/Auth";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth (no Navbar/Footer) */}
        <Route path="/auth" element={<Auth />} />

        {/* Memories page (no Navbar/Footer) */}
        <Route path="/memories" element={<Memories />} />

        {/* Default pages WITH Navbar/Footer */}
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/home" element={<Home />} />
              </Routes>
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
