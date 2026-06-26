-- Paper Plane Bulk Gifting Portal Schema Initialization

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enquiries Table
CREATE TABLE IF NOT EXISTS enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_code VARCHAR(100) UNIQUE NOT NULL,
    company_id INT NOT NULL,
    gift_category VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    budget_per_gift DECIMAL(10, 2) NOT NULL,
    branding_required VARCHAR(10) NOT NULL,
    branding_details TEXT,
    personalization_requirements TEXT,
    packaging_requirements TEXT,
    delivery_date DATE NOT NULL,
    additional_requirements TEXT,
    status VARCHAR(50) DEFAULT 'Enquiry Submitted',
    owner VARCHAR(100) DEFAULT 'Unassigned',
    priority VARCHAR(50) DEFAULT 'Medium',
    logo_path VARCHAR(500) DEFAULT NULL,
    brand_name_print VARCHAR(255) DEFAULT NULL,
    brand_tagline VARCHAR(255) DEFAULT NULL,
    printing_type VARCHAR(100) DEFAULT NULL,
    brand_colors VARCHAR(255) DEFAULT NULL,
    packaging_branding TEXT DEFAULT NULL,
    branding_instructions TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 3. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id INT NOT NULL,
    proposed_package VARCHAR(255) NOT NULL,
    price_per_gift DECIMAL(10, 2) NOT NULL,
    branding_cost DECIMAL(10, 2) DEFAULT 0.00,
    packaging_cost DECIMAL(10, 2) DEFAULT 0.00,
    delivery_cost DECIMAL(10, 2) DEFAULT 0.00,
    gst_percentage DECIMAL(5, 2) DEFAULT 0.00,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    quotation_status VARCHAR(50) DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
);

-- 4. Workflow History Table
CREATE TABLE IF NOT EXISTS workflow_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id INT NOT NULL,
    stage VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    output TEXT,
    action_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
);

-- 5. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id INT NOT NULL,
    source VARCHAR(50) NOT NULL,
    recommendation_text TEXT NOT NULL,
    quotation_summary TEXT NOT NULL,
    followup_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
);

-- 6. Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id INT NOT NULL,
    receiver_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
);

-- 7. Personalizations Table
CREATE TABLE IF NOT EXISTS personalizations (
    personalization_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    custom_message TEXT,
    logo_path VARCHAR(500),
    image_path VARCHAR(500),
    font_style VARCHAR(100),
    font_color VARCHAR(50),
    gift_wrap VARCHAR(100),
    instructions TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 8. Design Approvals Table
CREATE TABLE IF NOT EXISTS design_approvals (
    design_id INT AUTO_INCREMENT PRIMARY KEY,
    personalization_id INT NOT NULL,
    mockup_file VARCHAR(500) NOT NULL,
    version INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Mockup Uploaded',
    customer_comments TEXT,
    designer_notes TEXT,
    approval_date TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personalization_id) REFERENCES personalizations(personalization_id) ON DELETE CASCADE
);

-- 9. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    available_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 10,
    supplier VARCHAR(255),
    unit_price DECIMAL(10, 2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Occasions Table
CREATE TABLE IF NOT EXISTS occasions (
    occasion_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    occasion_name VARCHAR(255) NOT NULL,
    occasion_type VARCHAR(100) NOT NULL,
    occasion_date DATE NOT NULL,
    description TEXT,
    reminder_days_before INT DEFAULT 7,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 11. Returns Table
CREATE TABLE IF NOT EXISTS returns (
    return_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    customer_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'Submitted',
    admin_notes TEXT,
    refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    replacement_initiated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES companies(id) ON DELETE CASCADE
);
