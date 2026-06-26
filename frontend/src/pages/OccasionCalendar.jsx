import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function OccasionCalendar() {
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: "1", // Hardcoded for demo
    occasion_name: "",
    occasion_type: "",
    occasion_date: "",
    description: "",
    reminder_days_before: 7
  });

  const fetchOccasions = async () => {
    setLoading(true);
    try {
      const data = await api.getOccasions();
      setOccasions(data);
    } catch (err) {
      setError(err.message || "Failed to fetch occasions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOccasions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = () => {
    setError("");
    setSuccess("");
    setFormData({
      customer_id: "1",
      occasion_name: "",
      occasion_type: "",
      occasion_date: "",
      description: "",
      reminder_days_before: 7
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.addOccasion(formData);
      setSuccess("Occasion added successfully");
      setShowModal(false);
      fetchOccasions();
    } catch (err) {
      setError(err.message || "Failed to add occasion");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this occasion?")) return;
    try {
      await api.deleteOccasion(id);
      setSuccess("Occasion deleted");
      fetchOccasions();
    } catch (err) {
      setError("Failed to delete occasion: " + err.message);
    }
  };

  // Group occasions by month for display
  const groupedOccasions = occasions.reduce((acc, curr) => {
    const d = new Date(curr.occasion_date);
    const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {});

  return (
    <div className="animated-fade">
      <div style={{ padding: "1rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--primary-dark)" }}>Occasion Calendar</h2>
            <p style={{ color: "var(--text-muted)" }}>Track client events, festivals, and employee anniversaries.</p>
          </div>
          <button onClick={handleOpenModal} className="btn btn-primary">+ Add Occasion</button>
        </div>

        {error && <div style={{ padding: "1rem", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "8px", margin: "1rem 0" }}>{error}</div>}
        {success && <div style={{ padding: "1rem", backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "8px", margin: "1rem 0" }}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
          {loading && occasions.length === 0 ? (
            <p>Loading calendar...</p>
          ) : Object.keys(groupedOccasions).length === 0 ? (
            <div style={{ backgroundColor: "white", padding: "3rem", borderRadius: "12px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "3rem" }}>📅</span>
              <h3>No Occasions Found</h3>
              <p>Click "Add Occasion" to track your first event.</p>
            </div>
          ) : (
            Object.keys(groupedOccasions).map(monthYear => (
              <div key={monthYear} style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <h3 style={{ marginBottom: "1rem", color: "var(--primary)", borderBottom: "2px solid #E5E7EB", paddingBottom: "0.5rem" }}>{monthYear}</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                  {groupedOccasions[monthYear].map(occ => {
                    const d = new Date(occ.occasion_date);
                    return (
                      <div key={occ.occasion_id} style={{ border: "1px solid #E5E7EB", borderRadius: "8px", padding: "1rem", position: "relative" }}>
                        <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                          <button onClick={() => handleDelete(occ.occasion_id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "0.2rem" }} title="Delete">🗑️</button>
                        </div>
                        
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                          <div style={{ backgroundColor: "var(--primary)", color: "white", borderRadius: "8px", padding: "0.5rem", textAlign: "center", minWidth: "60px" }}>
                            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold" }}>{d.toLocaleString('default', { month: 'short' })}</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", lineHeight: "1" }}>{d.getDate()}</div>
                          </div>
                          <div>
                            <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>{occ.occasion_name}</h4>
                            <span style={{ fontSize: "0.75rem", backgroundColor: "#E0E7FF", color: "#4338CA", padding: "0.1rem 0.4rem", borderRadius: "4px", display: "inline-block" }}>
                              {occ.occasion_type}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                          <strong>Client:</strong> {occ.company_name}
                        </div>
                        {occ.description && (
                          <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{occ.description}</div>
                        )}
                        <div style={{ fontSize: "0.75rem", color: "#F59E0B", marginTop: "0.5rem" }}>
                          🔔 Reminder set {occ.reminder_days_before} days before
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", width: "500px", maxWidth: "90%" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Add New Occasion</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Occasion Name *</label>
                <input type="text" className="form-input" name="occasion_name" value={formData.occasion_name} onChange={handleInputChange} required placeholder="e.g. CEO Birthday" />
              </div>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Type *</label>
                  <select className="form-input" name="occasion_type" value={formData.occasion_type} onChange={handleInputChange} required>
                    <option value="">-- Select Type --</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Company Anniversary">Company Anniversary</option>
                    <option value="Festival">Festival</option>
                    <option value="Employee Joining">Employee Joining</option>
                    <option value="Custom">Custom Occasion</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" name="occasion_date" value={formData.occasion_date} onChange={handleInputChange} required />
                </div>
              </div>
              
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" name="description" value={formData.description} onChange={handleInputChange} rows="2" />
              </div>
              
              <div>
                <label className="form-label">Reminder (Days Before)</label>
                <input type="number" className="form-input" name="reminder_days_before" value={formData.reminder_days_before} onChange={handleInputChange} min="1" max="30" />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: "#F3F4F6", color: "#374151" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Add Occasion"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
