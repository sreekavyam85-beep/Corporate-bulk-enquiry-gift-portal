

export default function RecommendationPanel({
  recommendations = [],
  onGenerateGemini,
  isGeneratingGemini,
  onCopyFollowup,
}) {
  // Prefer Gemini, fallback to rule_based if Gemini isn't available
  const currentRec = recommendations.find((r) => r.source === "gemini") || recommendations.find((r) => r.source === "rule_based");

  return (
    <div className="card animated-fade" style={{ margin: 0, height: "100%" }}>
      <div style={styles.header}>
        <h3 className="card-title" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
          💡 Gifting Assistant Suggestions
        </h3>
        
        {/* Single Button to Generate (only show if no recommendations exist or we want to allow regen) */}
        {!currentRec && (
          <div style={styles.emptyGemini}>
            <span>🤖</span>
            <h4>Smart Gifting Assistant</h4>
            <p>Click below to generate custom smart gift recommendations, tailored quotes, and professional follow-up drafts based on the client's requirements.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onGenerateGemini}
              disabled={isGeneratingGemini}
              style={{ marginTop: "1rem" }}
            >
              {isGeneratingGemini ? "⚡ Preparing recommendations..." : "✨ Generate Smart Recommendations"}
            </button>
          </div>
        )}

        {currentRec && (
          <div className="animated-fade">
            <div style={styles.recSection}>
              <h4 style={styles.sectionHeader}>🎁 Package & Item Recommendations</h4>
              <pre style={styles.codeText}>{currentRec.recommendation_text}</pre>
            </div>

            <div style={styles.recSection}>
              <h4 style={styles.sectionHeader}>📊 Cost Rationale / Quotation Estimate</h4>
              <pre style={styles.codeText}>{currentRec.quotation_summary}</pre>
            </div>

            <div style={styles.recSection}>
              <div style={styles.followupHeader}>
                <h4 style={styles.sectionHeader}>✉️ Suggested Customer Follow-up Message</h4>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={styles.copyBtn}
                  onClick={() => onCopyFollowup(currentRec.followup_message)}
                >
                  📋 Copy Text
                </button>
              </div>
              <textarea
                style={styles.followupArea}
                value={currentRec.followup_message}
                readOnly
                rows="8"
              />
            </div>

            {currentRec && (
              <div style={{ marginTop: "1rem", textAlign: "right" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onGenerateGemini}
                  disabled={isGeneratingGemini}
                >
                  {isGeneratingGemini ? "⚡ Analyzing client data..." : "🔄 Regenerate Recommendations"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.85rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "1rem",
    marginBottom: "1.25rem",
  },
  tabContainer: {
    display: "flex",
    backgroundColor: "#f1f5f9",
    padding: "0.35rem",
    borderRadius: "10px",
  },
  tab: {
    border: "none",
    background: "none",
    padding: "0.45rem 1rem",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    boxShadow: "none",
  },
  tabActive: {
    backgroundColor: "#ffffff",
    color: "#0284c7",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
  },
  contentBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  emptyGemini: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center",
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-primary)",
    borderRadius: "12px",
    border: "2px dashed var(--blue-border)",
    fontSize: "0.95rem",
  },
  recSection: {
    marginBottom: "1.25rem",
  },
  sectionHeader: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--blue-primary)",
    marginBottom: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  codeText: {
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    fontSize: "0.925rem",
    backgroundColor: "var(--bg-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1rem",
    color: "var(--text-primary)",
    maxHeight: "220px",
    overflowY: "auto",
    lineHeight: 1.5,
  },
  followupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.65rem",
  },
  copyBtn: {
    padding: "0.35rem 0.75rem",
    fontSize: "0.75rem",
    borderRadius: "6px",
    boxShadow: "none",
  },
  followupArea: {
    width: "100%",
    backgroundColor: "var(--bg-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1rem",
    fontFamily: "inherit",
    fontSize: "0.925rem",
    color: "var(--text-primary)",
    outline: "none",
    resize: "none",
    lineHeight: 1.5,
  },
  regenerateContainer: {
    marginTop: "0.5rem",
  },
};
