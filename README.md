# Corporate Bulk Gift Enquiry Portal (Paper Plane)

A full-stack web application designed for **Paper Plane** to manage corporate bulk gift enquiries, package selections, branding workflows, quotation calculations, sales follow-ups, and admin reporting.

---

## Project Structure
```text
/corporatebulkgiftenquiryportal
  /frontend              # Vite + React (JavaScript, JSX, Vanilla CSS)
    /src
      /components        # Reusable UI elements (cards, tables, badges)
      /pages             # Main intake and admin screen workspaces
      /services          # API helper classes
      /styles            # Global Outfit typography & light blue styling
  /backend               # Python Flask Web APIs
    /routes              # Endpoint blueprints (leads, quotes, exports, Gemini)
    /services            # Logic services (SMTP mail, rules engine, Gemini AI)
    app.py               # Main Flask server entry point
    config.py            # Environment configurations loader
    db.py                # Direct PyMySQL connection driver
    requirements.txt     # Python requirements
    .env.example         # Template configuration env file
  /docs                  # Project files documentation
    DATABASE_SCHEMA.md   # SQL structures & relationships
    API_DOCUMENTATION.md # Endpoint paths, JSON request examples
    TEST_CASES.md        # Standard validation and verification scripts
  /tests                 # Python mock backend tests
```

---

## Setup Instructions

### 1. Database Configuration (MySQL)
Make sure you have a running MySQL server.
1. Connect to your MySQL server client (e.g. CLI, MySQL Workbench, DBeaver).
2. Run the SQL script found in `backend/init_db.sql` to generate the database database and tables:
   ```sql
   CREATE DATABASE IF NOT EXISTS corporate_bulk_gifts;
   USE corporate_bulk_gifts;
   -- Execute the statements from backend/init_db.sql
   ```
*(Note: The Flask application app.py will also attempt to auto-initialize these tables automatically on boot if connection parameters are correct).*

### 2. Configure Backend Environment
1. Copy `backend/.env.example` into a new file named `backend/.env`.
2. Open `backend/.env` and replace the placeholder variables with your credentials:
   ```env
   # MySQL Connection Details
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=corporate_bulk_gifts
   DB_PORT=3306

   # SMTP Credentials for Gmail
   # Note: Since Google requires 2FA, generate an App Password in your security settings
   MAIL_USERNAME=paperplane.bulkgifts@gmail.com
   MAIL_APP_PASSWORD=your_gmail_app_password_here
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   MAIL_USE_TLS=true

   # optional: Google Gemini API Suggestions Key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 3. Install Backend Dependencies & Run Server
1. Navigate into the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Activate on Windows:
   .\venv\Scripts\activate
   ```
3. Install package requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask development server:
   ```bash
   python app.py
   ```
The backend API service will bind to `http://localhost:5000`.

### 4. Install Frontend Dependencies & Run App
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start the Vite local server:
   ```bash
   npm run dev
   ```
The frontend portal page will open at `http://localhost:5173`.

---

## Running Unit Tests
We provide mock-based Python unit tests verifying input validations and rule recommendations.
Run tests from the root workspace directory using:
```bash
python -m unittest tests/test_api.py
```
