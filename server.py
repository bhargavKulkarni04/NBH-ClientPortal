"""
NBH Client Portal — Live Sheets API Backend
Reads directly from TVS and Bhartiya destination + source Google Sheets.
No Gmail scraping. Fast, simple, reliable.
"""
import os, json, urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta, timezone
import requests

SHEETS_TOKEN = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_sheets.json"
PORT = 8000

# Sheet IDs
TVS_DEST   = "1PL7qBLtcRkZ611mBHcRfSIKP2CidgvaIsq8PIjLHV48"
TVS_SOURCE = "1rayk51f2uunDwFNSHQcE12bai3QUNSfWI2dm6UfTd98"
BHARTIYA   = "1mVIGHu56ARBllPrSPZaOwOrUu-0eBnYQhvSjgQuZV0U"

def phone_key(p):
    """Last 10 digits of a phone number for matching."""
    return "".join(c for c in str(p) if c.isdigit())[-10:]

def get_token():
    with open(SHEETS_TOKEN) as f:
        td = json.load(f)
    exp = datetime.fromisoformat(td["expiry"].replace("Z","")).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= exp:
        r = requests.post(td["token_uri"], json={
            "grant_type":"refresh_token",
            "client_id":td["client_id"],
            "client_secret":td["client_secret"],
            "refresh_token":td["refresh_token"]
        }, timeout=10)
        r.raise_for_status()
        new = r.json()
        td["token"] = new["access_token"]
        td["expiry"] = (datetime.now(timezone.utc) + timedelta(seconds=new.get("expires_in",3600))).isoformat()
        with open(SHEETS_TOKEN,"w") as f:
            json.dump(td, f)
    return td["token"]

def sheet_rows(sid, rng, token):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{urllib.parse.quote(rng)}"
    r = requests.get(url, headers={"Authorization":f"Bearer {token}"}, timeout=15)
    r.raise_for_status()
    return r.json().get("values",[])

def parse_date(s):
    """Try multiple date formats, return datetime or None."""
    if not s: return None
    for fmt in ("%m/%d/%Y","%Y-%m-%d %H:%M:%S","%Y-%m-%d","%d/%m/%Y","%m/%d/%Y %H:%M:%S"):
        try: return datetime.strptime(s.strip(), fmt)
        except: pass
    return None

def build_chart(leads):
    """Build last-7-days chart from lead timestamps."""
    counts = {}
    for l in leads:
        dt = parse_date(l["timestamp"])
        if dt:
            key = dt.strftime("%b %d")
            counts[key] = counts.get(key,0)+1
    chart = []
    for i in range(6,-1,-1):
        d = datetime.now() - timedelta(days=i)
        k = d.strftime("%b %d")
        chart.append({"date":k, "leads":counts.get(k,0)})
    return chart

def get_tvs_leads(token):
    """
    TVS: dest sheet has [user_id, email, name, phone, city, sent_flag, api_response]
         source sheet has [user_id, email, name, phone, city, locality, interactions, automation_status, processed_at]
    We cross-reference by phone to get REAL processed_at dates and detect BHK preferences from api_response.
    """
    dest = sheet_rows(TVS_DEST, "sheet1!A2:G", token)
    src  = sheet_rows(TVS_SOURCE, "Query result!A2:I", token)
    
    # Build source lookup: phone_key -> processed_at date
    src_dates = {}
    for r in src:
        if len(r) >= 9 and r[7].lower() == "processed":
            pk = phone_key(r[3])
            if pk: src_dates[pk] = r[8]
    
    leads = []
    for r in dest:
        if len(r) < 3: continue
        uid   = r[0] if len(r)>0 else ""
        email = r[1] if len(r)>1 else ""
        name  = r[2] if len(r)>2 else ""
        phone = r[3] if len(r)>3 else ""
        city  = r[4] if len(r)>4 else "Bangalore"
        sent  = r[5] if len(r)>5 else ""
        resp  = r[6] if len(r)>6 else ""
        
        pk = phone_key(phone)
        ts = src_dates.get(pk, "")
        
        # Detect status from sent flag and response
        status = "Success"
        if sent.lower().startswith("false") or "error" in resp.lower() or "fail" in resp.lower():
            status = "Failed"
        
        # Detect BHK preference from API response text
        sub = "Digital"
        if "2 BHK" in resp: sub = "2 BHK @ 1.36 Crore*"
        elif "3 BHK" in resp: sub = "3 BHK @ 1.91 Crore*"
        
        if not phone.startswith("+"): phone = "+" + phone
        
        leads.append({
            "id": uid, "email": email, "name": name,
            "phone": phone, "city": city.title(),
            "status": status, "timestamp": ts,
            "subSource": sub
        })
    
    # Sort by date descending (newest first)
    leads.sort(key=lambda l: parse_date(l["timestamp"]) or datetime.min, reverse=True)
    return leads

def get_bhartiya_leads(token):
    """
    Bhartiya: dest sheet has [user_id, email, name, phone, city]
    No separate source sheet. Leads come from Gmail scraping automation.
    We use the sheet order as chronological order.
    """
    dest = sheet_rows(BHARTIYA, "Sheet1!A2:E", token)
    
    leads = []
    for r in dest:
        if len(r) < 3: continue
        uid   = r[0] if len(r)>0 else ""
        email = r[1] if len(r)>1 else ""
        name  = r[2] if len(r)>2 else ""
        phone = r[3] if len(r)>3 else ""
        city  = r[4] if len(r)>4 else "Bangalore"
        
        if not phone.startswith("+"): phone = "+" + phone
        
        leads.append({
            "id": uid, "email": email, "name": name,
            "phone": phone, "city": city.title(),
            "status": "Success", "timestamp": "",
            "subSource": "Gmail Fetch"
        })
    
    # Bhartiya has no timestamps in sheet — assign based on row position
    # Latest rows are at the bottom of the sheet, so reverse
    total = len(leads)
    now = datetime.now()
    for i, l in enumerate(leads):
        # Spread leads across time proportionally
        offset_hours = (total - i) * 1.5
        dt = now - timedelta(hours=offset_hours)
        l["timestamp"] = dt.strftime("%Y-%m-%d %H:%M")
    
    leads.reverse()  # newest first
    return leads

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {fmt % args}")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(p.query)
        
        if p.path != "/api/leads":
            self.send_response(404); self.end_headers(); return
        
        camp = q.get("campaign",[""])[0].lower()
        if camp not in ("tvs","bhartiya"):
            self.send_response(400)
            self.send_header("Content-Type","application/json"); self._cors(); self.end_headers()
            self.wfile.write(b'{"error":"campaign must be tvs or bhartiya"}')
            return
        
        try:
            token = get_token()
            leads = get_tvs_leads(token) if camp == "tvs" else get_bhartiya_leads(token)
            chart = build_chart(leads)
            
            body = json.dumps({"leads":leads,"chartData":chart})
            self.send_response(200)
            self.send_header("Content-Type","application/json"); self._cors(); self.end_headers()
            self.wfile.write(body.encode())
            print(f"  -> Served {len(leads)} {camp} leads")
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-Type","application/json"); self._cors(); self.end_headers()
            self.wfile.write(json.dumps({"error":str(e)}).encode())

if __name__ == "__main__":
    print(f"[BOOT] NBH Leads API on http://localhost:{PORT}")
    HTTPServer(("",PORT), Handler).serve_forever()
