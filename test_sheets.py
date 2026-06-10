import os
import json
import requests
from datetime import datetime, timedelta

TOKEN_FILE = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_sheets.json"

def get_access_token():
    if not os.path.exists(TOKEN_FILE):
        raise Exception(f"Token file not found: {TOKEN_FILE}")
        
    with open(TOKEN_FILE, "r") as f:
        token_data = json.load(f)
        
    # Check expiry
    expiry_str = token_data.get("expiry")
    # Expiry is in format: "2026-05-15T08:42:31.495021Z"
    # Parse it (remove Z and handle milliseconds)
    expiry_clean = expiry_str.replace("Z", "")
    expiry_dt = datetime.fromisoformat(expiry_clean)
    
    # Check if expired
    if datetime.utcnow() >= expiry_dt:
        print("[DEBUG] Access token expired. Refreshing token via HTTP POST...")
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
        
        # Update JSON structure
        token_data["token"] = access_token
        token_data["expiry"] = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + "Z"
        
        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f)
        print("[DEBUG] Token updated and saved.")
        return access_token
    else:
        print("[DEBUG] Token is still valid.")
        return token_data["token"]

def fetch_sheet_values(spreadsheet_id, sheet_range, token):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{sheet_range}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    resp = requests.get(url, headers=headers, timeout=15)
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch sheet values: {resp.status_code} - {resp.text}")
    return resp.json().get("values", [])

if __name__ == "__main__":
    try:
        token = get_access_token()
        
        print("\n=== FETCHING TVS DESTINATION SHEET ===")
        tvs_rows = fetch_sheet_values("1PL7qBLtcRkZ611mBHcRfSIKP2CidgvaIsq8PIjLHV48", "sheet1!A1:G15", token)
        print(f"Total TVS rows fetched: {len(tvs_rows)}")
        print("Sample TVS rows:")
        for r in tvs_rows[:4]:
            print("  ", r)
            
        print("\n=== FETCHING BHARTIYA DESTINATION SHEET ===")
        bh_rows = fetch_sheet_values("1mVIGHu56ARBllPrSPZaOwOrUu-0eBnYQhvSjgQuZV0U", "Sheet1!A1:G15", token)
        print(f"Total Bhartiya rows fetched: {len(bh_rows)}")
        print("Sample Bhartiya rows:")
        for r in bh_rows[:4]:
            print("  ", r)
            
    except Exception as e:
        print(f"[ERROR] Exception occurred: {e}")
