import csv
import io
import logging
from flask import Blueprint, Response, make_response
from db import execute_query

logger = logging.getLogger(__name__)
export_bp = Blueprint("export", __name__)

@export_bp.route("/api/export/csv", methods=["GET"])
def export_csv():
    """Generates and returns a CSV file containing all corporate gift enquiries."""
    query = """
        SELECT 
            e.enquiry_code,
            c.company_name,
            c.contact_person,
            c.email,
            e.gift_category,
            e.quantity,
            e.budget_per_gift,
            e.status,
            e.priority,
            e.created_at,
            q.total_amount
        FROM enquiries e
        JOIN companies c ON e.company_id = c.id
        LEFT JOIN quotations q ON e.id = q.enquiry_id
        ORDER BY e.created_at DESC
    """
    try:
        records = execute_query(query)
        
        # Create an in-memory string buffer
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            "Enquiry ID", 
            "Company Name", 
            "Contact Person", 
            "Email", 
            "Gift Category", 
            "Quantity", 
            "Budget", 
            "Status", 
            "Priority", 
            "Created Date", 
            "Quotation Amount"
        ])
        
        # Write rows
        for record in records:
            created_date = record["created_at"].strftime("%Y-%m-%d %H:%M:%S") if record["created_at"] else ""
            quote_amount = record["total_amount"] if record["total_amount"] is not None else ""
            writer.writerow([
                record["enquiry_code"],
                record["company_name"],
                record["contact_person"],
                record["email"],
                record["gift_category"],
                record["quantity"],
                record["budget_per_gift"],
                record["status"],
                record["priority"],
                created_date,
                quote_amount
            ])
        
        # Prepare response
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = "attachment; filename=enquiry_report.csv"
        response.headers["Content-type"] = "text/csv"
        return response
    except Exception as e:
        logger.error(f"Error during CSV export: {e}")
        return Response("Internal server error during CSV compilation.", status=500)
