import { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hardcoded secure check for the prototype
    if (username === "admin" && password === "password123") {
      onLogin();
    } else {
      setError("Invalid username or password. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <div className="card premium-card" style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.5 2.5L2 10.5L9.5 14.5L14.5 22L21.5 2.5Z"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="rgba(2, 132, 199, 0.1)"
              />
              <path
                d="M9.5 14.5L21.5 2.5"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={styles.title}>Admin Portal Login</h2>
          <p style={styles.subtitle}>Sign in to manage bulk gifting pipelines.</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              style={styles.input}
            />
          </div>
          <div className="form-group">
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              style={styles.input}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
            🔒 Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100%",
    width: "100%",
    padding: "2rem",
    backgroundColor: "#f8fafc"
  },
  loginCard: {
    width: "100%",
    maxWidth: "450px",
    padding: "3rem 2.5rem",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  logo: {
    display: "inline-block",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "0.95rem",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "0.5rem",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  submitBtn: {
    width: "100%",
    padding: "0.85rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: "500",
    marginBottom: "1.5rem",
    border: "1px solid #fecaca",
    textAlign: "center",
  }
};
