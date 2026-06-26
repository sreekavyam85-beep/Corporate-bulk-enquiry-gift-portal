import re
import os
import datetime
import random
import string
import logging
from flask import Blueprint, jsonify, request
from db import execute_query
from services.workflow_service import evaluate_rules, create_recommendation_record, log_workflow_stage
from services.email_service import send_enquiry_confirmation

logger = logging.getLogger(__name__)
enquiries_bp = Blueprint("enquiries_route", __name__)

def generate_enquiry_code():
    """Generates a random unique enquiry code like PP-2026-X8F4."""
    year = datetime.datetime.now().year
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"PP-{year}-{random_str}"

def validate_email(email):
    """Validates the syntax of an email address."""
    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(email_regex, email) is not None

@enquiries_bp.route("/api/create", methods=["POST"])
def create_enquiry():
    """Intake endpoint for client enquiries. Validates, inserts company & enquiry, and triggers workflow."""
    if request.is_json:
        data = request.json or {}
    else:
        data = request.form or {}
    
    # 1. Field Extraction & Required Validations
    company_name = data.get("company_name", "").strip()
    contact_person = data.get("contact_person", "").strip()
    email = data.get("company_email", "").strip() or data.get("email", "").strip()
    phone = data.get("phone", "").strip() or data.get("phone_number", "").strip()
    gift_category = data.get("gift_category", "").strip() or data.get("gift_package", "").strip()
    quantity_str = data.get("quantity", "")
    budget_str = data.get("budget_per_gift", "")
    branding_required = data.get("branding_required", "No").strip()
    branding_details = data.get("branding_details", "").strip()
    personalization_requirements = data.get("personalization_requirements", "").strip()
    packaging_requirements = data.get("packaging_requirements", "").strip()
    delivery_date_str = data.get("delivery_date", "").strip() or data.get("expected_delivery_date", "").strip()
    additional_requirements = data.get("additional_requirements", "").strip() or data.get("special_notes", "").strip()

    if not all([company_name, contact_person, email, phone, gift_category, quantity_str, budget_str, delivery_date_str]):
        return jsonify({"error": "Missing required fields. Please fill in all mandatory fields."}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid email address format."}), 400

    if not re.match(r"^\+?[1-9]\d{6,14}$", phone):
        return jsonify({"error": "Please enter a valid phone number (7-15 digits, optional +)."}), 400

    try:
        quantity = int(quantity_str)
        if quantity <= 0:
            return jsonify({"error": "Quantity must be a positive number."}), 400
    except ValueError:
        return jsonify({"error": "Quantity must be an integer."}), 400

    try:
        budget_per_gift = float(budget_str)
        if budget_per_gift <= 0:
            return jsonify({"error": "Budget per gift must be a positive number."}), 400
    except ValueError:
        return jsonify({"error": "Budget per gift must be a numeric value."}), 400

    try:
        delivery_date = datetime.datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
        if delivery_date < datetime.date.today():
            return jsonify({"error": "Expected delivery date cannot be in the past."}), 400
    except ValueError:
        return jsonify({"error": "Expected delivery date must be in YYYY-MM-DD format."}), 400

    # Extract new branding fields if branding is required
    logo_path = None
    brand_name_print = None
    brand_tagline = None
    printing_type = None
    brand_colors = None
    packaging_branding = None
    branding_instructions = None

    if branding_required == "Yes":
        brand_name_print = data.get("brand_name_print", "").strip()
        brand_tagline = data.get("brand_tagline", "").strip()
        printing_type = data.get("printing_type", "").strip()
        brand_colors = data.get("brand_colors", "").strip()
        packaging_branding = data.get("packaging_branding", "").strip()
        branding_instructions = data.get("branding_instructions", "").strip()

        if not brand_name_print:
            return jsonify({"error": "Company Name to Print is required when branding is enabled."}), 400

        # Handle optional logo upload
        if "logo" in request.files:
            file = request.files["logo"]
            if file and file.filename != "":
                # Validate extension
                allowed_extensions = {".png", ".jpg", ".jpeg", ".webp"}
                ext = os.path.splitext(file.filename)[1].lower()
                if ext not in allowed_extensions:
                    return jsonify({"error": "Invalid logo file type. Only PNG, JPG, JPEG, and WEBP are allowed."}), 400
                
                # Validate size (max 5 MB)
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                if file_size > 5 * 1024 * 1024:
                    return jsonify({"error": "Logo file size exceeds the 5 MB limit."}), 400
                
                # Save file
                import uuid
                from werkzeug.utils import secure_filename
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "logos")
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                
                save_path = os.path.join(upload_dir, unique_filename)
                file.save(save_path)
                logo_path = f"uploads/logos/{unique_filename}"

    try:
        # 2. Save or fetch Company
        company_query = "SELECT id FROM companies WHERE email = %s"
        company = execute_query(company_query, (email,), fetch_one=True)
        
        if company:
            company_id = company["id"]
            # Update detail if modified
            update_comp = "UPDATE companies SET company_name=%s, contact_person=%s, phone=%s WHERE id=%s"
            execute_query(update_comp, (company_name, contact_person, phone, company_id), fetch_all=False)
        else:
            insert_comp = "INSERT INTO companies (company_name, contact_person, email, phone) VALUES (%s, %s, %s, %s)"
            company_id = execute_query(insert_comp, (company_name, contact_person, email, phone), fetch_all=False)

        # 3. Create unique enquiry tracking code
        enquiry_code = generate_enquiry_code()

        # 4. Trigger rule-based workflow logic to determine priority & initial recommendations
        enquiry_payload = {
            "company_name": company_name,
            "contact_person": contact_person,
            "gift_category": gift_category,
            "quantity": quantity,
            "budget_per_gift": budget_per_gift,
            "branding_required": branding_required,
            "delivery_date": delivery_date_str
        }
        rules_output = evaluate_rules(enquiry_payload)
        priority = rules_output["priority"]

        # 5. Insert enquiry into database
        insert_enq = """
            INSERT INTO enquiries (
                enquiry_code, company_id, gift_category, quantity, budget_per_gift,
                branding_required, branding_details, personalization_requirements,
                packaging_requirements, delivery_date, additional_requirements,
                status, owner, priority, logo_path, brand_name_print, brand_tagline,
                printing_type, brand_colors, packaging_branding, branding_instructions
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Enquiry Submitted', 'Unassigned', %s, %s, %s, %s, %s, %s, %s, %s)
        """
        enquiry_id = execute_query(insert_enq, (
            enquiry_code, company_id, gift_category, quantity, budget_per_gift,
            branding_required, branding_details, personalization_requirements,
            packaging_requirements, delivery_date_str, additional_requirements, priority,
            logo_path, brand_name_print, brand_tagline, printing_type, brand_colors,
            packaging_branding, branding_instructions
        ), fetch_all=False)

        # 6. Save initial rule-based recommendation
        create_recommendation_record(
            enquiry_id=enquiry_id,
            source="rule_based",
            rec_text=rules_output["recommendation_text"],
            quote_sum=rules_output["quotation_summary"],
            followup_msg=rules_output["followup_message"]
        )

        # 7. Log stage in workflow history
        log_workflow_stage(
            enquiry_id=enquiry_id,
            stage="Enquiry Submitted",
            status="Enquiry Submitted",
            output="Enquiry successfully logged in the system.",
            action_note="Customer submitted bulk enquiry form online."
        )

        # 8. Send confirmation email to corporate buyer using SMTP
        send_enquiry_confirmation(
            enquiry_id=enquiry_id,
            company_name=company_name,
            receiver_email=email,
            enquiry_code=enquiry_code,
            gift_category=gift_category,
            quantity=quantity
        )

        return jsonify({
            "status": "success",
            "message": "Corporate bulk enquiry submitted successfully.",
            "enquiry_id": enquiry_id,
            "enquiry_code": enquiry_code
        }), 201

    except Exception as e:
        logger.error(f"Error saving enquiry record: {e}")
        err_msg = str(e)
        if "2003" in err_msg or "10061" in err_msg or "Can't connect to MySQL" in err_msg:
            return jsonify({
                "error": "Database connection failed. Please ensure your separate MySQL server is running locally on port 3306 and that the password is empty (or configured correctly in backend/.env)."
            }), 500
        return jsonify({"error": f"Failed to submit enquiry due to database error: {err_msg}"}), 500

@enquiries_bp.route("/api/list", methods=["GET"])
def get_enquiries():
    """Lists enquiries with status, category, and date filtering."""
    status_filter = request.args.get("status")
    category_filter = request.args.get("category") or request.args.get("type")
    priority_filter = request.args.get("priority")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = """
        SELECT 
            e.id, 
            e.enquiry_code, 
            c.company_name, 
            e.gift_category, 
            e.quantity, 
            e.budget_per_gift, 
            e.status, 
            e.priority, 
            e.owner,
            e.created_at,
            q.quotation_status
        FROM enquiries e
        JOIN companies c ON e.company_id = c.id
        LEFT JOIN quotations q ON e.id = q.enquiry_id
        WHERE 1=1
    """
    params = []

    if status_filter:
        query += " AND e.status = %s"
        params.append(status_filter)
        
    if category_filter:
        query += " AND e.gift_category = %s"
        params.append(category_filter)

    if priority_filter:
        query += " AND e.priority = %s"
        params.append(priority_filter)

    if start_date:
        query += " AND DATE(e.created_at) >= %s"
        params.append(start_date)

    if end_date:
        query += " AND DATE(e.created_at) <= %s"
        params.append(end_date)

    query += " ORDER BY e.created_at DESC"

    try:
        records = execute_query(query, tuple(params))
        
        # Serialize datetime
        for r in records:
            if r["created_at"]:
                r["created_at"] = r["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                
        return jsonify(records), 200
    except Exception as e:
        logger.error(f"Error listing enquiries: {e}")
        err_msg = str(e)
        if "2003" in err_msg or "10061" in err_msg or "Can't connect to MySQL" in err_msg:
            return jsonify({
                "error": "Database connection failed. Please ensure your separate MySQL server is running locally on port 3306."
            }), 500
        return jsonify({"error": f"Failed to retrieve enquiries: {err_msg}"}), 500

@enquiries_bp.route("/api/detail/<int:enquiry_id>", methods=["GET"])
def get_enquiry_detail(enquiry_id):
    """Retrieves an enquiry, company profile, quotations, workflow logs, and recommendations."""
    enq_query = """
        SELECT e.*, c.company_name, c.contact_person, c.email, c.phone
        FROM enquiries e
        JOIN companies c ON e.company_id = c.id
        WHERE e.id = %s
    """
    try:
        enquiry = execute_query(enq_query, (enquiry_id,), fetch_one=True)
        if not enquiry:
            return jsonify({"error": "Enquiry not found"}), 404

        # Serialize datetimes
        if enquiry["created_at"]:
            enquiry["created_at"] = enquiry["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        if enquiry["updated_at"]:
            enquiry["updated_at"] = enquiry["updated_at"].strftime("%Y-%m-%d %H:%M:%S")
        if enquiry["delivery_date"]:
            enquiry["delivery_date"] = enquiry["delivery_date"].strftime("%Y-%m-%d")

        # Fetch active quotation
        quote_query = "SELECT * FROM quotations WHERE enquiry_id = %s"
        quotation = execute_query(quote_query, (enquiry_id,), fetch_one=True)
        if quotation:
            if quotation["created_at"]:
                quotation["created_at"] = quotation["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            if quotation["updated_at"]:
                quotation["updated_at"] = quotation["updated_at"].strftime("%Y-%m-%d %H:%M:%S")

        # Fetch recommendations
        rec_query = "SELECT * FROM recommendations WHERE enquiry_id = %s"
        recs = execute_query(rec_query, (enquiry_id,))
        for r in recs:
            if r["created_at"]:
                r["created_at"] = r["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        # Fetch history logs
        hist_query = "SELECT * FROM workflow_history WHERE enquiry_id = %s ORDER BY created_at DESC"
        history = execute_query(hist_query, (enquiry_id,))
        for h in history:
            if h["created_at"]:
                h["created_at"] = h["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        # Fetch email logs
        email_query = "SELECT * FROM email_logs WHERE enquiry_id = %s ORDER BY sent_at DESC"
        emails = execute_query(email_query, (enquiry_id,))
        for em in emails:
            if em["sent_at"]:
                em["sent_at"] = em["sent_at"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({
            "enquiry": enquiry,
            "quotation": quotation,
            "recommendations": recs,
            "workflow_history": history,
            "email_logs": emails
        }), 200

    except Exception as e:
        logger.error(f"Error fetching enquiry details for {enquiry_id}: {e}")
        err_msg = str(e)
        if "2003" in err_msg or "10061" in err_msg or "Can't connect to MySQL" in err_msg:
            return jsonify({
                "error": "Database connection failed. Please ensure your separate MySQL server is running locally on port 3306."
            }), 500
        return jsonify({"error": f"Failed to retrieve details: {err_msg}"}), 500

@enquiries_bp.route("/api/process/<int:enquiry_id>", methods=["POST"])
def process_enquiry(enquiry_id):
    """Updates enquiry workflow fields and logs a history update entry."""
    data = request.json or {}
    new_status = data.get("status")
    new_priority = data.get("priority")
    new_owner = data.get("owner")
    action_note = data.get("action_note", "Workflow status updated.")

    if not new_status:
        return jsonify({"error": "Missing status parameter"}), 400

    try:
        # Check if enquiry exists
        check_query = "SELECT status, priority, owner FROM enquiries WHERE id = %s"
        current = execute_query(check_query, (enquiry_id,), fetch_one=True)
        if not current:
            return jsonify({"error": "Enquiry not found"}), 404

        # Compile updates
        updates = []
        params = []
        
        updates.append("status = %s")
        params.append(new_status)

        if new_priority:
            updates.append("priority = %s")
            params.append(new_priority)
        else:
            new_priority = current["priority"]

        if new_owner:
            updates.append("owner = %s")
            params.append(new_owner)
        else:
            new_owner = current["owner"]

        params.append(enquiry_id)
        
        update_query = f"""
            UPDATE enquiries 
            SET {", ".join(updates)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """
        execute_query(update_query, tuple(params), fetch_all=False)

        # Log transition in history
        log_workflow_stage(
            enquiry_id=enquiry_id,
            stage="Workflow Update",
            status=new_status,
            output=f"Owner: {new_owner} | Priority: {new_priority}",
            action_note=action_note
        )

        return jsonify({
            "status": "success",
            "message": f"Enquiry status updated to '{new_status}' successfully."
        }), 200

    except Exception as e:
        logger.error(f"Error processing status update for enquiry {enquiry_id}: {e}")
        err_msg = str(e)
        if "2003" in err_msg or "10061" in err_msg or "Can't connect to MySQL" in err_msg:
            return jsonify({
                "error": "Database connection failed. Please ensure your separate MySQL server is running locally on port 3306."
            }), 500
        return jsonify({"error": f"Failed to update workflow state: {err_msg}"}), 500

@enquiries_bp.route("/api/dashboard", methods=["GET"])
def get_dashboard_counts():
    """Aggregates enquiry records to output Dashboard KPI card numbers."""
    try:
        # 1. Total Enquiries
        q_total = "SELECT COUNT(*) as count FROM enquiries"
        r_total = execute_query(q_total, fetch_one=True)
        total = r_total["count"] if r_total else 0

        # 2. Converted Orders (Order Converted)
        q_conv = "SELECT COUNT(*) as count FROM enquiries WHERE status = 'Order Converted'"
        r_conv = execute_query(q_conv, fetch_one=True)
        converted = r_conv["count"] if r_conv else 0

        # 3. Quotations Prepared (Quotation Prepared / Sent / Approved / Rejected)
        q_quotes = "SELECT COUNT(*) as count FROM enquiries WHERE status = 'Quotation Prepared'"
        r_quotes = execute_query(q_quotes, fetch_one=True)
        quotations = r_quotes["count"] if r_quotes else 0

        # 4. Follow-ups Required
        q_followup = "SELECT COUNT(*) as count FROM enquiries WHERE status = 'Follow-up Required'"
        r_followup = execute_query(q_followup, fetch_one=True)
        followup = r_followup["count"] if r_followup else 0

        # 5. Pending Enquiries (Enquiry Submitted, Package Selection, Branding Review)
        q_pending = """
            SELECT COUNT(*) as count 
            FROM enquiries 
            WHERE status NOT IN ('Order Converted', 'Quotation Rejected')
        """
        r_pending = execute_query(q_pending, fetch_one=True)
        pending = r_pending["count"] if r_pending else 0

        # 6. Advanced Features Metrics
        q_pers = "SELECT COUNT(*) as count FROM personalizations"
        r_pers = execute_query(q_pers, fetch_one=True)
        total_personalizations = r_pers["count"] if r_pers else 0
        
        q_appr = "SELECT COUNT(*) as count FROM design_approvals WHERE status = 'Mockup Uploaded' OR status = 'Changes Requested'"
        r_appr = execute_query(q_appr, fetch_one=True)
        pending_approvals = r_appr["count"] if r_appr else 0
        
        q_inv = "SELECT COUNT(*) as count FROM inventory"
        r_inv = execute_query(q_inv, fetch_one=True)
        inventory_count = r_inv["count"] if r_inv else 0
        
        q_low_stock = "SELECT COUNT(*) as count FROM inventory WHERE available_quantity <= minimum_stock"
        r_low_stock = execute_query(q_low_stock, fetch_one=True)
        low_stock = r_low_stock["count"] if r_low_stock else 0
        
        q_occ = "SELECT COUNT(*) as count FROM occasions WHERE occasion_date >= CURRENT_DATE"
        r_occ = execute_query(q_occ, fetch_one=True)
        upcoming_occasions = r_occ["count"] if r_occ else 0
        
        q_ret = "SELECT COUNT(*) as count FROM returns WHERE status IN ('Submitted', 'Under Review')"
        r_ret = execute_query(q_ret, fetch_one=True)
        pending_returns = r_ret["count"] if r_ret else 0

        return jsonify({
            "total_enquiries": total,
            "pending_enquiries": pending,
            "quotations_prepared": quotations,
            "followups_required": followup,
            "converted_orders": converted,
            "total_personalizations": total_personalizations,
            "pending_approvals": pending_approvals,
            "inventory_count": inventory_count,
            "low_stock": low_stock,
            "upcoming_occasions": upcoming_occasions,
            "pending_returns": pending_returns
        }), 200

    except Exception as e:
        logger.error(f"Error compiling dashboard metrics: {e}")
        err_msg = str(e)
        if "2003" in err_msg or "10061" in err_msg or "Can't connect to MySQL" in err_msg:
            return jsonify({
                "error": "Database connection failed. Please ensure your separate MySQL server is running locally on port 3306."
            }), 500
        return jsonify({"error": f"Failed to compile dashboard summary metrics: {err_msg}"}), 500
