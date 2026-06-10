import os
import json
import base64
import re
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from bs4 import BeautifulSoup
from datetime import datetime

TOKEN_FILE = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_audit.json"

def get_all_html_parts(payload):
    html_parts = []
    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            html_parts.append(base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore"))
    for part in payload.get("parts", []):
        html_parts.extend(get_all_html_parts(part))
    return html_parts

def parse_html_table(html):
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        headers = [th.get_text().strip().lower() for th in rows[0].find_all(["th", "td"])]
        if "phone_no" in headers or "userid" in headers or "email_id" in headers:
            parsed_rows = []
            for row in rows[1:]:
                cols = row.find_all(["td", "th"])
                cells = [col.get_text().strip() for col in cols]
                if cells:
                    parsed_rows.append(cells)
            return headers, parsed_rows
    return None, None

def main():
    if not os.path.exists(TOKEN_FILE):
        print("token_audit.json not found!")
        return
        
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, [
        "https://www.googleapis.com/auth/gmail.readonly"
    ])
    gmail_service = build("gmail", "v1", credentials=creds)
    
    GMAIL_QUERY = 'subject:"Alert: Bhartiya reshed every 1 hour has results" in:anywhere'
    print("Searching Gmail...")
    results = gmail_service.users().messages().list(userId="me", q=GMAIL_QUERY, maxResults=10).execute()
    messages = results.get("messages", [])
    
    print(f"Found {len(messages)} messages.")
    
    leads = []
    for m in messages[:3]:
        msg = gmail_service.users().messages().get(userId="me", id=m["id"], format="full").execute()
        msg_date = msg.get("internalDate")
        dt = datetime.fromtimestamp(int(msg_date) / 1000.0)
        
        html_parts = get_all_html_parts(msg.get("payload", {}))
        for html in html_parts:
            headers, rows = parse_html_table(html)
            if not headers or not rows:
                continue
                
            userid_idx = headers.index("userid") if "userid" in headers else -1
            name_idx = headers.index("name") if "name" in headers else -1
            email_idx = headers.index("email_id") if "email_id" in headers else -1
            phone_idx = headers.index("phone_no") if "phone_no" in headers else -1
            city_idx = headers.index("city") if "city" in headers else -1
            
            for row in rows:
                name = row[name_idx] if name_idx != -1 and len(row) > name_idx else ""
                email = row[email_idx] if email_idx != -1 and len(row) > email_idx else ""
                phone = row[phone_idx] if phone_idx != -1 and len(row) > phone_idx else ""
                city = row[city_idx] if city_idx != -1 and len(row) > city_idx else ""
                
                leads.append({
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "city": city,
                    "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S")
                })
                
    print("Parsed Leads:")
    for l in leads[:5]:
        print(l)

if __name__ == "__main__":
    main()
