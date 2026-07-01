"""
Reads "Event wise summary" tab, groups by Event ID, aggregates totals,
and writes LIVECampaign.json with day-wise breakdowns nested inside.
"""
import json, requests, urllib.parse
from datetime import datetime, timedelta, timezone
from collections import OrderedDict

SHEETS_TOKEN = r"c:\Users\bharg\OneDrive\Desktop\API Agent\token_sheets.json"
SHEET_ID = "1X7aKAIoBVvtdhI_UPBM71RJAQFwwSpbdCnBo0Hcm0pg"
TAB_NAME = "Event wise summary"
OUTPUT = r"c:\Users\bharg\OneDrive\Desktop\API Agent\NBH_Client_Portal\public\LIVECampaign.json"

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

def safe_int(val):
    """Convert string to int, handling commas and empty strings."""
    if not val: return 0
    try:
        return int(str(val).replace(",","").strip())
    except:
        return 0

def safe_float(val):
    """Convert string like '1.50%' or '37500' to float."""
    if not val: return 0.0
    try:
        return float(str(val).replace(",","").replace("%","").strip())
    except:
        return 0.0

def main():
    token = get_token()
    
    # Fetch all data (cols A through M)
    rng = urllib.parse.quote(f"'{TAB_NAME}'!A:M")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{rng}"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    r.raise_for_status()
    rows = r.json().get("values", [])
    
    print(f"[INFO] Fetched {len(rows)} rows (including header)")
    
    if len(rows) < 2:
        print("[ERROR] No data rows found!")
        return
    
    header = rows[0]
    print(f"[INFO] Header: {header}")
    
    # Group by Event ID
    campaigns = OrderedDict()
    
    for row in rows[1:]:
        if len(row) < 9:
            continue
        
        event_id      = row[0].strip() if len(row) > 0 else ""
        event_date    = row[1].strip() if len(row) > 1 else ""
        impressions   = safe_int(row[2]) if len(row) > 2 else 0
        clicks        = safe_int(row[3]) if len(row) > 3 else 0
        event_status  = row[4].strip() if len(row) > 4 else ""
        campaign_start= row[5].strip() if len(row) > 5 else ""
        brand_name    = row[8].strip() if len(row) > 8 else ""
        imp_req       = safe_float(row[9]) if len(row) > 9 else 0
        req_ctr       = row[10].strip() if len(row) > 10 else ""
        click_req     = safe_float(row[11]) if len(row) > 11 else 0
        ctr           = row[12].strip() if len(row) > 12 else ""
        
        if not event_id:
            continue
        
        if event_id not in campaigns:
            # Clean brand name for password generation
            clean_brand = "".join(char for char in brand_name if char.isalnum()).title()
            if not clean_brand:
                clean_brand = "".join(char for char in event_id if char.isalnum()).title()
            
            campaigns[event_id] = {
                "eventId": event_id,
                "brandName": brand_name,
                "eventStatus": event_status,
                "campaignStart": campaign_start,
                "impReq": imp_req,
                "reqCTR": req_ctr,
                "clickReq": click_req,
                "totalImpressions": 0,
                "totalClicks": 0,
                "dayWise": [],
                "credentials": {
                    "userId": event_id.lower(),
                    "password": f"{clean_brand}@2026"
                } if event_status == "Live" else None
            }
        
        c = campaigns[event_id]
        c["totalImpressions"] += impressions
        c["totalClicks"] += clicks
        
        # Update status and credentials if they change
        if event_status:
            c["eventStatus"] = event_status
            if event_status == "Live" and not c.get("credentials"):
                clean_brand = "".join(char for char in c["brandName"] if char.isalnum()).title()
                if not clean_brand:
                    clean_brand = "".join(char for char in c["eventId"] if char.isalnum()).title()
                c["credentials"] = {
                    "userId": c["eventId"].lower(),
                    "password": f"{clean_brand}@2026"
                }
            elif event_status != "Live":
                c["credentials"] = None
        
        # Add day-wise entry
        c["dayWise"].append({
            "date": event_date,
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr
        })
    
    # Compute overall CTR for each campaign
    for c in campaigns.values():
        if c["totalImpressions"] > 0:
            c["ctr"] = f"{(c['totalClicks'] / c['totalImpressions'] * 100):.2f}%"
        else:
            c["ctr"] = "0.00%"
        
        # Sort day-wise by date
        c["dayWise"].sort(key=lambda d: _parse_date(d["date"]) or datetime.min)
        
        # Set latestDate (last day-wise entry)
        if c["dayWise"]:
            c["latestDate"] = c["dayWise"][-1]["date"]
        else:
            c["latestDate"] = ""
    
    result = list(campaigns.values())
    
    # Sort campaigns: Live first, then by latest date descending
    status_order = {"Live": 0, "Paused": 1, "Scheduled": 2, "Completed": 3}
    result.sort(key=lambda c: (
        status_order.get(c["eventStatus"], 99),
        -(_parse_date(c.get("latestDate","")) or datetime.min).timestamp()
    ))
    
    # Write JSON
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Written {len(result)} campaigns to LIVECampaign.json")
    print(f"[INFO] File: {OUTPUT}")
    
    # Summary
    statuses = {}
    for c in result:
        s = c["eventStatus"]
        statuses[s] = statuses.get(s, 0) + 1
    
    print(f"\n=== CAMPAIGN SUMMARY ===")
    for s, count in sorted(statuses.items()):
        print(f"  {s}: {count}")
    
    print(f"\n=== FIRST 10 CAMPAIGNS ===")
    for c in result[:10]:
        print(f"  {c['eventId']:30s} | {c['brandName']:25s} | {c['eventStatus']:10s} | Imp: {c['totalImpressions']:>12,} | Clicks: {c['totalClicks']:>8,} | CTR: {c['ctr']:>7s} | Days: {len(c['dayWise'])}")

def _parse_date(s):
    if not s: return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try: return datetime.strptime(s.strip(), fmt)
        except: pass
    return None

if __name__ == "__main__":
    main()
