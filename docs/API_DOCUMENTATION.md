# API Documentation - Paper Plane Bulk Gift Enquiry Portal

This document outlines all backend REST APIs exposed by the Flask application.

## Base URL
By default, the backend server runs on:
`http://localhost:5000`

---

## 1. Enquiry Intake
### `POST /api/create`
Creates a new corporate bulk gifting enquiry, registers or updates the company profile, runs rule-based recommendations, and dispatches a client SMTP confirmation email.

**Request Header:**
- `Content-Type: application/json`

**Request Body Example:**
```json
{
  "company_name": "Paper Plane Tech Labs",
  "contact_person": "Rahul Sharma",
  "company_email": "rahul@paperplane.com",
  "phone": "+91 98765 43210",
  "gift_category": "Employee Kits",
  "quantity": 120,
  "budget_per_gift": 1500,
  "branding_required": "Yes",
  "branding_details": "Laser engraving on water bottle caps",
  "personalization_requirements": "Individual card with employee name",
  "packaging_requirements": "Matte navy blue rigid gift boxes",
  "delivery_date": "2026-07-15",
  "additional_requirements": "Deliver all items in bulk to Bangalore HQ"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Corporate bulk enquiry submitted successfully.",
  "enquiry_id": 12,
  "enquiry_code": "PP-2026-W3F9"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Quantity must be a positive number."
}
```

---

## 2. Retrieve Enquiries List
### `GET /api/list`
Lists enquiries joining company contact details. Supports active parameters filtering.

**Query Parameters (Optional):**
- `status`: Filter by pipeline status (e.g. `Enquiry Submitted`, `Quotation Prepared`)
- `category` or `type`: Filter by gift category (e.g. `Employee Kits`, `Festival Hampers`)
- `priority`: Filter by priority level (`High`, `Medium`, `Low`)
- `start_date`: Filter submissions from date (`YYYY-MM-DD`)
- `end_date`: Filter submissions to date (`YYYY-MM-DD`)

**Success Response (200 OK):**
```json
[
  {
    "id": 12,
    "enquiry_code": "PP-2026-W3F9",
    "company_name": "Paper Plane Tech Labs",
    "gift_category": "Employee Kits",
    "quantity": 120,
    "budget_per_gift": 1500.00,
    "status": "Enquiry Submitted",
    "priority": "High",
    "owner": "Unassigned",
    "created_at": "2026-06-20 11:30:45"
  }
]
```

---

## 3. Retrieve Enquiry Detail
### `GET /api/detail/<id>`
Inspects a single corporate enquiry along with its associated quotation, recommendations (rule-based and Gemini), history timeline logs, and email dispatch audit logs.

**Success Response (200 OK):**
```json
{
  "enquiry": {
    "id": 12,
    "enquiry_code": "PP-2026-W3F9",
    "company_id": 4,
    "gift_category": "Employee Kits",
    "quantity": 120,
    "budget_per_gift": 1500.00,
    "branding_required": "Yes",
    "branding_details": "Laser engraving on water bottle caps",
    "personalization_requirements": "Individual card with employee name",
    "packaging_requirements": "Matte navy blue rigid gift boxes",
    "delivery_date": "2026-07-15",
    "additional_requirements": "Deliver all items in bulk to Bangalore HQ",
    "status": "Enquiry Submitted",
    "owner": "Unassigned",
    "priority": "High",
    "created_at": "2026-06-20 11:30:45",
    "updated_at": "2026-06-20 11:30:45",
    "company_name": "Paper Plane Tech Labs",
    "contact_person": "Rahul Sharma",
    "email": "rahul@paperplane.com",
    "phone": "+91 98765 43210"
  },
  "quotation": null,
  "recommendations": [
    {
      "id": 18,
      "enquiry_id": 12,
      "source": "rule_based",
      "recommendation_text": "Proposed Package Name: Welcome Aboard Kit...",
      "quotation_summary": "Estimated Pricing Structure...",
      "followup_message": "Hi Rahul...",
      "created_at": "2026-06-20 11:30:45"
    }
  ],
  "workflow_history": [
    {
      "id": 24,
      "enquiry_id": 12,
      "stage": "Enquiry Submitted",
      "status": "Enquiry Submitted",
      "output": "Enquiry successfully logged in the system.",
      "action_note": "Customer submitted bulk enquiry form online.",
      "created_at": "2026-06-20 11:30:45"
    }
  ],
  "email_logs": [
    {
      "id": 30,
      "enquiry_id": 12,
      "receiver_email": "rahul@paperplane.com",
      "subject": "Enquiry Confirmation - Reference: PP-2026-W3F9 | Paper Plane Gifting",
      "status": "Sent",
      "sent_at": "2026-06-20 11:30:47"
    }
  ]
}
```

---

## 4. Pipeline Updates
### `POST /api/process/<id>`
Modifies enquiry owner, priority, status and logs an update in the workflow history logs.

**Request Body Example:**
```json
{
  "status": "Package Selection",
  "priority": "High",
  "owner": "Rajesh Kumar",
  "action_note": "Called the buyer. Agreed to send Welcome Aboard Kit designs."
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Enquiry status updated to 'Package Selection' successfully."
}
```

---

## 5. Summary Metrics Dashboard
### `GET /api/dashboard`
Fetches current aggregations of total, pending, converted and quotation prepared counts.

**Success Response (200 OK):**
```json
{
  "total_enquiries": 28,
  "pending_enquiries": 14,
  "quotations_prepared": 8,
  "followups_required": 5,
  "converted_orders": 6
}
```

---

## 6. Quotation Builder
### `POST /api/quotation/<id>`
Inserts or updates the pricing proposal. Triggers the proposal SMTP email if status is marked "Sent" or `send_email` is true.

**Request Body Example:**
```json
{
  "proposed_package": "Welcome Aboard Executive Kit",
  "price_per_gift": 1350,
  "quantity": 120,
  "branding_cost": 3600,
  "packaging_cost": 9600,
  "delivery_cost": 2400,
  "quotation_status": "Draft",
  "notes": "50% advance payment required. Delivery within 14 days of PO approval.",
  "send_email": false
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Quotation saved successfully.",
  "email_sent": false,
  "data": {
    "id": 3,
    "enquiry_id": 12,
    "proposed_package": "Welcome Aboard Executive Kit",
    "price_per_gift": 1350,
    "branding_cost": 3600,
    "packaging_cost": 9600,
    "delivery_cost": 2400,
    "total_amount": 177600,
    "quotation_status": "Draft",
    "notes": "50% advance payment required. Delivery within 14 days of PO approval."
  }
}
```

---

## 7. Client Communications
### `POST /api/followup/<id>`
Saves customer follow-up notes in recommendations and dispatches SMTP emails if requested.

**Request Body Example:**
```json
{
  "followup_message": "Hi Rahul, following up regarding the welcome kits quotation. Please let us know if you need any alterations.",
  "subject": "Proposal Discussion - Paper Plane Gifting",
  "send_email": true
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Follow-up message logged successfully.",
  "email_sent": true
}
```

---

## 8. CSV Reports Compile
### `GET /api/export/csv`
Returns a streamable CSV attachment of all logged portal enquiries and billing amounts.

**Response Headers:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename=enquiry_report.csv`

---

## 9. Gemini AI Suggestions
### `POST /api/gemini-suggestion/<id>`
Triggers Google Gemini generating custom smart recommendations, cost breakdowns, and follow-up templates. If the API key is not configured, fallback to rule-based evaluation.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "source": "gemini",
  "fallback": false,
  "data": {
    "recommendation_text": "Option 1: The Eco-Office Pack...\nOption 2: Tech Professional Starter...",
    "quotation_summary": "Itemized Breakdown per unit:\n- Premium Bottle: INR 600...",
    "followup_message": "Dear Rahul, Thank you for choosing Paper Plane..."
  }
}
```
