import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import MessageToast from "../components/MessageToast";
import RecommendationPanel from "../components/RecommendationPanel";
import QuotationForm from "../components/QuotationForm";

const WORKFLOW_STAGES = [
  { key: "Enquiry Submitted", label: "1. Enquiry Submitted", desc: "Intake form received and logged." },
  { key: "Package Selection", label: "2. Package Selection", desc: "Select bundle configs based on budget." },
  { key: "Branding Requirement Review", label: "3. Branding Review", desc: "Audit logo layouts & customization." },
  { key: "Quotation Prepared", label: "4. Quotation Preparation", desc: "Itemize rates & compile client proposal." },
  { key: "Follow-up Required", label: "5. Follow-up", desc: "Execute negotiations and review revisions." },
  { key: "Order Converted", label: "6. Order Conversion", desc: "Customer approved proposal. Invoice logged." },
];

export default function WorkflowScreen({ preselectedEnquiryId, onViewDetails }) {
  const [enquiries, setEnquiries] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detailData, setDetailData] = useState(null); // Detailed data of selected enquiry

  // UI status states
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Follow-up & AI states
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  // Communication fields
  const [actionNote, setActionNote] = useState("");
  const [nextStageKey, setNextStageKey] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [followupMsg, setFollowupMsg] = useState("");
  const [followupSubject, setFollowupSubject] = useState("");
  const [sendSMTP, setSendSMTP] = useState(false);

  // Quotation handlers
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Autocomplete search states
  const [searchValue, setSearchValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const comboboxRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
  }, []);

  const handleSaveQuotation = async (payload) => {
    setIsSavingQuote(true);
    try {
      const res = await api.saveQuotation(selectedId, payload);
      showToast(
        res.email_sent 
          ? "Quotation proposal saved and email sent to client!" 
          : "Quotation draft generated and saved!", 
        "success"
      );
      // Refresh details
      fetchEnquiryDetails(selectedId);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSavingQuote(false);
    }
  };

  // 1. Fetch initial enquiries list
  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await api.getEnquiries();
      setEnquiries(data);
      if (data.length > 0) {
        // Default select the preselected ID or the first record
        const defaultId = preselectedEnquiryId || data[0].id;
        setSelectedId(defaultId.toString());
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load enquiries list.", "error");
    } finally {
      setIsLoadingList(false);
    }
  }, [preselectedEnquiryId, showToast]);

  // 2. Fetch selected enquiry details
  const fetchEnquiryDetails = useCallback(async (id) => {
    if (!id) return;
    setIsLoadingDetails(true);
    try {
      const details = await api.getEnquiryDetail(id);
      setDetailData(details);
      
      // Determine the next dropdown state default
      const currentStatus = details.enquiry.status;
      setNextStageKey(currentStatus);
      setOwner(details.enquiry.owner || "Unassigned");
      setPriority(details.enquiry.priority || "Medium");

      // Prepopulate follow-up drafts based on recommendation
      const latestRec = details.recommendations.find(r => r.source === "gemini") || 
                        details.recommendations.find(r => r.source === "rule_based");
      if (latestRec) {
        setFollowupMsg(latestRec.followup_message || "");
        setFollowupSubject(`Update on Bulk Gift Enquiry ${details.enquiry.enquiry_code} - Paper Plane`);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to retrieve pipeline details for this enquiry.", "error");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedId) {
        fetchEnquiryDetails(selectedId);
      } else {
        setDetailData(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedId, fetchEnquiryDetails]);

  // Sync search input value with selected enquiry
  useEffect(() => {
    if (selectedId && enquiries.length > 0) {
      const enq = enquiries.find((e) => e.id.toString() === selectedId.toString());
      if (enq) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchValue(`${enq.enquiry_code} — ${enq.company_name}`);
      }
    }
  }, [selectedId, enquiries]);

  // Handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEnquiries = enquiries.filter((enq) => {
    const searchLower = searchValue.toLowerCase();
    return (
      enq.enquiry_code.toLowerCase().includes(searchLower) ||
      enq.company_name.toLowerCase().includes(searchLower)
    );
  });

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
  };

  const selectEnquiry = (enq) => {
    setSelectedId(enq.id.toString());
    setSearchValue(`${enq.enquiry_code} — ${enq.company_name}`);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsDropdownOpen(true);
      }
      if (e.key === "Enter") {
        const exactMatch = enquiries.find(
          (enq) => enq.enquiry_code.toLowerCase() === searchValue.toLowerCase().trim()
        );
        if (exactMatch) {
          selectEnquiry(exactMatch);
        } else {
          showToast("Invalid Enquiry ID. Please enter a valid Enquiry ID.", "error");
        }
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredEnquiries.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredEnquiries.length) {
        selectEnquiry(filteredEnquiries[highlightedIndex]);
      } else {
        const exactMatch = enquiries.find(
          (enq) => enq.enquiry_code.toLowerCase() === searchValue.toLowerCase().trim()
        );
        if (exactMatch) {
          selectEnquiry(exactMatch);
        } else if (filteredEnquiries.length === 1) {
          selectEnquiry(filteredEnquiries[0]);
        } else {
          showToast("Invalid Enquiry ID. Please enter a valid Enquiry ID.", "error");
        }
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Handle advancing workflow stage
  const handleAdvanceStage = async (e) => {
    e.preventDefault();
    if (!nextStageKey) return;
    setIsProcessing(true);
    try {
      await api.processEnquiry(selectedId, {
        status: nextStageKey,
        owner: owner,
        priority: priority,
        action_note: actionNote.trim() || `Advanced pipeline status to '${nextStageKey}' via Assistant Board.`
      });
      showToast(`Workflow updated successfully.`, "success");
      setActionNote("");
      // Refresh details
      fetchEnquiryDetails(selectedId);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle saving and sending follow-up email
  const handleSendFollowup = async (e) => {
    e.preventDefault();
    if (!followupMsg.trim()) {
      showToast("Follow-up text message is required.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await api.saveFollowup(selectedId, {
        followup_message: followupMsg,
        subject: followupSubject,
        send_email: sendSMTP
      });
      showToast(
        res.email_sent 
          ? "Follow-up email dispatched via Gmail SMTP!" 
          : "Follow-up notes saved successfully.", 
        "success"
      );
      setSendSMTP(false);
      fetchEnquiryDetails(selectedId);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle AI suggestion generation
  const handleGenerateGemini = async () => {
    setIsGeneratingGemini(true);
    try {
      await api.getGeminiSuggestion(selectedId, true);
      showToast("Smart Gifting recommendations generated successfully!", "success");
      fetchEnquiryDetails(selectedId);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsGeneratingGemini(false);
    }
  };

  const handleCopyFollowup = (text) => {
    setFollowupMsg(text);
    showToast("Follow-up draft copied to editor below!", "info");
  };

  // Helper to determine active workflow indexes
  const getStageIndex = (statusValue) => {
    // Map database values if they slightly differ
    let cleanVal = statusValue;
    if (cleanVal === "Quotation Sent") cleanVal = "Quotation Prepared";
    if (cleanVal === "Follow-up Required" || cleanVal === "Follow-up Sent") cleanVal = "Follow-up Required";
    
    return WORKFLOW_STAGES.findIndex(s => s.key === cleanVal);
  };

  if (isLoadingList) {
    return <LoadingSpinner message="Loading workflow registry..." />;
  }

  return (
    <div className="workflow-page-container animated-fade">
      {toastMsg && (
        <MessageToast message={toastMsg} type={toastType} onClose={() => setToastMsg("")} />
      )}

      {/* Select Enquiry Bar */}
      <div className="card premium-card" style={{ padding: "1.5rem 2rem", marginBottom: 0, overflow: "visible", zIndex: 10 }}>
        <div style={styles.selectorWrapper}>
          <label style={styles.selectLabel}>
            <span style={{ fontSize: "1.2rem", marginRight: "0.25rem" }}>🔍</span> Select Corporate Enquiry:
          </label>
          <div ref={comboboxRef} style={{ position: "relative", flex: "1 1 350px" }}>
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onClick={() => setIsDropdownOpen(true)}
              placeholder="Type Enquiry ID or Company..."
              style={{ ...styles.dropdown, width: "100%", boxSizing: "border-box" }}
            />
            {isDropdownOpen && (
              <ul style={styles.dropdownMenu}>
                {filteredEnquiries.length > 0 ? (
                  filteredEnquiries.map((enq, idx) => (
                    <li
                      key={enq.id}
                      onClick={() => selectEnquiry(enq)}
                      style={{
                        ...styles.dropdownItem,
                        backgroundColor: idx === highlightedIndex ? "var(--blue-light)" : "transparent",
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <strong>{enq.enquiry_code}</strong> — {enq.company_name} ({enq.gift_category})
                    </li>
                  ))
                ) : (
                  <li style={{ ...styles.dropdownItem, color: "var(--text-muted)", cursor: "default" }}>
                    No matching enquiries found.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!detailData ? (
        <div style={styles.emptyState} className="card premium-card">
          <span style={styles.emptyIcon}>✈️</span>
          <h3>No Active Enquiry Selected</h3>
          <p>Please select a corporate enquiry from the dropdown above to manage its process workflow.</p>
        </div>
      ) : isLoadingDetails ? (
        <LoadingSpinner message="Opening pipeline stages..." />
      ) : (
        <>
          {/* Section 1: Workflow Timeline */}
          <div className="workflow-section-timeline">
            <div className="card premium-card" style={{ padding: "2rem", margin: 0 }}>
              <h3 style={styles.sectionHeader}>
                <span style={{ fontSize: "1.25rem" }}>📈</span> Corporate Gifting Workflow
              </h3>
              <div className="workflow-pipeline-board">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const currentActiveIdx = getStageIndex(detailData.enquiry.status);
                  const isCompleted = idx < currentActiveIdx;
                  const isActive = idx === currentActiveIdx;
                  
                  let stepClass = "muted";
                  let numBadgeStyle = styles.stepNumMuted;
                  if (isCompleted) {
                    stepClass = "completed";
                    numBadgeStyle = styles.stepNumCompleted;
                  } else if (isActive) {
                    stepClass = "active";
                    numBadgeStyle = styles.stepNumActive;
                  }

                  return (
                    <div key={stage.key} className={`workflow-step-card ${stepClass}`}>
                      <div style={{ ...styles.stepNum, ...numBadgeStyle, marginBottom: "0.75rem" }}>
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <div className="workflow-step-title">{stage.label}</div>
                      <div className="workflow-step-desc">{stage.desc}</div>
                      {isActive && <div style={styles.activeTag}>Active Stage</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout: Strict 2-Column Grid with Height Matching */}
          <div className="workflow-dashboard-grid">
            
            {/* ROW 1: Short Cards */}
            {/* Corporate Enquiry Details */}
            <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%" }}>
              <h3 className="card-title" style={{ borderBottom: "none", marginBottom: "0.5rem" }}>
                <span>📁</span> Corporate Enquiry Details
              </h3>
              <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                <div style={styles.quickOverview}>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Company:</span>
                    <span style={styles.overviewValue}>{detailData.enquiry.company_name}</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Contact:</span>
                    <span style={styles.overviewValue}>{detailData.enquiry.contact_person}</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Category:</span>
                    <span style={styles.overviewValue}>{detailData.enquiry.gift_category}</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Quantity:</span>
                    <span style={{ ...styles.overviewValue, fontWeight: 700 }}>{detailData.enquiry.quantity} items</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Budget Limit:</span>
                    <span style={{ ...styles.overviewValue, fontWeight: 700 }}>₹{Number(detailData.enquiry.budget_per_gift).toLocaleString("en-IN")}/gift</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Owner:</span>
                    <span style={styles.overviewValue}>{detailData.enquiry.owner || "Unassigned"}</span>
                  </div>
                  <div style={styles.overviewRow}>
                    <span style={styles.overviewLabel}>Priority:</span>
                    <StatusBadge type="priority" value={detailData.enquiry.priority} />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: "1.5rem", width: "100%" }}
                  onClick={() => onViewDetails(detailData.enquiry.id)}
                >
                  📁 Open Full Details File
                </button>
              </div>
            </div>

            {/* Workflow Status Update */}
            <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
              <h3 className="card-title">
                <span>⚡</span> Workflow Status Update
              </h3>
              <form onSubmit={handleAdvanceStage} style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
                <div>
                  <div className="form-group">
                    <label>Select Stage to Transition To</label>
                    <select
                      value={nextStageKey}
                      onChange={(e) => setNextStageKey(e.target.value)}
                    >
                      <option value="Enquiry Submitted">1. Enquiry Submitted</option>
                      <option value="Package Selection">2. Package Selection</option>
                      <option value="Branding Requirement Review">3. Branding Requirement Review</option>
                      <option value="Quotation Prepared">4. Quotation Prepared</option>
                      <option value="Follow-up Required">5. Follow-up</option>
                      <option value="Order Converted">6. Order Conversion (Close-Won)</option>
                      <option value="Quotation Rejected">Quotation Rejected (Close-Lost)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign Owner</label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="Enter sales executive name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Order Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Action Log Entry Note</label>
                    <textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Describe progress (e.g. Approved layout proofs, requested quote send)."
                      rows="3"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "💾 Update Stage"}
                </button>
              </form>
            </div>

            {/* ROW 2: Medium Cards */}
            {/* Gifting Assistant Suggestions */}
            <div style={{ height: "100%" }}>
              <RecommendationPanel
                recommendations={detailData.recommendations}
                onGenerateGemini={handleGenerateGemini}
                isGeneratingGemini={isGeneratingGemini}
                onCopyFollowup={handleCopyFollowup}
              />
            </div>

            {/* Send Customer Follow-up */}
            <div className="card premium-card hover-lift" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
              <h3 className="card-title">
                <span>📞</span> Send Customer Follow-up
              </h3>
              
              {(() => {
                const qStatus = detailData?.quotation?.quotation_status;
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

              <form onSubmit={handleSendFollowup} style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
                <div>
                  <div className="form-group">
                    <label>Subject Line</label>
                    <input
                      type="text"
                      value={followupSubject}
                      onChange={(e) => setFollowupSubject(e.target.value)}
                      required
                      disabled={detailData?.quotation?.quotation_status === "Approved" || detailData?.quotation?.quotation_status === "Rejected"}
                    />
                  </div>
                  <div className="form-group" style={{ display: "flex", flexDirection: "column" }}>
                    <label>Follow-up Message Draft</label>
                    <textarea
                      value={followupMsg}
                      onChange={(e) => setFollowupMsg(e.target.value)}
                      rows="6"
                      required
                      disabled={detailData?.quotation?.quotation_status === "Approved" || detailData?.quotation?.quotation_status === "Rejected"}
                    />
                  </div>
                  <div className="form-group" style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="sendSMTP"
                      checked={sendSMTP}
                      onChange={(e) => setSendSMTP(e.target.checked)}
                      style={styles.checkbox}
                      disabled={detailData?.quotation?.quotation_status === "Approved" || detailData?.quotation?.quotation_status === "Rejected"}
                    />
                    <label htmlFor="sendSMTP" style={styles.checkboxLabel}>
                      🚀 Dispatch this message immediately to client's email ({detailData.enquiry.email}) via Gmail SMTP.
                    </label>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: "100%", marginTop: "0.5rem" }} 
                  disabled={isProcessing || detailData?.quotation?.quotation_status === "Approved" || detailData?.quotation?.quotation_status === "Rejected"}
                >
                  {isProcessing ? "Processing..." : "💾 Save & Execute Follow-up Action"}
                </button>
              </form>
            </div>

            {/* ROW 3: Full Width - Custom Quotation Workspace */}
            <div style={{ gridColumn: "1 / -1" }}>
              <QuotationForm
                enquiry={detailData.enquiry}
                initialQuotation={detailData.quotation}
                onSave={handleSaveQuotation}
                isLoading={isSavingQuote}
              />
            </div>

            {/* ROW 4: Full Width - Action History */}
            <div className="card premium-card hover-lift" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <h3 className="card-title">
                <span>📜</span> Action History
              </h3>
              <div style={{ ...styles.historyLog, maxHeight: "300px" }}>
                {detailData.workflow_history.length === 0 ? (
                  <p style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: "0.9rem" }}>No history recorded.</p>
                ) : (
                  detailData.workflow_history.map((hist) => (
                    <div key={hist.id} style={styles.logItem}>
                      <div style={styles.logHeader}>
                        <span style={styles.logStage}>{hist.stage}</span>
                        <span style={styles.logTime}>{hist.created_at}</span>
                      </div>
                      <p style={styles.logNote}>{hist.action_note}</p>
                      {hist.output && <div style={styles.logOutput}>{hist.output}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  selectBar: {
    padding: "1.25rem 2rem",
    marginBottom: "1rem",
  },
  selectorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
    width: "100%",
  },
  selectLabel: {
    margin: 0,
    fontWeight: 700,
    fontSize: "1rem",
    color: "var(--text-secondary)",
    display: "inline-flex",
    alignItems: "center",
  },
  dropdown: {
    padding: "0.75rem 1rem",
    fontSize: "0.95rem",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    outline: "none",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    marginTop: "0.5rem",
    maxHeight: "300px",
    overflowY: "auto",
    zIndex: 50,
    listStyle: "none",
    padding: "0.5rem 0",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  },
  dropdownItem: {
    padding: "0.75rem 1rem",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    borderBottom: "1px solid #f8fafc",
  },
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
  },
  emptyIcon: {
    fontSize: "3.5rem",
    display: "block",
    marginBottom: "1rem",
  },
  pipelineCard: {
    gridColumn: "1 / -1",
    padding: "2rem",
  },
  sectionHeader: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  pipelineBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "1.25rem",
  },
  stepCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "1.25rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative",
    transition: "all var(--transition-fast)",
  },
  stepCardCompleted: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    color: "#166534",
  },
  stepCardActive: {
    backgroundColor: "var(--blue-light)",
    borderColor: "var(--blue-accent)",
    boxShadow: "0 0 0 4px var(--blue-glow)",
    color: "#0369a1",
  },
  stepCardMuted: {
    backgroundColor: "#ffffff",
    opacity: 0.75,
  },
  stepNum: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "0.85rem",
    fontWeight: 700,
    marginBottom: "0.75rem",
    transition: "all var(--transition-fast)",
  },
  stepNumCompleted: {
    backgroundColor: "#22c55e",
    color: "#ffffff",
  },
  stepNumActive: {
    backgroundColor: "#0284c7",
    color: "#ffffff",
  },
  stepNumMuted: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  stepLabel: {
    fontSize: "0.875rem",
    fontWeight: 700,
    marginBottom: "0.35rem",
  },
  stepDesc: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  activeTag: {
    position: "absolute",
    top: "-10px",
    backgroundColor: "var(--blue-primary)",
    color: "#ffffff",
    fontSize: "0.68rem",
    fontWeight: 700,
    padding: "0.2rem 0.625rem",
    borderRadius: "999px",
    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
  },
  quickOverview: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    fontSize: "0.925rem",
    marginTop: "0.5rem",
  },
  overviewRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "0.5rem",
  },
  overviewLabel: {
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  overviewValue: {
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  historyLog: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "350px",
    overflowY: "auto",
    paddingRight: "0.5rem",
  },
  logItem: {
    borderBottom: "1px dashed var(--border-color)",
    paddingBottom: "0.85rem",
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    marginBottom: "0.35rem",
  },
  logStage: {
    fontWeight: 700,
    color: "var(--blue-primary)",
  },
  logTime: {
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  logNote: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  logOutput: {
    fontSize: "0.8rem",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "0.35rem 0.625rem",
    borderRadius: "6px",
    marginTop: "0.35rem",
    display: "inline-block",
    border: "1px solid #e2e8f0",
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
}

