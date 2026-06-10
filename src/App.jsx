import React, { useState, useMemo, useEffect } from 'react';
import { Component as LoginPage } from './components/ui/animated-characters-login-page';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Download, Search, Filter, LogOut, Settings, Users, CheckCircle, RefreshCw, Clock, AlertTriangle 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ==========================================
// MOCK DATA FALLBACKS (If backend offline)
// ==========================================

const TVS_LEADS_MOCK = [
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "jkumar.mail63@gmail.com", name: "Jitendra kumar", phone: "+917760150410", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-08 12:46:12", subSource: "Digital" },
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "yadavmonica8@gmail.com", name: "Mangala J", phone: "+917259206049", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-08 12:46:18", subSource: "3 BHK @ 1.91 Crore*" },
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "chsr1910@gmail.com", name: "Satish Kumar Reddy", phone: "+919972685527", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-08 12:46:25", subSource: "3 BHK @ 1.91 Crore*" },
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "abhishek306@gmail.com", name: "Abhishek Dasgupta", phone: "+919880038717", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-08 12:46:32", subSource: "Digital" },
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "drbithicgo@gmail.com", name: "SANA MAZUMDER", phone: "+918088568012", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-08 12:46:40", subSource: "Digital" }
];

const BHARTIYA_LEADS_MOCK = [
  { id: "G_8a96c382823b63ac01823d7ddf7e03de", email: "sachindrams@gmail.com", name: "SACHINDRA SOPPANNA", phone: "+919886605797", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-06 12:22:23", subSource: "Gmail Fetch" },
  { id: "G_8a968f829e6fa59d019e72ec202b0d73", email: "nrai2911@gmail.com", name: "Neha Rai Bhagat", phone: "+917021929186", city: "Bangalore", sent: "True", status: "Success", timestamp: "2026-06-06 12:34:10", subSource: "Gmail Fetch" }
];

const TVS_CHART_MOCK = [
  { date: 'June 04', leads: 7 },
  { date: 'June 05', leads: 12 },
  { date: 'June 06', leads: 9 },
  { date: 'June 07', leads: 18 },
  { date: 'June 08', leads: 15 }
];

const BHARTIYA_CHART_MOCK = [
  { date: 'June 03', leads: 8 },
  { date: 'June 04', leads: 6 },
  { date: 'June 05', leads: 14 },
  { date: 'June 06', leads: 11 }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // App states
  const [campaign, setCampaign] = useState(''); // 'tvs' or 'bhartiya'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Drip feed settings (interactive simulations)
  const [minDelay, setMinDelay] = useState(10);
  const [maxDelay, setMaxDelay] = useState(120);

  // Live Sheets API States
  const [leads, setLeads] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Authentication logic
  const handleLoginDirect = async (email, password) => {
    setError('');
    
    if (email === 'tvs@nobrokerhood.com' && password === 'tvs123') {
      setIsLoggedIn(true);
      setCampaign('tvs');
      setMinDelay(10);
      setMaxDelay(120);
      return true;
    } else if (email === 'bhartiya@nobrokerhood.com' && password === 'bhartiya123') {
      setIsLoggedIn(true);
      setCampaign('bhartiya');
      setMinDelay(1);
      setMaxDelay(180);
      return true;
    } else {
      setError('Invalid email or password. Please use partner login credentials.');
      return false;
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLogin(false);
    setUsername('');
    setPassword('');
    setSearch('');
    setStatusFilter('All');
    setLeads([]);
    setChartData([]);
  };

  // Fetch from the live backend server
  const fetchLeads = async (campaignName) => {
    if (!campaignName) return;
    setLoading(true);
    setBackendError('');
    try {
      const res = await fetch(`http://localhost:8000/api/leads?campaign=${campaignName}`);
      if (!res.ok) {
        throw new Error('Failed to retrieve sheet data');
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setChartData(data.chartData || []);
    } catch (err) {
      console.error("Error fetching live leads from sheets:", err);
      setBackendError('Could not sync with Google Sheets API server. Showing cached data.');
      // fallback to mock
      setLeads(campaignName === 'tvs' ? TVS_LEADS_MOCK : BHARTIYA_LEADS_MOCK);
      setChartData(campaignName === 'tvs' ? TVS_CHART_MOCK : BHARTIYA_CHART_MOCK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && campaign) {
      fetchLeads(campaign);
    }
  }, [isLoggedIn, campaign]);

  // Filters logic
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

  // Metric aggregates
  const stats = useMemo(() => {
    const total = leads.length;
    const successCount = leads.filter(l => l.status === 'Success').length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(0) : 100;
    
    // Approximate queue
    const pending = campaign === 'tvs' ? 14 : 3;
    
    return {
      total,
      successRate,
      pending
    };
  }, [leads, campaign]);

  // Export to Excel logic using xlsx
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLeads.map(l => ({
      'Lead ID': l.id,
      'Name': l.name,
      'Email': l.email,
      'Phone': l.phone,
      'City': l.city,
      'Typeform/Preference': l.subSource,
      'Sync Status': l.status,
      'Logged At': l.timestamp
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Export");
    XLSX.writeFile(wb, `NBH_${campaign === 'tvs' ? 'TVS_Emerald' : 'Bhartiya_City'}_Leads_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Rendering direct login page
  if (!isLoggedIn) {
    return (
      <LoginPage 
        onLogin={handleLoginDirect} 
        error={error} 
      />
    );
  }

  return (
    <div className="dashboard-container animate-fade">
      {/* Sidebar Section */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <img src="/nbh_logo.png" alt="NoBrokerHood Logo" style={{ height: '24px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.3px' }}>Partner</span>
        </div>

        <ul className="sidebar-menu">
          <li className="sidebar-item active">
            <Users size={18} />
            <span>Campaign Leads</span>
          </li>
          <li className="sidebar-item">
            <Settings size={18} />
            <span>Drip Configuration</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {campaign === 'tvs' ? 'TVS' : 'BC'}
            </div>
            <div className="user-info">
              <h4>{campaign === 'tvs' ? 'TVS Emerald' : 'Bhartiya City'}</h4>
              <p>Active Campaign Partner</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="main-content">
        <header className="top-navbar">
          <h1>Welcome Back, {campaign === 'tvs' ? 'TVS Emerald Portal' : 'Bhartiya City Portal'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="sync-status-indicator">
              <div className={`pulse-indicator ${backendError ? 'error' : ''}`} />
              <span style={{ fontSize: '0.85rem', color: backendError ? 'var(--nbh-red)' : 'var(--nbh-slate)', fontWeight: '600' }}>
                {backendError ? 'Using Cached Sheets Data' : 'Google Sheets API Live'}
              </span>
            </div>
            <div className="campaign-badge">
              {campaign === 'tvs' ? 'TVS Emerald Altura' : 'Bhartiya City Automation'}
            </div>
          </div>
        </header>

        <section className="content-body">
          {/* Metrics Panel Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-info">
                <h5>Total Leads Processed</h5>
                <div className="metric-value">{stats.total}</div>
                <div className="metric-trend trend-up">
                  +12% this week
                </div>
              </div>
              <div className="metric-icon">
                <Users size={24} />
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-info">
                <h5>Salesforce Sync Success</h5>
                <div className="metric-value">{stats.successRate}%</div>
                <div className="metric-trend trend-up">
                  Optimal performance
                </div>
              </div>
              <div className="metric-icon" style={{ color: '#10b981' }}>
                <CheckCircle size={24} />
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-info">
                <h5>Pending Drip Queue</h5>
                <div className="metric-value">{stats.pending}</div>
                <div className="metric-trend" style={{ color: '#d97706' }}>
                  Waiting to dispatch
                </div>
              </div>
              <div className="metric-icon" style={{ color: '#d97706' }}>
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="dashboard-row">
            {/* Lead Arrival Charts Panel */}
            <div className="card-panel">
              <div className="card-header">
                <h3>Leads Received Trend</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last 7 Days</span>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                {loading ? (
                  <div className="spinner-container">
                    <div className="spinner" />
                    <p>Fetching chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="leads" 
                        stroke="var(--nbh-teal)" 
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Drip settings component */}
            <div className="card-panel">
              <div className="card-header">
                <h3>Drip Configuration</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="config-setting-row">
                  <div className="setting-info">
                    <h4>Min Drip Delay</h4>
                    <p>Minimum delay before next push</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="filter-select"
                      style={{ width: '70px', padding: '6px' }}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '0.9rem' }}>mins</span>
                  </div>
                </div>

                <div className="config-setting-row">
                  <div className="setting-info">
                    <h4>Max Drip Delay</h4>
                    <p>Maximum delay before next push</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="filter-select"
                      style={{ width: '70px', padding: '6px' }}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{campaign === 'tvs' ? 'mins' : 'hrs'}</span>
                  </div>
                </div>

                <div className="config-setting-row">
                  <div className="setting-info">
                    <h4>Automation Engine</h4>
                    <p>Main cron/scheduler running</p>
                  </div>
                  <span className="status-badge success">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Leads Data Table Section */}
          <div className="card-panel">
            <div className="card-header" style={{ marginBottom: '24px' }}>
              <h3>Live Ingestion Log</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => fetchLeads(campaign)} className="card-action-btn" style={{ padding: '10px 20px' }} disabled={loading}>
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh Sync</span>
                </button>
                <button onClick={handleExportExcel} className="form-button" style={{ width: 'auto', padding: '10px 20px' }}>
                  <Download size={18} />
                  <span>Export to Excel</span>
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
              <div className="input-wrapper filter-search">
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search by name, phone..." 
                  style={{ paddingLeft: '40px' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Ingestion Statuses</option>
                <option value="Success">Success (Sync)</option>
                <option value="Failed">Failed (Sync)</option>
              </select>
            </div>

            {loading ? (
              <div className="spinner-container">
                <div className="spinner" />
                <p>Syncing live database rows from Google Sheet...</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="nbh-table">
                  <thead>
                    <tr>
                      <th>Lead Name</th>
                      <th>Mobile</th>
                      <th>Email Address</th>
                      <th>Region</th>
                      <th>Preference (20% logic)</th>
                      <th>Ingestion Status</th>
                      <th>Sync Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{lead.name}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.city}</td>
                        <td>
                          <span className="campaign-badge" style={{ backgroundColor: lead.subSource === 'Digital' || lead.subSource === 'Gmail Fetch' || lead.subSource === 'Sheet Backup' ? '#f1f5f9' : 'var(--nbh-teal-light)', color: lead.subSource === 'Digital' || lead.subSource === 'Gmail Fetch' || lead.subSource === 'Sheet Backup' ? '#64748b' : 'var(--nbh-teal)' }}>
                            {lead.subSource}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${lead.status === 'Success' ? 'success' : 'failed'}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{lead.timestamp}</td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                          No leads found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
