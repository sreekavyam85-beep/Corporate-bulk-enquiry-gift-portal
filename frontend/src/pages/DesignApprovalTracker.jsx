import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function DesignApprovalTracker({ isAdmin }) {
  const [approvals, setApprovals] = useState([]);
  const [personalizations, setPersonalizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    personalization_id: "",
    designer_notes: ""
  });
  const [mockupFile, setMockupFile] = useState(null);
  
  // For customer feedback
  const [feedback, setFeedback] = useState({});

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    // Strip " GMT" to prevent browsers from adding local timezone offsets to naive DB dates
    const cleanStr = dateStr.replace(" GMT", "");
    return new Date(cleanStr).toLocaleDateString();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const perData = await api.getPersonalizations();
      setPersonalizations(perData.filter(p => p.status === 'Pending Design' || p.status === 'Design Review'));
      
      const appData = await api.getDesignApprovals();
      setApprovals(appData);
    } catch (err) {
      setError(err.message || "Failed to load tracker data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFeedbackChange = (designId, value) => {
    setFeedback(prev => ({ ...prev, [designId]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.personalization_id || !mockupFile) {
      setError("Please select a personalization and upload a mockup.");
      return;
    }

    const submitData = new FormData();
    submitData.append("personalization_id", formData.personalization_id);
    submitData.append("designer_notes", formData.designer_notes);
    submitData.append("mockup", mockupFile);

    setLoading(true);
    try {
      await api.uploadDesignMockup(submitData);
      setSuccess("Mockup uploaded successfully!");
      setFormData({ personalization_id: "", designer_notes: "" });
      setMockupFile(null);
      document.getElementById("mockupInput").value = "";
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to upload mockup.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (designId, status) => {
    try {
      const updateData = { status };
      if (status === 'Changes Requested' || status === 'Approved') {
        updateData.customer_comments = feedback[designId] || "";
      }
      
      await api.updateDesignApproval(designId, updateData);
      setSuccess(`Design marked as ${status}`);
      setFeedback(prev => ({ ...prev, [designId]: "" }));
      fetchData();
    } catch (err) {
      setError("Failed to update design status: " + err.message);
    }
  };

  return (
    <div className="animated-fade">
      <div style={{ padding: "1rem 2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--primary-dark)" }}>Design Approval Tracker</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Upload mockups and track client feedback and approvals.</p>

        {error && <div style={{ padding: "1rem", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "8px", marginBottom: "1rem" }}>{error}</div>}
        {success && <div style={{ padding: "1rem", backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "8px", marginBottom: "1rem" }}>{success}</div>}

        <div style={{ display: "flex", gap: "2rem" }}>
          
          {/* Designer Upload Column */}
          {isAdmin && (
            <div style={{ flex: 1, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Upload Mockup (Designer)</h3>
              <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="form-label">Select Personalization Request *</label>
                  <select className="form-input" name="personalization_id" value={formData.personalization_id} onChange={handleInputChange} required>
                    <option value="">-- Select Request --</option>
                    {personalizations.map(p => (
                      <option key={p.personalization_id} value={p.personalization_id}>
                        {p.recipient_name} - {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Mockup File (PDF/Image) *</label>
                  <input type="file" id="mockupInput" className="form-input" accept="image/*,.pdf" onChange={(e) => setMockupFile(e.target.files[0])} required />
                </div>

                <div>
                  <label className="form-label">Designer Notes</label>
                  <textarea className="form-input" name="designer_notes" value={formData.designer_notes} onChange={handleInputChange} rows="3" />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "1rem" }}>
                  {loading ? "Uploading..." : "Upload Design"}
                </button>
              </form>
            </div>
          )}

          {/* Customer / Admin Review Column */}
          <div style={{ flex: 1.5, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Review Designs</h3>
            
            {loading && approvals.length === 0 ? (
              <p>Loading designs...</p>
            ) : approvals.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No design mockups uploaded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {approvals.map(approval => (
                  <div key={approval.design_id} style={{ border: "1px solid var(--border-light)", borderRadius: "8px", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <h4 style={{ margin: "0 0 0.25rem 0" }}>{approval.recipient_name}'s {approval.product_name}</h4>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Version: {approval.version} | Uploaded: {formatDate(approval.created_at)}</div>
                      </div>
                      <span className={`status-badge ${approval.status === 'Approved' ? 'status-won' : (approval.status === 'Changes Requested' ? 'status-lost' : 'status-pending')}`}>
                        {approval.status}
                      </span>
                    </div>

                    <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", fontSize: "0.9rem" }}>
                      <strong>Designer Notes:</strong> {approval.designer_notes || "None"}
                    </div>
                    
                    {approval.customer_comments && (
                      <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#FEF3C7", borderRadius: "6px", fontSize: "0.9rem", color: "#92400E" }}>
                        <strong>Past Feedback:</strong> {approval.customer_comments}
                      </div>
                    )}

                    <div style={{ marginBottom: "1rem" }}>
                      <a href={`http://localhost:5000/uploads/${approval.mockup_file}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontSize: "0.9rem", display: "inline-block" }}>
                        📎 View Mockup File
                      </a>
                    </div>

                    {approval.status !== 'Approved' && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea 
                          className="form-input" 
                          placeholder="Add comments or revision requests..." 
                          rows="2" 
                          value={feedback[approval.design_id] || ""}
                          onChange={(e) => handleFeedbackChange(approval.design_id, e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "1rem" }}>
                          <button onClick={() => updateStatus(approval.design_id, 'Approved')} className="btn" style={{ background: '#10B981', color: 'white' }}>Approve Design</button>
                          <button onClick={() => updateStatus(approval.design_id, 'Changes Requested')} className="btn" style={{ background: '#EF4444', color: 'white' }}>Request Changes</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
