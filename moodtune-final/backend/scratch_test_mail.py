import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

def test_smtp():
    # Load dotenv overriding any existing env vars
    load_dotenv(override=True)
    
    server_host = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    try:
        port_val = os.getenv('MAIL_PORT', '587')
        server_port = int(port_val)
    except ValueError:
        server_port = 587
        
    username = os.getenv('MAIL_USERNAME', '')
    password = os.getenv('MAIL_PASSWORD', '')
    use_tls = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    
    print("--- SMTP Configuration Diagnostics ---")
    print(f"MAIL_SERVER: {server_host}")
    print(f"MAIL_PORT: {server_port}")
    print(f"MAIL_USE_TLS: {use_tls}")
    print(f"MAIL_USERNAME: {username}")
    print(f"MAIL_PASSWORD: {'*' * len(password) if password else '(empty)'}")
    print("--------------------------------------")
    
    if not username or username == 'your_gmail_address@gmail.com':
        print("\n[WARNING] MAIL_USERNAME is set to the default placeholder or is empty.")
        print("Please configure MAIL_USERNAME and MAIL_PASSWORD in your backend/.env file with a real Gmail account and App Password.")
        return
        
    if not password or password == 'your_16_character_app_password':
        print("\n[WARNING] MAIL_PASSWORD is set to the default placeholder or is empty.")
        print("Please configure MAIL_PASSWORD in your backend/.env file with your 16-character Google App Password.")
        return
        
    print("\nAttempting to connect to the SMTP server...")
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(server_host, server_port, timeout=10)
        print("Connection established successfully.")
        
        if use_tls:
            print("Initiating TLS encryption (STARTTLS)...")
            server.starttls()
            print("TLS encryption initiated.")
            
        print(f"Attempting login as {username}...")
        server.login(username, password)
        print("SMTP login successful! Your credentials are correct.")
        
        # Send a test email
        msg = MIMEText("This is a test email from MoodTune AI configuration tool.")
        msg['Subject'] = "MoodTune AI - SMTP Test"
        msg['From'] = username
        msg['To'] = username
        
        print(f"Sending test email to {username}...")
        server.sendmail(username, [username], msg.as_string())
        print("Test email sent successfully! Please check your inbox.")
        
        server.quit()
        print("\n[SUCCESS] SMTP is fully configured and working.")
        
    except smtplib.SMTPAuthenticationError as e:
        print("\n[ERROR] SMTP Authentication Failed!")
        print(f"Details: {e}")
        print("\nPossible solutions:")
        print("1. If you are using Gmail, make sure you are using an 'App Password', NOT your account password.")
        print("   To create one: Go to your Google Account -> Security -> 2-Step Verification -> App Passwords.")
        print("2. Check if your Gmail address in MAIL_USERNAME is spelled correctly.")
    except smtplib.SMTPConnectError as e:
        print("\n[ERROR] Connection to the SMTP server failed!")
        print(f"Details: {e}")
        print("Check your internet connection or MAIL_SERVER/MAIL_PORT configuration.")
    except Exception as e:
        print(f"\n[ERROR] An unexpected error occurred: {e}")

if __name__ == '__main__':
    test_smtp()
