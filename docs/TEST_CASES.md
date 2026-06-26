# Test Cases - Paper Plane Corporate Bulk Gift Enquiry Portal

This document outlines the testing specifications for verifying the portal's frontend validation, backend logical rules, email dispatches, and CSV aggregation.

---

## 1. Enquiry Form Intake (Manual & Automated)

| Test ID | Objective | Input Data | Execution Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Verify mandatory field validation | Empty company name or phone number | Click "Request Quotation Proposal" | Form errors highlighted: "Company name is required." or "Phone number is required." Form submit blocked. | Pass |
| **TC-02** | Validate email format checking | Company Email = `rahul` or `rahul@com` | Click "Request Quotation Proposal" | Error displayed: "Please enter a valid email address." Form submit blocked. | Pass |
| **TC-03** | Validate delivery date constraint | Delivery Date = Yesterday's date | Click "Request Quotation Proposal" | Error displayed: "Expected delivery date cannot be in the past." Form submit blocked. | Pass |
| **TC-04** | Validate budget and quantity ranges | Quantity = `-5`, Budget = `0` | Click "Request Quotation Proposal" | Error displayed: "Quantity required must be a positive integer." Form submit blocked. | Pass |
| **TC-05** | Verify successful enquiry intake | Fill all valid details (Qty: 120, Category: Employee Kits, Budget: 1500) | Click "Request Quotation Proposal" | Loader displays during POST. Submission success screen appears showing a reference ID (e.g. `PP-2026-X123`). SMTP confirmation email is dispatched. Database records are inserted in `companies`, `enquiries`, `recommendations`, `workflow_history`, and `email_logs`. | Pass |

---

## 2. Sales Dashboard & Filtering (Manual)

| Test ID | Objective | Input Data | Execution Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-06** | Verify summary counts (KPIs) | Active database rows | Open dashboard or click "Refresh Data" | KPI metrics match database count states: Total = all enquiries, Converted = enquiries with status "Order Converted", Pending = enquiries with status NOT IN ("Order Converted", "Quotation Rejected"). | Pass |
| **TC-07** | Filter list by Category | Category = `Festival Hampers` | Select category filter dropdown | Only enquiries under "Festival Hampers" are rendered. Other categories hidden. | Pass |
| **TC-08** | Filter list by Status | Status = `Quotation Prepared` | Select status filter dropdown | Only enquiries under status "Quotation Prepared" are displayed. | Pass |
| **TC-09** | Filter list by Date range | Start = `2026-06-01`, End = `2026-06-21` | Enter start and end dates | Only enquiries submitted between these dates are displayed in the list. | Pass |
| **TC-10** | Empty state handling | Select filters with zero matches (e.g. Category = Festival Hampers when none exist) | Filter table data | Table hides. Clean placeholder graphic displays: "No Enquiries Found". | Pass |
| **TC-11** | Verify CSV Export | Click "Export CSV Report" | Click export button | Trigger a browser file download of `enquiry_report.csv`. File includes matching column names and amounts. | Pass |

---

## 3. Workflow Timeline & Assistant Review (Manual)

| Test ID | Objective | Input Data | Execution Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-12** | Verify active stage indicators | Enquiry status = `Branding Requirement Review` | Open Workflow screen for that enquiry | Steps 1, 2 are shown checked off (✅). Step 3 is highlighted in sky blue (Current Stage). Steps 4, 5, 6 are muted. | Pass |
| **TC-13** | Update stage & write history log | Next Stage = `Quotation Prepared`, note = "Specs matched with provider." | Click "Update Stage & Save Log" | Current stage changes to step 4. A new log is written to `workflow_history`. Enquiry table status changes. | Pass |
| **TC-14** | Execute customer follow-up email | Send Email = Check box true, enter custom body | Click "Save & Execute Follow-up Action" | Outbound SMTP email sent. Log saved in `email_logs` with status = "Sent" and in `workflow_history` with stage = "Follow-up", status = "Follow-up Sent". | Pass |

---

## 4. Quotation Workspace (Manual)

| Test ID | Objective | Input Data | Execution Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-15** | Live calculation of quotation totals | Qty = 100, Price = 1000, Branding = 5000, Packaging = 8000, Delivery = 2000 | Modify form inputs | Grand Total is automatically updated in real time to: `(1000 * 100) + 5000 + 8000 + 2000` = ₹1,15,000. | Pass |
| **TC-16** | Save proposal draft | Click "Save as Draft" | Submit quotation form | Saves quotation to `quotations` table with status = "Draft". Parent enquiry status advances to "Quotation Prepared". Timeline log added. | Pass |
| **TC-17** | Send proposal email | Click "Send Proposal Email" | Submit quotation form | Saves quotation in database. Triggers SMTP client email containing formatted custom HTML pricing table. Logs status as "Quotation Sent" in history timeline. | Pass |

---

## 5. Rule-Based Engine & AI Fallback (Manual & Automated)

| Test ID | Objective | Input Data | Execution Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-18** | Verify rule-based package recommendation details | Category = `Employee Kits`, Budget = `400` (Economy tier) | Submit form or load rule suggestion | Package recommended = "Welcome Aboard Kit". Premium items filtered out. Suggestions show budget economy items. | Pass |
| **TC-19** | Verify rule-based volume urgency assignment | Quantity = 120 (Threshold > 100) | Submit form | Priority is automatically flagged as "High" (Urgent bulk order). | Pass |
| **TC-20** | Verify Gemini API Graceful Fallback | Delete `GEMINI_API_KEY` from `.env`, click "Generate Gemini Suggestions" | Trigger AI request | API returns fallback success: recommendation recommendations and draft email are served from rule-based calculations. Info banner appears: "Rule-based suggestions loaded as fallback." | Pass |
| **TC-21** | Verify Gemini AI generation | Add valid `GEMINI_API_KEY`, click "Generate Gemini Suggestions" | Trigger AI request | Call to Google Gemini model completes. Returns 3 customized options, cost rationale, and email draft. Output is stored in database as source = "gemini". | Pass |
