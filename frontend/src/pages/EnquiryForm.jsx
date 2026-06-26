import { useState } from "react";
import { api } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

export default function EnquiryForm() {
  // Form State
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [giftCategory, setGiftCategory] = useState("Employee Kits");
  const [quantity, setQuantity] = useState("");
  const [budgetPerGift, setBudgetPerGift] = useState("");
  const [brandingRequired, setBrandingRequired] = useState("No");
  const [brandingDetails, setBrandingDetails] = useState("");
  const [personalizationRequirements, setPersonalizationRequirements] = useState("");
  const [packagingRequirements, setPackagingRequirements] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");

  // New Branding Enhancement States
  const [brandNamePrint, setBrandNamePrint] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [printingType, setPrintingType] = useState("Screen Printing");
  const [brandColors, setBrandColors] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoError, setLogoError] = useState("");
  const [packagingBranding, setPackagingBranding] = useState("");
  const [brandingInstructions, setBrandingInstructions] = useState("");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [invalidFields, setInvalidFields] = useState([]);
  const [successDetails, setSuccessDetails] = useState(null); // stores { code, id } after success

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setLogoError("");
    if (!file) {
      setLogoFile(null);
      setLogoPreview("");
      return;
    }

    // Validate type: accept PNG, JPG, JPEG, WEBP
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const fileExt = file.name.split(".").pop().toLowerCase();
    const validExtensions = ["png", "jpg", "jpeg", "webp"];
    if (!allowedTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      const msg = "Invalid logo file type. Only PNG, JPG, JPEG, and WEBP files are allowed.";
      setLogoError(msg);
      setErrorMsg(msg);
      setLogoFile(null);
      setLogoPreview("");
      e.target.value = "";
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      const msg = "Logo file size exceeds the 5 MB limit.";
      setLogoError(msg);
      setErrorMsg(msg);
      setLogoFile(null);
      setLogoPreview("");
      e.target.value = "";
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setLogoError("");
  };

  const validateForm = () => {
    setErrorMsg("");
    setInvalidFields([]);
    let errors = [];
    let invalid = [];

    if (!companyName.trim()) {
      errors.push("Company name cannot be empty.");
      invalid.push("companyName");
    }
    
    if (!contactPerson.trim()) {
      errors.push("Contact person name cannot be empty.");
      invalid.push("contactPerson");
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Please enter a valid email address.");
      invalid.push("email");
    }
    
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phone)) {
      errors.push("Please enter a valid phone number (7-15 digits, optional +).");
      invalid.push("phone");
    }
    
    const qtyStr = String(quantity).trim();
    const qtyInt = parseInt(qtyStr, 10);
    if (!qtyStr || isNaN(qtyInt) || qtyInt <= 0 || qtyStr !== String(qtyInt)) {
      errors.push("Quantity must be a positive number greater than zero.");
      invalid.push("quantity");
    }
    
    const budgetFloat = parseFloat(budgetPerGift);
    if (isNaN(budgetFloat) || budgetFloat <= 0) {
      errors.push("Budget per gift must be a positive number.");
      invalid.push("budgetPerGift");
    }
    
    if (!deliveryDate) {
      errors.push("Expected delivery date is required.");
      invalid.push("deliveryDate");
    } else {
      const delDateObj = new Date(deliveryDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (delDateObj < today) {
        errors.push("Expected delivery date cannot be in the past.");
        invalid.push("deliveryDate");
      }
    }

    if (brandingRequired === "Yes") {
      if (!brandNamePrint.trim()) {
        errors.push("Company Name to Print is required when branding is enabled.");
        invalid.push("brandNamePrint");
      }
      if (logoError) {
        errors.push(logoError);
        invalid.push("logoFile");
      }
    }

    if (errors.length > 0) {
      setInvalidFields(invalid);
      return errors[0]; // Return the first error message to display at the top
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setErrorMsg(error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    // Build FormData payload to support file upload
    const formData = new FormData();
    formData.append("company_name", companyName);
    formData.append("contact_person", contactPerson);
    formData.append("company_email", email);
    formData.append("phone", phone);
    formData.append("gift_category", giftCategory);
    formData.append("quantity", parseInt(quantity));
    formData.append("budget_per_gift", parseFloat(budgetPerGift));
    formData.append("branding_required", brandingRequired);
    formData.append("branding_details", brandingDetails);
    formData.append("personalization_requirements", personalizationRequirements);
    formData.append("packaging_requirements", packagingRequirements);
    formData.append("delivery_date", deliveryDate);
    formData.append("additional_requirements", additionalRequirements);

    if (brandingRequired === "Yes") {
      formData.append("brand_name_print", brandNamePrint);
      formData.append("brand_tagline", brandTagline);
      formData.append("printing_type", printingType);
      formData.append("brand_colors", brandColors);
      formData.append("packaging_branding", packagingBranding);
      formData.append("branding_instructions", brandingInstructions);
      if (logoFile) {
        formData.append("logo", logoFile);
      }
    }

    try {
      const response = await api.createEnquiry(formData);
      setSuccessDetails({
        code: response.enquiry_code,
        id: response.enquiry_id,
      });
      // Reset form fields
      resetForm();
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit enquiry. Please check your connection.");
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setGiftCategory("Employee Kits");
    setQuantity("");
    setBudgetPerGift("");
    setBrandingRequired("No");
    setBrandingDetails("");
    setPersonalizationRequirements("");
    setPackagingRequirements("");
    setDeliveryDate("");
    setAdditionalRequirements("");
    setBrandNamePrint("");
    setBrandTagline("");
    setPrintingType("Screen Printing");
    setBrandColors("");
    setLogoFile(null);
    setLogoPreview("");
    setLogoError("");
    setPackagingBranding("");
    setBrandingInstructions("");
  };

  if (successDetails) {
    return (
      <div style={styles.successContainer} className="animated-fade">
        <div className="card premium-card" style={styles.successCard}>
          <div style={styles.successIconWrapper}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21.5 2.5L2 10.5L9.5 14.5L14.5 22L21.5 2.5Z"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M9.5 14.5L21.5 2.5"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={styles.successHeader}>Enquiry Submitted Successfully!</h2>
          <p style={styles.successMuted}>
            Thank you! Your bulk gift enquiry has been successfully logged and processed under our automated sales system.
          </p>
          
          <div style={styles.codeBox}>
            <span style={styles.codeLabel}>REFERENCE ID / ENQUIRY CODE</span>
            <span style={styles.codeValue}>{successDetails.code}</span>
          </div>

          <p style={styles.successMuted}>
            A confirmation email has been dispatched to <strong>{email}</strong>. Our corporate account consultants are reviewing your custom preferences.
          </p>

          <div style={styles.actionRow}>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ ...styles.submitBtn, marginTop: "1.5rem" }}
              onClick={() => setSuccessDetails(null)}
            >
              Submit Another Enquiry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animated-fade">
      {/* Hero Header Section */}
      <div className="hero-block animated-fade">
        <div className="hero-bg-lines">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="92%" cy="15%" r="140" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="6 6" opacity="0.4" />
            <circle cx="8%" cy="85%" r="100" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <path
              d="M-40,160 Q120,60 280,160 T600,160 T920,160"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="8 6"
              opacity="0.2"
            />
          </svg>
        </div>
        <h1 className="hero-title">Corporate Bulk Gift Enquiry Portal</h1>
        <p className="hero-subtitle">
          Design custom employee onboarding kits, client hampers, and corporate gifts. Submit your quantity, budget, and delivery requirements to receive a customized quote proposal.
        </p>
      </div>

      {errorMsg && (
        <div style={styles.errorAlert} className="animated-fade">
          <strong>Validation Error:</strong> {errorMsg}
        </div>
      )}

      {isSubmitting ? (
        <div className="card premium-card">
          <LoadingSpinner message="Sending corporate bulk enquiry and generating proposal..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          {/* Card 1: Company Profile */}
          <div className="card premium-card hover-lift">
            <h3 className="card-title">
              <span style={{ fontSize: "1.35rem" }}>🏢</span> Company & Contact Profile
            </h3>
            <div style={styles.cardContent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Paper Plane Tech Labs"
                    className={invalidFields.includes("companyName") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("companyName") && <span className="validation-error-text">Required</span>}
                </div>
                <div className="form-group">
                  <label>Contact Person Name *</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className={invalidFields.includes("contactPerson") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("contactPerson") && <span className="validation-error-text">Required</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label style={styles.label}>Company Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@acmecorp.com"
                    className={invalidFields.includes("email") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("email") && <span className="validation-error-text">Valid email required</span>}
                </div>
                <div className="form-group">
                  <label style={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 16))}
                    placeholder="e.g. +1 234 567 8900"
                    className={invalidFields.includes("phone") ? "invalid-field" : ""}
                    maxLength={16}
                  />
                  {invalidFields.includes("phone") && <span className="validation-error-text">Valid phone number required</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Gift Requirements */}
          <div className="card premium-card hover-lift">
            <h3 className="card-title">
              <span style={{ fontSize: "1.35rem" }}>🎁</span> Gifting Preferences & Delivery
            </h3>
            <div style={styles.cardContent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Gift Category *</label>
                  <select
                    value={giftCategory}
                    onChange={(e) => setGiftCategory(e.target.value)}
                  >
                    <option value="Employee Kits">Employee Kits</option>
                    <option value="Festival Hampers">Festival Hampers</option>
                    <option value="Corporate Gifts">Corporate Gifts</option>
                    <option value="Personalized Gifts">Personalized Gifts</option>
                    <option value="Custom Hampers">Custom Hampers</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={styles.label}>Quantity Required *</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 500"
                    min="1"
                    className={invalidFields.includes("quantity") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("quantity") && <span className="validation-error-text">Positive number required</span>}
                </div>
                <div className="form-group">
                  <label style={styles.label}>Budget Per Gift (₹) *</label>
                  <input
                    type="number"
                    value={budgetPerGift}
                    onChange={(e) => setBudgetPerGift(e.target.value)}
                    placeholder="e.g. 1500"
                    min="1"
                    className={invalidFields.includes("budgetPerGift") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("budgetPerGift") && <span className="validation-error-text">Positive budget required</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Branding Required? *</label>
                  <select
                    value={brandingRequired}
                    onChange={(e) => setBrandingRequired(e.target.value)}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={styles.label}>Expected Delivery Date *</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={invalidFields.includes("deliveryDate") ? "invalid-field" : ""}
                  />
                  {invalidFields.includes("deliveryDate") && <span className="validation-error-text">Valid future date required</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Branding Specifications (Conditional) */}
          <div className={`branding-section-container ${brandingRequired === "Yes" ? "expanded" : ""}`}>
            <div className="card premium-card hover-lift" style={{ borderLeft: "4px solid var(--blue-primary)" }}>
              <h3 className="card-title">
                <span style={{ fontSize: "1.35rem" }}>🎨</span> Custom Branding Specifications
              </h3>
              <div style={styles.cardContent}>
                <div className="form-row">
                  <div className="form-group">
                    <label style={styles.label}>Company Name to Print *</label>
                    <input
                      type="text"
                      value={brandNamePrint}
                      onChange={(e) => setBrandNamePrint(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className={invalidFields.includes("brandNamePrint") ? "invalid-field" : ""}
                    />
                    {invalidFields.includes("brandNamePrint") && <span className="validation-error-text">Required</span>}
                  </div>
                  <div className="form-group">
                    <label>Tagline / Slogan (Optional)</label>
                    <input
                      type="text"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      placeholder="e.g. Flight of Innovation"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Printing Type *</label>
                    <select
                      value={printingType}
                      onChange={(e) => setPrintingType(e.target.value)}
                    >
                      <option value="Screen Printing">Screen Printing</option>
                      <option value="UV Printing">UV Printing</option>
                      <option value="Laser Engraving">Laser Engraving</option>
                      <option value="Embossing">Embossing</option>
                      <option value="Debossing">Debossing</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Brand Colors (Optional)</label>
                    <input
                      type="text"
                      value={brandColors}
                      onChange={(e) => setBrandColors(e.target.value)}
                      placeholder="e.g. #0284c7, #ffffff or Navy Blue"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Company Logo Upload (Optional) (PNG, JPG, JPEG, WEBP - Max 5MB)</label>
                  <input
                    type="file"
                    key={logoFile ? "logo-present" : "logo-empty"}
                    accept=".png, .jpg, .jpeg, .webp"
                    onChange={handleLogoChange}
                    style={{ padding: "0.85rem" }}
                  />
                  {logoError && (
                    <div className="error-text" style={{ marginTop: "0.5rem" }}>
                      {logoError}
                    </div>
                  )}
                  {logoPreview && (
                    <div style={styles.logoPreviewContainer}>
                      <img src={logoPreview} alt="Logo Preview" style={styles.logoPreviewImage} />
                      <div style={styles.logoPreviewDetails}>
                        <span style={styles.logoPreviewName}>{logoFile?.name || "Uploaded Logo"}</span>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={clearLogo}
                          style={styles.clearLogoBtn}
                        >
                          Remove Logo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Branding Details (Logo positions, placement notes)</label>
                  <textarea
                    value={brandingDetails}
                    onChange={(e) => setBrandingDetails(e.target.value)}
                    placeholder="Specify requirements such as: Laser engraving on bottle, Screen printing on box lids, etc."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Packaging Branding Requirements (Optional)</label>
                  <textarea
                    value={packagingBranding}
                    onChange={(e) => setPackagingBranding(e.target.value)}
                    placeholder="e.g. Outer wrap sleeve with repeating custom logo print."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Additional Branding Instructions (Optional)</label>
                  <textarea
                    value={brandingInstructions}
                    onChange={(e) => setBrandingInstructions(e.target.value)}
                    placeholder="Any other guidelines regarding colors, margins, or orientation."
                    rows="2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Additional Requirements */}
          <div className="card premium-card hover-lift">
            <h3 className="card-title">
              <span style={{ fontSize: "1.35rem" }}>📋</span> Individual Customization & Special Notes
            </h3>
            <div style={styles.cardContent}>
              <div className="form-group">
                <label>Personalization Requirements (Individual names, customized cards)</label>
                <textarea
                  value={personalizationRequirements}
                  onChange={(e) => setPersonalizationRequirements(e.target.value)}
                  placeholder="e.g. Include custom welcome card with individual employee name printed on it."
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Packaging Requirements (Custom boxes, wrapping ribbons, colors)</label>
                <textarea
                  value={packagingRequirements}
                  onChange={(e) => setPackagingRequirements(e.target.value)}
                  placeholder="e.g. Premium rigid box packaging in navy blue color."
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Additional Requirements / Special Notes</label>
                <textarea
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  placeholder="Enter details of any items you want to include, eco-friendly preference, or logistics constraints."
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
              disabled={isSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.25rem" }}>
                <path d="M21.5 2.5L2 10.5L9.5 14.5L14.5 22L21.5 2.5Z" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M9.5 14.5L21.5 2.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isSubmitting ? "Submitting Enquiry..." : "Request Quotation Proposal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "960px",
    margin: "0 auto",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  cardContent: {
    marginTop: "0.5rem",
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
    marginBottom: "1.75rem",
    fontSize: "0.95rem",
    fontWeight: 500,
  },
  actionRow: {
    marginTop: "1rem",
    marginBottom: "2.5rem",
  },
  submitBtn: {
    width: "100%",
    padding: "1rem",
    fontSize: "1.1rem",
    borderRadius: "12px",
    boxShadow: "0 10px 20px -5px rgba(2, 132, 199, 0.3)",
  },
  successContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "2.5rem 0",
  },
  successCard: {
    maxWidth: "600px",
    width: "100%",
    textAlign: "center",
    padding: "3.5rem 2.5rem",
  },
  successIconWrapper: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    marginBottom: "1.5rem",
  },
  successHeader: {
    color: "#065f46",
    fontSize: "1.75rem",
    fontWeight: 800,
    marginBottom: "1rem",
    letterSpacing: "-0.02em",
  },
  successMuted: {
    color: "var(--text-secondary)",
    fontSize: "0.98rem",
    lineHeight: 1.6,
    marginBottom: "1.25rem",
  },
  codeBox: {
    backgroundColor: "var(--blue-light)",
    border: "2px dashed var(--blue-accent)",
    borderRadius: "12px",
    padding: "1.25rem",
    margin: "1.75rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  codeLabel: {
    fontSize: "0.8rem",
    color: "#0369a1",
    fontWeight: 700,
    letterSpacing: "0.075em",
  },
  codeValue: {
    fontSize: "2.1rem",
    color: "#0284c7",
    fontWeight: 850,
    letterSpacing: "0.05em",
  },
  logoPreviewContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "var(--bg-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
  },
  logoPreviewImage: {
    width: "90px",
    height: "90px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    objectFit: "contain",
    backgroundColor: "#ffffff",
  },
  logoPreviewDetails: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.5rem",
    flex: 1,
  },
  logoPreviewName: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
    wordBreak: "break-all",
  },
  clearLogoBtn: {
    padding: "0.4rem 0.85rem",
    fontSize: "0.8rem",
    borderRadius: "6px",
    boxShadow: "none",
  },
};
