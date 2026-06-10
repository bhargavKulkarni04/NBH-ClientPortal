import os
import json
import base64
import requests
from datetime import datetime, timedelta

TOKEN_FILE = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_audit.json"

def get_access_token():
    if not os.path.exists(TOKEN_FILE):
        raise Exception(f"Token file not found: {TOKEN_FILE}")
        
    with open(TOKEN_FILE, "r") as f:
        token_data = json.load(f)
        
    expiry_str = token_data.get("expiry")
    expiry_clean = expiry_str.replace("Z", "")
    expiry_dt = datetime.fromisoformat(expiry_clean)
    
    if datetime.utcnow() >= expiry_dt:
        print("[DEBUG] token_audit access token expired. Refreshing token via HTTP POST...")
        refresh_payload = {
            "grant_type": "refresh_token",
            "client_id": token_data["client_id"],
            "client_secret": token_data["client_secret"],
            "refresh_token": token_data["refresh_token"]
        }
        resp = requests.post(token_data["token_uri"], json=refresh_payload, timeout=10)
        if resp.status_code != 200:
            raise Exception(f"Failed to refresh token: {resp.status_code} - {resp.text}")
            
        new_token_data = resp.json()
        access_token = new_token_data["access_token"]
        expires_in = new_token_data.get("expires_in", 3600)
        
        token_data["token"] = access_token
        token_data["expiry"] = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + "Z"
        
        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f)
        print("[DEBUG] Token refreshed and saved.")
        return access_token
    else:
        print("[DEBUG] Token is still valid.")
        return token_data["token"]

def main():
    try:
        token = get_access_token()
        print("Got token successfully.")
        
        # Search messages
        query = 'subject:"Alert: Bhartiya reshed every 1 hour has results"'
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={query}&maxResults=3"
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            print("Failed to list messages:", resp.status_code, resp.text)
            return
            
        messages = resp.json().get("messages", [])
        print(f"Found {len(messages)} messages.")
        
        for m in messages:
            msg_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}"
            msg_resp = requests.get(msg_url, headers=headers, timeout=15).json()
            internal_date = int(msg_resp.get("internalDate", 0)) / 1000.0
            dt = datetime.fromtimestamp(internal_date)
            print("Message ID:", m["id"], "Snippet:", msg_resp.get("snippet", ""), "Date:", dt.strftime("%Y-%m-%d %H:%M:%S"))
            
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    main()
