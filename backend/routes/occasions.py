from flask import Blueprint, request, jsonify
from db import execute_query
import logging

logger = logging.getLogger(__name__)

occasions_bp = Blueprint('occasions', __name__)

@occasions_bp.route("/api/occasions", methods=["POST"])
def add_occasion():
    try:
        data = request.json
        customer_id = data.get("customer_id")
        occasion_name = data.get("occasion_name")
        occasion_type = data.get("occasion_type")
        occasion_date = data.get("occasion_date") # YYYY-MM-DD
        
        if not customer_id or not occasion_name or not occasion_type or not occasion_date:
            return jsonify({"error": "customer_id, occasion_name, occasion_type, and occasion_date are required"}), 400
            
        description = data.get("description", "")
        reminder_days = data.get("reminder_days_before", 7)
        
        query = """
            INSERT INTO occasions 
            (customer_id, occasion_name, occasion_type, occasion_date, description, reminder_days_before) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (customer_id, occasion_name, occasion_type, occasion_date, description, reminder_days)
        occasion_id = execute_query(query, params, fetch_all=False, fetch_one=False)
        
        return jsonify({"message": "Occasion added successfully", "occasion_id": occasion_id}), 201
    except Exception as e:
        logger.error(f"Error adding occasion: {e}")
        return jsonify({"error": str(e)}), 500

@occasions_bp.route("/api/occasions", methods=["GET"])
def get_occasions():
    try:
        # Optionally filter by month/year or get all
        results = execute_query("SELECT o.*, c.company_name FROM occasions o JOIN companies c ON o.customer_id = c.id ORDER BY o.occasion_date ASC")
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching occasions: {e}")
        return jsonify({"error": str(e)}), 500

@occasions_bp.route("/api/occasions/reminders", methods=["GET"])
def get_reminders():
    try:
        # Simplified query: occasions where today >= (occasion_date - reminder_days)
        query = """
            SELECT o.*, c.company_name 
            FROM occasions o 
            JOIN companies c ON o.customer_id = c.id
            WHERE o.status = 'Active' 
            AND DATE_SUB(o.occasion_date, INTERVAL o.reminder_days_before DAY) <= CURRENT_DATE
            AND o.occasion_date >= CURRENT_DATE
            ORDER BY o.occasion_date ASC
        """
        results = execute_query(query)
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching reminders: {e}")
        return jsonify({"error": str(e)}), 500

@occasions_bp.route("/api/occasions/<int:oid>", methods=["PUT"])
def update_occasion(oid):
    try:
        data = request.json
        updates = []
        params = []
        
        for field in ["occasion_name", "occasion_type", "occasion_date", "description", "reminder_days_before", "status"]:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
                
        if not updates:
            return jsonify({"error": "No fields to update"}), 400
            
        query = f"UPDATE occasions SET {', '.join(updates)} WHERE occasion_id = %s"
        params.append(oid)
        
        execute_query(query, tuple(params), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Occasion updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating occasion: {e}")
        return jsonify({"error": str(e)}), 500

@occasions_bp.route("/api/occasions/<int:oid>", methods=["DELETE"])
def delete_occasion(oid):
    try:
        execute_query("DELETE FROM occasions WHERE occasion_id = %s", (oid,), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Occasion deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting occasion: {e}")
        return jsonify({"error": str(e)}), 500
