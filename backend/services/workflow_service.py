import datetime
import logging
from db import execute_query

logger = logging.getLogger(__name__)

def evaluate_rules(enquiry_data):
    """
    Applies rule-based logic on the enquiry data to generate suggestions,
    determine priority, and build draft emails.
    """
    category = enquiry_data.get("gift_category")
    budget = float(enquiry_data.get("budget_per_gift", 0))
    quantity = int(enquiry_data.get("quantity", 0))
    branding = enquiry_data.get("branding_required", "No")
    delivery_date_str = enquiry_data.get("delivery_date")

    # 1. Determine Priority
    priority = "Medium"
    if quantity > 100:
        priority = "High"

    # Check delivery date proximity (if delivery is within 14 days, mark as High priority)
    if delivery_date_str:
        try:
            if isinstance(delivery_date_str, str):
                delivery_date = datetime.datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
            else:
                delivery_date = delivery_date_str
            days_left = (delivery_date - datetime.date.today()).days
            if days_left <= 14:
                priority = "High"
        except Exception as e:
            logger.error(f"Error parsing delivery date in workflow engine: {e}")

    # 2. Package and Item Recommendations
    items_suggested = []
    package_name = ""

    if category == "Festival Hampers":
        package_name = "Festive Celebration Box"
        items_suggested = ["Premium dry fruits", "Handmade diyas/candles", "Festive sweets", "Custom greeting card"]
    elif category == "Employee Kits":
        package_name = "Welcome Aboard Kit"
        items_suggested = ["Insulated stainless steel water bottle", "Hardcover notebook & premium pen", "Custom Welcome Card", "Premium branded packing box"]
    elif category == "Corporate Gifts":
        package_name = "Classic Corporate Bundle"
        items_suggested = ["Branded power bank", "Leather card holder", "Metal ballpoint pen", "Sleek magnetic box"]
    elif category == "Personalized Gifts":
        package_name = "Bespoke Memory Pack"
        items_suggested = ["Engraved metal thermos", "Personalized desk organizer", "Custom name tag", "Eco-friendly fiber box"]
    else:  # Custom Hampers or default
        package_name = "Tailored Curated Hamper"
        items_suggested = ["Custom chocolate pack", "Gourmet coffee/tea", "Branded ceramic mug", "Reusable wooden crate"]

    # 3. Budget Tier Suggestions
    budget_description = ""
    if budget < 500:
        budget_description = "Suggested Tier: Economy Corporate Tier. Focus on compact, high-utility items."
        items_suggested = [item for item in items_suggested if "Premium" not in item and "Leather" not in item]
        if not items_suggested:
            items_suggested = ["Eco-friendly pen", "Custom key chain", "Standard notebook"]
    elif 500 <= budget <= 1500:
        budget_description = "Suggested Tier: Mid-Range Hamper Tier. Well-balanced mix of utility and aesthetics."
    else:
        budget_description = "Suggested Tier: Premium Executive Tier. High-end materials, executive presentation."
        items_suggested.insert(0, "Premium leather organizer sleeve")
        items_suggested.insert(0, "Luxury tech accessories")

    # 4. Branding Adjustments
    branding_notes = ""
    branding_cost_est = 0.0
    if branding == "Yes" or branding is True:
        branding_notes = "Includes custom screen-printing or laser-engraving of the company logo on all items."
        branding_cost_est = 50.0 if quantity < 100 else 30.0  # discount for higher volumes
    else:
        branding_notes = "Standard default branding, no custom company logo engraving requested."

    # 5. Build Recommendation Text
    recommendation_text = f"Proposed Package Name: {package_name}\n"
    recommendation_text += f"{budget_description}\n"
    recommendation_text += "Recommended Items Include:\n"
    for item in items_suggested:
        recommendation_text += f" - {item}\n"
    recommendation_text += f"\nBranding details: {branding_notes}"

    # 6. Build Quotation Summary
    price_per_gift_est = budget * 0.95  # Leave 5% buffer
    packaging_cost_est = 40.0 if budget < 500 else (80.0 if budget <= 1500 else 150.0)
    delivery_cost_est = 50.0 if quantity < 50 else (35.0 if quantity <= 150 else 20.0) # Cost per item
    delivery_total_est = delivery_cost_est * quantity
    
    branding_total_est = branding_cost_est * quantity
    packaging_total_est = packaging_cost_est * quantity
    items_total_est = price_per_gift_est * quantity
    grand_total_est = items_total_est + branding_total_est + packaging_total_est + delivery_total_est

    quotation_summary = f"Estimated Pricing Structure:\n"
    quotation_summary += f" - Item Unit Price: ₹{price_per_gift_est:.2f} (Qty: {quantity})\n"
    quotation_summary += f" - Branding Cost: ₹{branding_cost_est:.2f} per unit (Total: ₹{branding_total_est:.2f})\n"
    quotation_summary += f" - Packaging Cost: ₹{packaging_cost_est:.2f} per unit (Total: ₹{packaging_total_est:.2f})\n"
    quotation_summary += f" - Delivery/Logistics: ₹{delivery_cost_est:.2f} per unit (Total: ₹{delivery_total_est:.2f})\n"
    quotation_summary += f"Total Estimated Quote: ₹{grand_total_est:.2f}"

    # 7. Build Follow-up Message
    followup_message = f"Hi {enquiry_data.get('contact_person')},\n\n"
    followup_message += f"Thank you for contacting Paper Plane bulk gifting team. We received your request regarding {quantity} units of '{category}' for '{enquiry_data.get('company_name')}'.\n\n"
    followup_message += f"Based on your budget of ₹{budget:.2f} per gift, we recommend our '{package_name}' package. It contains a curated selection of products matching your exact profile.\n"
    if branding == "Yes" or branding is True:
        followup_message += "We've also factored in your requirements for company branding/logo engraving on all items.\n"
    followup_message += f"\nWe can target delivery before your expected date of {delivery_date_str}.\n"
    followup_message += f"I have put together a preliminary proposal totaling approximately ₹{grand_total_est:,.2f}.\n\n"
    followup_message += "Please let us know if you'd like us to share samples or adjust the item configuration!\n\n"
    followup_message += "Best regards,\nPaper Plane Sales Team"

    return {
        "priority": priority,
        "proposed_package": package_name,
        "price_per_gift": price_per_gift_est,
        "branding_cost": branding_cost_est,
        "packaging_cost": packaging_cost_est,
        "delivery_cost": delivery_cost_est,
        "total_amount": grand_total_est,
        "recommendation_text": recommendation_text,
        "quotation_summary": quotation_summary,
        "followup_message": followup_message
    }

def create_recommendation_record(enquiry_id, source, rec_text, quote_sum, followup_msg):
    """Inserts a recommendation record in the database."""
    query = """
        INSERT INTO recommendations (enquiry_id, source, recommendation_text, quotation_summary, followup_message, created_at)
        VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    """
    execute_query(query, (enquiry_id, source, rec_text, quote_sum, followup_msg), fetch_all=False)

def log_workflow_stage(enquiry_id, stage, status, output, action_note):
    """Inserts an entry in the workflow history log."""
    query = """
        INSERT INTO workflow_history (enquiry_id, stage, status, output, action_note, created_at)
        VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    """
    execute_query(query, (enquiry_id, stage, status, output, action_note), fetch_all=False)
