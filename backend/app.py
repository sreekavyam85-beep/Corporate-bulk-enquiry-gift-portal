import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import init_db

# Configure Logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all routes to simplify frontend connection
CORS(app)

# Load Configurations
app.config.from_object(Config)

# Register Blueprints
from routes.enquiries import enquiries_bp
from routes.quotations import quotations_bp
from routes.gemini import gemini_bp
from routes.export import export_bp
from routes.personalizations import personalizations_bp
from routes.design_approvals import design_approvals_bp
from routes.inventory import inventory_bp
from routes.occasions import occasions_bp
from routes.returns import returns_bp

app.register_blueprint(enquiries_bp)
app.register_blueprint(quotations_bp)
app.register_blueprint(gemini_bp)
app.register_blueprint(export_bp)
app.register_blueprint(personalizations_bp)
app.register_blueprint(design_approvals_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(occasions_bp)
app.register_blueprint(returns_bp)

@app.route("/health", methods=["GET"])
def health_check():
    """Simple API health check endpoint."""
    return jsonify({"status": "healthy", "service": "paperplane-bulk-gift-backend"}), 200

@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    """Serves uploaded logo images from the uploads directory."""
    from flask import send_from_directory
    upload_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    return send_from_directory(upload_path, filename)

@app.route("/api/health/db", methods=["GET"])
def db_health_check():
    """Checks the database connectivity and returns status or exact error."""
    try:
        from db import get_db_connection
        conn = get_db_connection()
        conn.close()
        return jsonify({
            "connected": True,
            "database": Config.DB_NAME
        }), 200
    except Exception as e:
        logger.error(f"Database health check failed: {e}", exc_info=True)
        return jsonify({
            "connected": False,
            "error": str(e)
        }), 500

# Error Handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "An unexpected database or server error occurred"}), 500

if __name__ == "__main__":
    # Bootstrapping the database schema
    logger.info("Checking and bootstrapping MySQL database tables...")
    try:
        schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_db.sql")
        init_db(schema_path)
        logger.info(f"[DATABASE CONNECTION] SUCCESS: Connected to MySQL at {Config.DB_HOST}:{Config.DB_PORT} and verified database '{Config.DB_NAME}'.")
    except Exception as e:
        logger.error(f"[DATABASE CONNECTION] FAILURE: Can't connect to MySQL at {Config.DB_HOST}:{Config.DB_PORT}. Reason: {e}", exc_info=True)

    # Run the Flask App
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting Flask server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
