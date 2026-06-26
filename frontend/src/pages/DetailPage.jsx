import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import MessageToast from "../components/MessageToast";
import QuotationForm from "../components/QuotationForm";
import RecommendationPanel from "../components/RecommendationPanel";

const STEPPER_STAGES = [
  { key: "Enquiry Submitted", label: "Intake" },
  { key: "Package Selection", label: "Package" },
  { key: "Branding Requirement Review", label: "Branding" },
  { key: "Quotation Prepared", label: "Quotation" },
  { key: "Follow-up Required", label: "Follow-up" },
  { key: "Order Converted", label: "Converted" },
];

const getStageIndex = (statusValue) => {
  let cleanVal = statusValue;
  if (cleanVal === "Quotation Sent") cleanVal = "Quotation Prepared";
  if (cleanVal === "Follow-up Sent") cleanVal = "Follow-up Required";
  if (cleanVal === "Branding Review") cleanVal = "Branding Requirement Review";
  
  const idx = STEPPER_STAGES.findIndex(s => s.key === cleanVal);
  if (idx !== -1) return idx;
  if (statusValue === "Quotation Rejected") return 5;
  return 0;
};

export default function DetailPage({ enquiryId, onBack }) {
  const [data, setData] = useState(null); // { enquiry, quotation, recommendations, workflow_history, email_logs }

  const { enquiry, quotation } = data || {};

  const pricingBreakdown = useMemo(() => {
    if (!enquiry) return { isEstimated: true, base: 0, branding: 0, packaging: 0, delivery: 0, gst: 0, total: 0, subtotal: 0 };
    const qty = Number(enquiry.quantity) || 0;
    
    const basePriceVal = quotation ? (Number(quotation.price_per_gift) || 0) : (Number(enquiry.budget_per_gift) || 0);
    const branding = quotation ? (Number(quotation.branding_cost) || 0) : (enquiry.branding_required === "Yes" ? 50 * qty : 0);
    const packaging = quotation ? (Number(quotation.packaging_cost) || 0) : 80 * qty;
    const delivery = quotation ? (Number(quotation.delivery_cost) || 0) : 35 * qty;
    const gstPct = quotation ? (Number(quotation.gst_percentage) || 18) : 18;
    
    const base = basePriceVal * qty;
    const subtotal = base + branding + packaging + delivery;
    const gst = subtotal * (gstPct / 100);
    const total = subtotal + gst;
    
    return {
      isEstimated: !quotation,
      base,
      branding,
      packaging,
      delivery,
      gst,
      total,
      subtotal
    };
  }, [enquiry, quotation]);
  
  // Page states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  // Workflow update states
  const [statusVal, setStatusVal] = useState("");
  const [priorityVal, setPriorityVal] = useState("");
  const [ownerVal, setOwnerVal] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [isUpdatingWorkflow, setIsUpdatingWorkflow] = useState(false);

  // AI & follow-up trigger states
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  
  // Custom Follow-up modal/form fields
  const [customFollowup, setCustomFollowup] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [sendFollowupEmail, setSendFollowupEmail] = useState(false);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const details = await api.getEnquiryDetail(enquiryId);
      setData(details);
      
      // Prepopulate workflow editing fields
      setStatusVal(details.enquiry.status || "");
      setPriorityVal(details.enquiry.priority || "");
      setOwnerVal(details.enquiry.owner || "");
      
      // Prepopulate follow-up drafts based on recommendation
      const latestRec = details.recommendations.find(r => r.source === "gemini") || 
                        details.recommendations.find(r => r.source === "rule_based");
      if (latestRec) {
        setCustomFollowup(latestRec.followup_message || "");
        setCustomSubject(`Bulk enquiry update - Reference ${details.enquiry.enquiry_code} | Paper Plane`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve the detailed enquiry record.");
    } finally {
      setIsLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDetails]);

  // Handle Workflow Details Update (Status, Owner, Priority)
  const handleUpdateWorkflow = async (e) => {
    e.preventDefault();
    setIsUpdatingWorkflow(true);
    try {
      await api.processEnquiry(enquiryId, {
        status: statusVal,
        priority: priorityVal,
        owner: ownerVal,
        action_note: actionNote.trim() || `State updated to '${statusVal}' with owner '${ownerVal}'.`
      });
      showToast("Workflow and status parameters updated successfully.", "success");
      setActionNote("");
      // Refresh details
      const details = await api.getEnquiryDetail(enquiryId);
      setData(details);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  // Handle Quotation Saving
  const handleSaveQuotation = async (quotationPayload) => {
    setIsSavingQuote(true);
    try {
      const res = await api.saveQuotation(enquiryId, quotationPayload);
      showToast(
        res.email_sent 
          ? "Quotation proposal saved and email successfully sent to customer!" 
          : "Quotation proposal saved successfully as draft.", 
        "success"
      );
      // Refresh details
      const details = await api.getEnquiryDetail(enquiryId);
      setData(details);
      setStatusVal(details.enquiry.status);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSavingQuote(false);
    }
  };

  // Handle custom followup trigger
  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    if (!customFollowup.trim()) {
      showToast("Follow-up email content is required.", "error");
      return;
    }
    
    setIsSavingFollowup(true);
    try {
      const res = await api.saveFollowup(enquiryId, {
        followup_message: customFollowup,
        subject: customSubject,
        send_email: sendFollowupEmail
      });
      
      showToast(
        res.email_sent 
          ? "Follow-up notes saved and SMTP email sent to company contact!" 
          : "Follow-up notes successfully saved in system files.", 
        "success"
      );
      setSendFollowupEmail(false);
      // Refresh details
      const details = await api.getEnquiryDetail(enquiryId);
      setData(details);
      setStatusVal(details.enquiry.status);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSavingFollowup(false);
    }
  };

  // Call Gemini Suggestions API
  const handleGenerateGemini = async () => {
    setIsGeneratingGemini(true);
    try {
      await api.getGeminiSuggestion(enquiryId, true);
      // We unified the success message so the user never sees technical errors or fallback warnings.
      showToast("Smart Gifting recommendations generated successfully!", "success");
      
      // Refresh details
      const details = await api.getEnquiryDetail(enquiryId);
      setData(details);
      
      // Prepopulate follow-up drafts based on new AI results
      const geminiRec = details.recommendations.find(r => r.source === "gemini");
      if (geminiRec) {
        setCustomFollowup(geminiRec.followup_message);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsGeneratingGemini(false);
    }
  };

  // Prepopulate the custom follow-up text area when copying
  const handleCopyFollowup = (text) => {
    setCustomFollowup(text);
    showToast("Follow-up text copied to message workspace below!", "info");
    // Also scroll down to follow up editor
    const editor = document.getElementById("follow-up-editor");
    if (editor) editor.scrollIntoView({ behavior: "smooth" });
  };

  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (isLoading) {
    return <LoadingSpinner message="Fetching customer records, logs, and billing history..." />;
  }

  if (errorMsg || !data) {
    return (
      <div style={styles.errorContainer} className="card premium-card">
        <h3>⚠️ Detailed record retrieval failed</h3>
        <p>{errorMsg || "Record data could not be parsed."}</p>
        <button className="btn btn-primary" onClick={onBack} style={{ marginTop: "1rem" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { recommendations, workflow_history, email_logs } = data;

  const totalForPercent = pricingBreakdown.total || 1;
  const pBase = (pricingBreakdown.base / totalForPercent) * 100;
  const pBranding = (pricingBreakdown.branding / totalForPercent) * 100;
  const pPackaging = (pricingBreakdown.packaging / totalForPercent) * 100;
  const pDelivery = (pricingBreakdown.delivery / totalForPercent) * 100;
  const pGst = (pricingBreakdown.gst / totalForPercent) * 100;

  return (
    <div className="animated-fade">
      {toastMsg && (
        <MessageToast message={toastMsg} type={toastType} onClose={() => setToastMsg("")} />
      )}

      {/* Detail header */}
      <div style={styles.headerPanel}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={styles.backBtn}>
            ⬅️ Back to Dashboard
          </button>
          <div style={styles.titleRow}>
            <h2 style={styles.title}>{enquiry.company_name}</h2>
            <StatusBadge type="status" value={enquiry.status} />
            <StatusBadge type="priority" value={enquiry.priority} />
          </div>
          <p style={styles.subtitle}>Enquiry Code: <strong>{enquiry.enquiry_code}</strong> | Submitted: {enquiry.created_at}</p>
        </div>
      </div>

      <div className="workflow-dashboard-grid">
        
        {/* ROW 1: Full Width Overview */}
        <div className="card premium-card hover-lift" style={{ margin: 0, gridColumn: "1 / -1" }}>
          <h3 className="card-title">
            <span>📈</span> Pipeline Progress & Pricing Analytics
          </h3>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={styles.subHeading}>Workflow Stage Progress</h4>
            <div className="stepper-container">
              <div className="stepper-line">
                <div 
                  className="stepper-line-progress" 
                  style={{ 
                    width: `${(getStageIndex(enquiry.status) / (STEPPER_STAGES.length - 1)) * 100}%`,
                    backgroundColor: enquiry.status === "Quotation Rejected" ? "#ef4444" : "var(--blue-primary)"
                  }} 
                />
              </div>
              {STEPPER_STAGES.map((stage, idx) => {
                const activeIdx = getStageIndex(enquiry.status);
                const isCompleted = idx < activeIdx;
                const isActive = idx === activeIdx;
                const isRejected = enquiry.status === "Quotation Rejected";
                
                let stepClass = "";
                if (isCompleted) stepClass = "completed";
                else if (isActive) stepClass = "active";

                const bubbleStyle = {};
                if (isActive && isRejected) {
                  bubbleStyle.backgroundColor = "#ef4444";
                  bubbleStyle.borderColor = "#ef4444";
                  bubbleStyle.color = "#ffffff";
                  bubbleStyle.animation = "stepper-pulse-red 2s infinite";
                }

                return (
                  <div key={stage.key} className={`stepper-item ${stepClass}`}>
                    <div className="stepper-bubble" style={bubbleStyle}>
                      {isCompleted ? "✓" : isRejected && isActive ? "✗" : idx + 1}
                    </div>
                    <div 
                      className="stepper-label" 
                      style={isActive && isRejected ? { color: "#ef4444" } : {}}
                    >
                      {isRejected && isActive ? "Rejected" : stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
            <h4 style={styles.subHeading}>
              {pricingBreakdown.isEstimated ? "💰 Estimated Budget Allocation" : "💵 Quote Cost Composition"}
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {pricingBreakdown.isEstimated 
                ? "Based on client's budget per gift limit and standard options."
                : `Composition of proposed quote: ${quotation.proposed_package || "Tailored Bundle"}`}
            </p>
            
            <div className="composition-track">
              {pBase > 0 && (
                <div 
                  className="composition-segment" 
                  style={{ width: `${pBase}%`, backgroundColor: "#3b82f6" }} 
                  title={`Base Gift Items: ${formatCurrency(pricingBreakdown.base)} (${pBase.toFixed(1)}%)`}
                />
              )}
              {pBranding > 0 && (
                <div 
                  className="composition-segment" 
                  style={{ width: `${pBranding}%`, backgroundColor: "#8b5cf6" }} 
                  title={`Branding Add-ons: ${formatCurrency(pricingBreakdown.branding)} (${pBranding.toFixed(1)}%)`}
                />
              )}
              {pPackaging > 0 && (
                <div 
                  className="composition-segment" 
                  style={{ width: `${pPackaging}%`, backgroundColor: "#f59e0b" }} 
                  title={`Premium Packaging: ${formatCurrency(pricingBreakdown.packaging)} (${pPackaging.toFixed(1)}%)`}
                />
              )}
              {pDelivery > 0 && (
                <div 
                  className="composition-segment" 
                  style={{ width: `${pDelivery}%`, backgroundColor: "#10b981" }} 
                  title={`Delivery & Logistics: ${formatCurrency(pricingBreakdown.delivery)} (${pDelivery.toFixed(1)}%)`}
                />
              )}
              {pGst > 0 && (
                <div 
                  className="composition-segment" 
                  style={{ width: `${pGst}%`, backgroundColor: "#ef4444" }} 
                  title={`GST / Taxes: ${formatCurrency(pricingBreakdown.gst)} (${pGst.toFixed(1)}%)`}
                />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
              <div style={styles.legendItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3b82f6" }} />
                  <span style={styles.legendLabel}>Base Items</span>
                </div>
                <span style={styles.legendVal}>{formatCurrency(pricingBreakdown.base)}</span>
              </div>
              {pricingBreakdown.branding > 0 && (
                <div style={styles.legendItem}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                    <span style={styles.legendLabel}>Branding</span>
                  </div>
                  <span style={styles.legendVal}>{formatCurrency(pricingBreakdown.branding)}</span>
                </div>
              )}
              <div style={styles.legendItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <span style={styles.legendLabel}>Packaging</span>
                </div>
                <span style={styles.legendVal}>{formatCurrency(pricingBreakdown.packaging)}</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <span style={styles.legendLabel}>Logistics</span>
                </div>
                <span style={styles.legendVal}>{formatCurrency(pricingBreakdown.delivery)}</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                  <span style={styles.legendLabel}>GST Taxes</span>
                </div>
                <span style={styles.legendVal}>{formatCurrency(pricingBreakdown.gst)}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", padding: "0.75rem 1rem", backgroundColor: "var(--blue-light)", borderRadius: "8px", border: "1px solid var(--blue-border)" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                {pricingBreakdown.isEstimated ? "Total Estimated BudgetCap:" : "Quote Grand Total:"}
              </span>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--blue-hover)" }}>
                {formatCurrency(pricingBreakdown.total)}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
            <h4 style={styles.subHeading}>🎯 Order Priority Level</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <div style={{ flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, display: "flex", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: enquiry.priority === "Low" ? "33%" : enquiry.priority === "Medium" ? "66%" : "100%", 
                    height: "100%", 
                    backgroundColor: enquiry.priority === "Low" ? "#22c55e" : enquiry.priority === "Medium" ? "#f97316" : "#ef4444",
                    transition: "width 0.4s ease, background-color 0.4s ease"
                  }} 
                />
              </div>
              <span style={{ 
                fontSize: "0.85rem", 
                fontWeight: 700, 
                color: enquiry.priority === "Low" ? "#22c55e" : enquiry.priority === "Medium" ? "#f97316" : "#ef4444" 
              }}>
                {enquiry.priority || "Medium"} Priority
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: Short Pair */}
        <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%" }}>
          <h3 className="card-title">
            <span>🏢</span> Corporate Profile & Contact
          </h3>
          <div style={styles.specGrid}>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Contact Person:</span>
              <span style={styles.specVal}>{enquiry.contact_person}</span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Company Email:</span>
              <span style={styles.specVal}><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Phone Number:</span>
              <span style={styles.specVal}>{enquiry.phone}</span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Assigned Owner:</span>
              <span style={{ ...styles.specVal, fontWeight: 700, color: "var(--blue-primary)" }}>{enquiry.owner || "Unassigned"}</span>
            </div>
          </div>
        </div>

        <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
          <h3 className="card-title">
            <span>⚙️</span> Update Pipeline State
          </h3>
          <form onSubmit={handleUpdateWorkflow} style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>Pipeline Status</label>
                  <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                    <option value="Enquiry Submitted">Enquiry Submitted</option>
                    <option value="Package Selection">Package Selection</option>
                    <option value="Branding Requirement Review">Branding Review</option>
                    <option value="Quotation Prepared">Quotation Prepared</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Order Converted">Order Converted (Close-Won)</option>
                    <option value="Quotation Rejected">Quotation Rejected (Close-Lost)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Order Priority</label>
                  <select value={priorityVal} onChange={(e) => setPriorityVal(e.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sales Owner</label>
                  <input
                    type="text"
                    value={ownerVal}
                    onChange={(e) => setOwnerVal(e.target.value)}
                    placeholder="Enter sales executive name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Action Log Note</label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g. Discussed preferences over phone, custom welcome cards accepted."
                />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary" style={{ width: "100%" }} disabled={isUpdatingWorkflow}>
              {isUpdatingWorkflow ? "Syncing..." : "💾 Update Pipeline State"}
            </button>
          </form>
        </div>

        {/* ROW 3: Medium Pair */}
        <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%" }}>
          <h3 className="card-title">
            <span>🎁</span> Enquiry Gifting Specifications
          </h3>
          <div style={styles.specGrid}>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Gift Category:</span>
              <span style={styles.specVal}>{enquiry.gift_category}</span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Quantity Required:</span>
              <span style={{ ...styles.specVal, fontWeight: 700 }}>{enquiry.quantity} units</span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Budget Per Gift:</span>
              <span style={{ ...styles.specVal, fontWeight: 700 }}>{formatCurrency(enquiry.budget_per_gift)}</span>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specLabel}>Delivery Date:</span>
              <span style={styles.specVal}>{enquiry.delivery_date}</span>
            </div>
          </div>
          
          <div style={styles.reqBlock}>
            <h4 style={styles.subHeading}>🎨 Branding Specifications:</h4>
            <p style={styles.reqText}>
              <strong>Branding Required:</strong> {enquiry.branding_required}
            </p>
            {enquiry.branding_required === "Yes" && (
              <div style={styles.brandingDetailGrid}>
                {enquiry.logo_path && (
                  <div style={{ gridColumn: "1 / -1", marginBottom: "0.75rem", borderBottom: "1px dashed var(--border-color)", paddingBottom: "0.75rem" }}>
                    <span style={styles.specLabel}>Uploaded Company Logo:</span>
                    <div style={styles.logoThumbnailContainer}>
                      <img 
                        src={`http://localhost:5000/${enquiry.logo_path}`} 
                        alt="Company Logo" 
                        style={styles.logoThumbnail} 
                      />
                      <a 
                        href={`http://localhost:5000/${enquiry.logo_path}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-secondary"
                        style={styles.viewLogoBtn}
                      >
                        🔍 View Full Size
                      </a>
                    </div>
                  </div>
                )}
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Company Name to Print:</span>
                  <strong style={styles.specVal}>{enquiry.brand_name_print || "Not specified"}</strong>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Tagline / Slogan:</span>
                  <span style={styles.specVal}>{enquiry.brand_tagline || "None"}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Printing Type:</span>
                  <span style={styles.specVal}>{enquiry.printing_type || "Screen Printing"}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Brand Colors:</span>
                  <span style={styles.specVal}>{enquiry.brand_colors || "Not specified"}</span>
                </div>
                {enquiry.branding_details && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                    <span style={styles.specLabel}>Placement & Details:</span>
                    <p style={styles.reqText}>{enquiry.branding_details}</p>
                  </div>
                )}
                {enquiry.packaging_branding && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                    <span style={styles.specLabel}>Packaging Branding Requirements:</span>
                    <p style={styles.reqText}>{enquiry.packaging_branding}</p>
                  </div>
                )}
                {enquiry.branding_instructions && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                    <span style={styles.specLabel}>Additional Branding Instructions:</span>
                    <p style={styles.reqText}>{enquiry.branding_instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {enquiry.personalization_requirements && (
            <div style={styles.reqBlock}>
              <h4 style={styles.subHeading}>🏷️ Personalization Requirements:</h4>
              <p style={styles.reqText}>{enquiry.personalization_requirements}</p>
            </div>
          )}

          {enquiry.packaging_requirements && (
            <div style={styles.reqBlock}>
              <h4 style={styles.subHeading}>📦 Packaging Requirements:</h4>
              <p style={styles.reqText}>{enquiry.packaging_requirements}</p>
            </div>
          )}

          {enquiry.additional_requirements && (
            <div style={styles.reqBlock}>
              <h4 style={styles.subHeading}>📝 Special Instructions / Notes:</h4>
              <p style={styles.reqText}>{enquiry.additional_requirements}</p>
            </div>
          )}
        </div>

        <div style={{ height: "100%" }}>
          <RecommendationPanel
            recommendations={recommendations}
            onGenerateGemini={handleGenerateGemini}
            isGeneratingGemini={isGeneratingGemini}
            onCopyFollowup={handleCopyFollowup}
          />
        </div>

        {/* ROW 4: Full Width Quotation */}
        <div style={{ gridColumn: "1 / -1" }}>
          <QuotationForm
            enquiry={enquiry}
            initialQuotation={quotation}
            onSave={handleSaveQuotation}
            isLoading={isSavingQuote}
          />
        </div>

        {/* ROW 5: Communications Pair */}
        <div className="card premium-card hover-lift" id="follow-up-editor" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
          <h3 className="card-title">
            <span>📞</span> Customer Communication Terminal
          </h3>
          
          {(() => {
            const qStatus = quotation?.quotation_status;
            const isFinalised = qStatus === "Approved" || qStatus === "Rejected";
            if (isFinalised) {
              return (
                <div style={styles.finalisedAlert}>
                  <span style={{ fontSize: "1.5rem" }}>🔒</span>
                  <div>
                    <strong style={{ display: "block" }}>Follow-up Locked</strong>
                    <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                      This enquiry's quotation is finalized as <strong>{qStatus}</strong>.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <form onSubmit={handleSaveFollowup} style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
            <div>
              <div className="form-group">
                <label>Email Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Subject of the email"
                  required
                  disabled={quotation?.quotation_status === "Approved" || quotation?.quotation_status === "Rejected"}
                />
              </div>

              <div className="form-group">
                <label>Draft Email Body Message</label>
                <textarea
                  value={customFollowup}
                  onChange={(e) => setCustomFollowup(e.target.value)}
                  placeholder="Paste or write follow up details here..."
                  rows="10"
                  required
                  disabled={quotation?.quotation_status === "Approved" || quotation?.quotation_status === "Rejected"}
                />
              </div>

              <div className="form-group" style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="sendFollowupEmail"
                  checked={sendFollowupEmail}
                  onChange={(e) => setSendFollowupEmail(e.target.checked)}
                  style={styles.checkbox}
                  disabled={quotation?.quotation_status === "Approved" || quotation?.quotation_status === "Rejected"}
                />
                <label htmlFor="sendFollowupEmail" style={styles.checkboxLabel}>
                  🚀 Dispatch this message immediately to client's email ({enquiry.email}) via Gmail SMTP.
                </label>
              </div>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "1rem" }} 
              disabled={isSavingFollowup || quotation?.quotation_status === "Approved" || quotation?.quotation_status === "Rejected"}
            >
              {isSavingFollowup ? "Processing..." : "💾 Save & Execute Follow-up Action"}
            </button>
          </form>
        </div>

        <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%" }}>
          <h3 className="card-title">
            <span>📧</span> Email Dispatch Logs
          </h3>
          {email_logs.length === 0 ? (
            <p style={styles.emptyHist}>No outbound email logs recorded.</p>
          ) : (
            <div style={styles.emailContainer}>
              {email_logs.map((log) => (
                <div key={log.id} style={styles.emailItem}>
                  <div style={styles.emailHeader}>
                    <span>To: <strong>{log.receiver_email}</strong></span>
                    <span style={{ 
                      ...styles.emailStatus, 
                      color: log.status.includes("Sent") ? "var(--priority-low-text)" : "var(--priority-high-text)",
                      backgroundColor: log.status.includes("Sent") ? "var(--priority-low-bg)" : "var(--priority-high-bg)" 
                    }}>
                      {log.status}
                    </span>
                  </div>
                  <div style={styles.emailSubject}>Sub: {log.subject}</div>
                  <div style={styles.emailDate}>Dispatched at: {log.sent_at}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 6: Full Width Action Logs */}
        <div className="card premium-card hover-lift" style={{ margin: 0, gridColumn: "1 / -1" }}>
          <h3 className="card-title">
            <span>📜</span> Workflow Action Logs
          </h3>
          <div style={{ ...styles.timeline, maxHeight: "400px", overflowY: "auto" }}>
            {workflow_history.length === 0 ? (
              <p style={styles.emptyHist}>No status progression logs recorded yet.</p>
            ) : (
              workflow_history.map((log) => (
                <div key={log.id} style={styles.timelineItem}>
                  <div style={styles.timelineBullet}></div>
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineHeader}>
                      <strong style={styles.timelineStage}>{log.stage}</strong>
                      <span style={styles.timelineDate}>{log.created_at}</span>
                    </div>
                    <p style={styles.timelineNote}>{log.action_note}</p>
                    {log.output && <div style={styles.timelineOutput}>{log.output}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  headerPanel: {
    marginBottom: "2rem",
  },
  backBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    marginBottom: "1rem",
    borderRadius: "8px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    flexWrap: "wrap",
    marginTop: "0.25rem",
  },
  title: {
    fontSize: "1.85rem",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    marginTop: "0.35rem",
    fontWeight: 500,
  },
  workspaceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
    alignItems: "start",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.25rem",
    marginTop: "0.5rem",
  },
  specItem: {
    display: "flex",
    flexDirection: "column",
    fontSize: "0.9rem",
    gap: "0.25rem",
  },
  specLabel: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  specVal: {
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  reqBlock: {
    marginTop: "1.5rem",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "1rem",
  },
  subHeading: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--blue-primary)",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  reqText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    position: "relative",
    paddingLeft: "1.5rem",
    borderLeft: "2px solid var(--blue-border)",
    marginLeft: "0.5rem",
    marginTop: "0.5rem",
  },
  timelineItem: {
    position: "relative",
  },
  timelineBullet: {
    position: "absolute",
    left: "-29px",
    top: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "var(--blue-primary)",
    border: "2px solid #ffffff",
    boxShadow: "0 0 0 3px var(--blue-border)",
  },
  timelineContent: {
    fontSize: "0.9rem",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.25rem",
  },
  timelineStage: {
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  timelineDate: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  timelineNote: {
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  timelineOutput: {
    fontSize: "0.78rem",
    color: "var(--blue-primary)",
    backgroundColor: "var(--blue-light)",
    padding: "0.35rem 0.625rem",
    borderRadius: "6px",
    marginTop: "0.375rem",
    display: "inline-block",
    border: "1px solid var(--blue-border)",
    fontWeight: 500,
  },
  emptyHist: {
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    fontStyle: "italic",
  },
  emailContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
    marginTop: "0.5rem",
  },
  emailItem: {
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "1rem",
    backgroundColor: "var(--bg-primary)",
    fontSize: "0.85rem",
  },
  emailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.35rem",
  },
  emailStatus: {
    fontWeight: 700,
    fontSize: "0.72rem",
    textTransform: "uppercase",
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
    letterSpacing: "0.025em",
  },
  emailSubject: {
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
  },
  emailDate: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  finalisedAlert: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "var(--priority-high-bg)",
    border: "1px solid #fee2e2",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    color: "var(--priority-high-text)",
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.65rem",
    margin: "1.25rem 0",
  },
  checkbox: {
    width: "auto",
    marginTop: "4px",
    cursor: "pointer",
  },
  checkboxLabel: {
    cursor: "pointer",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    userSelect: "none",
    fontWeight: 500,
  },
  errorContainer: {
    textAlign: "center",
    padding: "3rem 1.5rem",
  },
  brandingDetailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.85rem 1.25rem",
    marginTop: "0.85rem",
    padding: "1rem 1.25rem",
    backgroundColor: "var(--blue-light)",
    borderRadius: "12px",
    border: "1px solid var(--blue-border)",
  },
  logoThumbnailContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    marginTop: "0.5rem",
  },
  logoThumbnail: {
    width: "70px",
    height: "70px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    objectFit: "contain",
    backgroundColor: "#ffffff",
  },
  viewLogoBtn: {
    padding: "0.4rem 0.85rem",
    fontSize: "0.8rem",
    height: "fit-content",
    borderRadius: "6px",
    boxShadow: "none",
  },
  legendItem: {
    display: "flex",
    flexDirection: "column",
    fontSize: "0.85rem",
    gap: "0.15rem",
  },
  legendLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  legendVal: {
    color: "var(--text-primary)",
    fontWeight: 750,
    fontSize: "0.825rem",
  },
};
