import pymysql
import pymysql.cursors
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import threading

_local_data = threading.local()

def get_db_connection():
    """Returns a direct PyMySQL connection to the database, caching it per-thread for maximum performance."""
    try:
        # Check if this thread already has an open, active connection
        if hasattr(_local_data, 'connection') and _local_data.connection.open:
            try:
                _local_data.connection.ping(reconnect=True) # Ensure it hasn't timed out
                return _local_data.connection
            except Exception:
                pass # Connection died, create a new one
                
        _local_data.connection = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
        return _local_data.connection
    except Exception as e:
        logger.error(f"[DATABASE CONNECTION ERROR] Failed to connect to MySQL at {Config.DB_HOST}:{Config.DB_PORT} as user '{Config.DB_USER}' using database '{Config.DB_NAME}'. Details: {e}", exc_info=True)
        raise e

_db_initialized = False

def execute_query(query, params=None, fetch_all=True, fetch_one=False):
    """Utility function to execute queries safely with automatic resource cleanup."""
    global _db_initialized
    if not _db_initialized:
        try:
            import os
            schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_db.sql")
            init_db(schema_path)
            _db_initialized = True
        except Exception as e:
            logger.warning(f"Lazy database initialization pending: {e}")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch_one:
                return cursor.fetchone()
            if fetch_all:
                return cursor.fetchall()
            return cursor.lastrowid
    except Exception as e:
        logger.error(f"Database error executing query '{query}': {e}")
        raise e

def init_db(schema_file_path):
    """Initializes the database schema using the SQL script."""
    # First connect without database selection to create database if it doesn't exist
    conn = pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT,
        autocommit=True
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME}")
            logger.info(f"Database '{Config.DB_NAME}' created or verified.")
    finally:
        conn.close()

    # Now read and execute the init script
    with open(schema_file_path, 'r', encoding='utf-8') as f:
        sql_script = f.read()

    # Split by semicolon to run statements sequentially
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Simple splitter that respects comments isn't strictly necessary for schema setup
            # but we can filter empty statements.
            statements = sql_script.split(';')
            for statement in statements:
                stmt_stripped = statement.strip()
                if stmt_stripped:
                    cursor.execute(stmt_stripped)
        logger.info("Database schema initialized successfully.")
        
        # Verify if quotations table needs alteration to support GST percentage and amount
        try:
            with conn.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM quotations LIKE 'gst_percentage'")
                col_exists = cursor.fetchone()
                if not col_exists:
                    cursor.execute("ALTER TABLE quotations ADD COLUMN gst_percentage DECIMAL(5, 2) DEFAULT 0.00")
                    cursor.execute("ALTER TABLE quotations ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0.00")
                    logger.info("Altered quotations table to add GST columns.")
        except Exception as alter_err:
            logger.warning(f"Did not alter quotations table: {alter_err}")
    except Exception as e:
        logger.error(f"Error during schema initialization: {e}")
        raise e
    finally:
        conn.close()
