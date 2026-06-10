import os
import json
import base64
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime

TOKEN_FILE = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_audit.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

try:
    if not os.path.exists(TOKEN_FILE):
        print("token_audit.json not found!")
        exit(1)
        
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    gmail = build("gmail", "v1", credentials=creds)

    GMAIL_QUERY = 'subject:"Alert: Bhartiya reshed every 1 hour has results"'
    results = gmail.users().messages().list(userId="me", q=GMAIL_QUERY, maxResults=5).execute()
    messages = results.get("messages", [])
    print("Alerts count fetched:", len(messages))
    for m in messages:
        msg = gmail.users().messages().get(userId="me", id=m["id"], format="minimal").execute()
        dt = datetime.fromtimestamp(int(msg["internalDate"]) / 1000.0)
        print("Message ID:", m["id"], "Date:", dt.strftime("%Y-%m-%d %H:%M:%S"))
except Exception as e:
    print("ERROR:", e)
