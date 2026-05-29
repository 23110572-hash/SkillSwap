from http.server import BaseHTTPRequestHandler
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': f'Invalid JSON: {str(e)}'}).encode('utf-8'))
            return
            
        secret = data.get('secret')
        if secret != "skillswap-secret-key-12345":
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': 'Unauthorized'}).encode('utf-8'))
            return
            
        recipient = data.get('recipient')
        subject = data.get('subject')
        html_content = data.get('html_content')
        
        if not recipient or not subject or not html_content:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': 'Missing required fields'}).encode('utf-8'))
            return

        smtp_server = 'smtp.gmail.com'
        smtp_user = 'krishnaagrawal0706@gmail.com'
        smtp_password = 'yxjovzacuabanpbn'
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = recipient
        msg.attach(MIMEText(html_content, 'html'))
        
        success = False
        error_msg = ""
        
        try:
            # Try SSL 465 first
            server = smtplib.SMTP_SSL(smtp_server, 465, timeout=10)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipient, msg.as_string())
            server.quit()
            success = True
        except Exception as e:
            error_msg += f"SSL failed: {str(e)}. "
            try:
                # Try TLS 587
                server = smtplib.SMTP(smtp_server, 587, timeout=10)
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipient, msg.as_string())
                server.quit()
                success = True
            except Exception as e2:
                error_msg += f"TLS failed: {str(e2)}."
                
        if success:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
        else:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': error_msg}).encode('utf-8'))
            
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b"SMTP Relay Service is online.")
