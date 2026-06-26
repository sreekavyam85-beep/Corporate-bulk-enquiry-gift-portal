import KPICard from "../components/KPICard";

export default function DispatchDashboard() {
  return (
    <div className="animated-fade">
      <div style={styles.headerPanel}>
        <div>
          <h2 style={styles.title}>Dispatch Dashboard</h2>
          <p style={styles.subtitle}>Shipping & Logistics Operations</p>
        </div>
      </div>

      <div style={styles.kpiContainer}>
        <KPICard title="Pending Dispatch" count={12} icon="🚚" color="#f97316" />
        <KPICard title="In Transit" count={8} icon="📍" color="#0284c7" />
        <KPICard title="Delivered (This Month)" count={34} icon="🏁" color="#10b981" />
      </div>

      <div className="card premium-card hover-lift" style={{ padding: "2rem" }}>
        <h3>Shipping Schedule (Placeholder)</h3>
        <p>This section will track tracking IDs, dispatch schedules, and courier integration.</p>
      </div>
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
  kpiContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  }
};
