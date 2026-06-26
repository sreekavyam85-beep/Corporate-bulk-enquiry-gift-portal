import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from db import execute_query
import logging

logger = logging.getLogger(__name__)

personalizations_bp = Blueprint('personalizations', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@personalizations_bp.route("/api/personalizations", methods=["POST"])
def create_personalization():
    try:
        data = request.form
        customer_id = data.get("customer_id")
        product_name = data.get("product_name")
        recipient_name = data.get("recipient_name")
        
        if not customer_id or not product_name or not recipient_name:
            return jsonify({"error": "customer_id, product_name, and recipient_name are required"}), 400

        custom_message = data.get("custom_message", "")
        font_style = data.get("font_style", "")
        font_color = data.get("font_color", "")
        gift_wrap = data.get("gift_wrap", "")
        instructions = data.get("instructions", "")

        logo_path = None
        image_path = None

        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        # Handle Logo Upload
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(UPLOAD_FOLDER, f"logo_{customer_id}_{filename}")
                file.save(filepath)
                logo_path = f"logo_{customer_id}_{filename}"

        # Handle Image Upload
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(UPLOAD_FOLDER, f"image_{customer_id}_{filename}")
                file.save(filepath)
                image_path = f"image_{customer_id}_{filename}"

        query = """
            INSERT INTO personalizations 
            (customer_id, product_name, recipient_name, custom_message, logo_path, image_path, font_style, font_color, gift_wrap, instructions) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (customer_id, product_name, recipient_name, custom_message, logo_path, image_path, font_style, font_color, gift_wrap, instructions)
        
        personalization_id = execute_query(query, params, fetch_all=False, fetch_one=False)
        return jsonify({"message": "Personalization created successfully", "personalization_id": personalization_id}), 201

    except Exception as e:
        logger.error(f"Error creating personalization: {e}")
        return jsonify({"error": str(e)}), 500

@personalizations_bp.route("/api/personalizations", methods=["GET"])
def get_personalizations():
    try:
        status_filter = request.args.get("status")
        query = "SELECT * FROM personalizations"
        params = ()
        
        if status_filter:
            query += " WHERE status = %s"
            params = (status_filter,)
            
        query += " ORDER BY created_at DESC"
        
        results = execute_query(query, params)
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching personalizations: {e}")
        return jsonify({"error": str(e)}), 500

@personalizations_bp.route("/api/personalizations/<int:pid>", methods=["PUT"])
def update_personalization_status(pid):
    try:
        data = request.json
        status = data.get("status")
        if not status:
            return jsonify({"error": "status is required"}), 400
            
        query = "UPDATE personalizations SET status = %s WHERE personalization_id = %s"
        execute_query(query, (status, pid), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Personalization status updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating personalization: {e}")
        return jsonify({"error": str(e)}), 500

@personalizations_bp.route("/api/personalizations/<int:pid>", methods=["DELETE"])
def delete_personalization(pid):
    try:
        query = "DELETE FROM personalizations WHERE personalization_id = %s"
        execute_query(query, (pid,), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Personalization deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting personalization: {e}")
        return jsonify({"error": str(e)}), 500
