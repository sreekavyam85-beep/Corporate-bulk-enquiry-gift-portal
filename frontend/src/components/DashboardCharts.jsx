import { useMemo } from "react";

export default function DashboardCharts({ enquiries = [] }) {
  // 1. Process Status counts
  const statusData = useMemo(() => {
    const counts = {};
    enquiries.forEach((e) => {
      const status = e.status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });

    const colorsMap = {
      "Enquiry Submitted": "#475569",
      "Package Selection": "#0284c7",
      "Branding Requirement Review": "#8b5cf6",
      "Branding Review": "#8b5cf6",
      "Quotation Prepared": "#eab308",
      "Quotation Sent": "#0284c7",
      "Follow-up Required": "#f97316",
      "Follow-up Sent": "#f97316",
      "Order Converted": "#10b981",
      "Quotation Rejected": "#ef4444",
    };

    const total = enquiries.length;
    return Object.entries(counts).map(([name, val]) => ({
      name,
      value: val,
      percentage: total > 0 ? (val / total) * 100 : 0,
      color: colorsMap[name] || "#64748b",
    }));
  }, [enquiries]);

  // 2. Process Category counts
  const categoryData = useMemo(() => {
    const counts = {};
    enquiries.forEach((e) => {
      const cat = e.gift_category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = enquiries.length;
    return Object.entries(counts)
      .map(([name, val]) => ({
        name,
        value: val,
        percentage: total > 0 ? (val / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [enquiries]);

  // 3. Process Quote Status counts
  const quoteStatusData = useMemo(() => {
    const counts = { Draft: 0, Sent: 0, Approved: 0, Rejected: 0, "No Quote": 0 };
    enquiries.forEach((e) => {
      const status = e.quotation_status;
      if (!status) {
        counts["No Quote"]++;
      } else if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    const colorsMap = {
      Draft: "#64748b",
      Sent: "#3b82f6",
      Approved: "#10b981",
      Rejected: "#ef4444",
      "No Quote": "#cbd5e1",
    };

    const total = enquiries.length;
    return Object.entries(counts)
      .filter((entry) => entry[1] > 0 || enquiries.length === 0)
      .map(([name, val]) => ({
        name,
        value: val,
        percentage: total > 0 ? (val / total) * 100 : 0,
        color: colorsMap[name] || "#64748b",
      }));
  }, [enquiries]);

  // 4. Process Conversion Funnel Analytics
  const funnelData = useMemo(() => {
    const total = enquiries.length;
    let proposalsSent = 0;
    let ordersWon = 0;

    enquiries.forEach((e) => {
      if (e.quotation_status) {
        proposalsSent++;
      }
      if (e.status === "Order Converted" || e.quotation_status === "Approved") {
        ordersWon++;
      }
    });

    const convRate = total > 0 ? (ordersWon / total) * 100 : 0;

    return {
      total,
      proposalsSent,
      ordersWon,
      convRate,
    };
  }, [enquiries]);

  // 5. Process Trend data (Monthly Enquiry Trend)
  const trendData = useMemo(() => {
    const counts = {};
    enquiries.forEach((e) => {
      if (!e.created_at) return;
      // Extract Year and Month (YYYY-MM) from created_at
      const dateParts = e.created_at.split(" ")[0].split("-");
      if (dateParts.length < 2) return;
      const monthStr = `${dateParts[0]}-${dateParts[1]}`; // e.g., "2026-06"
      counts[monthStr] = (counts[monthStr] || 0) + 1;
    });

    // Formatter to show e.g. "Jun 2026"
    const formatMonth = (monthStr) => {
      try {
        const [year, month] = monthStr.split("-");
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      } catch {
        return monthStr;
      }
    };

    return Object.entries(counts)
      .map(([month, count]) => ({
        rawMonth: month,
        label: formatMonth(month),
        count,
      }))
      .sort((a, b) => new Date(a.rawMonth + "-01") - new Date(b.rawMonth + "-01"))
      .slice(-6); // Show last 6 months
  }, [enquiries]);

  // Helper to render Doughnut SVG segments
  const renderDoughnut = (data, total) => {
    if (total === 0 || data.length === 0) {
      return (
        <svg width="150" height="150" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={65} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          <text x="100" y="105" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">
            No Data
          </text>
        </svg>
      );
    }

    const r = 65;
    const circ = 2 * Math.PI * r; // ~408.4
    let accumulatedPercent = 0;

    return (
      <svg width="150" height="150" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {data.map((item, idx) => {
          const strokeLength = (item.percentage / 100) * circ;
          const strokeOffset = circ - strokeLength;
          const angle = accumulatedPercent * 360 - 90;
          accumulatedPercent += item.percentage / 100;

          return (
            <circle
              key={idx}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={item.color}
              strokeWidth="20"
              strokeDasharray={circ}
              strokeDashoffset={strokeOffset}
              transform={`rotate(${angle} 100 100)`}
              strokeLinecap={strokeLength > 5 ? "round" : "butt"}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            >
              <title>{`${item.name}: ${item.value} (${item.percentage.toFixed(1)}%)`}</title>
            </circle>
          );
        })}
        <text x="100" y="100" textAnchor="middle" fontSize="26" fill="var(--text-primary)" fontWeight="800">
          {total}
        </text>
        <text x="100" y="122" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontWeight="700" letterSpacing="0.05em">
          TOTALS
        </text>
      </svg>
    );
  };

  // Helper to render Trend SVG path
  const renderTrendArea = () => {
    if (trendData.length === 0) {
      return <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No trend data available</div>;
    }

    const width = 460;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...trendData.map((d) => d.count), 1);
    const stepX = trendData.length > 1 ? chartWidth / (trendData.length - 1) : chartWidth;

    // Build line path
    const points = trendData.map((d, idx) => {
      const x = paddingLeft + idx * stepX;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      return { x, y, val: d.count, label: d.label };
    });

    const linePath = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : "";

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--blue-accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + chartHeight * ratio;
          const valLabel = Math.round((1 - ratio) * maxVal);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontWeight="600">
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Gradient Area */}
        {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

        {/* Main Line */}
        {linePath && <path d={linePath} fill="none" stroke="var(--blue-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Data points & tooltips */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#ffffff"
              stroke="var(--blue-primary)"
              strokeWidth="2.5"
              style={{ transition: "r 0.15s ease" }}
            />
            {/* Show simple tooltips/labels above points */}
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-secondary)">
              {p.val}
            </text>
            {/* Date label at bottom */}
            <text x={p.x} y={height - 5} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-muted)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const totalEnquiries = enquiries.length;

  return (
    <div className="charts-grid animated-fade" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* First Row: Status & Category */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        
        {/* 1. Doughnut Chart: Enquiry Status */}
        <div className="chart-card">
          <h4 className="chart-title-text">
            <span>📊</span> Enquiry Status Distribution
          </h4>
          <div className="chart-container-inner" style={{ gap: "1.5rem", flexWrap: "wrap" }}>
            <div>{renderDoughnut(statusData, totalEnquiries)}</div>
            <div className="chart-legend-container" style={{ flex: 1, minWidth: "150px" }}>
              {statusData.map((item, idx) => (
                <div key={idx} className="chart-legend-item">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className="chart-legend-dot" style={{ backgroundColor: item.color }} />
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.value} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Bar Chart: Enquiries by Category */}
        <div className="chart-card">
          <h4 className="chart-title-text">
            <span>🎁</span> Enquiries by Category
          </h4>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", width: "100%", paddingRight: "0.5rem" }}>
            {categoryData.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                No categories available.
              </div>
            ) : (
              categoryData.map((item, idx) => (
                <div key={idx} className="bar-chart-row">
                  <span className="bar-chart-label" title={item.name}>
                    {item.name}
                  </span>
                  <div className="bar-chart-track">
                    <div className="bar-chart-fill" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="bar-chart-value">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Trend over time & Quote Status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        
        {/* 3. Line Chart: Monthly Enquiry Trend */}
        <div className="chart-card">
          <h4 className="chart-title-text">
            <span>📈</span> Monthly Enquiry Trend
          </h4>
          <div className="chart-container-inner">{renderTrendArea()}</div>
        </div>

        {/* 4. Doughnut Chart: Quote Status Distribution */}
        <div className="chart-card">
          <h4 className="chart-title-text">
            <span>📄</span> Quote Status Distribution
          </h4>
          <div className="chart-container-inner" style={{ gap: "1.5rem", flexWrap: "wrap" }}>
            <div>{renderDoughnut(quoteStatusData, totalEnquiries)}</div>
            <div className="chart-legend-container" style={{ flex: 1, minWidth: "150px" }}>
              {quoteStatusData.map((item, idx) => (
                <div key={idx} className="chart-legend-item">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className="chart-legend-dot" style={{ backgroundColor: item.color }} />
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.value} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Third Row: Funnel Conversion Analytics */}
      <div className="chart-card" style={{ minHeight: "300px" }}>
        <h4 className="chart-title-text">
          <span>🎉</span> Order Conversion Funnel Analytics
        </h4>
        <div className="chart-container-inner" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "2rem", alignItems: "center" }}>
          
          {/* Funnel diagram */}
          <div className="funnel-wrapper">
            {/* Total Inflow */}
            <div className="funnel-stage" style={{ backgroundColor: "#1e293b" }}>
              <span className="funnel-stage-label">Lead Inflow (Total Enquiries)</span>
              <span className="funnel-stage-value">{funnelData.total}</span>
              <div className="funnel-stage-fill" style={{ width: "100%", backgroundColor: "#334155" }} />
            </div>

            {/* Proposals Sent */}
            <div className="funnel-stage" style={{ backgroundColor: "#1e3a8a" }}>
              <span className="funnel-stage-label">Proposals Logged & Dispatched</span>
              <span className="funnel-stage-value">{funnelData.proposalsSent}</span>
              <div 
                className="funnel-stage-fill" 
                style={{ 
                  width: `${funnelData.total > 0 ? (funnelData.proposalsSent / funnelData.total) * 100 : 0}%`, 
                  backgroundColor: "#2563eb" 
                }} 
              />
            </div>

            {/* Orders Won */}
            <div className="funnel-stage" style={{ backgroundColor: "#064e3b" }}>
              <span className="funnel-stage-label">Orders Won (Converted)</span>
              <span className="funnel-stage-value">{funnelData.ordersWon}</span>
              <div 
                className="funnel-stage-fill" 
                style={{ 
                  width: `${funnelData.total > 0 ? (funnelData.ordersWon / funnelData.total) * 100 : 0}%`, 
                  backgroundColor: "#059669" 
                }} 
              />
            </div>
          </div>

          {/* Conversion rate gauge metric */}
          <div className="conversion-gauge-container">
            <span className="conversion-gauge-value">
              {funnelData.convRate.toFixed(1)}%
            </span>
            <span className="conversion-gauge-label">
              Conversion Rate
            </span>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>
              Percentage of total enquiries converted to active corporate orders.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
