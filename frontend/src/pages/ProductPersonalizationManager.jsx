import { useState, useEffect } from "react";
import { api } from "../services/api";
import KPICard from "../components/KPICard";

export default function ProductPersonalizationManager({ isAdmin }) {
  const [personalizations, setPersonalizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    customer_id: "1", // Hardcoded for demo assuming company 1 exists
    product_name: "",
    recipient_name: "",
    custom_message: "",
    font_style: "Arial",
    font_color: "#000000",
    gift_wrap: "None",
    instructions: ""
  });
  const [logoFile, setLogoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const fetchPersonalizations = async () => {
    setLoading(true);
    try {
      const data = await api.getPersonalizations();
      setPersonalizations(data);
    } catch (err) {
      setError(err.message || "Failed to fetch personalizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPersonalizations();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.product_name || !formData.recipient_name) {
      setError("Product Name and Recipient Name are required.");
      return;
    }

    if (formData.custom_message.length > 200) {
      setError("Custom message cannot exceed 200 characters.");
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    
    if (logoFile) submitData.append("logo", logoFile);
    if (imageFile) submitData.append("image", imageFile);

    setLoading(true);
    try {
      await api.createPersonalization(submitData);
      setSuccess("Personalization request submitted successfully!");
      setFormData({
        ...formData,
        product_name: "",
        recipient_name: "",
        custom_message: "",
        instructions: ""
      });
      setLogoFile(null);
      setImageFile(null);
      document.getElementById("logoInput").value = "";
      document.getElementById("imageInput").value = "";
      fetchPersonalizations();
    } catch (err) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.updatePersonalizationStatus(id, status);
      fetchPersonalizations();
    } catch (err) {
      setError("Failed to update status: " + err.message);
    }
  };

  const pendingCount = personalizations.filter(p => p.status === 'Pending').length;
  const approvedCount = personalizations.filter(p => p.status === 'Approved').length;

  return (
    <div className="animated-fade">
      <div style={{ padding: "1rem 2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--primary-dark)" }}>Product Personalization</h2>
        <p style={{ color: "var(--text-muted)" }}>Manage custom branding, names, and messages for specific gift items.</p>
        
        {error && <div style={{ padding: "1rem", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "8px", marginBottom: "1rem" }}>{error}</div>}
        {success && <div style={{ padding: "1rem", backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "8px", marginBottom: "1rem" }}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", margin: "1.5rem 0" }}>
            <KPICard title="Total Requests" value={personalizations.length} icon="✍️" color="#3B82F6" />
            <KPICard title="Pending Review" value={pendingCount} icon="⏳" color="#F59E0B" />
            <KPICard title="Approved" value={approvedCount} icon="✅" color="#10B981" />
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          {/* Submission Form */}
          <div style={{ flex: 1, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>New Request</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Product Name *</label>
                <input type="text" className="form-input" name="product_name" value={formData.product_name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Recipient Name *</label>
                <input type="text" className="form-input" name="recipient_name" value={formData.recipient_name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Custom Message (Max 200 chars)</label>
                <textarea className="form-input" name="custom_message" value={formData.custom_message} onChange={handleInputChange} rows="3" maxLength="200" />
                <div style={{ fontSize: "0.8rem", color: "gray", textAlign: "right" }}>{formData.custom_message.length}/200</div>
              </div>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Font Style</label>
                  <select className="form-input" name="font_style" value={formData.font_style} onChange={handleInputChange}>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Cursive">Cursive</option>
                    <option value="Monospace">Monospace</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Font Color</label>
                  <input type="color" className="form-input" name="font_color" value={formData.font_color} onChange={handleInputChange} style={{ padding: "0.2rem", height: "42px" }} />
                </div>
              </div>

              <div>
                <label className="form-label">Gift Wrap Option</label>
                <select className="form-input" name="gift_wrap" value={formData.gift_wrap} onChange={handleInputChange}>
                  <option value="None">None</option>
                  <option value="Standard Wrap">Standard Wrap</option>
                  <option value="Premium Box">Premium Box</option>
                  <option value="Eco-Friendly">Eco-Friendly Packaging</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Company Logo</label>
                  <input type="file" id="logoInput" className="form-input" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Custom Image</label>
                  <input type="file" id="imageInput" className="form-input" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                </div>
              </div>

              <div>
                <label className="form-label">Additional Instructions</label>
                <textarea className="form-input" name="instructions" value={formData.instructions} onChange={handleInputChange} rows="2" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "1rem" }}>
                {loading ? "Submitting..." : "Submit Personalization"}
              </button>
            </form>
          </div>

          {/* Admin View List */}
          {isAdmin && (
            <div style={{ flex: 1.5, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Admin Review View</h3>
              {loading && personalizations.length === 0 ? (
                <p>Loading...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Recipient</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personalizations.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>No personalizations found.</td></tr>
                      ) : (
                        personalizations.map(p => (
                          <tr key={p.personalization_id}>
                            <td>{p.product_name}</td>
                            <td>{p.recipient_name}</td>
                            <td><span style={{ display: 'inline-block', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.custom_message || "-"}</span></td>
                            <td>
                              <span className={`status-badge ${p.status === 'Pending' ? 'status-pending' : (p.status === 'Approved' ? 'status-won' : 'status-lost')}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {p.status === 'Pending' && (
                                  <>
                                    <button onClick={() => updateStatus(p.personalization_id, 'Approved')} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>Approve</button>
                                    <button onClick={() => updateStatus(p.personalization_id, 'Rejected')} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>Reject</button>
                                  </>
                                )}
                                {p.status === 'Approved' && (
                                  <button onClick={() => updateStatus(p.personalization_id, 'Completed')} style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>Complete</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
