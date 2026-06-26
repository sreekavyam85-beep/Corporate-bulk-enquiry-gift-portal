import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from db import execute_query
import logging

logger = logging.getLogger(__name__)

returns_bp = Blueprint('returns', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@returns_bp.route("/api/returns", methods=["POST"])
def submit_return():
    try:
        data = request.form
        order_id = data.get("order_id")
        customer_id = data.get("customer_id")
        reason = data.get("reason")
        
        if not order_id or not customer_id or not reason:
            return jsonify({"error": "order_id, customer_id, and reason are required"}), 400
            
        description = data.get("description", "")
        image_path = None
        
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                if not os.path.exists(UPLOAD_FOLDER):
                    os.makedirs(UPLOAD_FOLDER)
                filename = secure_filename(file.filename)
                filepath = os.path.join(UPLOAD_FOLDER, f"return_{order_id}_{filename}")
                file.save(filepath)
                image_path = f"return_{order_id}_{filename}"
                
        query = """
            INSERT INTO returns 
            (order_id, customer_id, reason, description, image_path) 
            VALUES (%s, %s, %s, %s, %s)
        """
        params = (order_id, customer_id, reason, description, image_path)
        return_id = execute_query(query, params, fetch_all=False, fetch_one=False)
        
        return jsonify({"message": "Return request submitted successfully", "return_id": return_id}), 201

    except Exception as e:
        logger.error(f"Error submitting return: {e}")
        return jsonify({"error": str(e)}), 500

@returns_bp.route("/api/returns", methods=["GET"])
def get_returns():
    try:
        status_filter = request.args.get("status")
        query = """
            SELECT r.*, c.company_name, e.enquiry_code 
            FROM returns r
            JOIN companies c ON r.customer_id = c.id
            JOIN enquiries e ON r.order_id = e.id
        """
        params = ()
        
        if status_filter:
            query += " WHERE r.status = %s"
            params = (status_filter,)
            
        query += " ORDER BY r.created_at DESC"
        results = execute_query(query, params)
        
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching returns: {e}")
        return jsonify({"error": str(e)}), 500

@returns_bp.route("/api/returns/<int:rid>", methods=["PUT"])
def update_return(rid):
    try:
        data = request.json
        updates = []
        params = []
        
        for field in ["status", "admin_notes", "refund_amount", "replacement_initiated"]:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
                
        if not updates:
            return jsonify({"error": "No fields to update"}), 400
            
        query = f"UPDATE returns SET {', '.join(updates)} WHERE return_id = %s"
        params.append(rid)
        
        execute_query(query, tuple(params), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Return request updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating return: {e}")
        return jsonify({"error": str(e)}), 500
