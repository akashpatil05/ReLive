import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Memories from './pages/Memories';
import Auth from './pages/Auth';

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/memories" element={<Memories />} />
      <Route
        path="*"
        element={
        <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
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