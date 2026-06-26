
export default function LoadingSpinner({ message = "Loading data, please wait..." }) {
  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.message}>{message}</p>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1rem",
    width: "100%",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f0f9ff",
    borderTop: "4px solid #0284c7",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  message: {
    marginTop: "1rem",
    fontSize: "0.95rem",
    color: "#64748b",
    fontWeight: 500,
  },
};

// Inject custom keyframes for the spinner animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
