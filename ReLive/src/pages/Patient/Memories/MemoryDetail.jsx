import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AddMemoryModal from "../../../components/AddMemoryModal"; // Import the modal
import "./MemoryDetail.css";

const API_BASE = "http://127.0.0.1:8000";
const getAccess = () => localStorage.getItem("access");

export default function MemoryDetail() {
  const { memoryId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  
  const [memory, setMemory] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [playingRecording, setPlayingRecording] = useState(null);
  const [likedByUser, setLikedByUser] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const audioRefs = useRef({});

  // ✅ NEW: Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);

  // Real data from backend
  const [memoryData, setMemoryData] = useState({
    photos: [],
    voiceRecordings: [],
    videos: [],
    peopleInMemory: [],
    eventTags: []
  });

  // Same formatImageUrl function as Memories.jsx
  const formatImageUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // Cloudinary secure_url or absolute
    if (url.startsWith("/")) return `${API_BASE}${url}`; // /media/...
    if (url.startsWith("media/")) return `${API_BASE}/${url}`; // media/...
    return url; // base64/others
  };

  // Same formatImageUrl logic for audio/video URLs
  const formatMediaUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // Cloudinary or absolute
    if (url.startsWith("/")) return `${API_BASE}${url}`; // /media/...
    if (url.startsWith("media/")) return `${API_BASE}/${url}`; // media/...
    return url;
  };

  const fetchMemoryDetail = useCallback(async () => {
    const access = getAccess();
    if (!access) {
      navigate("/login");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Try enhanced endpoint first, fallback to standard
      let res;
      let isEnhanced = false;
      
      try {
        res = await fetch(`${API_BASE}/api/memories/${memoryId}/detail/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (res.ok) {
          isEnhanced = true;
        } else if (res.status !== 404) {
          throw new Error(`Enhanced endpoint error: ${res.status}`);
        }
      } catch (enhancedError) {
        console.log("Enhanced endpoint not available, using standard:", enhancedError.message);
      }
      
      // If enhanced failed, use standard endpoint
      if (!isEnhanced || !res.ok) {
        res = await fetch(`${API_BASE}/api/memories/${memoryId}/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
      }
      
      if (res.ok) {
        const data = await res.json();
        console.log("API Response:", data);
        console.log("Using enhanced endpoint:", isEnhanced);
        
        setMemory(data);
        setLikedByUser(data.is_liked || false);
        setLikesCount(data.media_counts?.likes || data.likes_count || 0);
        
        // Initialize media data
        const mediaData = {
          photos: [],
          voiceRecordings: [],
          videos: [],
          peopleInMemory: [],
          eventTags: []
        };

        // Handle images - prioritize enhanced data, fallback to standard
        if (isEnhanced && data.images && Array.isArray(data.images) && data.images.length > 0) {
          // Enhanced endpoint with images array
          mediaData.photos = data.images.map((img) => ({
            ...img,
            image: formatImageUrl(img.resolved_image_url || img.image_url || img.image),
            resolved_image_url: img.resolved_image_url || img.image_url || img.image
          }));
          console.log("Using enhanced images:", mediaData.photos);
        } else {
          // Standard endpoint or enhanced without separate images
          // Use main memory image following same logic as Memories.jsx
          const resolved = data.resolved_image_url || data.image_url || data.image || null;
          if (resolved) {
            const formattedUrl = formatImageUrl(resolved);
            mediaData.photos = [{
              id: 1,
              image_url: resolved,
              resolved_image_url: resolved,
              image: formattedUrl,
              caption: data.title || "Memory image"
            }];
            console.log("Using main image as photo:", { original: resolved, formatted: formattedUrl });
          } else {
            console.log("No image data found");
          }
        }

        // Handle enhanced media types
        if (isEnhanced) {
          if (data.videos && Array.isArray(data.videos)) {
            mediaData.videos = data.videos.map((vid) => ({
              ...vid,
              video: formatMediaUrl(vid.resolved_video_url || vid.video_url || vid.video),
              thumbnail_url: vid.thumbnail_url
            }));
          }

          if (data.voice_recordings && Array.isArray(data.voice_recordings)) {
            mediaData.voiceRecordings = data.voice_recordings.map((audio) => ({
              ...audio,
              audio: formatMediaUrl(audio.resolved_audio_url || audio.audio_url || audio.audio)
            }));
          }

          if (data.tagged_people && Array.isArray(data.tagged_people)) {
            mediaData.peopleInMemory = data.tagged_people;
          }

          if (data.event_tags && Array.isArray(data.event_tags)) {
            mediaData.eventTags = data.event_tags;
          }
        }

        setMemoryData(mediaData);

        // Try to fetch navigation if available
        fetchMemoryNavigation();
      } else if (res.status === 401) {
        navigate("/login");
        return;
      } else {
        setError("Memory not found");
      }
    } catch (e) {
      console.error("Fetch memory error:", e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [memoryId, navigate]);

  const fetchMemoryNavigation = useCallback(async () => {
    const access = getAccess();
    if (!access) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/memories/${memoryId}/navigation/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      
      if (res.ok) {
        const navData = await res.json();
        setNavigation(navData);
      }
    } catch (e) {
      // Navigation is optional, don't show error
      console.log("Navigation not available");
    }
  }, [memoryId]);

  useEffect(() => {
    fetchMemoryDetail();
  }, [fetchMemoryDetail]);

  const handleBack = () => {
    if (state?.from === "patient-memories") {
      navigate(-1);
    } else {
      navigate("/memories");
    }
  };

  // ✅ UPDATED: Handle edit memory
  const handleEdit = () => {
    console.log("Opening edit modal for memory:", memory);
    
    // Prepare memory data for editing
    // Convert the fetched memory data to the format expected by AddMemoryModal
    const memoryForEdit = {
      ...memory,
      // Make sure we have the main image URL in the expected format
      image: memory.resolved_image_url || memory.image_url || memory.image,
      image_url: memory.resolved_image_url || memory.image_url || memory.image,
      resolved_image_url: memory.resolved_image_url || memory.image_url || memory.image
    };
    
    setEditingMemory(memoryForEdit);
    setEditModalOpen(true);
  };

  // ✅ NEW: Handle memory update success
  const handleMemoryUpdated = (updatedMemory) => {
    console.log("Memory updated successfully:", updatedMemory);
    
    // Update the current memory state with new data
    const resolved = updatedMemory.resolved_image_url || updatedMemory.image_url || updatedMemory.image || null;
    const memoryWithFormattedImage = {
      ...updatedMemory,
      image: formatImageUrl(resolved),
      resolved_image_url: resolved
    };
    
    setMemory(memoryWithFormattedImage);
    
    // Update the photos in memoryData if main image changed
    if (resolved) {
      const formattedUrl = formatImageUrl(resolved);
      setMemoryData(prev => ({
        ...prev,
        photos: prev.photos.length > 0 && prev.photos[0].id === 1 
          ? [{
              id: 1,
              image_url: resolved,
              resolved_image_url: resolved,
              image: formattedUrl,
              caption: updatedMemory.title || "Memory image"
            }, ...prev.photos.slice(1)]
          : prev.photos
      }));
    }
    
    // Close the modal
    setEditModalOpen(false);
    setEditingMemory(null);
    
    // Show success message (optional)
    // You could add a toast notification here
    console.log("✅ Memory updated successfully");
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this memory?")) return;
    
    const access = getAccess();
    if (!access) return;

    try {
      // Try enhanced endpoint first, fall back to standard
      let res = await fetch(`${API_BASE}/api/memories/${memoryId}/detail/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access}` },
      });

      // If enhanced endpoint fails, use standard
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE}/api/memories/${memoryId}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${access}` },
        });
      }

      if (res.ok || res.status === 204) {
        navigate(-1);
      } else {
        alert("Failed to delete memory");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("Error deleting memory");
    }
  };

  const handleLikeToggle = async () => {
    if (isLiking) return;
    
    const access = getAccess();
    if (!access) return;

    setIsLiking(true);
    const wasLiked = likedByUser;

    try {
      // Optimistic update
      setLikedByUser(!wasLiked);
      setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

      const res = await fetch(`${API_BASE}/api/memories/${memoryId}/like/`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${access}` },
      });

      if (!res.ok) {
        // Revert on failure
        setLikedByUser(wasLiked);
        setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      }
    } catch (e) {
      // Revert on error
      setLikedByUser(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error("Like error:", e);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePlayRecording = (recording) => {
    if (playingRecording && audioRefs.current[playingRecording]) {
      audioRefs.current[playingRecording].pause();
    }
    
    if (playingRecording === recording.id) {
      setPlayingRecording(null);
    } else {
      setPlayingRecording(recording.id);
      if (audioRefs.current[recording.id]) {
        audioRefs.current[recording.id].play().catch(console.error);
      }
    }
  };

  const handleNavigateToMemory = (memoryId) => {
    if (memoryId) {
      navigate(`/memories/${memoryId}`, { 
        state: { from: state?.from }, 
        replace: false 
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const getAvatarInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getTagColor = (tagName) => {
    const colors = {
      family: "#f3e5f5",
      reunion: "#e8f5e8", 
      summer: "#fff3e0",
      home: "#e3f2fd",
      birthday: "#fce4ec",
      vacation: "#e0f2f1",
      holiday: "#fff8e1",
      anniversary: "#f1f8e9"
    };
    return colors[tagName?.toLowerCase()] || "#f5f5f5";
  };

  const getTagTextColor = (tagName) => {
    const colors = {
      family: "#7b1fa2",
      reunion: "#2e7d32",
      summer: "#ef6c00", 
      home: "#1976d2",
      birthday: "#c2185b",
      vacation: "#00695c",
      holiday: "#f57f17",
      anniversary: "#689f38"
    };
    return colors[tagName?.toLowerCase()] || "#666";
  };

  if (loading) {
    return (
      <div className="memory-detail-page">
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading memory details...</p>
        </div>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="memory-detail-page">
        <div className="error-center">
          <h3>Memory not found</h3>
          <p>{error || "This memory doesn't exist or you don't have permission to view it."}</p>
          <button className="btn-primary" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-detail-page">
      {/* Header with Back and Action buttons */}
      <header className="memory-detail-header">
        <button className="back-btn" onClick={handleBack}>
          <span className="back-icon">←</span> Back To Memories
        </button>
        <div className="action-buttons">
          <button className="edit-btn" onClick={handleEdit}>
            <span className="edit-icon">✏️</span> Edit Memory
          </button>
          <button className="delete-btn" onClick={handleDelete}>
            <span className="delete-icon">🗑️</span> Delete
          </button>
          <button 
            className={`like-btn ${likedByUser ? 'liked' : ''}`}
            onClick={handleLikeToggle}
            disabled={isLiking}
          >
            <span className="like-icon">❤️</span>
            <span className="like-count">{likesCount}</span>
          </button>
        </div>
      </header>

      {/* Memory Title and Basic Info */}
      <div className="memory-title-section">
        <h1 className="memory-title">{memory.title}</h1>
        <div className="memory-meta">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <span>{formatDate(memory.date)}</span>
          </div>
          {memory.location && (
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span>{memory.location}</span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            <span>By {memory.user_display || memory.username || "Unknown"}</span>
          </div>
        </div>
      </div>

      {/* Photos Section */}
      {memoryData.photos.length > 0 && (
        <div className="photos-section">
          <div className="section-header">
            <span className="section-icon">📸</span>
            <h3>Photos ({memoryData.photos.length})</h3>
          </div>
          <div className="photos-grid">
            {memoryData.photos.map((photo, index) => (
              <div 
                key={photo.id || index} 
                className={`photo-item ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <img 
                  src={photo.image || "https://ui-avatars.com/api/?name=IMG&background=ccc&color=666&size=300"}
                  alt={photo.caption || `Memory photo ${index + 1}`} 
                  loading="lazy"
                  onError={(e) => {
                    console.error("Image load error for:", photo);
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://ui-avatars.com/api/?name=IMG&background=ccc&color=666&size=300";
                  }}
                />
                {photo.caption && (
                  <div className="photo-caption">{photo.caption}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {memoryData.videos.length > 0 && (
        <div className="videos-section">
          <div className="section-header">
            <span className="section-icon">🎥</span>
            <h3>Videos ({memoryData.videos.length})</h3>
          </div>
          <div className="videos-grid">
            {memoryData.videos.map((video, index) => (
              <div key={video.id || index} className="video-item">
                <video 
                  controls 
                  poster={video.thumbnail_url}
                  src={video.video}
                  onError={(e) => {
                    console.error("Video load error:", video);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
                {video.caption && (
                  <div className="video-caption">{video.caption}</div>
                )}
                {video.duration_formatted && (
                  <div className="video-duration">{video.duration_formatted}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Recordings Section */}
      {memoryData.voiceRecordings.length > 0 && (
        <div className="voice-section">
          <div className="section-header">
            <span className="section-icon">🎤</span>
            <h3>Voice Recordings ({memoryData.voiceRecordings.length})</h3>
          </div>
          <div className="voice-recordings">
            {memoryData.voiceRecordings.map((recording) => (
              <div key={recording.id} className="voice-recording-item">
                <div className="recording-info">
                  <div className="recording-avatar">
                    {recording.avatar_url ? (
                      <img src={recording.avatar_url} alt={recording.speaker_display} />
                    ) : (
                      <div className="avatar-initials">
                        {getAvatarInitials(recording.speaker_name)}
                      </div>
                    )}
                  </div>
                  <div className="recording-details">
                    <h4>{recording.speaker_display || recording.speaker_name || "Unknown Speaker"}</h4>
                    {recording.duration_formatted && (
                      <span className="recording-duration">{recording.duration_formatted}</span>
                    )}
                  </div>
                </div>
                <div className="recording-controls">
                  <button 
                    className={`play-btn ${playingRecording === recording.id ? 'playing' : ''}`}
                    onClick={() => handlePlayRecording(recording)}
                  >
                    {playingRecording === recording.id ? '⏸️' : '▶️'}
                  </button>
                  <div className="recording-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                  <div className="recording-controls-right">
                    <span className="volume-icon">🔊</span>
                    <span className="duration">—●—</span>
                  </div>
                </div>
                {/* Hidden audio element for actual playback */}
                <audio 
                  ref={el => audioRefs.current[recording.id] = el}
                  onEnded={() => setPlayingRecording(null)}
                  style={{ display: 'none' }}
                  onError={(e) => {
                    console.error("Audio load error:", recording);
                  }}
                >
                  <source 
                    src={recording.audio}
                    type="audio/mpeg" 
                  />
                </audio>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout for Description and People & Tags */}
      <div className="content-grid">
        {/* Description Section */}
        <div className="description-section">
          <div className="section-header">
            <span className="section-icon">📝</span>
            <h3>Description</h3>
          </div>
          <div className="description-content">
            <p>{memory.description || "No description provided for this memory."}</p>
          </div>
        </div>

        {/* People & Tags Section */}
        <div className="people-tags-section">
          <div className="section-header">
            <span className="section-icon">🏷️</span>
            <h3>People & Tags</h3>
          </div>
          
          {memoryData.peopleInMemory.length > 0 && (
            <div className="people-subsection">
              <h4>People in This Memory</h4>
              <div className="people-tags">
                {memoryData.peopleInMemory.map((person) => (
                  <span key={person.id} className="person-tag">
                    {person.avatar_url && (
                      <img src={person.avatar_url} alt={person.name} className="person-avatar" />
                    )}
                    {person.name}
                    {person.relation && <span className="person-relation"> ({person.relation})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {memoryData.eventTags.length > 0 && (
            <div className="event-tags-subsection">
              <h4>Event Tags</h4>
              <div className="event-tags">
                {memoryData.eventTags.map((tag) => (
                  <span 
                    key={tag.id} 
                    className="event-tag" 
                    style={{
                      backgroundColor: tag.color || getTagColor(tag.tag_name),
                      color: getTagTextColor(tag.tag_name)
                    }}
                  >
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Show legacy tag if no event tags */}
          {memoryData.eventTags.length === 0 && memory.tag && (
            <div className="event-tags-subsection">
              <h4>Category</h4>
              <div className="event-tags">
                <span 
                  className="event-tag" 
                  style={{
                    backgroundColor: getTagColor(memory.tag),
                    color: getTagTextColor(memory.tag)
                  }}
                >
                  {memory.tag}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {memory.comments && memory.comments.length > 0 && (
        <div className="comments-section">
          <div className="section-header">
            <span className="section-icon">💬</span>
            <h3>Comments ({memory.comments.length})</h3>
          </div>
          <div className="comments-list">
            {memory.comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <strong>{comment.user_display}</strong>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation to Previous/Next Memory */}
      {navigation && (
        <div className="memory-navigation">
          {navigation.previous_memory ? (
            <button 
              className="nav-btn prev-btn"
              onClick={() => handleNavigateToMemory(navigation.previous_memory.id)}
            >
              <span className="nav-icon">←</span>
              <div className="nav-text">
                <span className="nav-label">Previous Memory</span>
                <span className="nav-title">{navigation.previous_memory.title}</span>
              </div>
            </button>
          ) : (
            <div className="nav-btn-placeholder"></div>
          )}
          
          <div className="memory-counter">
            <span>Memory {navigation.current_position} of {navigation.total_memories}</span>
          </div>
          
          {navigation.next_memory ? (
            <button 
              className="nav-btn next-btn"
              onClick={() => handleNavigateToMemory(navigation.next_memory.id)}
            >
              <div className="nav-text">
                <span className="nav-label">Next Memory</span>
                <span className="nav-title">{navigation.next_memory.title}</span>
              </div>
              <span className="nav-icon">→</span>
            </button>
          ) : (
            <div className="nav-btn-placeholder"></div>
          )}
        </div>
      )}

      {/* ✅ ADD: Edit Memory Modal */}
      <AddMemoryModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingMemory(null);
        }}
        onCreated={handleMemoryUpdated}
        editingMemory={editingMemory}
      />
    </div>
  );
}
