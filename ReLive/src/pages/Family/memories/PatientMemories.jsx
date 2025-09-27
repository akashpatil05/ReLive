// PatientMemories.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AddMemoryModal from "../../../components/AddMemoryModal";
import "./PatientMemories.css";

const API_BASE = "http://127.0.0.1:8000";
const getAccess = () => localStorage.getItem("access");

export default function PatientMemories() {
  const { patientId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  
  // Get patient info from navigation state or fallback
  const patient = state?.patient || { name: "Patient", username: "Unknown" };
  const patientName = state?.patientName || patient.name || patient.username || "Patient";

  const fetchPatientMemories = useCallback(async () => {
    const access = getAccess();
    if (!access) {
      navigate("/login");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all memories (backend will filter based on user role and connections)
      const res = await fetch(`${API_BASE}/api/memories/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        // Filter memories for this specific patient on frontend as additional safety
        const patientMemories = data.filter(memory => 
          memory.user === parseInt(patientId) || 
          memory.username === patient.username
        );
        setMemories(patientMemories);
      } else if (res.status === 401) {
        navigate("/login");
        return;
      } else {
        setError("Failed to load memories");
      }
    } catch (e) {
      console.error("Fetch memories error:", e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [patientId, patient.username, navigate]);

  useEffect(() => {
    fetchPatientMemories();
  }, [fetchPatientMemories]);

  const handleBack = () => {
    navigate("/family-dashboard");
  };

  // Navigate to memory detail page
  const handleViewMemory = (memory) => {
    navigate(`/memories/${memory.id}`, {
      state: { 
        from: "patient-memories",
        patient: patient,
        patientName: patientName 
      }
    });
  };

  const handleAddMemory = () => {
    setEditingMemory(null);
    setShowAddModal(true);
  };

  const handleEditMemory = (memory) => {
    setEditingMemory(memory);
    setShowAddModal(true);
  };

  const handleMemoryCreated = (newMemory) => {
    setMemories(prev => [newMemory, ...prev]);
    setShowAddModal(false);
    setEditingMemory(null);
  };

  const handleMemoryUpdated = (updatedMemory) => {
    setMemories(prev => prev.map(m => m.id === updatedMemory.id ? updatedMemory : m));
    setShowAddModal(false);
    setEditingMemory(null);
  };

  const handleDeleteMemory = async (memoryId) => {
    if (!window.confirm("Are you sure you want to delete this memory?")) return;
    
    const access = getAccess();
    if (!access) return;

    try {
      const res = await fetch(`${API_BASE}/api/memories/${memoryId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access}` },
      });

      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
      } else {
        alert("Failed to delete memory");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("Error deleting memory");
    }
  };

  if (loading) {
    return (
      <div className="patient-memories-page">
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading {patientName}'s memories…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-memories-page">
      <header className="pm-header">
        <div className="pm-nav">
          <button className="btn-secondary" onClick={handleBack}>
            ← Back to Dashboard
          </button>
          <button className="btn-primary" onClick={handleAddMemory}>
            + Add Memory
          </button>
        </div>
        <h1>{patientName}'s Memories</h1>
        <p>Managing memories for {patientName}</p>
      </header>

      {error && (
        <div className="pm-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="pm-content">
        {memories.length > 0 ? (
          <div className="memories-grid">
            {memories.map((memory) => (
              <div key={memory.id} className="memory-card">
                {memory.image_url && (
                  <div 
                    className="memory-image"
                    onClick={() => handleViewMemory(memory)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view details"
                  >
                    <img 
                      src={memory.image_url} 
                      alt={memory.title}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-image.png";
                      }}
                    />
                  </div>
                )}
                <div className="memory-content">
                  <h3 
                    className="memory-title clickable-title"
                    onClick={() => handleViewMemory(memory)}
                    title="Click to view details"
                  >
                    {memory.title}
                  </h3>
                  <p className="memory-description">{memory.description}</p>
                  <div className="memory-details">
                    <span className="memory-date">{memory.date}</span>
                    {memory.location && (
                      <span className="memory-location">📍 {memory.location}</span>
                    )}
                    {memory.tag && (
                      <span className="memory-tag">{memory.tag}</span>
                    )}
                  </div>
                  <div className="memory-actions">
                    <button 
                      className="btn-primary btn-sm"
                      onClick={() => handleViewMemory(memory)}
                    >
                      View Details
                    </button>
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={() => handleEditMemory(memory)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={() => handleDeleteMemory(memory.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pm-empty">
            <div className="empty-icon">📸</div>
            <h3>No memories yet</h3>
            <p>{patientName} doesn't have any memories yet.</p>
            <button className="btn-primary" onClick={handleAddMemory}>
              Add First Memory
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Memory Modal */}
      <AddMemoryModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingMemory(null);
        }}
        onCreated={editingMemory ? handleMemoryUpdated : handleMemoryCreated}
        editingMemory={editingMemory}
        patientId={patientId} // Pass patient ID for family members
        patientName={patientName} // Pass patient name for better UX
      />
    </div>
  );
}
