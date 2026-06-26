import { useEffect, memo } from "react";

const MessageToast = memo(function MessageToast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getColors = () => {
    switch (type) {
      case "error":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          borderColor: "#fca5a5",
          icon: "❌"
        };
      case "info":
        return {
          backgroundColor: "#f0f9ff",
          color: "#0369a1",
          borderColor: "#bae6fd",
          icon: "ℹ️"
        };
      case "success":
      default:
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderColor: "#bbf7d0",
          icon: "✅"
        };
    }
  };

  const themeColors = getColors();

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor: themeColors.backgroundColor,
        color: themeColors.color,
        borderColor: themeColors.borderColor,
      }}
      className="animated-fade"
    >
      <span style={styles.icon}>{themeColors.icon}</span>
      <span style={styles.message}>{message}</span>
      <button style={styles.closeBtn} onClick={onClose}>
        ×
      </button>
    </div>
  );
});

export default MessageToast;

const styles = {
  toast: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "0.875rem 1.25rem",
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    zIndex: 1000,
    maxWidth: "350px",
  },
  icon: {
    fontSize: "1.15rem",
  },
  message: {
    fontSize: "0.9rem",
    fontWeight: 500,
    flex: 1,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "inherit",
    fontSize: "1.25rem",
    cursor: "pointer",
    fontWeight: "bold",
    padding: "0 0.25rem",
    lineHeight: 1,
  },
};
