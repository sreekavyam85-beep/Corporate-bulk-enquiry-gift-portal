import { useState } from "react";

export default function Navbar({ currentView, setView, isAdmin, setIsAdmin }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleNavClick = (view) => {
    setView(view);
    setMobileOpen(false);
  };

  const logoSVG = (
    <svg
      className="moving-plane"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ minWidth: "28px" }}
    >
      <path
        d="M21.5 2.5L2 10.5L9.5 14.5L14.5 22L21.5 2.5Z"
        stroke="#0284c7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(2, 132, 199, 0.05)"
      />
      <path
        d="M9.5 14.5L21.5 2.5"
        stroke="#0284c7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <>
      {/* 1. Mobile Topbar Header (Visible only on mobile/tablet) */}
      <div className="mobile-topbar">
        <button
          className="mobile-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Sidebar Navigation"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            padding: 0,
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        <div className="sidebar-brand" onClick={() => handleNavClick("enquiry")}>
          <div className="sidebar-logo">{logoSVG}</div>
          <span className="sidebar-logo-text" style={{ fontSize: "1.2rem" }}>Paper Plane</span>
        </div>
        <div style={{ width: 24 }} />
      </div>

      {/* 2. Backdrop dim overlay (Visible only on mobile when sidebar is open) */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* 3. Main Premium Left Sidebar Navigation */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-header-wrapper">
          <div className="sidebar-header" onClick={() => !collapsed ? handleNavClick("enquiry") : null}>
            <div className="sidebar-brand">
              <div className="sidebar-logo">{logoSVG}</div>
              {!collapsed && (
                <div className="sidebar-brand-details">
                  <span className="sidebar-logo-text">Paper Plane</span>
                  <div className="sidebar-subtext">Bulk Gifting</div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Hamburger button for collapsing */}
          <button
            className="desktop-hamburger"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse Navigation Menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1E3A5F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${currentView === "enquiry" ? "active" : ""}`}
            onClick={() => handleNavClick("enquiry")}
            id="nav-enquiry-form"
            title="Enquiry Form"
          >
            <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>📋</span>
            {!collapsed && <span>Enquiry Form</span>}
          </button>
          
          {isAdmin && (
            <>
              <button
                className={`sidebar-link ${currentView === "workflow" ? "active" : ""}`}
                onClick={() => handleNavClick("workflow")}
                id="nav-workflow"
                title="Workflow Screen"
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>📈</span>
                {!collapsed && <span>Workflow Screen</span>}
              </button>
              <button
                className={`sidebar-link ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => handleNavClick("dashboard")}
                id="nav-dashboard"
                title="Sales Dashboard"
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>📊</span>
                {!collapsed && <span>Sales Dashboard</span>}
              </button>
            </>
          )}
          
          
          {/* Advanced Interfaces */}
          
          <button
            className={`sidebar-link ${currentView === "personalization" ? "active" : ""}`}
            onClick={() => handleNavClick("personalization")}
            title="Product Personalization"
          >
            <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>✍️</span>
            {!collapsed && <span>Personalization</span>}
          </button>
          
          <button
            className={`sidebar-link ${currentView === "approval-tracker" ? "active" : ""}`}
            onClick={() => handleNavClick("approval-tracker")}
            title="Design Approval Tracker"
          >
            <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>✅</span>
            {!collapsed && <span>Design Approvals</span>}
          </button>
          
          {isAdmin && (
            <>
              <button
                className={`sidebar-link ${currentView === "inventory" ? "active" : ""}`}
                onClick={() => handleNavClick("inventory")}
                title="Inventory Screen"
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>📦</span>
                {!collapsed && <span>Inventory</span>}
              </button>
              
              <button
                className={`sidebar-link ${currentView === "calendar" ? "active" : ""}`}
                onClick={() => handleNavClick("calendar")}
                title="Occasion Calendar"
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>📅</span>
                {!collapsed && <span>Calendar</span>}
              </button>
            </>
          )}
          
          <button
            className={`sidebar-link ${currentView === "returns" ? "active" : ""}`}
            onClick={() => handleNavClick("returns")}
            title="Return Request Page"
          >
            <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>↩️</span>
            {!collapsed && <span>Return Requests</span>}
          </button>

          <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
            {isAdmin ? (
              <button
                className="sidebar-link"
                onClick={() => { setIsAdmin(false); handleNavClick("enquiry"); }}
                title="Admin Logout"
                style={{ color: "#ef4444" }}
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>🔓</span>
                {!collapsed && <span>Logout</span>}
              </button>
            ) : (
              <button
                className={`sidebar-link ${currentView === "login" ? "active" : ""}`}
                onClick={() => handleNavClick("login")}
                title="Admin Login"
                style={{ color: "#0284c7" }}
              >
                <span style={{ fontSize: "1.25rem", minWidth: "24px", display: "inline-block", textAlign: "center" }}>🔐</span>
                {!collapsed && <span>Admin Login</span>}
              </button>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
