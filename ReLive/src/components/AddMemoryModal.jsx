import React, { useEffect, useRef, useState } from "react";

// Backend-only upload: send the file to Django; server uploads to Cloudinary
const USE_CLIENT_UPLOAD = false;

export default function AddMemoryModal({ 
  open, 
  onClose, 
  onCreated, 
  editingMemory = null, 
  patientId = null, // NEW: For family members creating memories for specific patients
  patientName = null // NEW: Display name for better UX
}) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });
  const [location, setLocation] = useState("");
  const [tag, setTag] = useState("General");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // NEW: Check if we're editing or creating
  const isEditing = Boolean(editingMemory);
  const modalTitle = isEditing ? "Edit Memory" : "Add New Memory";
  const submitText = isEditing ? "Update Memory" : "Save Memory";

  // NEW: Populate form when editing
  useEffect(() => {
    if (editingMemory) {
      setTitle(editingMemory.title || "");
      setDescription(editingMemory.description || "");
      setDate(editingMemory.date || "");
      setLocation(editingMemory.location || "");
      setTag(editingMemory.tag || "General");
      
      // Handle existing image
      if (editingMemory.image_url) {
        setPreviewUrl(editingMemory.image_url);
      }
    } else {
      // Reset for new memory
      resetForm();
    }
  }, [editingMemory]);

  useEffect(() => {
    if (open && firstFieldRef.current) {
      const t = setTimeout(() => firstFieldRef.current.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === dialogRef.current) onClose?.();
  };

  // FIXED: Get the first file from FileList, not the FileList itself
  const handleImageChange = (e) => {
    const file = e.target && e.target.files && e.target.files[0]; // Get first file, not FileList
    
    // Clean up existing preview URL if it's a blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setImageFile(file || null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    return () => {
      // Clean up blob URLs on unmount
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setLocation("");
    setTag("General");
    setImageFile(null);
    
    // Clean up preview URL if it's a blob
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const access = localStorage.getItem("access");
    if (!access) return alert("Not authenticated");
    if (!title.trim()) return alert("Title is required");
    if (!date) return alert("Date is required");

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description || ""); // ensure string
      fd.append("date", date);
      fd.append("location", location);
      fd.append("tag", tag);
      
      // NEW: Add patient_id for family members creating memories for patients
      if (patientId && !isEditing) {
        fd.append("patient_id", patientId);
        console.log(`👪 Creating memory for patient ID: ${patientId} (${patientName || 'Unknown'})`);
      }
      
      if (imageFile) {
        console.log("Appending file:", imageFile, "Type:", typeof imageFile); // Debug log
        fd.append("image", imageFile); // Should be File object
      }

      // Debug: Log FormData entries
      console.log("=== FormData Debug ===");
      for (let [key, value] of fd.entries()) {
        console.log(`${key}:`, value, typeof value);
      }

      // NEW: Different URLs for editing vs creating
      const url = isEditing 
        ? `http://127.0.0.1:8000/api/memories/${editingMemory.id}/`
        : "http://127.0.0.1:8000/api/memories/";
      
      const method = isEditing ? "PUT" : "POST";
      
      console.log(`📡 ${method} request to: ${url}`);

      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${access}` }, // No Content-Type - let browser set boundary
        body: fd,
      });
      
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        console.log(`✅ Memory ${isEditing ? 'updated' : 'created'} successfully:`, data);
        onCreated?.(data);
        resetForm();
        onClose?.();
      } else {
        console.error(`❌ ${isEditing ? 'Update' : 'Create'} error:`, data);
        if (data && typeof data === "object") {
          const msg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join("\n");
          alert(msg || `Failed to ${isEditing ? 'update' : 'create'} memory`);
        } else {
          alert(`Failed to ${isEditing ? 'update' : 'create'} memory`);
        }
      }
    } catch (err) {
      console.error("❌ Submit error:", err);
      alert(err?.message || "Upload error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memory-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 id="add-memory-title">{modalTitle}</h3>
            {/* NEW: Show patient info when creating memory for another user */}
            {patientId && !isEditing && (
              <p className="modal-subtitle">Creating memory for: <strong>{patientName || 'Patient'}</strong></p>
            )}
            {isEditing && (
              <p className="modal-subtitle">Editing existing memory</p>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="modal-body"
          style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}
          encType="multipart/form-data"
        >
          <div className="form-row">
            <label>Title *</label>
            <input
              ref={firstFieldRef}
              type="text"
              placeholder="A day at the beach"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label>Description</label>
            <textarea
              placeholder="Describe the memory..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="form-row">
              <label>Location</label>
              <input
                type="text"
                placeholder="City, Place"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Tag</label>
              <select value={tag} onChange={(e) => setTag(e.target.value)}>
                <option>General</option>
                <option>Family</option>
                <option>Vacation</option>
                <option>Holiday</option>
                <option>Anniversary</option>
                <option>Birthday</option>
                <option>Travel</option>
                <option>Work</option>
                <option>Friends</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <label>Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
            {isEditing && !imageFile && (
              <p className="form-hint">Leave empty to keep current image</p>
            )}
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Preview" />
                {/* NEW: Show if this is existing image or new upload */}
                <p className="preview-label">
                  {imageFile ? "New image selected" : "Current image"}
                </p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (isEditing ? "Updating..." : "Saving...") : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}