import { useState, useEffect, useMemo } from "react";

export default function QuotationForm({ enquiry, initialQuotation, onSave, isLoading }) {
  const [proposedPackage, setProposedPackage] = useState("");
  const [pricePerGift, setPricePerGift] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [brandingCost, setBrandingCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [quotationStatus, setQuotationStatus] = useState("Draft");
  const [notes, setNotes] = useState("");

  // Populate form fields from initialQuotation or evaluate defaults
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialQuotation) {
        setProposedPackage(initialQuotation.proposed_package || "");
        setPricePerGift(Number(initialQuotation.price_per_gift) || 0);
        setQuantity(Number(initialQuotation.quantity) || Number(enquiry.quantity) || 0);
        setBrandingCost(Number(initialQuotation.branding_cost) || 0);
        setPackagingCost(Number(initialQuotation.packaging_cost) || 0);
        setDeliveryCost(Number(initialQuotation.delivery_cost) || 0);
        setGstPercentage(initialQuotation.gst_percentage !== undefined && initialQuotation.gst_percentage !== null ? Number(initialQuotation.gst_percentage) : 18);
        setQuotationStatus(initialQuotation.quotation_status || "Draft");
        setNotes(initialQuotation.notes || "");
      } else {
        // Default placeholder calculations using enquiry
        setProposedPackage(enquiry.gift_category === "Festival Hampers" ? "Festive Celebration Box" : "Tailored Bundle");
        setPricePerGift(Number(enquiry.budget_per_gift) || 0);
        setQuantity(Number(enquiry.quantity) || 0);
        setBrandingCost(enquiry.branding_required === "Yes" ? 50 * Number(enquiry.quantity) : 0);
        setPackagingCost(80 * Number(enquiry.quantity)); // standard mid packaging default
        setDeliveryCost(35 * Number(enquiry.quantity));  // standard shipping default
        setGstPercentage(18);
        setQuotationStatus("Draft");
        setNotes("");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialQuotation, enquiry]);

  // Calculate subtotal, GST, and grand total dynamically
  const subtotal = useMemo(() => {
    return (pricePerGift * quantity) + brandingCost + packagingCost + deliveryCost;
  }, [pricePerGift, quantity, brandingCost, packagingCost, deliveryCost]);

  const gstAmount = useMemo(() => {
    return subtotal * (gstPercentage / 100.0);
  }, [subtotal, gstPercentage]);

  const totalAmount = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  const handleSubmit = (e, sendEmail = false) => {
    e.preventDefault();
    if (!proposedPackage.trim()) {
      alert("Proposed package description is required");
      return;
    }
    if (quantity <= 0) {
      alert("Quantity must be greater than zero");
      return;
    }
    
    onSave({
      proposed_package: proposedPackage,
      price_per_gift: pricePerGift,
      quantity,
      branding_cost: brandingCost,
      packaging_cost: packagingCost,
      delivery_cost: deliveryCost,
      gst_percentage: gstPercentage,
      quotation_status: sendEmail ? "Sent" : quotationStatus,
      notes,
      send_email: sendEmail
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <form className="card animated-fade" style={styles.form}>
      <h3 className="card-title">📝 Custom Quotation Workspace</h3>
      
      {/* Customer Profile Overview */}
      <div style={styles.customerOverview}>
        <h4 style={styles.overviewTitle}>Customer Profile</h4>
        <div style={styles.overviewGrid}>
          <div>
            <strong>Company:</strong> {enquiry?.company_name || "N/A"}
          </div>
          <div>
            <strong>Contact:</strong> {enquiry?.contact_person || "N/A"}
          </div>
          <div>
            <strong>Email:</strong> {enquiry?.email || enquiry?.company_email || "N/A"}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Proposed Gift Package/Bundle Name *</label>
        <input
          type="text"
          value={proposedPackage}
          onChange={(e) => setProposedPackage(e.target.value)}
          placeholder="e.g. Welcome Aboard Executive Kit"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price Per Gift (₹) *</label>
          <input
            type="number"
            value={pricePerGift}
            onChange={(e) => setPricePerGift(Number(e.target.value))}
            min="0"
            required
          />
        </div>
        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min="1"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Total Branding Cost (₹)</label>
          <input
            type="number"
            value={brandingCost}
            onChange={(e) => setBrandingCost(Number(e.target.value))}
            min="0"
          />
          <small style={styles.help}>Client requested branding: {enquiry.branding_required}</small>
        </div>
        <div className="form-group">
          <label>Total Packaging Cost (₹)</label>
          <input
            type="number"
            value={packagingCost}
            onChange={(e) => setPackagingCost(Number(e.target.value))}
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Total Delivery Cost (₹)</label>
          <input
            type="number"
            value={deliveryCost}
            onChange={(e) => setDeliveryCost(Number(e.target.value))}
            min="0"
          />
        </div>
      </div>

      <div style={styles.calculationsBlock}>
        <div style={styles.calcRow}>
          <span>Items Subtotal:</span>
          <span>{formatCurrency(pricePerGift * quantity)}</span>
        </div>
        <div style={styles.calcRow}>
          <span>Branding, Packaging, Delivery Addons:</span>
          <span>{formatCurrency(brandingCost + packagingCost + deliveryCost)}</span>
        </div>
        <div style={{ ...styles.calcRow, borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem" }}>
          <span>Subtotal (Before GST):</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div style={styles.calcRow}>
          <span>GST ({gstPercentage}%):</span>
          <span>{formatCurrency(gstAmount)}</span>
        </div>
        <div style={{ ...styles.calcRow, borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem", fontWeight: "bold" }}>
          <span>Grand Total (Including GST):</span>
          <span style={styles.totalText}>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>GST Percentage (%) *</label>
          <select
            value={gstPercentage}
            onChange={(e) => setGstPercentage(Number(e.target.value))}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </select>
        </div>
        <div className="form-group">
          <label>Quotation Status</label>
          <select
            value={quotationStatus}
            onChange={(e) => setQuotationStatus(e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Approved">Approved (Order Converted)</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Quotation Terms / Notes / Remarks</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter payment terms, delivery timelines, validation period, etc."
          rows="3"
        />
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isLoading}
        >
          💾 Generate Quotation
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isLoading}
          style={styles.sendBtn}
        >
          ✉️ Send Quotation Email
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    margin: 0,
  },
  customerOverview: {
    backgroundColor: "var(--blue-light)",
    border: "1px solid var(--blue-border)",
    borderRadius: "8px",
    padding: "0.85rem 1rem",
    marginBottom: "1.25rem",
  },
  overviewTitle: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.8rem",
    color: "var(--blue-hover)",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.5rem 1rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  help: {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "0.825rem",
    marginTop: "0.35rem",
    fontWeight: 500,
  },
  calculationsBlock: {
    backgroundColor: "var(--blue-light)",
    border: "1px solid var(--blue-border)",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
  },
  calcRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.925rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  totalText: {
    fontSize: "1.35rem",
    color: "var(--blue-hover)",
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    gap: "0.85rem",
    marginTop: "1.75rem",
  },
  sendBtn: {
    flex: 1,
  },
};
