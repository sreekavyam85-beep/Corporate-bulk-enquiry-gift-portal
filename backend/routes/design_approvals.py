import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from db import execute_query
import logging

logger = logging.getLogger(__name__)

design_approvals_bp = Blueprint('design_approvals', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@design_approvals_bp.route("/api/design_approvals", methods=["POST"])
def upload_mockup():
    try:
        data = request.form
        personalization_id = data.get("personalization_id")
        designer_notes = data.get("designer_notes", "")
        
        if not personalization_id:
            return jsonify({"error": "personalization_id is required"}), 400

        if 'mockup' not in request.files:
            return jsonify({"error": "mockup file is required"}), 400
            
        file = request.files['mockup']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({"error": "Invalid or missing file"}), 400
            
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)
            
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"mockup_{personalization_id}_{filename}")
        file.save(filepath)
        mockup_path = f"mockup_{personalization_id}_{filename}"
        
        # Check if one already exists to increment version
        existing = execute_query("SELECT version FROM design_approvals WHERE personalization_id = %s ORDER BY version DESC LIMIT 1", (personalization_id,), fetch_all=False, fetch_one=True)
        version = existing['version'] + 1 if existing else 1
        
        query = """
            INSERT INTO design_approvals 
            (personalization_id, mockup_file, version, status, designer_notes) 
            VALUES (%s, %s, %s, 'Mockup Uploaded', %s)
        """
        params = (personalization_id, mockup_path, version, designer_notes)
        design_id = execute_query(query, params, fetch_all=False, fetch_one=False)
        
        # Update personalization status
        execute_query("UPDATE personalizations SET status = 'Design Review' WHERE personalization_id = %s", (personalization_id,), fetch_all=False, fetch_one=False)
        
        return jsonify({"message": "Mockup uploaded successfully", "design_id": design_id, "version": version}), 201

    except Exception as e:
        logger.error(f"Error uploading mockup: {e}")
        return jsonify({"error": str(e)}), 500

@design_approvals_bp.route("/api/design_approvals", methods=["GET"])
def get_approvals():
    try:
        pid = request.args.get("personalization_id")
        if pid:
            query = "SELECT * FROM design_approvals WHERE personalization_id = %s ORDER BY version DESC"
            results = execute_query(query, (pid,))
        else:
            query = """
                SELECT da.*, p.product_name, p.recipient_name 
                FROM design_approvals da
                JOIN personalizations p ON da.personalization_id = p.personalization_id
                ORDER BY da.created_at DESC
            """
            results = execute_query(query)
            
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching design approvals: {e}")
        return jsonify({"error": str(e)}), 500

@design_approvals_bp.route("/api/design_approvals/<int:design_id>", methods=["PUT"])
def update_approval(design_id):
    try:
        data = request.json
        status = data.get("status")
        comments = data.get("customer_comments")
        
        if not status:
            return jsonify({"error": "status is required"}), 400
            
        query = "UPDATE design_approvals SET status = %s"
        params = [status]
        
        if comments is not None:
            query += ", customer_comments = %s"
            params.append(comments)
            
        if status == 'Approved':
            query += ", approval_date = CURRENT_TIMESTAMP"
            
        query += " WHERE design_id = %s"
        params.append(design_id)
        
        execute_query(query, tuple(params), fetch_all=False, fetch_one=False)
        
        # Optionally update parent personalization
        if status == 'Approved':
            # get personalization_id
            row = execute_query("SELECT personalization_id FROM design_approvals WHERE design_id = %s", (design_id,), fetch_all=False, fetch_one=True)
            if row:
                execute_query("UPDATE personalizations SET status = 'Design Approved' WHERE personalization_id = %s", (row['personalization_id'],), fetch_all=False, fetch_one=False)
        
        return jsonify({"message": "Design approval updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating design approval: {e}")
        return jsonify({"error": str(e)}), 500
