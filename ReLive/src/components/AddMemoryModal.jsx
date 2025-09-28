import React, { useState, useEffect, useRef } from "react";
import { FaTimes, FaUpload, FaImage, FaVideo, FaMicrophone, FaTrash, FaPlus, FaStop, FaPause, FaPlay } from "react-icons/fa";
import "./AddMemoryModal.css";

const API_BASE = "http://127.0.0.1:8000";

const AddMemoryModal = ({ open, onClose, onCreated, editingMemory }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    tag: "Family",
  });

  // Multiple media states
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState([]);
  const [existingMedia, setExistingMedia] = useState({
    images: [],
    videos: [],
    audio: []
  });

  // ✅ SIMPLIFIED: Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Refs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  const tagOptions = [
    "Family", "Vacation", "Holiday", "Anniversary", 
    "Birthday", "Travel", "Work", "Friends"
  ];

  // Cleanup function
  const cleanupRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Audio track stopped');
      });
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editingMemory) {
        setFormData({
          title: editingMemory.title || "",
          description: editingMemory.description || "",
          date: editingMemory.date || "",
          location: editingMemory.location || "",
          tag: editingMemory.tag || "Family",
        });

        setExistingMedia({
          images: editingMemory.images || [],
          videos: editingMemory.videos || [],
          audio: editingMemory.voice_recordings || []
        });
      } else {
        setFormData({
          title: "",
          description: "",
          date: "",
          location: "",
          tag: "Family",
        });
        setExistingMedia({ images: [], videos: [], audio: [] });
      }
      
      // Reset new file selections
      setSelectedImages([]);
      setSelectedVideos([]);
      setSelectedAudio([]);
      setUploadProgress({});
      setRecordingName("");
    } else {
      // Cleanup when modal closes
      cleanupRecording();
    }

    return cleanupRecording;
  }, [open, editingMemory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle multiple image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  // Handle multiple video selection
  const handleVideoSelect = (e) => {
    const files = Array.from(e.target.files);
    const newVideos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));
    setSelectedVideos(prev => [...prev, ...newVideos]);
  };

  // Handle multiple audio selection
  const handleAudioSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAudio = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      name: file.name,
      type: 'upload'
    }));
    setSelectedAudio(prev => [...prev, ...newAudio]);
  };

  // ✅ FIXED: Simplified audio recording
  const startRecording = async () => {
    try {
      console.log('🎙️ Starting audio recording...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Data chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('🛑 Recording stopped, processing audio...');
        
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          
          console.log('🎵 Audio blob created:', blob.size, 'bytes, type:', blob.type);
          
          if (blob.size > 0) {
            const audioUrl = URL.createObjectURL(blob);
            const fileName = recordingName || `Recording_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`;
            const file = new File([blob], fileName, { type: blob.type });
            
            const newRecording = {
              file: file,
              preview: audioUrl,
              id: Date.now() + Math.random(),
              name: fileName,
              type: 'recording'
            };
            
            setSelectedAudio(prev => [...prev, newRecording]);
            console.log('✅ Recording added to list');
          } else {
            console.error('❌ Empty audio blob');
            alert('Recording failed: No audio data captured');
          }
        } else {
          console.error('❌ No audio chunks');
          alert('Recording failed: No audio data captured');
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);
        setRecordingName("");
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        alert('Recording error: ' + event.error.message);
        cleanupRecording();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      let errorMessage = 'Could not start recording. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Recording not supported in this browser.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      cleanupRecording();
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stop recording requested');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      console.log('⚠️ MediaRecorder not in recording state:', mediaRecorderRef.current?.state);
      cleanupRecording();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Remove selected media
  const removeSelectedImage = (id) => {
    setSelectedImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed && removed.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const removeSelectedVideo = (id) => {
    setSelectedVideos(prev => {
      const updated = prev.filter(vid => vid.id !== id);
      const removed = prev.find(vid => vid.id === id);
      if (removed && removed.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const removeSelectedAudio = (id) => {
    setSelectedAudio(prev => {
      const updated = prev.filter(aud => aud.id !== id);
      const removed = prev.find(aud => aud.id === id);
      if (removed && removed.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  // Remove existing media
  const removeExistingMedia = async (mediaType, mediaId) => {
    const access = localStorage.getItem("access");
    if (!access) return;

    try {
      const endpoint = {
        images: `memory-images/${mediaId}/`,
        videos: `memory-videos/${mediaId}/`,
        audio: `memory-recordings/${mediaId}/`
      };

      const res = await fetch(`${API_BASE}/api/${endpoint[mediaType]}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access}` }
      });

      if (res.ok) {
        setExistingMedia(prev => ({
          ...prev,
          [mediaType]: prev[mediaType].filter(item => item.id !== mediaId)
        }));
      } else {
        alert("Failed to delete media item");
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Error deleting media item");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const access = localStorage.getItem("access");
    if (!access) {
      alert("Please log in to continue");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (isRecording) {
      alert("Please stop recording before submitting");
      return;
    }

    setUploading(true);

    try {
      // First, create or update the memory
      const memoryData = new FormData();
      memoryData.append("title", formData.title);
      memoryData.append("description", formData.description);
      memoryData.append("date", formData.date);
      memoryData.append("location", formData.location);
      memoryData.append("tag", formData.tag);

      // Add main image if it's a new memory and we have images
      if (!editingMemory && selectedImages.length > 0) {
        memoryData.append("image", selectedImages[0].file);
      }

      const memoryEndpoint = editingMemory 
        ? `${API_BASE}/api/memories/${editingMemory.id}/`
        : `${API_BASE}/api/memories/`;

      const memoryMethod = editingMemory ? "PUT" : "POST";

      const memoryRes = await fetch(memoryEndpoint, {
        method: memoryMethod,
        headers: { Authorization: `Bearer ${access}` },
        body: memoryData,
      });

      if (!memoryRes.ok) {
        throw new Error("Failed to save memory");
      }

      const savedMemory = await memoryRes.json();
      const memoryId = savedMemory.id;

      // Upload additional images
      const imagesToUpload = !editingMemory && selectedImages.length > 0 
        ? selectedImages.slice(1)
        : selectedImages;

      for (let i = 0; i < imagesToUpload.length; i++) {
        const image = imagesToUpload[i];
        const imageData = new FormData();
        imageData.append("image", image.file);
        imageData.append("caption", `Image ${i + 1}`);

        setUploadProgress(prev => ({ ...prev, [`image-${image.id}`]: 50 }));

        try {
          const imageRes = await fetch(`${API_BASE}/api/memories/${memoryId}/images/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${access}` },
            body: imageData,
          });

          if (imageRes.ok) {
            setUploadProgress(prev => ({ ...prev, [`image-${image.id}`]: 100 }));
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }

      // Upload videos
      for (let i = 0; i < selectedVideos.length; i++) {
        const video = selectedVideos[i];
        const videoData = new FormData();
        videoData.append("video", video.file);
        videoData.append("caption", `Video ${i + 1}`);

        setUploadProgress(prev => ({ ...prev, [`video-${video.id}`]: 50 }));

        try {
          const videoRes = await fetch(`${API_BASE}/api/memories/${memoryId}/videos/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${access}` },
            body: videoData,
          });

          if (videoRes.ok) {
            setUploadProgress(prev => ({ ...prev, [`video-${video.id}`]: 100 }));
          }
        } catch (error) {
          console.error("Error uploading video:", error);
        }
      }

      // Upload audio files
      console.log('🎵 Uploading', selectedAudio.length, 'audio files...');
      
      for (let i = 0; i < selectedAudio.length; i++) {
        const audio = selectedAudio[i];
        
        if (!audio.file) {
          console.log('⚠️ Skipping audio without file:', audio.name);
          continue;
        }
        
        const audioData = new FormData();
        audioData.append("audio", audio.file);
        audioData.append("speaker_name", audio.type === 'recording' ? "User Recording" : "User");

        setUploadProgress(prev => ({ ...prev, [`audio-${audio.id}`]: 50 }));

        try {
          console.log('📤 Uploading audio:', audio.name, 'Size:', audio.file.size);
          
          const audioRes = await fetch(`${API_BASE}/api/memories/${memoryId}/recordings/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${access}` },
            body: audioData,
          });

          if (audioRes.ok) {
            setUploadProgress(prev => ({ ...prev, [`audio-${audio.id}`]: 100 }));
            console.log('✅ Audio uploaded successfully:', audio.name);
          } else {
            const errorText = await audioRes.text();
            console.error('❌ Audio upload failed:', errorText);
          }
        } catch (error) {
          console.error("Error uploading audio:", error);
        }
      }

      // Success
      onCreated(savedMemory);
      onClose();

    } catch (error) {
      console.error("Error saving memory:", error);
      alert("Failed to save memory. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingMemory ? "Edit Memory" : "Add New Memory"}</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="memory-form">
          {/* Basic Information - Same as before */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter memory title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this memory..."
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tag">Category</label>
                <select
                  id="tag"
                  name="tag"
                  value={formData.tag}
                  onChange={handleInputChange}
                >
                  {tagOptions.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Where was this memory made?"
              />
            </div>
          </div>

          {/* Media Management Section */}
          <div className="form-section">
            <h3>Media</h3>

            {/* Images Section - Same as before */}
            <div className="media-section">
              <div className="media-header">
                <h4><FaImage /> Images</h4>
                <button 
                  type="button" 
                  className="add-media-btn"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <FaPlus /> Add Images
                </button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />

              {existingMedia.images.length > 0 && (
                <div className="existing-media">
                  <h5>Current Images</h5>
                  <div className="media-grid">
                    {existingMedia.images.map((image) => (
                      <div key={image.id} className="media-item">
                        <img 
                          src={image.resolved_image_url || image.image_url || image.image} 
                          alt={image.caption || "Memory image"}
                          className="media-preview"
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeExistingMedia('images', image.id)}
                        >
                          <FaTrash />
                        </button>
                        {image.caption && (
                          <div className="media-caption">{image.caption}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="new-media">
                  <h5>New Images</h5>
                  <div className="media-grid">
                    {selectedImages.map((image) => (
                      <div key={image.id} className="media-item">
                        <img 
                          src={image.preview} 
                          alt="New image"
                          className="media-preview"
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeSelectedImage(image.id)}
                        >
                          <FaTrash />
                        </button>
                        {uploadProgress[`image-${image.id}`] && (
                          <div className="upload-progress">
                            {uploadProgress[`image-${image.id}`]}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Videos Section - Same as before */}
            <div className="media-section">
              <div className="media-header">
                <h4><FaVideo /> Videos</h4>
                <button 
                  type="button" 
                  className="add-media-btn"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <FaPlus /> Add Videos
                </button>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoSelect}
                style={{ display: 'none' }}
              />

              {existingMedia.videos.length > 0 && (
                <div className="existing-media">
                  <h5>Current Videos</h5>
                  <div className="media-grid">
                    {existingMedia.videos.map((video) => (
                      <div key={video.id} className="media-item video-item-small">
                        <video 
                          src={video.resolved_video_url || video.video_url || video.video}
                          className="media-preview video-preview-small"
                          controls
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeExistingMedia('videos', video.id)}
                        >
                          <FaTrash />
                        </button>
                        {video.caption && (
                          <div className="media-caption">{video.caption}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVideos.length > 0 && (
                <div className="new-media">
                  <h5>New Videos</h5>
                  <div className="media-grid">
                    {selectedVideos.map((video) => (
                      <div key={video.id} className="media-item video-item-small">
                        <video 
                          src={video.preview}
                          className="media-preview video-preview-small"
                          controls
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeSelectedVideo(video.id)}
                        >
                          <FaTrash />
                        </button>
                        {uploadProgress[`video-${video.id}`] && (
                          <div className="upload-progress">
                            {uploadProgress[`video-${video.id}`]}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ✅ SIMPLIFIED Audio Section */}
            <div className="media-section">
              <div className="media-header">
                <h4><FaMicrophone /> Voice Recordings</h4>
                <div className="audio-actions">
                  <button 
                    type="button" 
                    className="add-media-btn"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isRecording}
                  >
                    <FaPlus /> Upload Audio
                  </button>
                  
                  {!isRecording ? (
                    <button 
                      type="button" 
                      className="record-btn"
                      onClick={startRecording}
                    >
                      <FaMicrophone /> Start Recording
                    </button>
                  ) : (
                    <div className="recording-controls">
                      <button 
                        type="button" 
                        className="record-control-btn stop-btn"
                        onClick={stopRecording}
                      >
                        <FaStop />
                      </button>
                      <span className="recording-time">{formatTime(recordingTime)}</span>
                      <span className="recording-indicator">● REC</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recording Name Input */}
              {isRecording && (
                <div className="recording-name-input">
                  <input
                    type="text"
                    placeholder="Recording name (optional)"
                    value={recordingName}
                    onChange={(e) => setRecordingName(e.target.value)}
                  />
                </div>
              )}

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAudioSelect}
                style={{ display: 'none' }}
              />

              {/* Existing Audio */}
              {existingMedia.audio.length > 0 && (
                <div className="existing-media">
                  <h5>Current Recordings</h5>
                  <div className="audio-list">
                    {existingMedia.audio.map((audio) => (
                      <div key={audio.id} className="audio-item">
                        <div className="audio-info">
                          <FaMicrophone className="audio-icon" />
                          <span>{audio.speaker_name || "Recording"}</span>
                          {audio.duration_formatted && (
                            <span className="duration">({audio.duration_formatted})</span>
                          )}
                        </div>
                        <audio 
                          src={audio.resolved_audio_url || audio.audio_url || audio.audio}
                          controls
                          className="audio-player"
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeExistingMedia('audio', audio.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Audio (Both Recorded and Uploaded) */}
              {selectedAudio.length > 0 && (
                <div className="new-media">
                  <h5>New Recordings</h5>
                  <div className="audio-list">
                    {selectedAudio.map((audio) => (
                      <div key={audio.id} className="audio-item">
                        <div className="audio-info">
                          <FaMicrophone className="audio-icon" />
                          <span>{audio.name}</span>
                          {audio.type === 'recording' && (
                            <span className="recording-badge">Recorded</span>
                          )}
                        </div>
                        <audio 
                          src={audio.preview}
                          controls
                          className="audio-player"
                        />
                        <button
                          type="button"
                          className="remove-media-btn"
                          onClick={() => removeSelectedAudio(audio.id)}
                        >
                          <FaTrash />
                        </button>
                        {uploadProgress[`audio-${audio.id}`] && (
                          <div className="upload-progress">
                            {uploadProgress[`audio-${audio.id}`]}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={uploading || isRecording}>
              Cancel
            </button>
            <button type="submit" disabled={uploading || isRecording}>
              {uploading ? "Saving..." : 
               isRecording ? "Stop recording first" :
               editingMemory ? "Update Memory" : "Create Memory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryModal;
