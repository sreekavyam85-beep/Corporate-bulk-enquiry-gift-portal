import { useState, useEffect } from "react";
import { api, API_BASE_URL } from "../services/api";
import KPICard from "../components/KPICard";

export default function ReturnRequestPage({ isAdmin }) {
  const [returns, setReturns] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    order_id: "",
    customer_id: "1", // Hardcoded for demo
    reason: "",
    description: ""
  });
  const [imageFile, setImageFile] = useState(null);
  
  // For admin modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);

  const fetchEnquiries = async () => {
    try {
      const data = await api.getEnquiries();
      // Only show enquiries that are actually converted orders or at least valid
      setEnquiries(data);
    } catch (err) {
      console.error("Failed to fetch enquiries for dropdown", err);
    }
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await api.getReturns();
      setReturns(data);
    } catch (err) {
      setError(err.message || "Failed to fetch returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReturns();
    fetchEnquiries();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.order_id || !formData.reason) {
      setError("Order ID and Reason are required.");
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    
    if (imageFile) submitData.append("image", imageFile);

    setLoading(true);
    try {
      await api.submitReturn(submitData);
      setSuccess("Return request submitted successfully!");
      setFormData({
        ...formData,
        order_id: "",
        reason: "",
        description: ""
      });
      setImageFile(null);
      document.getElementById("returnImageInput").value = "";
      fetchReturns();
    } catch (err) {
      setError(err.message || "Failed to submit return request.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdmin = (ret) => {
    setSelectedReturn(ret);
    setAdminNotes(ret.admin_notes || "");
    setRefundAmount(ret.refund_amount || 0);
    setShowAdminModal(true);
  };

  const handleAdminUpdate = async (status) => {
    try {
      await api.updateReturn(selectedReturn.return_id, {
        status,
        admin_notes: adminNotes,
        refund_amount: status === 'Refund Initiated' ? refundAmount : selectedReturn.refund_amount,
        replacement_initiated: status === 'Replacement Initiated' ? true : selectedReturn.replacement_initiated
      });
      setSuccess(`Return request updated to ${status}`);
      setShowAdminModal(false);
      fetchReturns();
    } catch (err) {
      setError("Failed to update return: " + err.message);
    }
  };

  const pendingCount = returns.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length;
  const approvedCount = returns.filter(r => r.status === 'Approved' || r.status === 'Replacement Initiated' || r.status === 'Refund Initiated').length;

  return (
    <div className="animated-fade">
      <div style={{ padding: "1rem 2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--primary-dark)" }}>Return Requests (RMA)</h2>
        <p style={{ color: "var(--text-muted)" }}>Manage customer returns, replacements, and refunds.</p>
        
        {error && <div style={{ padding: "1rem", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "8px", marginBottom: "1rem" }}>{error}</div>}
        {success && <div style={{ padding: "1rem", backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "8px", marginBottom: "1rem" }}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", margin: "1.5rem 0" }}>
            <KPICard title="Total RMAs" value={returns.length} icon="↩️" color="#3B82F6" />
            <KPICard title="Action Required" value={pendingCount} icon="⚠️" color="#F59E0B" />
            <KPICard title="Resolved" value={approvedCount} icon="✅" color="#10B981" />
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          {/* Customer Submission Form */}
          <div style={{ flex: 1, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", height: "fit-content" }}>
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Submit Return</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Select Order (Enquiry) *</label>
                <select className="form-input" name="order_id" value={formData.order_id} onChange={handleInputChange} required>
                  <option value="">-- Select Order --</option>
                  {enquiries.map(enq => (
                    <option key={enq.id} value={enq.id}>
                      {enq.enquiry_code} - {enq.company_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="form-label">Reason for Return *</label>
                <select className="form-input" name="reason" value={formData.reason} onChange={handleInputChange} required>
                  <option value="">-- Select Reason --</option>
                  <option value="Damaged Item">Damaged / Defective Item</option>
                  <option value="Wrong Item Shipped">Wrong Item Shipped</option>
                  <option value="Branding Error">Branding / Printing Error</option>
                  <option value="Quality Issue">Quality Not As Expected</option>
                  <option value="Missing Items">Missing Items in Package</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label">Detailed Description</label>
                <textarea className="form-input" name="description" value={formData.description} onChange={handleInputChange} rows="3" placeholder="Please describe the issue in detail..." />
              </div>
              
              <div>
                <label className="form-label">Upload Proof (Image/PDF)</label>
                <input type="file" id="returnImageInput" className="form-input" accept="image/*,.pdf" onChange={(e) => setImageFile(e.target.files[0])} />
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Provide photos of the damaged items or branding errors.</div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "1rem" }}>
                {loading ? "Submitting..." : "Submit RMA Request"}
              </button>
            </form>
          </div>

          {/* Admin RMA List */}
          {isAdmin && (
            <div style={{ flex: 2, backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Admin RMA Queue</h3>
              {loading && returns.length === 0 ? (
                <p>Loading...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>RMA #</th>
                        <th>Order ID</th>
                        <th>Client</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>No return requests found.</td></tr>
                      ) : (
                        returns.map(r => (
                          <tr key={r.return_id}>
                            <td>#{r.return_id}</td>
                            <td><span style={{ fontFamily: "monospace", backgroundColor: "#F3F4F6", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>{r.enquiry_code}</span></td>
                            <td>{r.company_name}</td>
                            <td>{r.reason}</td>
                            <td>
                              <span className={`status-badge ${['Submitted', 'Under Review'].includes(r.status) ? 'status-pending' : (['Rejected'].includes(r.status) ? 'status-lost' : 'status-won')}`}>
                                {r.status}
                              </span>
                            </td>
                            <td>
                              <button onClick={() => handleOpenAdmin(r)} className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Review</button>
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

      {showAdminModal && selectedReturn && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", width: "600px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Review RMA #{selectedReturn.return_id}</h3>
              <span className="status-badge" style={{ backgroundColor: "#F3F4F6", color: "#374151" }}>{selectedReturn.status}</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#F8FAFC", borderRadius: "8px" }}>
              <div>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Order ID</strong>
                {selectedReturn.enquiry_code}
              </div>
              <div>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Client</strong>
                {selectedReturn.company_name}
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Reason</strong>
                {selectedReturn.reason}
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Description</strong>
                {selectedReturn.description || "No description provided."}
              </div>
              {selectedReturn.image_path && (
                <div style={{ gridColumn: "span 2" }}>
                  <a href={`${API_BASE_URL}/uploads/${selectedReturn.image_path}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontSize: "0.9rem" }}>
                    📎 View Attached Proof
                  </a>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="form-label">Admin Notes (Internal)</label>
              <textarea className="form-input" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" placeholder="Enter investigation notes..." />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="form-label">Refund Amount ($) - If applicable</label>
              <input type="number" step="0.01" className="form-input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} min="0" />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", padding: "1rem", borderTop: "1px solid #E5E7EB" }}>
              <button onClick={() => handleAdminUpdate('Under Review')} className="btn" style={{ background: "#F59E0B", color: "white" }}>Mark Under Review</button>
              <button onClick={() => handleAdminUpdate('Replacement Initiated')} className="btn" style={{ background: "#3B82F6", color: "white" }}>Approve Replacement</button>
              <button onClick={() => handleAdminUpdate('Refund Initiated')} className="btn" style={{ background: "#10B981", color: "white" }}>Approve Refund</button>
              <button onClick={() => handleAdminUpdate('Rejected')} className="btn" style={{ background: "#EF4444", color: "white" }}>Reject RMA</button>
              
              <div style={{ flex: 1 }}></div>
              <button onClick={() => setShowAdminModal(false)} className="btn" style={{ background: "#F3F4F6", color: "#374151" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
