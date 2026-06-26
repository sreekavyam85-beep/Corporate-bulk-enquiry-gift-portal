import KPICard from "../components/KPICard";

export default function DesignerDashboard() {
  return (
    <div className="animated-fade">
      <div style={styles.headerPanel}>
        <div>
          <h2 style={styles.title}>Designer Dashboard</h2>
          <p style={styles.subtitle}>Artwork & Branding Pipeline</p>
        </div>
      </div>

      <div style={styles.kpiContainer}>
        <KPICard title="Pending Artworks" count={8} icon="🎨" color="#8b5cf6" />
        <KPICard title="Awaiting Client Approval" count={4} icon="👀" color="#f59e0b" />
        <KPICard title="Approved Designs" count={15} icon="✅" color="#10b981" />
      </div>

      <div className="card premium-card hover-lift" style={{ padding: "2rem" }}>
        <h3>Design Tasks queue (Placeholder)</h3>
        <p>This section will list incoming design requirements and allow artwork upload/versioning.</p>
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
