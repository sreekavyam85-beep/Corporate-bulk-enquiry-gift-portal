import logging
from config import Config

logger = logging.getLogger(__name__)

def generate_gemini_suggestions(enquiry_data):
    """
    Calls the Google Gemini API to generate tailored bulk gift recommendations,
    a cost breakdown summary, and a follow-up email draft.
    
    Returns a dict with key fields or None if the API fails or is not configured.
    """
    if not Config.GEMINI_API_KEY:
        logger.info("Gemini API key is missing. Skipping Gemini suggestions.")
        return None

    try:
        import google.generativeai as genai
        logger.info("Initializing Gemini API and preparing prompt...")
        genai.configure(api_key=Config.GEMINI_API_KEY)
        
        # Use the flash model for general text generation
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Compile details for prompting
        category = enquiry_data.get("gift_category")
        quantity = enquiry_data.get("quantity")
        budget = enquiry_data.get("budget_per_gift")
        branding = enquiry_data.get("branding_required")
        branding_details = enquiry_data.get("branding_details") or "None"
        personalization = enquiry_data.get("personalization_requirements") or "None"
        packaging = enquiry_data.get("packaging_requirements") or "None"
        additional = enquiry_data.get("additional_requirements") or "None"
        company_name = enquiry_data.get("company_name")
        contact_person = enquiry_data.get("contact_person")

        prompt = f"""
You are an expert sales consultant for "Paper Plane", a premium corporate bulk gifting company.
Your task is to analyze the following customer bulk gift enquiry and generate custom recommendations.

CLIENT DETAILS:
- Company Name: {company_name}
- Contact Person: {contact_person}

ENQUIRY DETAILS:
- Gift Category: {category}
- Quantity: {quantity} units
- Budget Per Gift: INR {budget}
- Branding Required: {branding} (Details: {branding_details})
- Personalization Requirements: {personalization}
- Packaging Requirements: {packaging}
- Special Notes: {additional}

You MUST structure your response into exactly three sections separated by specific markers:
===RECOMMENDATIONS===
(Provide 3 specific premium gift combinations aligning with the category and budget. Outline materials, quality, and aesthetics.)

===QUOTATION===
(Provide a proposed itemized estimation breakdown per unit and overall. Give a rationale for packaging, branding, delivery costs based on the client requirements.)

===FOLLOWUP===
(Write a polite, professional follow-up email from Paper Plane Sales Team to the contact person, discussing details, pricing, and next steps.)

Ensure that your output follows this exact structure so that it can be parsed.
"""

        logger.info("Sending request to Gemini API with retry logic...")
        import time
        max_retries = 2
        response = None
        
        for attempt in range(max_retries):
            try:
                # Add timeout to ensure we don't hang
                response = model.generate_content(prompt, request_options={"timeout": 15})
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Gemini API failed after {max_retries} attempts: {e}")
                    raise e
                logger.warning(f"Gemini API attempt {attempt + 1} failed. Retrying in 2 seconds...")
                time.sleep(2)
                
        text = response.text
        
        # Parse the output text using our markers
        recommendation_text = ""
        quotation_summary = ""
        followup_message = ""

        if "===RECOMMENDATIONS===" in text:
            parts = text.split("===RECOMMENDATIONS===")[1].split("===QUOTATION===")
            recommendation_text = parts[0].strip()
            
            if "===FOLLOWUP===" in parts[1]:
                subparts = parts[1].split("===FOLLOWUP===")
                quotation_summary = subparts[0].strip()
                followup_message = subparts[1].strip()
            else:
                quotation_summary = parts[1].strip()
        else:
            # Fallback parsing in case the model ignored exact format but returned general text
            logger.warning("Gemini did not return output with exact markers. Splitting raw text.")
            recommendation_text = text
            quotation_summary = f"Total Budget Estimated: ₹{float(budget) * int(quantity):,.2f} for {quantity} items."
            followup_message = f"Hi {contact_person}, thank you for your enquiry. We are working on a tailored proposal for {company_name}."

        return {
            "recommendation_text": recommendation_text,
            "quotation_summary": quotation_summary,
            "followup_message": followup_message
        }
    except Exception as e:
        # Catch any Google API exception (429, timeouts, auth errors) and fallback silently
        logger.warning(f"Gemini API unavailable or failed, seamlessly falling back. Reason: {e}")
        return None
