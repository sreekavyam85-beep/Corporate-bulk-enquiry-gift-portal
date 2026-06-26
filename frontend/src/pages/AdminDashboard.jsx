import KPICard from "../components/KPICard";

export default function AdminDashboard() {
  return (
    <div className="animated-fade">
      <div style={styles.headerPanel}>
        <div>
          <h2 style={styles.title}>Gift Store Admin Dashboard</h2>
          <p style={styles.subtitle}>System Overview & Administration</p>
        </div>
      </div>

      <div style={styles.kpiContainer}>
        <KPICard title="Active Users" count={12} icon="👥" color="#0284c7" />
        <KPICard title="Total Revenue" count={"$14,500"} icon="💰" color="#10b981" />
        <KPICard title="Pending Approvals" count={3} icon="⏳" color="#f59e0b" />
      </div>

      <div className="card premium-card hover-lift" style={{ padding: "2rem" }}>
        <h3>System Logs & Configuration</h3>
        <p>This section will contain system logs, user management, and global configuration settings.</p>
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
