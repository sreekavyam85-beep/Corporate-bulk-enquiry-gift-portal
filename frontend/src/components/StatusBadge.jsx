import { memo } from 'react';

const StatusBadge = memo(function StatusBadge({ type, value }) {
  const getStyles = () => {
    if (type === "priority") {
      switch (value) {
        case "High":
          return {
            backgroundColor: "var(--priority-high-bg)",
            color: "var(--priority-high-text)",
            border: "1px solid #fee2e2",
          };
        case "Medium":
          return {
            backgroundColor: "var(--priority-medium-bg)",
            color: "var(--priority-medium-text)",
            border: "1px solid #ffedd5",
          };
        case "Low":
        default:
          return {
            backgroundColor: "var(--priority-low-bg)",
            color: "var(--priority-low-text)",
            border: "1px solid #dcfce7",
          };
      }
    } else if (type === "quotation") {
      switch (value) {
        case "Draft":
          return {
            backgroundColor: "#f1f5f9",
            color: "#475569",
            border: "1px solid #cbd5e1",
          };
        case "Sent":
          return {
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
            border: "1px solid #bae6fd",
          };
        case "Approved":
          return {
            backgroundColor: "var(--status-converted-bg)",
            color: "var(--status-converted-text)",
            border: "1px solid #bbf7d0",
          };
        case "Rejected":
          return {
            backgroundColor: "var(--status-rejected-bg)",
            color: "var(--status-rejected-text)",
            border: "1px solid #fecaca",
          };
        default:
          return {
            backgroundColor: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
          };
      }
    } else {
      // Type is status
      switch (value) {
        case "Enquiry Submitted":
          return {
            backgroundColor: "var(--status-submitted-bg)",
            color: "var(--status-submitted-text)",
          };
        case "Package Selection":
          return {
            backgroundColor: "var(--status-package-bg)",
            color: "var(--status-package-text)",
          };
        case "Branding Requirement Review":
          return {
            backgroundColor: "var(--status-branding-bg)",
            color: "var(--status-branding-text)",
          };
        case "Quotation Prepared":
        case "Quotation Sent":
          return {
            backgroundColor: "var(--status-quotation-bg)",
            color: "var(--status-quotation-text)",
          };
        case "Follow-up Required":
        case "Follow-up Sent":
        case "Follow-up":
          return {
            backgroundColor: "var(--status-followup-bg)",
            color: "var(--status-followup-text)",
          };
        case "Order Converted":
          return {
            backgroundColor: "var(--status-converted-bg)",
            color: "var(--status-converted-text)",
          };
        case "Quotation Rejected":
        default:
          return {
            backgroundColor: "var(--status-rejected-bg)",
            color: "var(--status-rejected-text)",
          };
      }
    }
  };

  const displayValue = type === "quotation" && !value ? "None" : value;

  return (
    <span
      className="badge"
      style={{
        ...styles.badge,
        ...getStyles(),
      }}
    >
      {type === "priority" && "⚠️ "}
      {type === "quotation" && "📄 "}
      {displayValue}
    </span>
  );
});

export default StatusBadge;

const styles = {
  badge: {
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
    letterSpacing: "0.025em",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  },
};
