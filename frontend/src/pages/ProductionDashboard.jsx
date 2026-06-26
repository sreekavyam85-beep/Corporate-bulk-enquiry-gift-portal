import KPICard from "../components/KPICard";

export default function ProductionDashboard() {
  return (
    <div className="animated-fade">
      <div style={styles.headerPanel}>
        <div>
          <h2 style={styles.title}>Production Dashboard</h2>
          <p style={styles.subtitle}>Assembly & Inventory Management</p>
        </div>
      </div>

      <div style={styles.kpiContainer}>
        <KPICard title="Active Orders" count={5} icon="📦" color="#0284c7" />
        <KPICard title="Low Stock Alerts" count={2} icon="⚠️" color="#ef4444" />
        <KPICard title="Units Assembled" count={1250} icon="🛠️" color="#10b981" />
      </div>

      <div className="card premium-card hover-lift" style={{ padding: "2rem" }}>
        <h3>Production Pipeline (Placeholder)</h3>
        <p>This section will manage assembly workflows, inventory checks, and packaging schedules.</p>
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
