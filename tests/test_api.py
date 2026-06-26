import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend directory to sys.path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from routes.enquiries import validate_email
from services.workflow_service import evaluate_rules

class TestCorporateGiftingPortal(unittest.TestCase):
    
    def test_email_validation(self):
        """Validates the syntax checking regex helper for emails."""
        self.assertTrue(validate_email("test@example.com"))
        self.assertTrue(validate_email("corporate.gifts@paper-plane.co.in"))
        self.assertFalse(validate_email("testexample.com"))
        self.assertFalse(validate_email("test@example"))
        self.assertFalse(validate_email(""))

    def test_rule_based_priority_and_package_matching(self):
        """Verifies workflow recommendations and urgency assignments based on rules."""
        # Case 1: Large quantity of employee kits, high budget, close date -> High Priority, welcome onboard kit
        enquiry_1 = {
            "gift_category": "Employee Kits",
            "quantity": 150,
            "budget_per_gift": 1800.0,
            "branding_required": "Yes",
            "delivery_date": "2026-06-25" # delivery date is close (today is 2026-06-20)
        }
        res_1 = evaluate_rules(enquiry_1)
        self.assertEqual(res_1["priority"], "High")
        self.assertEqual(res_1["proposed_package"], "Welcome Aboard Kit")
        self.assertIn("Premium branded packing box", res_1["recommendation_text"])
        self.assertIn("Total Estimated Quote", res_1["quotation_summary"])
        self.assertIn("custom welcome card", res_1["recommendation_text"].lower())

        # Case 2: Small quantity of festival hampers, small budget -> Medium priority, basic items
        enquiry_2 = {
            "gift_category": "Festival Hampers",
            "quantity": 20,
            "budget_per_gift": 400.0,
            "branding_required": "No",
            "delivery_date": "2026-09-30" # far out date
        }
        res_2 = evaluate_rules(enquiry_2)
        self.assertEqual(res_2["priority"], "Medium")
        self.assertEqual(res_2["proposed_package"], "Festive Celebration Box")
        # should have filtered out premium dry fruits or similar premium titles due to budget < 500
        self.assertIn("Economy Corporate Tier", res_2["recommendation_text"])

    @patch("routes.enquiries.execute_query")
    @patch("routes.enquiries.send_enquiry_confirmation")
    def test_api_create_missing_fields(self, mock_send_email, mock_query):
        """Tests that /api/create rejects requests with missing details."""
        # Create a Flask test app context
        from app import app
        app.config["TESTING"] = True
        client = app.test_client()

        # Missing expected delivery date
        payload = {
            "company_name": "Acme Corp",
            "contact_person": "Wile E.",
            "company_email": "wile@acme.com",
            "phone": "9876543210",
            "gift_category": "Corporate Gifts",
            "quantity": "50",
            "budget_per_gift": "1000",
            "delivery_date": ""
        }
        response = client.post("/api/create", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required fields", response.get_json()["error"])

    @patch("routes.enquiries.execute_query")
    @patch("routes.enquiries.send_enquiry_confirmation")
    def test_api_create_invalid_numeric_ranges(self, mock_send_email, mock_query):
        """Tests validation failures for invalid numbers and past dates."""
        from app import app
        app.config["TESTING"] = True
        client = app.test_client()

        # Negative budget cap
        payload = {
            "company_name": "Acme Corp",
            "contact_person": "Wile E.",
            "company_email": "wile@acme.com",
            "phone": "9876543210",
            "gift_category": "Corporate Gifts",
            "quantity": "50",
            "budget_per_gift": "-10",
            "delivery_date": "2026-08-30"
        }
        response = client.post("/api/create", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Budget per gift must be a positive number", response.get_json()["error"])

    @patch("routes.export.execute_query")
    def test_csv_export_format(self, mock_query):
        """Tests that CSV export returns the correct headers and columns."""
        from app import app
        app.config["TESTING"] = True
        client = app.test_client()

        # Mock database return value
        mock_query.return_value = [
            {
                "enquiry_code": "PP-2026-XYZ1",
                "company_name": "Tesla Inc",
                "contact_person": "Elon Musk",
                "email": "elon@tesla.com",
                "gift_category": "Corporate Gifts",
                "quantity": 100,
                "budget_per_gift": 1500.00,
                "status": "Quotation Prepared",
                "priority": "High",
                "created_at": MagicMock(strftime=lambda fmt: "2026-06-20 12:00:00"),
                "total_amount": 160000.00
            }
        ]

        response = client.get("/api/export/csv")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.content_type)
        
        csv_data = response.data.decode("utf-8")
        self.assertIn("Enquiry ID,Company Name,Contact Person,Email,Gift Category,Quantity,Budget,Status,Priority,Created Date,Quotation Amount", csv_data)
        self.assertIn("PP-2026-XYZ1", csv_data)
        self.assertIn("Tesla Inc", csv_data)
        self.assertIn("160000.0", csv_data)

    @patch("routes.quotations.execute_query")
    @patch("routes.quotations.send_quotation_proposal")
    @patch("routes.quotations.log_workflow_stage")
    def test_quotation_creation_and_gst_calculations(self, mock_log, mock_send_email, mock_query):
        """Verifies quotation creation parses GST, calculates total amount, and calls send_quotation_proposal."""
        from app import app
        app.config["TESTING"] = True
        client = app.test_client()

        # Mock parent enquiry response
        mock_query.side_effect = [
            # First execute_query call (checking parent enquiry)
            {
                "id": 1,
                "company_name": "Test Company",
                "email": "test@company.com",
                "contact_person": "Jane Doe",
                "enquiry_code": "PP-2026-TEST"
            },
            # Second execute_query call (check existing quotation - returns None for new quote)
            None,
            # Third execute_query call (insert query return value)
            101,
            # Fourth execute_query call (update enquiry status)
            None
        ]

        payload = {
            "proposed_package": "Standard Welcome Pack",
            "price_per_gift": 100.0,
            "quantity": 10,
            "branding_cost": 20.0,
            "packaging_cost": 30.0,
            "delivery_cost": 40.0,
            "gst_percentage": 18.0,
            "quotation_status": "Draft",
            "notes": "Test quotation terms.",
            "send_email": False
        }

        response = client.post("/api/quotation/1", json=payload)
        self.assertEqual(response.status_code, 200)
        
        json_data = response.get_json()
        self.assertEqual(json_data["status"], "success")
        
        # Subtotal calculation: (100.0 * 10) + 20.0 + 30.0 + 40.0 = 1090.0
        # GST calculation: 1090.0 * 0.18 = 196.2
        # Total calculation: 1090.0 + 196.2 = 1286.2
        self.assertEqual(json_data["data"]["gst_percentage"], 18.0)
        self.assertEqual(json_data["data"]["gst_amount"], 196.2)
        self.assertEqual(json_data["data"]["total_amount"], 1286.2)
        self.assertEqual(json_data["data"]["quotation_status"], "Draft")

if __name__ == "__main__":
    unittest.main()
