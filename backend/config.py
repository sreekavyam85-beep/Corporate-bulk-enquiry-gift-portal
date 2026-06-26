import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "corporate_gift_portal")
    DB_PORT = int(os.getenv("DB_PORT", 3306))

    # Gemini API Key
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # SMTP Configuration
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "paperplane.bulkgifts@gmail.com")
    MAIL_APP_PASSWORD = os.getenv("MAIL_APP_PASSWORD", "")
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
