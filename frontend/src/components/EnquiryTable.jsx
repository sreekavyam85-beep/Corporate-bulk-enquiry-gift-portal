import StatusBadge from "./StatusBadge";

export default function EnquiryTable({ enquiries, onViewDetails }) {
  if (!enquiries || enquiries.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📦</span>
        <h3>No Enquiries Found</h3>
        <p>There are no bulk gift enquiries matching the selected filter criteria.</p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="table-container animated-fade">
      <table>
        <thead>
          <tr>
            <th>Enquiry ID</th>
            <th>Company Name</th>
            <th>Category</th>
            <th style={{ textAlign: "right" }}>Quantity</th>
            <th style={{ textAlign: "right" }}>Budget</th>
            <th>Status</th>
            <th>Quote Status</th>
            <th>Priority</th>
            <th>Created Date</th>
            <th>Owner</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((enquiry) => (
            <tr key={enquiry.id}>
              <td style={{ fontWeight: 600, color: "#0284c7" }}>
                {enquiry.enquiry_code}
              </td>
              <td style={{ fontWeight: 500 }}>
                {enquiry.company_name}
              </td>
              <td>{enquiry.gift_category}</td>
              <td style={{ textAlign: "right", fontWeight: 500 }}>
                {enquiry.quantity.toLocaleString("en-IN")}
              </td>
              <td style={{ textAlign: "right", fontWeight: 500 }}>
                {formatCurrency(enquiry.budget_per_gift)}
              </td>
              <td>
                <StatusBadge type="status" value={enquiry.status} />
              </td>
              <td>
                <StatusBadge type="quotation" value={enquiry.quotation_status} />
              </td>
              <td>
                <StatusBadge type="priority" value={enquiry.priority} />
              </td>
              <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {formatDate(enquiry.created_at)}
              </td>
              <td style={{ fontWeight: 500 }}>
                {enquiry.owner || "Unassigned"}
              </td>
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn btn-secondary"
                  style={styles.actionBtn}
                  onClick={() => onViewDetails(enquiry.id)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "2px dashed var(--blue-border)",
    textAlign: "center",
    color: "var(--text-muted)",
  },
  emptyIcon: {
    fontSize: "3.5rem",
    marginBottom: "1.25rem",
    display: "block",
  },
  actionBtn: {
    padding: "0.45rem 1rem",
    fontSize: "0.85rem",
    borderRadius: "8px",
    boxShadow: "none",
  },
};
