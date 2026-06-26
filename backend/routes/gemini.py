import logging
from flask import Blueprint, jsonify, request
from db import execute_query
from services.gemini_service import generate_gemini_suggestions
from services.workflow_service import evaluate_rules, create_recommendation_record, log_workflow_stage

logger = logging.getLogger(__name__)
gemini_bp = Blueprint("gemini_route", __name__)

@gemini_bp.route("/api/gemini-suggestion/<int:enquiry_id>", methods=["POST"])
def get_gemini_suggestion(enquiry_id):
    """
    Retrieves enquiry details, invokes the Gemini API (if key available),
    stores the output in the recommendations table, and logs the workflow action.
    """
    # 1. Fetch the enquiry data joining with company
    query = """
        SELECT 
            e.*, 
            c.company_name, 
            c.contact_person, 
            c.email, 
            c.phone
        FROM enquiries e
        JOIN companies c ON e.company_id = c.id
        WHERE e.id = %s
    """
    try:
        enquiry = execute_query(query, (enquiry_id,), fetch_one=True)
        if not enquiry:
            return jsonify({"error": "Enquiry not found"}), 404

        # 1.5 Check Cache (if not forcing regeneration)
        data = request.json or {}
        force_regenerate = data.get("force", False)
        
        if not force_regenerate:
            cache_query = "SELECT * FROM recommendations WHERE enquiry_id = %s AND source = 'gemini'"
            cached_rec = execute_query(cache_query, (enquiry_id,), fetch_one=True)
            if cached_rec:
                return jsonify({
                    "status": "success",
                    "source": "gemini",
                    "fallback": False,
                    "cached": True,
                    "data": {
                        "recommendation_text": cached_rec["recommendation_text"],
                        "quotation_summary": cached_rec["quotation_summary"],
                        "followup_message": cached_rec["followup_message"]
                    }
                }), 200

        # 2. Try generating Gemini suggestions
        suggestions = generate_gemini_suggestions(enquiry)
        fallback = False

        if suggestions:
            source = "gemini"
            rec_text = suggestions["recommendation_text"]
            quote_sum = suggestions["quotation_summary"]
            followup_msg = suggestions["followup_message"]
        else:
            # Fallback to rule-based logic
            fallback = True
            source = "rule_based"
            rules = evaluate_rules(enquiry)
            rec_text = rules["recommendation_text"]
            quote_sum = rules["quotation_summary"]
            followup_msg = rules["followup_message"]

        # 3. Store in recommendations table
        # Check if record already exists for this enquiry and source
        check_query = "SELECT id FROM recommendations WHERE enquiry_id = %s AND source = %s"
        existing = execute_query(check_query, (enquiry_id, source), fetch_one=True)
        
        if existing:
            update_query = """
                UPDATE recommendations 
                SET recommendation_text = %s, quotation_summary = %s, followup_message = %s, created_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            execute_query(update_query, (rec_text, quote_sum, followup_msg, existing["id"]), fetch_all=False)
        else:
            create_recommendation_record(enquiry_id, source, rec_text, quote_sum, followup_msg)

        # 4. Log workflow history
        action_note = "Generated smart suggestions via Gemini AI." if not fallback else "Generated suggestions via rule-based engine (fallback)."
        log_workflow_stage(
            enquiry_id=enquiry_id,
            stage="Workflow / Assistant Review",
            status="Suggestions Prepared",
            output=rec_text[:200] + "...",
            action_note=action_note
        )

        return jsonify({
            "status": "success",
            "source": source,
            "fallback": fallback,
            "data": {
                "recommendation_text": rec_text,
                "quotation_summary": quote_sum,
                "followup_message": followup_msg
            }
        }), 200

    except Exception as e:
        logger.error(f"Error processing Gemini suggestion for enquiry {enquiry_id}: {e}")
        return jsonify({"error": "Failed to process request due to a server error."}), 500
