import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import KPICard from "../components/KPICard";
import EnquiryTable from "../components/EnquiryTable";
import LoadingSpinner from "../components/LoadingSpinner";
import MessageToast from "../components/MessageToast";

export default function SalesDashboard({ onViewDetails }) {
  // KPI Metrics State
  const [metrics, setMetrics] = useState({
    total_enquiries: 0,
    pending_enquiries: 0,
    quotations_prepared: 0,
    followups_required: 0,
    converted_orders: 0,
    total_personalizations: 0,
    pending_approvals: 0,
    inventory_count: 0,
    low_stock: 0,
    upcoming_occasions: 0,
    pending_returns: 0
  });

  // Table Data State
  const [enquiries, setEnquiries] = useState([]);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Loading & Error States
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Fetch KPI Counts
  const fetchCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const counts = await api.getDashboardCounts();
      setMetrics(counts);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load dashboard metrics summary counts.");
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  // Fetch Enquiries List
  const fetchEnquiries = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const filters = {
        status: statusFilter,
        category: categoryFilter,
        start_date: startDate,
        end_date: endDate,
      };
      const list = await api.getEnquiries(filters);
      setEnquiries(list);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load bulk enquiry records list.");
    } finally {
      setIsLoadingTable(false);
    }
  }, [statusFilter, categoryFilter, startDate, endDate]);

  // Trigger load on mounting & filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCounts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEnquiries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEnquiries]);

  const handleRefresh = () => {
    setToastMsg("Refreshing data...");
    fetchCounts();
    fetchEnquiries();
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="animated-fade">
      {/* Toast Notifications */}
      {toastMsg && (
        <MessageToast message={toastMsg} onClose={() => setToastMsg("")} />
      )}

      {/* Header Panel */}
      <div style={styles.headerPanel}>
        <div>
          <h2 style={styles.title}>Corporate Sales Dashboard</h2>
          <p style={styles.subtitle}>Paper Plane Bulk Gifting Operations Hub</p>
        </div>
        <div style={styles.actions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            style={styles.actionBtn}
          >
            🔄 Refresh Data
          </button>
          <a
            href={api.getExportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={styles.actionBtn}
            onClick={() => setToastMsg("Exporting CSV report...")}
          >
            📥 Export CSV Report
          </a>
        </div>
      </div>

      {/* KPI Cards section */}
      {isLoadingCounts ? (
        <LoadingSpinner message="Aggregating metrics summary counts..." />
      ) : (
        <div style={styles.kpiContainer}>
          <KPICard
            title="Total Enquiries"
            count={metrics.total_enquiries}
            icon="📋"
            color="#0284c7"
          />
          <KPICard
            title="Pending Enquiries"
            count={metrics.pending_enquiries}
            icon="⏳"
            color="#f59e0b"
          />
          <KPICard
            title="Quotations Prepared"
            count={metrics.quotations_prepared}
            icon="📝"
            color="#8b5cf6"
          />
          <KPICard
            title="Follow-ups Required"
            count={metrics.followups_required}
            icon="📞"
            color="#f97316"
          />
          <KPICard
            title="Converted Orders"
            count={metrics.converted_orders}
            icon="🎉"
            color="#10b981"
          />
        </div>
      )}

      {/* Advanced Modules KPIs */}
      {!isLoadingCounts && (
        <div style={{ ...styles.kpiContainer, marginTop: "-1rem", marginBottom: "2rem" }}>
          <KPICard
            title="Personalizations"
            count={metrics.total_personalizations}
            icon="✍️"
            color="#6366f1"
          />
          <KPICard
            title="Design Approvals"
            count={metrics.pending_approvals}
            icon="✅"
            color="#ec4899"
          />
          <KPICard
            title="Total Inventory"
            count={metrics.inventory_count}
            icon="📦"
            color="#3b82f6"
          />
          <KPICard
            title="Low Stock"
            count={metrics.low_stock}
            icon="⚠️"
            color="#ef4444"
          />
          <KPICard
            title="Upcoming Occasions"
            count={metrics.upcoming_occasions}
            icon="📅"
            color="#14b8a6"
          />
          <KPICard
            title="Pending Returns"
            count={metrics.pending_returns}
            icon="↩️"
            color="#f59e0b"
          />
        </div>
      )}

      {/* Filter Workspace */}
      <div className="card premium-card hover-lift" style={styles.filterCard}>
        <h4 style={styles.filterTitle}>🔍 Filter Records</h4>
        <div style={styles.filterGrid}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Employee Kits">Employee Kits</option>
              <option value="Festival Hampers">Festival Hampers</option>
              <option value="Corporate Gifts">Corporate Gifts</option>
              <option value="Personalized Gifts">Personalized Gifts</option>
              <option value="Custom Hampers">Custom Hampers</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Enquiry Submitted">Enquiry Submitted</option>
              <option value="Package Selection">Package Selection</option>
              <option value="Branding Requirement Review">Branding Review</option>
              <option value="Quotation Prepared">Quotation Prepared</option>
              <option value="Follow-up Required">Follow-up Required</option>
              <option value="Order Converted">Order Converted</option>
              <option value="Quotation Rejected">Quotation Rejected</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                if (startDate && new Date(e.target.value) < new Date(startDate)) {
                  setToastMsg("End Date cannot be before Start Date.");
                  setEndDate("");
                } else {
                  setEndDate(e.target.value);
                }
              }}
            />
          </div>
        </div>

        {(categoryFilter || statusFilter || startDate || endDate) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearFilters}
            style={styles.clearBtn}
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Main Records Table */}
      {isLoadingTable ? (
        <LoadingSpinner message="Fetching matching enquiry records list..." />
      ) : errorMsg ? (
        <div style={styles.errorContainer} className="card premium-card">
          <span style={styles.errorIcon}>⚠️</span>
          <p>{errorMsg}</p>
        </div>
      ) : (
        <EnquiryTable enquiries={enquiries} onViewDetails={onViewDetails} />
      )}
    </div>
  );
}

const styles = {
  headerPanel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1.25rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  actionBtn: {
    fontSize: "0.9rem",
    borderRadius: "10px",
  },
  kpiContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  filterCard: {
    padding: "1.5rem 2rem 2rem 2rem",
    marginBottom: "2rem",
  },
  filterTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.5rem",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.25rem",
    alignItems: "end",
  },
  clearBtn: {
    marginTop: "1.25rem",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  errorContainer: {
    color: "#991b1b",
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    padding: "3rem",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: "2.5rem",
    display: "block",
    marginBottom: "0.75rem",
  },
};
