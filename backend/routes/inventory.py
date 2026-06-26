from flask import Blueprint, request, jsonify
from db import execute_query
import logging

logger = logging.getLogger(__name__)

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route("/api/inventory", methods=["POST"])
def add_product():
    try:
        data = request.json
        product_name = data.get("product_name")
        category = data.get("category")
        available_quantity = data.get("available_quantity", 0)
        minimum_stock = data.get("minimum_stock", 10)
        supplier = data.get("supplier", "")
        unit_price = data.get("unit_price", 0.0)
        
        if not product_name or not category or unit_price is None:
            return jsonify({"error": "product_name, category, and unit_price are required"}), 400
            
        query = """
            INSERT INTO inventory 
            (product_name, category, available_quantity, minimum_stock, supplier, unit_price) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (product_name, category, available_quantity, minimum_stock, supplier, unit_price)
        product_id = execute_query(query, params, fetch_all=False, fetch_one=False)
        
        return jsonify({"message": "Product added successfully", "product_id": product_id}), 201
    except Exception as e:
        logger.error(f"Error adding product: {e}")
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/api/inventory", methods=["GET"])
def get_inventory():
    try:
        results = execute_query("SELECT * FROM inventory ORDER BY product_name")
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching inventory: {e}")
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/api/inventory/<int:pid>", methods=["PUT"])
def update_product(pid):
    try:
        data = request.json
        product_name = data.get("product_name")
        category = data.get("category")
        available_quantity = data.get("available_quantity")
        reserved_quantity = data.get("reserved_quantity")
        minimum_stock = data.get("minimum_stock")
        supplier = data.get("supplier")
        unit_price = data.get("unit_price")
        
        updates = []
        params = []
        
        if product_name is not None:
            updates.append("product_name = %s")
            params.append(product_name)
        if category is not None:
            updates.append("category = %s")
            params.append(category)
        if available_quantity is not None:
            updates.append("available_quantity = %s")
            params.append(available_quantity)
        if reserved_quantity is not None:
            updates.append("reserved_quantity = %s")
            params.append(reserved_quantity)
        if minimum_stock is not None:
            updates.append("minimum_stock = %s")
            params.append(minimum_stock)
        if supplier is not None:
            updates.append("supplier = %s")
            params.append(supplier)
        if unit_price is not None:
            updates.append("unit_price = %s")
            params.append(unit_price)
            
        if not updates:
            return jsonify({"error": "No fields to update"}), 400
            
        query = f"UPDATE inventory SET {', '.join(updates)} WHERE product_id = %s"
        params.append(pid)
        
        execute_query(query, tuple(params), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating product: {e}")
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/api/inventory/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    try:
        execute_query("DELETE FROM inventory WHERE product_id = %s", (pid,), fetch_all=False, fetch_one=False)
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting product: {e}")
        return jsonify({"error": str(e)}), 500
