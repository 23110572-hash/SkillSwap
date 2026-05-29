import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from models import User, Skill

def send_schedule_email(match, classes, recipient_email):
    """
    Sends an email with the complete class schedule table to the recipient_email.
    Uses SMTP credentials from environment variables.
    """
    # Load configuration
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    try:
        smtp_port = int(os.getenv('SMTP_PORT', '465'))
    except ValueError:
        smtp_port = 465
    smtp_user = os.getenv('SMTP_USER', 'krishnaagrawal0706@gmail.com')
    smtp_password = os.getenv('SMTP_PASSWORD', 'yxjovzacuabanpbn')

    if not smtp_user or not smtp_password:
        print("SMTP credentials are not configured. Cannot send email.")
        return False

    # Fetch user/course details from DB
    learner = User.query.get(match.learner_id)
    teacher = User.query.get(match.teacher_id)
    skill = Skill.query.get(match.skill_id)

    learner_name = learner.username if learner else "Learner"
    teacher_name = teacher.username if teacher else "Teacher"
    skill_title = skill.title if skill else "Peer Learning Session"

    # Build the HTML table rows for schedule
    table_rows = ""
    for c in classes:
        if c.scheduled_at:
            # e.g., "Fri, May 29, 2026 at 08:30 PM"
            formatted_date = c.scheduled_at.strftime('%a, %b %d, %Y at %I:%M %p')
        else:
            formatted_date = "<i>Not scheduled yet</i>"

        if c.completed_at:
            status_text = "Completed"
            status_class = "status-completed"
        elif c.scheduled_at:
            status_text = "Scheduled"
            status_class = "status-scheduled"
        else:
            status_text = "Pending"
            status_class = "status-pending"

        table_rows += f"""
        <tr>
            <td class="class-num">#{c.class_number}</td>
            <td>
                <div class="class-title">{c.title}</div>
            </td>
            <td class="class-date">{formatted_date}</td>
            <td style="text-align: center;">
                <span class="status-badge {status_class}">{status_text}</span>
            </td>
        </tr>
        """

    # HTML Email Template with professional CSS design (Rich Aesthetics)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Class Schedule Update</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                color: #1e293b;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }}
            .header {{
                background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
                padding: 30px 20px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .header p {{
                margin: 5px 0 0 0;
                font-size: 14px;
                color: #c7d2fe;
            }}
            .content {{
                padding: 30px 25px;
            }}
            .course-info {{
                background-color: #f1f5f9;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 25px;
                border: 1px solid #e2e8f0;
            }}
            .info-grid {{
                display: table;
                width: 100%;
            }}
            .info-col {{
                display: table-cell;
                width: 50%;
            }}
            .info-label {{
                font-size: 10px;
                text-transform: uppercase;
                font-weight: 700;
                color: #64748b;
                letter-spacing: 0.5px;
            }}
            .info-value {{
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                margin-top: 2px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }}
            th {{
                background-color: #f8fafc;
                color: #475569;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-align: left;
                padding: 12px;
                border-bottom: 2px solid #e2e8f0;
            }}
            td {{
                padding: 14px 12px;
                font-size: 13px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
            }}
            tr:last-child td {{
                border-bottom: none;
            }}
            .class-num {{
                font-weight: 700;
                color: #4f46e5;
                width: 35px;
            }}
            .class-title {{
                font-weight: 600;
                color: #0f172a;
            }}
            .class-date {{
                color: #475569;
                font-size: 12px;
            }}
            .status-badge {{
                display: inline-block;
                padding: 4px 8px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                border-radius: 6px;
                text-align: center;
            }}
            .status-pending {{
                background-color: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
            }}
            .status-scheduled {{
                background-color: #e0e7ff;
                color: #4338ca;
                border: 1px solid #c7d2fe;
            }}
            .status-completed {{
                background-color: #d1fae5;
                color: #047857;
                border: 1px solid #a7f3d0;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }}
            .footer a {{
                color: #4f46e5;
                text-decoration: none;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SkillSwap Class Schedule</h1>
                <p>Your updated peer learning curriculum</p>
            </div>
            <div class="content">
                <div class="course-info">
                    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #0f172a;">{skill_title}</h2>
                    <div class="info-grid">
                        <div class="info-col">
                            <div class="info-label">Instructor</div>
                            <div class="info-value">{teacher_name}</div>
                        </div>
                        <div class="info-col">
                            <div class="info-label">Learner</div>
                            <div class="info-value">{learner_name}</div>
                        </div>
                    </div>
                </div>
                
                <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Curriculum & Schedule</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Class</th>
                            <th style="width: 50%;">Topic</th>
                            <th style="width: 28%;">Date & Time</th>
                            <th style="width: 12%; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows}
                    </tbody>
                </table>
            </div>
            <div class="footer">
                <p>Sent via <a href="https://skillswap.app">SkillSwap</a> Peer Learning Platform.</p>
                <p>&copy; 2026 SkillSwap. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Construct MIMEMultipart email message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"SkillSwap: Schedule for {skill_title}"
    msg['From'] = smtp_user
    msg['To'] = recipient_email
    msg.attach(MIMEText(html_content, 'html'))

    # Send via SMTP connection (catch and print errors to prevent server crash)
    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
        
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, recipient_email, msg.as_string())
        server.quit()
        print(f"Schedule email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"SMTP error sending schedule email to {recipient_email}: {e}")
        return False

def send_schedule_email_async(app, match, classes, recipient_email):
    """
    Sends the schedule email in a background thread to prevent blocking client requests.
    """
    def run():
        with app.app_context():
            try:
                send_schedule_email(match, classes, recipient_email)
            except Exception as e:
                app.logger.error(f"Async email sending exception: {e}")
    
    thread = threading.Thread(target=run)
    thread.daemon = True
    thread.start()

def send_verification_email(recipient_email, code):
    """
    Sends a verification email with a 6-digit code to the recipient_email.
    """
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    try:
        smtp_port = int(os.getenv('SMTP_PORT', '465'))
    except ValueError:
        smtp_port = 465
    smtp_user = os.getenv('SMTP_USER', 'krishnaagrawal0706@gmail.com')
    smtp_password = os.getenv('SMTP_PASSWORD', 'yxjovzacuabanpbn')

    if not smtp_user or not smtp_password:
        print("SMTP credentials are not configured. Cannot send verification email.")
        return False

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                color: #1e293b;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 500px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }}
            .header {{
                background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
                padding: 30px 20px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 30px;
                text-align: center;
            }}
            .code-box {{
                display: inline-block;
                background-color: #f1f5f9;
                border: 2px dashed #4f46e5;
                color: #4f46e5;
                font-size: 32px;
                font-weight: 800;
                letter-spacing: 5px;
                padding: 15px 30px;
                border-radius: 12px;
                margin: 25px 0;
            }}
            .instructions {{
                font-size: 14px;
                color: #475569;
                line-height: 1.6;
                margin-bottom: 10px;
            }}
            .warning {{
                font-size: 12px;
                color: #94a3b8;
                margin-top: 20px;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }}
            .footer a {{
                color: #4f46e5;
                text-decoration: none;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
                <p class="instructions">Thank you for joining SkillSwap! Please use the following 6-digit verification code to complete your registration or email update:</p>
                <div class="code-box">{code}</div>
                <p class="instructions">Enter this code in the verification screen to activate your account and unlock peer learning.</p>
                <p class="warning">This verification code is valid for 1 hour. If you did not request this code, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>Sent via <a href="https://skillswap.app">SkillSwap</a> Peer Learning Platform.</p>
                <p>&copy; 2026 SkillSwap. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"SkillSwap: Verify Your Email Address"
    msg['From'] = smtp_user
    msg['To'] = recipient_email
    msg.attach(MIMEText(html_content, 'html'))

    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            server.starttls()
        
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, recipient_email, msg.as_string())
        server.quit()
        print(f"Verification email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"SMTP error sending verification email to {recipient_email}: {e}")
        return False

def send_verification_email_async(app, recipient_email, code):
    """
    Sends the verification email in a background thread to prevent blocking client requests.
    """
    def run():
        with app.app_context():
            try:
                send_verification_email(recipient_email, code)
            except Exception as e:
                app.logger.error(f"Async verification email sending exception: {e}")
    
    thread = threading.Thread(target=run)
    thread.daemon = True
    thread.start()
