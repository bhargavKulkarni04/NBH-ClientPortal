import json

data = json.load(open(r"public/LIVECampaign.json", "r", encoding="utf-8"))
live = [c for c in data if c["eventStatus"] == "Live"]

print(f"Total Live campaigns (unique by Event ID): {len(live)}")
print(f"{'#':>3}  {'Event ID':<42} {'Brand Name':<32} {'Start':<12} {'Impressions':>14} {'Clicks':>10} {'CTR':>8}")
print("-" * 130)

for i, c in enumerate(live, 1):
    print(f"{i:>3}  {c['eventId']:<42} {c['brandName']:<32} {c['campaignStart']:<12} {c['totalImpressions']:>14,} {c['totalClicks']:>10,} {c['ctr']:>8}")
