import logging
from flask import Blueprint, jsonify, request
from db import execute_query
from services.email_service import send_quotation_proposal, send_followup_email
from services.workflow_service import log_workflow_stage

logger = logging.getLogger(__name__)
quotations_bp = Blueprint("quotations_route", __name__)

@quotations_bp.route("/api/quotation/<int:enquiry_id>", methods=["POST"])
def manage_quotation(enquiry_id):
    """
    Creates or updates the quotation for a bulk enquiry.
    If the status is updated to 'Sent' or send_email is True, sends the quotation via email.
    """
    data = request.json or {}
    
    # Validate fields
    try:
        proposed_package = data.get("proposed_package", "").strip()
        price_per_gift = float(data.get("price_per_gift", 0))
        quantity = int(data.get("quantity", 0))
        branding_cost = float(data.get("branding_cost", 0))
        packaging_cost = float(data.get("packaging_cost", 0))
        delivery_cost = float(data.get("delivery_cost", 0))
        gst_percentage = float(data.get("gst_percentage", 0))
        quotation_status = data.get("quotation_status", "Draft").strip()
        notes = data.get("notes", "").strip()
        send_email_req = data.get("send_email", False)
        
        if not proposed_package:
            return jsonify({"error": "Proposed package description is required"}), 400
        if quantity <= 0:
            return jsonify({"error": "Quantity must be greater than zero"}), 400
            
    except ValueError as e:
        return jsonify({"error": f"Invalid numeric value: {e}"}), 400

    # Calculate aggregate total amount with GST
    subtotal = (price_per_gift * quantity) + branding_cost + packaging_cost + delivery_cost
    gst_amount = subtotal * (gst_percentage / 100.0)
    total_amount = subtotal + gst_amount

    try:
        # Check if parent enquiry exists
        enquiry_query = """
            SELECT e.*, c.company_name, c.email, c.contact_person
            FROM enquiries e
            JOIN companies c ON e.company_id = c.id
            WHERE e.id = %s
        """
        enquiry = execute_query(enquiry_query, (enquiry_id,), fetch_one=True)
        if not enquiry:
            return jsonify({"error": "Parent enquiry not found"}), 404

        # Save or update database entry in quotations table
        check_query = "SELECT id FROM quotations WHERE enquiry_id = %s"
        existing = execute_query(check_query, (enquiry_id,), fetch_one=True)

        if existing:
            update_query = """
                UPDATE quotations
                SET proposed_package = %s, price_per_gift = %s, branding_cost = %s,
                    packaging_cost = %s, delivery_cost = %s, gst_percentage = %s,
                    gst_amount = %s, total_amount = %s, quotation_status = %s,
                    notes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            execute_query(update_query, (
                proposed_package, price_per_gift, branding_cost,
                packaging_cost, delivery_cost, gst_percentage,
                gst_amount, total_amount, quotation_status, notes, existing["id"]
            ), fetch_all=False)
            quote_id = existing["id"]
        else:
            insert_query = """
                INSERT INTO quotations (
                    enquiry_id, proposed_package, price_per_gift, branding_cost,
                    packaging_cost, delivery_cost, gst_percentage, gst_amount,
                    total_amount, quotation_status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            quote_id = execute_query(insert_query, (
                enquiry_id, proposed_package, price_per_gift, branding_cost,
                packaging_cost, delivery_cost, gst_percentage, gst_amount,
                total_amount, quotation_status, notes
            ), fetch_all=False)

        # Update main enquiry status to 'Quotation Prepared' or if approved/rejected, update accordingly
        new_enquiry_status = "Quotation Prepared"
        if quotation_status == "Approved":
            new_enquiry_status = "Order Converted"
        elif quotation_status == "Rejected":
            new_enquiry_status = "Quotation Rejected"
            
        update_enquiry_query = "UPDATE enquiries SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
        execute_query(update_enquiry_query, (new_enquiry_status, enquiry_id), fetch_all=False)

        # Log action in workflow history
        log_workflow_stage(
            enquiry_id=enquiry_id,
            stage="Quotation Preparation",
            status=new_enquiry_status,
            output=f"Package: {proposed_package} | Total: ₹{total_amount:,.2f}",
            action_note=f"Quotation updated to status '{quotation_status}' by internal sales team."
        )

        # Check if email notification is requested or status changed to Sent
        email_sent = False
        if send_email_req or quotation_status == "Sent":
            # Generate detailed HTML pricing table
            details_table_html = f"""
            <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:14px;">
              <tr style="background-color:#f2f2f2; border-bottom:1px solid #ddd; text-align:left;">
                <th style="padding:8px;">Cost Component</th>
                <th style="padding:8px; text-align:right;">Rate (₹)</th>
                <th style="padding:8px; text-align:right;">Quantity</th>
                <th style="padding:8px; text-align:right;">Subtotal (₹)</th>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">Base Gift Unit Cost</td>
                <td style="padding:8px; text-align:right;">{price_per_gift:,.2f}</td>
                <td style="padding:8px; text-align:right;">{quantity}</td>
                <td style="padding:8px; text-align:right;">{price_per_gift * quantity:,.2f}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">Branding & Logo setups</td>
                <td style="padding:8px; text-align:right;">{branding_cost/quantity:,.2f}</td>
                <td style="padding:8px; text-align:right;">{quantity}</td>
                <td style="padding:8px; text-align:right;">{branding_cost:,.2f}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">Custom packaging / casing</td>
                <td style="padding:8px; text-align:right;">{packaging_cost/quantity:,.2f}</td>
                <td style="padding:8px; text-align:right;">{quantity}</td>
                <td style="padding:8px; text-align:right;">{packaging_cost:,.2f}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">Delivery & Shipping Logistics</td>
                <td style="padding:8px; text-align:right;">-</td>
                <td style="padding:8px; text-align:right;">-</td>
                <td style="padding:8px; text-align:right;">{delivery_cost:,.2f}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee; font-weight:bold; background-color:#fafafa;">
                <td style="padding:8px;" colspan="3">Subtotal (before GST)</td>
                <td style="padding:8px; text-align:right;">{subtotal:,.2f}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;" colspan="3">GST ({gst_percentage}%)</td>
                <td style="padding:8px; text-align:right;">{gst_amount:,.2f}</td>
              </tr>
              <tr style="border-bottom:2px solid #ddd; font-weight:bold; background-color:#f0f9ff; color:#0369a1;">
                <td style="padding:8px;" colspan="3">Final Total Amount (including GST)</td>
                <td style="padding:8px; text-align:right;">{total_amount:,.2f}</td>
              </tr>
            </table>
            """
            email_sent = send_quotation_proposal(
                enquiry_id=enquiry_id,
                company_name=enquiry["company_name"],
                receiver_email=enquiry["email"],
                enquiry_code=enquiry["enquiry_code"],
                proposed_package=proposed_package,
                total_amount=total_amount,
                details_table_html=details_table_html,
                notes=notes
            )
            # Log the email transition as a workflow stage
            log_workflow_stage(
                enquiry_id=enquiry_id,
                stage="Quotation Preparation",
                status="Quotation Sent",
                output=f"Proposal emailed to {enquiry['email']}",
                action_note="Quotation email proposal dispatched to customer."
            )

        return jsonify({
            "status": "success",
            "message": "Quotation saved successfully.",
            "email_sent": email_sent,
            "data": {
                "id": quote_id,
                "enquiry_id": enquiry_id,
                "proposed_package": proposed_package,
                "price_per_gift": price_per_gift,
                "branding_cost": branding_cost,
                "packaging_cost": packaging_cost,
                "delivery_cost": delivery_cost,
                "gst_percentage": gst_percentage,
                "gst_amount": gst_amount,
                "total_amount": total_amount,
                "quotation_status": quotation_status,
                "notes": notes
            }
        }), 200
    except Exception as e:
        logger.error(f"Error managing quotation for enquiry {enquiry_id}: {e}")
        return jsonify({"error": "Failed to save quotation due to server error"}), 500

@quotations_bp.route("/api/followup/<int:enquiry_id>", methods=["POST"])
def manage_followup(enquiry_id):
    """
    Generates and saves the follow-up text for an enquiry.
    Sends follow-up email if requested.
    """
    data = request.json or {}
    followup_message = data.get("followup_message", "").strip()
    subject = data.get("subject", "Following up on your bulk gift enquiry | Paper Plane").strip()
    send_email_req = data.get("send_email", False)

    if not followup_message:
        return jsonify({"error": "Follow-up message content is required"}), 400

    try:
        # Fetch enquiry and client profile
        enquiry_query = """
            SELECT e.*, c.company_name, c.email, c.contact_person
            FROM enquiries e
            JOIN companies c ON e.company_id = c.id
            WHERE e.id = %s
        """
        enquiry = execute_query(enquiry_query, (enquiry_id,), fetch_one=True)
        if not enquiry:
            return jsonify({"error": "Enquiry not found"}), 404

        # Save follow-up message inside the recommendations table (by source 'rule_based' or 'gemini')
        # We check the most recent recommendation, and update its followup_message.
        # Alternatively, we create a recommendation record or just log it. Let's update any existing recommendation.
        rec_check = "SELECT id FROM recommendations WHERE enquiry_id = %s ORDER BY created_at DESC LIMIT 1"
        rec = execute_query(rec_check, (enquiry_id,), fetch_one=True)
        if rec:
            rec_update = "UPDATE recommendations SET followup_message = %s WHERE id = %s"
            execute_query(rec_update, (followup_message, rec["id"]), fetch_all=False)
        else:
            # Create a simple container record if none exists
            create_recommendation_record(
                enquiry_id=enquiry_id,
                source="rule_based",
                rec_text="Pending custom compilation.",
                quote_sum="Pending custom compilation.",
                followup_msg=followup_message
            )

        # Update enquiry status to 'Follow-up' if it's currently below that stage
        # The stages are: Enquiry Submitted, Package Selection, Branding Requirement Review, Quotation Preparation, Follow-up, Order Conversion.
        current_status = enquiry["status"]
        if current_status in ["Enquiry Submitted", "Package Selection", "Branding Requirement Review", "Quotation Prepared"]:
            update_status_query = "UPDATE enquiries SET status = 'Follow-up Required', updated_at = CURRENT_TIMESTAMP WHERE id = %s"
            execute_query(update_status_query, (enquiry_id,), fetch_all=False)
            current_status = "Follow-up Required"

        # Log action in workflow history
        log_workflow_stage(
            enquiry_id=enquiry_id,
            stage="Follow-up",
            status=current_status,
            output=followup_message[:200] + "...",
            action_note="Follow-up notes/message drafted and updated in system."
        )

        email_sent = False
        if send_email_req:
            email_sent = send_followup_email(
                enquiry_id=enquiry_id,
                company_name=enquiry["company_name"],
                receiver_email=enquiry["email"],
                subject_text=subject,
                message_text=followup_message
            )
            # Log email dispatch in workflow history
            log_workflow_stage(
                enquiry_id=enquiry_id,
                stage="Follow-up",
                status="Follow-up Sent",
                output=f"Email sent to {enquiry['email']}",
                action_note="Follow-up email dispatched directly to customer."
            )

        return jsonify({
            "status": "success",
            "message": "Follow-up message logged successfully.",
            "email_sent": email_sent
        }), 200

    except Exception as e:
        logger.error(f"Error processing follow-up for enquiry {enquiry_id}: {e}")
        return jsonify({"error": "Failed to complete follow-up action due to server error"}), 500
