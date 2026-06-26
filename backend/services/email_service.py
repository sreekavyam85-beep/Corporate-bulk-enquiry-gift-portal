import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import threading
from config import Config
from db import execute_query

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_email(enquiry_id, receiver_email, subject, status):
    """Saves the log of the email transaction in the database."""
    query = """
        INSERT INTO email_logs (enquiry_id, receiver_email, subject, status, sent_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
    """
    try:
        execute_query(query, (enquiry_id, receiver_email, subject, status), fetch_all=False)
        logger.info(f"Logged email to {receiver_email} with status {status}")
    except Exception as e:
        logger.error(f"Failed to log email to database: {e}")

def send_email(enquiry_id, receiver_email, subject, html_content):
    """Sends an email using Gmail SMTP and logs the result, preventing duplicates."""
    
    # Check for duplicate email to avoid spamming the client
    check_query = "SELECT id FROM email_logs WHERE enquiry_id = %s AND subject = %s AND status = 'Sent'"
    existing = execute_query(check_query, (enquiry_id, subject), fetch_all=False, fetch_one=True)
    if existing:
        logger.info(f"Email with subject '{subject}' already sent for enquiry {enquiry_id}. Skipping duplicate send.")
        return True

    # Check if configurations are set
    if not Config.MAIL_APP_PASSWORD:
        logger.warning("SMTP Mail password not set in environment. Mocking successful email send.")
        log_email(enquiry_id, receiver_email, subject, "Mocked (No Credentials)")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = Config.MAIL_USERNAME
    msg["To"] = receiver_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        logger.info(f"Connecting to SMTP server {Config.SMTP_SERVER}:{Config.SMTP_PORT}...")
        # Add 10-second timeout to prevent SMTP server issues from freezing the API route
        server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT, timeout=10)
        server.ehlo()
        if Config.MAIL_USE_TLS:
            server.starttls()
            server.ehlo()
        
        server.login(Config.MAIL_USERNAME, Config.MAIL_APP_PASSWORD)
        server.sendmail(Config.MAIL_USERNAME, receiver_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email sent successfully to {receiver_email}")
        log_email(enquiry_id, receiver_email, subject, "Sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {receiver_email}: {e}")
        log_email(enquiry_id, receiver_email, subject, "Failed")
        return False

def send_enquiry_confirmation(enquiry_id, company_name, receiver_email, enquiry_code, gift_category, quantity):
    """Sends a confirmation email when an enquiry is successfully submitted."""
    subject = f"Enquiry Confirmation - Reference: {enquiry_code} | Paper Plane Gifting"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Thank You for Your Gifting Enquiry!</h2>
          <p>Dear {company_name} Team,</p>
          <p>We have successfully received your bulk gift enquiry. Our sales team is already reviewing your details and preparing your tailor-made quotation.</p>
          
          <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0050b3;">Enquiry Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold; width: 150px;">Reference ID:</td>
                <td style="padding: 5px 0; color: #0070f3; font-weight: bold;">{enquiry_code}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Gift Category:</td>
                <td style="padding: 5px 0;">{gift_category}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Quantity Required:</td>
                <td style="padding: 5px 0;">{quantity} units</td>
              </tr>
            </table>
          </div>
          
          <p>We will be in touch with you shortly. If you have any additional requirements, please feel free to reply directly to this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">
            Warm regards,<br />
            <strong>Paper Plane Bulk Gifting Team</strong><br />
            Email: {Config.MAIL_USERNAME}
          </p>
        </div>
      </body>
    </html>
    """
    threading.Thread(target=send_email, args=(enquiry_id, receiver_email, subject, html_content)).start()
    return True

def send_quotation_proposal(enquiry_id, company_name, receiver_email, enquiry_code, proposed_package, total_amount, details_table_html, notes):
    """Sends the proposal email when a quotation is generated and sent."""
    subject = f"Paper Plane Corporate Gifting Quotation - Reference: {enquiry_code}"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Bulk Gift Quotation Proposal</h2>
          <p>Dear {company_name} Team,</p>
          <p>We are delighted to share the customized quotation for your bulk gift enquiry <strong>{enquiry_code}</strong>. Below is the summary of the package and itemized pricing details:</p>
          
          <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0050b3;">Proposed Package: {proposed_package}</h3>
            {details_table_html}
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #abc; text-align: right; font-size: 18px; font-weight: bold; color: #0050b3;">
              Total Estimated Amount: ₹{total_amount:,.2f}
            </div>
          </div>
          
          {f'<p><strong>Notes:</strong> {notes}</p>' if notes else ''}
          
          <p>Please review this proposal. If you would like to approve or suggest any revisions, please reply directly to this email or coordinate with your account owner.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">
            Warm regards,<br />
            <strong>Paper Plane Bulk Gifting Team</strong><br />
            Email: {Config.MAIL_USERNAME}
          </p>
        </div>
      </body>
    </html>
    """
    threading.Thread(target=send_email, args=(enquiry_id, receiver_email, subject, html_content)).start()
    return True

def send_followup_email(enquiry_id, company_name, receiver_email, subject_text, message_text):
    """Sends a follow-up email directly to the client."""
    # Build standard HTML email container around follow-up message text
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Update Regarding Your Enquiry</h2>
          <p>Dear {company_name} Team,</p>
          
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0070f3; background-color: #f9f9f9; white-space: pre-line;">
            {message_text}
          </div>
          
          <p>Please feel free to respond directly to this email if you have any questions or would like to proceed.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">
            Warm regards,<br />
            <strong>Paper Plane Bulk Gifting Team</strong><br />
            Email: {Config.MAIL_USERNAME}
          </p>
        </div>
      </body>
    </html>
    """
    threading.Thread(target=send_email, args=(enquiry_id, receiver_email, subject_text, html_content)).start()
    return True
