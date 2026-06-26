
export default function KPICard({ title, count, icon, color = "#0284c7" }) {
  return (
    <div style={styles.card} className="card premium-card hover-lift animated-fade">
      <div style={styles.content}>
        <span style={styles.title}>{title}</span>
        <span style={{ ...styles.count, color }}>{count}</span>
      </div>
      <div style={{ ...styles.iconContainer, backgroundColor: `${color}12` }}>
        <span style={{ ...styles.icon, color }}>{icon}</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    margin: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    flex: "1 1 200px",
    minWidth: "200px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  title: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  count: {
    fontSize: "2.25rem",
    fontWeight: 800,
    lineHeight: 1,
  },
  iconContainer: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "transform 0.2s ease",
  },
  icon: {
    fontSize: "1.65rem",
  },
};
