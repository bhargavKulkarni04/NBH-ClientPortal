/**
 * ============================================================
 * NBH Client Portal — Apps Script Backend
 * ============================================================
 * Replaces fetch_sheet.py. Reads "Event wise summary" tab from
 * Google Sheets, groups by Event ID, aggregates totals, and
 * returns the same JSON structure as LIVECampaign.json.
 *
 * Deploy as: Web App → Execute as Me → Anyone can access
 * URL pattern: https://script.google.com/macros/s/.../exec
 * ============================================================
 */

// ── Configuration ──
var CAMPAIGN_SHEET_ID = "1X7aKAIoBVvtdhI_UPBM71RJAQFwwSpbdCnBo0Hcm0pg";
var CAMPAIGN_TAB_NAME = "Event wise summary";

// ── Helpers ──

function safeInt(val) {
  if (!val && val !== 0) return 0;
  var s = String(val).replace(/,/g, "").trim();
  var i = parseInt(s, 10);
  return isNaN(i) ? 0 : i;
}

function safeFloat(val) {
  if (!val && val !== 0) return 0.0;
  var s = String(val).replace(/,/g, "").replace(/%/g, "").trim();
  var f = parseFloat(s);
  return isNaN(f) ? 0.0 : f;
}

/**
 * Python's str.title() equivalent:
 * "BHARTIYA CITY" → strip non-alnum → "BHARTIYACITY" → title → "Bhartiyacity"
 */
function pythonTitle(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function cleanBrandForPassword(brandName, eventId) {
  var cleaned = (brandName || "").replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) {
    cleaned = (eventId || "").replace(/[^a-zA-Z0-9]/g, "");
  }
  return pythonTitle(cleaned);
}

function parseDateStr(s) {
  if (!s) return null;
  s = String(s).trim();

  // Handle Google Sheets Date objects
  if (s instanceof Date || Object.prototype.toString.call(s) === "[object Date]") {
    return isNaN(s.getTime()) ? null : s;
  }

  // Try m/d/yyyy (US format — matches the sheet)
  var parts = s.split("/");
  if (parts.length === 3) {
    var m = parseInt(parts[0], 10);
    var d = parseInt(parts[1], 10);
    var y = parseInt(parts[2], 10);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
      return new Date(y, m - 1, d);
    }
  }

  // Try yyyy-mm-dd
  var d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function formatDate(val) {
  if (!val) return "";

  var d;
  if (val instanceof Date) {
    d = val;
  } else {
    d = parseDateStr(String(val));
  }

  if (!d) return String(val).trim();
  return (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
}

// ── Main Logic ──

function getCampaigns() {
  var sheet = SpreadsheetApp.openById(CAMPAIGN_SHEET_ID).getSheetByName(CAMPAIGN_TAB_NAME);
  if (!sheet) throw new Error("Could not find '" + CAMPAIGN_TAB_NAME + "' tab");

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var rows = sheet.getRange(1, 1, lastRow, 13).getValues(); // A:M
  var campaigns = {}; 
  var campaignOrder = []; 

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (row.length < 9) continue;

    var eventId       = row[0] ? String(row[0]).trim() : "";
    var eventDate     = formatDate(row[1]);
    var impressions   = safeInt(row[2]);
    var clicks        = safeInt(row[3]);
    var eventStatus   = row[4] ? String(row[4]).trim() : "";
    var campaignStart = row[5] ? formatDate(row[5]) : "";
    var brandName     = (row.length > 8 && row[8]) ? String(row[8]).trim() : "";
    var impReq        = (row.length > 9)  ? safeFloat(row[9])  : 0;
    var reqCtr        = (row.length > 10 && row[10]) ? String(row[10]).trim() : "";
    var clickReq      = (row.length > 11) ? safeFloat(row[11]) : 0;
    var ctr           = (row.length > 12 && row[12]) ? String(row[12]).trim() : "";

    if (!eventId) continue;

    if (!campaigns[eventId]) {
      var cleanBrand = cleanBrandForPassword(brandName, eventId);

      campaigns[eventId] = {
        eventId: eventId,
        brandName: brandName,
        eventStatus: eventStatus,
        campaignStart: campaignStart,
        impReq: impReq,
        reqCTR: reqCtr,
        clickReq: clickReq,
        totalImpressions: 0,
        totalClicks: 0,
        dayWise: [],
        credentials: (eventStatus === "Live") ? {
          userId: eventId.toLowerCase(),
          password: cleanBrand + "@2026"
        } : null
      };
      campaignOrder.push(eventId);
    }

    var c = campaigns[eventId];
    c.totalImpressions += impressions;
    c.totalClicks += clicks;

    if (eventStatus) {
      c.eventStatus = eventStatus;
      if (eventStatus === "Live" && !c.credentials) {
        var cb = cleanBrandForPassword(c.brandName, c.eventId);
        c.credentials = {
          userId: c.eventId.toLowerCase(),
          password: cb + "@2026"
        };
      } else if (eventStatus !== "Live") {
        c.credentials = null;
      }
    }

    c.dayWise.push({
      date: eventDate,
      impressions: impressions,
      clicks: clicks,
      ctr: ctr
    });
  }

  var result = [];
  for (var j = 0; j < campaignOrder.length; j++) {
    result.push(campaigns[campaignOrder[j]]);
  }

  for (var k = 0; k < result.length; k++) {
    var camp = result[k];

    if (camp.totalImpressions > 0) {
      camp.ctr = ((camp.totalClicks / camp.totalImpressions) * 100).toFixed(2) + "%";
    } else {
      camp.ctr = "0.00%";
    }

    camp.dayWise.sort(function(a, b) {
      var dtA = parseDateStr(a.date);
      var dtB = parseDateStr(b.date);
      if (!dtA) return -1;
      if (!dtB) return 1;
      return dtA.getTime() - dtB.getTime();
    });

    if (camp.dayWise.length > 0) {
      camp.latestDate = camp.dayWise[camp.dayWise.length - 1].date;
    } else {
      camp.latestDate = "";
    }
  }

  var statusOrder = { "Live": 0, "Paused": 1, "Scheduled": 2, "Completed": 3 };

  result.sort(function(a, b) {
    var orderA = statusOrder[a.eventStatus] !== undefined ? statusOrder[a.eventStatus] : 99;
    var orderB = statusOrder[b.eventStatus] !== undefined ? statusOrder[b.eventStatus] : 99;

    if (orderA !== orderB) return orderA - orderB;

    var dtA = parseDateStr(a.latestDate);
    var dtB = parseDateStr(b.latestDate);
    var timeA = dtA ? dtA.getTime() : 0;
    var timeB = dtB ? dtB.getTime() : 0;

    return timeB - timeA;
  });

  return result;
}

// ── Web App Entry Point ──

function doGet(e) {
  var type = (e.parameter.type || "").toLowerCase();
  
  try {
    if (type === "campaigns") {
      var data = getCampaigns();
      return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Serve the single bundled Index.html page
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('NBH Client Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
