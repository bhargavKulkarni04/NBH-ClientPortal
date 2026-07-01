import React, { useState, useMemo, useEffect } from 'react';
import { LoginPage } from './components/ui/LoginPage.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, Search, Filter, LogOut, Users, CheckCircle, RefreshCw,
  Clock, Bell, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, Calendar, Eye, MousePointer, TrendingUp, Megaphone, Headphones
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Leads mock data (fallback if Sheets server is offline)








// ==========================================
// SVG Sparkline Component
// ==========================================
function Sparkline({ data, color = '#10B981', width = 80, height = 40 }) {
  if (!data || data.length < 2) {
    // Return a dummy path if not enough points
    return (
      <svg className="cp-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={`M0,${height / 2} L${width},${height / 2}`} stroke={color} strokeWidth="2" fill="none" />
      </svg>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg className="cp-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={fillPath} className="spark-fill" fill={color} style={{ opacity: 0.08, stroke: 'none' }} />
      <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ==========================================
// MAIN APP
// ==========================================

export default function App() {
  // Master Campaigns Data List loaded from public/LIVECampaign.json
  const [campaignsList, setCampaignsList] = useState([]);

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientInitials, setClientInitials] = useState('');
  const [activeBrand, setActiveBrand] = useState(''); // Brand name to filter campaigns by
  const [activeEventId, setActiveEventId] = useState(''); // Specific campaign ID if campaign-specific login
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('campaigns');

  // Campaign view states
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('All');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  // Leads view states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [leads, setLeads] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Drip feed settings
  const [minDelay, setMinDelay] = useState(10);
  const [maxDelay, setMaxDelay] = useState(120);

  // Load Campaigns JSON on Mount
  useEffect(() => {
    fetch('/LIVECampaign.json')
      .then(res => res.json())
      .then(data => {
        setCampaignsList(data || []);
      })
      .catch(err => {
        console.error("Failed to load campaigns list:", err);
      });
  }, []);

  // ── Authentication ──
  const handleLoginDirect = async (email, passwordInput) => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check master admin account
    if (cleanEmail === 'admin@nobrokerhood.com' && passwordInput === 'admin123') {
      setIsLoggedIn(true);
      setIsAdmin(true);
      setCampaign('bhartiya'); // Fallback sheet campaign for Leads tab
      setClientName('Administrator');
      setClientInitials('ADM');
      setActiveBrand(''); // Shows all campaigns
      setActiveEventId('');
      return true;
    }

    // 2. Check campaign-specific credentials in LIVECampaign.json
    const matched = campaignsList.find(c =>
      c.credentials &&
      c.credentials.userId.toLowerCase() === cleanEmail &&
      c.credentials.password === passwordInput
    );

    if (matched) {
      setIsLoggedIn(true);
      setIsAdmin(false);

      // Determine sheet campaign name for leads tab (fallback mapping)
      const brandLower = matched.brandName.toLowerCase();
      if (brandLower.includes('tvs')) {
        setCampaign('tvs');
      } else if (brandLower.includes('bhartiya')) {
        setCampaign('bhartiya');
      } else {
        setCampaign('bhartiya');
      }

      setClientName(matched.brandName); // Changed to use Brand Name instead of Event ID as per request

      // Initials helper
      const initials = matched.eventId.substring(0, 3).toUpperCase();
      setClientInitials(initials || 'PT');

      setActiveBrand(matched.brandName);
      setActiveEventId(matched.eventId); // Lock dashboard to this eventId
      return true;
    }

    // 3. Fallback compatibility credentials
    if (cleanEmail === 'tvs@nobrokerhood.com' && passwordInput === 'tvs123') {
      setIsLoggedIn(true);
      setIsAdmin(false);
      setCampaign('tvs');
      setClientName('TVS Emerald');
      setClientInitials('TE');
      setActiveBrand('TVS EMERALDS');
      setActiveEventId('');
      return true;
    } else if (cleanEmail === 'bhartiya@nobrokerhood.com' && passwordInput === 'bhartiya123') {
      setIsLoggedIn(true);
      setIsAdmin(false);
      setCampaign('bhartiya');
      setClientName('Bhartiya City');
      setClientInitials('BC');
      setActiveBrand('BHARTIYA CITY');
      setActiveEventId('');
      return true;
    }

    setError('Invalid User ID or Password. Use admin credentials or campaign credentials (e.g. cp7949bhartiya_may29 / BhartiyaCity@2026).');
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCampaign('');
    setClientName('');
    setClientInitials('');
    setActiveBrand('');
    setActiveEventId('');
    setSearch('');
    setStatusFilter('All');
    setLeads([]);
    setChartData([]);
    setActiveTab('campaigns');
    setCampaignSearch('');
    setCampaignStatusFilter('All');
    setCurrentPage(1);
  };

  // ── Leads Fetch ──
  const fetchLeads = async (campaignName) => {
    if (!campaignName) return;
    setLoading(true);
    setBackendError('');
    try {
      const res = await fetch(`http://localhost:8000/api/leads?campaign=${campaignName}`);
      if (!res.ok) throw new Error('Failed to retrieve sheet data');
      const data = await res.json();
      setLeads(data.leads || []);
      setChartData(data.chartData || []);
    } catch (err) {
      console.error("Error fetching live leads:", err);
      setBackendError('Could not sync with Google Sheets API server. Showing cached data.');
      setLeads(campaignName === 'tvs' ? TVS_LEADS_MOCK : BHARTIYA_LEADS_MOCK);
      setChartData(campaignName === 'tvs' ? TVS_CHART_MOCK : BHARTIYA_CHART_MOCK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && campaign && activeTab === 'leads') {
      fetchLeads(campaign);
    }
  }, [isLoggedIn, campaign, activeTab]);

  // ── Brand/Campaign Campaigns Scoping ──
  const brandCampaigns = useMemo(() => {
    return campaignsList.filter(c => {
      if (activeEventId) {
        return c.eventId === activeEventId; // Specific campaign scope
      }
      if (!activeBrand) return true; // Admin views all
      return c.brandName.toLowerCase() === activeBrand.toLowerCase(); // Brand scope
    });
  }, [campaignsList, activeBrand, activeEventId]);

  // ── Campaign Filters & Pagination ──
  const tableData = useMemo(() => {
    if (activeEventId) {
      // Single campaign view: show dayWise data
      const campaign = brandCampaigns[0];
      if (!campaign || !campaign.dayWise) return [];

      let days = campaign.dayWise;

      // Filter by date range if provided
      if (campaignStartDate) {
        const start = new Date(campaignStartDate);
        days = days.filter(d => new Date(d.date) >= start);
      }
      if (campaignEndDate) {
        const end = new Date(campaignEndDate);
        days = days.filter(d => new Date(d.date) <= end);
      }

      return days.map(d => ({
        isDayRow: true,
        eventId: campaign.eventId,
        brandName: campaign.brandName,
        date: d.date,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) + "%" : "0.00%",
        eventStatus: campaign.eventStatus
      })).reverse(); // Reverse to show newest dates first
    } else {
      // Multi-campaign view: show campaigns
      let camps = brandCampaigns.filter(c => {
        const matchesSearch =
          c.eventId.toLowerCase().includes(campaignSearch.toLowerCase()) ||
          c.brandName.toLowerCase().includes(campaignSearch.toLowerCase());
        // For admin, we might still respect the "All" status filter, or default to Live. 
        // We will ignore campaignStatusFilter since it's hardcoded to Live now in UI, but keep the logic for safety.
        return matchesSearch;
      });

      // Filter by date range (using campaign start date)
      if (campaignStartDate) {
        const start = new Date(campaignStartDate);
        camps = camps.filter(c => new Date(c.campaignStart) >= start);
      }
      if (campaignEndDate) {
        const end = new Date(campaignEndDate);
        camps = camps.filter(c => new Date(c.campaignStart) <= end);
      }

      return camps.map(c => ({
        isDayRow: false,
        ...c
      }));
    }
  }, [brandCampaigns, activeEventId, campaignSearch, campaignStartDate, campaignEndDate]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedData = tableData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Campaigns Metrics Panel Calculations ──
  const campaignMetrics = useMemo(() => {
    const totalImpressions = brandCampaigns.reduce((s, c) => s + c.totalImpressions, 0);
    const totalClicks = brandCampaigns.reduce((s, c) => s + c.totalClicks, 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
    return {
      totalImpressions,
      totalClicks,
      avgCTR,
      totalCampaigns: brandCampaigns.length
    };
  }, [brandCampaigns]);

  // ── Dynamic Daily Sparkline Timeline Data ──
  const brandDailyTimeline = useMemo(() => {
    const datesMap = {};
    brandCampaigns.forEach(c => {
      if (c.dayWise) {
        c.dayWise.forEach(d => {
          const dt = d.date;
          if (!datesMap[dt]) {
            datesMap[dt] = { date: dt, impressions: 0, clicks: 0 };
          }
          datesMap[dt].impressions += d.impressions;
          datesMap[dt].clicks += d.clicks;
        });
      }
    });

    // Helper to parse date strings (m/d/yyyy) safely for sorting
    const parseDateStr = (s) => {
      const parts = s.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
      return new Date(s);
    };

    return Object.values(datesMap).sort((a, b) => parseDateStr(a.date) - parseDateStr(b.date));
  }, [brandCampaigns]);

  const sparklineImpressions = useMemo(() => {
    const data = brandDailyTimeline.map(d => d.impressions);
    return data.length >= 2 ? data : [0, 0];
  }, [brandDailyTimeline]);

  const sparklineClicks = useMemo(() => {
    const data = brandDailyTimeline.map(d => d.clicks);
    return data.length >= 2 ? data : [0, 0];
  }, [brandDailyTimeline]);

  const sparklineCTR = useMemo(() => {
    const data = brandDailyTimeline.map(d => d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0);
    return data.length >= 2 ? data : [0, 0];
  }, [brandDailyTimeline]);

  const sparklineCampaigns = useMemo(() => {
    const data = brandCampaigns.map((_, i) => i + 1);
    return data.length >= 2 ? data : [0, 0];
  }, [brandCampaigns]);

  // ── Leads Filters ──
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch =
        (lead.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone || '').includes(search);
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const leadsStats = useMemo(() => {
    const total = leads.length;
    const successCount = leads.filter(l => l.status === 'Success').length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(0) : 100;
    const pending = campaign === 'tvs' ? 14 : 3;
    return { total, successRate, pending };
  }, [leads, campaign]);

  // ── Export ──
  const handleExportCampaigns = () => {
    const ws = XLSX.utils.json_to_sheet(tableData.map(c =>
      c.isDayRow ? {
        'Event ID': c.eventId,
        'Brand Name': c.brandName,
        'Date': c.date,
        'Impressions': c.impressions,
        'Clicks': c.clicks,
        'CTR': c.ctr,
        'Status': 'Live'
      } : {
        'Event ID': c.eventId,
        'Impressions': c.totalImpressions,
        'Clicks': c.totalClicks,
        'CTR': c.ctr,
        'Status': c.eventStatus,
        'Campaign Start': c.campaignStart,
        'Brand Name': c.brandName,
        'Imp Req': c.impReq,
        'Req CTR': c.reqCTR,
        'Click Req': c.clickReq
      }
    ));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Campaigns");
    XLSX.writeFile(wb, `NBH_Campaigns_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportLeads = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLeads.map(l => ({
      'Lead ID': l.id, 'Name': l.name, 'Email': l.email,
      'Phone': l.phone, 'City': l.city, 'Typeform/Preference': l.subSource,
      'Sync Status': l.status, 'Logged At': l.timestamp
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Export");
    XLSX.writeFile(wb, `NBH_${campaign === 'tvs' ? 'TVS_Emerald' : 'Bhartiya_City'}_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Format number helper
  const formatNum = (n) => {
    return n.toLocaleString('en-IN');
  };

  // ── Render: Login ──
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLoginDirect} error={error} />;
  }

  // ── Render: Dashboard ──
  return (
    <div className="cp-layout animate-fade">
      {/* ════════════ SIDEBAR ════════════ */}
      <aside className="cp-sidebar">
        {/* Logo */}
        <div className="cp-sidebar-logo">
          <img src="/nbh_logo.png" alt="NoBrokerHood" style={{ filter: 'none' }} />
        </div>

        {/* Navigation */}
        

        {/* Support Card */}
        <div className="cp-support-card">
          <img
            src="/support-illustration.png"
            alt="Support Agent"
            className="cp-support-img"
          />
          <div className="cp-support-body">
            <h4>Need Help?</h4>
            <p>Our support team is here to assist you.</p>
            <button
              className="cp-support-btn"
              onClick={() => alert('Email: Bhargav.s@nobroker.in\\nPhone: 8618818322')}
            >
              <Headphones size={18} />
              Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <main className="cp-main">
        {/* ── Header ── */}
        <header className="cp-header">
          <div className="cp-header-left">
            <img src="/nbh_logo.png" alt="NoBrokerHood" className="mobile-logo" />
            <h1>Welcome back, {clientName}! 👋</h1>
            <p>Here's what's happening with your campaigns.</p>
          </div>

          <div className="cp-header-right">
            {isAdmin && (
              <select
                className="cp-filter-select"
                style={{ padding: '8px 28px 8px 12px', fontSize: '0.82rem', height: '36px' }}
                value={activeBrand}
                onChange={(e) => { setActiveBrand(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Brands (Admin)</option>
                {Array.from(new Set(campaignsList.map(c => c.brandName))).sort().map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            )}

            {/* Notification bell */}
            <button className="cp-notif-btn" title="Notifications">
              <Bell size={22} />
              <span className="cp-notif-badge">3</span>
            </button>

            {/* Profile / Sign Out */}
            <button className="cp-profile" onClick={handleLogout} title="Sign Out">
              <div className="cp-profile-avatar">{clientInitials}</div>
              <span className="cp-profile-name">{clientName}</span>
              <LogOut className="cp-profile-chevron" size={16} />
            </button>
          </div>
        </header>

        {/* ── Content Body ── */}
        <div className="cp-content">
          /* CAMPAIGNS VIEW */
          <>


              {/* Metrics Grid */}
              <div className="cp-metrics-grid">
                {/* Total Impressions */}
                <div className="cp-metric-card">
                  <div className="cp-metric-left">
                    
                    <div className="cp-metric-info">
                      <h5>Total Impressions</h5>
                      <div className="cp-metric-value">{formatNum(campaignMetrics.totalImpressions)}</div>
                    </div>
                  </div>
                </div>

                {/* Total Clicks */}
                <div className="cp-metric-card">
                  <div className="cp-metric-left">
                    
                    <div className="cp-metric-info">
                      <h5>Total Clicks</h5>
                      <div className="cp-metric-value">{formatNum(campaignMetrics.totalClicks)}</div>
                    </div>
                  </div>
                </div>

                {/* Average CTR */}
                <div className="cp-metric-card">
                  <div className="cp-metric-left">
                    
                    <div className="cp-metric-info">
                      <h5>Average CTR</h5>
                      <div className="cp-metric-value">{campaignMetrics.avgCTR}%</div>
                    </div>
                  </div>
                </div>

                {/* Total Campaigns */}
                <div className="cp-metric-card">
                  <div className="cp-metric-left">
                    
                    <div className="cp-metric-info">
                      <h5>Total Campaigns</h5>
                      <div className="cp-metric-value">{campaignMetrics.totalCampaigns}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="cp-table-wrapper">
                {/* Filter Bar */}
                <div className="cp-filter-bar">
                  <div className="cp-status live" style={{ padding: '6px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', fontSize: '0.85rem' }}>
                    <span className="cp-status-dot" />
                    Live
                  </div>

                  <div className="cp-date-range-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid var(--nbh-border)', padding: '6px 16px', borderRadius: '8px', background: '#f8f9fb' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Choose Date Range:</span>
                    <input
                      type="date"
                      className="cp-date-input"
                      value={campaignStartDate}
                      onChange={(e) => { setCampaignStartDate(e.target.value); setCurrentPage(1); }}
                      style={{ padding: '4px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input
                      type="date"
                      className="cp-date-input"
                      value={campaignEndDate}
                      onChange={(e) => { setCampaignEndDate(e.target.value); setCurrentPage(1); }}
                      style={{ padding: '4px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}
                    />
                  </div>

                  <button className="cp-export-btn" onClick={handleExportCampaigns}>
                    <Download size={18} />
                    Export
                  </button>

                  <button className="cp-apply-btn" onClick={() => setCurrentPage(1)}>
                    <Filter size={16} />
                    Apply
                  </button>
                </div>

                {/* Data Table */}
                <div className="cp-table-container">
                  <table className="cp-table">
                    <thead>
                      <tr>
                        {activeEventId ? (
                          <>
                            <th>Event ID</th>
                            <th>Brand Name</th>
                            <th>Date</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                            <th>CTR</th>
                            <th>Status</th>
                          </>
                        ) : (
                          <>
                            <th>Event ID</th>
                            <th className="sortable">Event Date ↕</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                            <th>Event status</th>
                            <th>Campaign Start</th>
                            <th>Brand Name</th>
                            <th>Imp Req</th>
                            <th>Req CTR</th>
                            <th>Click Req</th>
                            <th>CTR</th>
                            <th></th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, idx) => (
                        <tr key={row.eventId + (row.isDayRow ? row.date : '') + idx}>
                          {row.isDayRow ? (
                            <>
                              <td className="col-event-id">{row.eventId}</td>
                              <td>{row.brandName}</td>
                              <td>{row.date}</td>
                              <td className="col-impressions">{formatNum(row.impressions)}</td>
                              <td className="col-clicks">{formatNum(row.clicks)}</td>
                              <td className="col-ctr">{row.ctr}</td>
                              <td>
                                <span className="cp-status live">
                                  <span className="cp-status-dot" />
                                  Live
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="col-event-id">{row.eventId}</td>
                              <td>{row.latestDate || row.campaignStart}</td>
                              <td className="col-impressions">{formatNum(row.totalImpressions)}</td>
                              <td className="col-clicks">{formatNum(row.totalClicks)}</td>
                              <td>
                                <span className={`cp-status ${row.eventStatus.toLowerCase()}`}>
                                  <span className="cp-status-dot" />
                                  {row.eventStatus}
                                </span>
                              </td>
                              <td>{row.campaignStart}</td>
                              <td>{row.brandName}</td>
                              <td className="col-imp-req">{formatNum(Math.round(row.impReq))}</td>
                              <td className="col-req-ctr">{row.reqCTR}</td>
                              <td className="col-click-req">{formatNum(Math.round(row.clickReq))}</td>
                              <td className="col-ctr">{row.ctr}</td>
                              <td>
                                <button className="cp-actions-btn" title="More actions">
                                  <MoreVertical size={18} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {paginatedData.length === 0 && (
                        <tr>
                          <td colSpan={activeEventId ? "7" : "12"} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No data found matching current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cp-pagination">
                  <span className="cp-pagination-info">
                    Showing {tableData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, tableData.length)} of {tableData.length} entries
                  </span>
                  <div className="cp-pagination-controls">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', fontFamily: 'inherit', marginRight: '10px' }}
                    >
                      {[7, 10, 20, 50].filter(n => n < tableData.length).map(n => (
                        <option key={n} value={n}>{n} / page</option>
                      ))}
                      <option value={Math.max(tableData.length, 1)}>All ({tableData.length})</option>
                    </select>
                    <button
                      className="cp-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`cp-page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="cp-page-btn"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
        </div>
      </main>
    </div>
  );
}
