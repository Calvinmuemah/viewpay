import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Users, Landmark, Megaphone, Settings, 
  LogOut, ShieldCheck, Sun, Moon, Ban, CheckCircle2, 
  AlertTriangle, Eye, ArrowUpDown, Lock, Check, X, Edit2
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://viewpay-nine.vercel.app/api/v1';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);

  // Auth states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data lists
  const [stats, setStats] = useState({ total_users: 0, total_advertisers: 0, active_campaigns: 0, total_revenue: 0, total_payouts: 0, total_profit: 0 });
  const [users, setUsers] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [fraud, setFraud] = useState({ duplicateIps: [], clickSpammers: [] });
  const [auditLogs, setAuditLogs] = useState([]);

  // System Settings state
  const [pricingSettings, setPricingSettings] = useState({ cost_per_view: 0.05, cost_per_click: 0.10, reward_percentage: 60, platform_commission: 40, min_withdrawal_limit: 10.00, withdrawal_fee_percent: 2.5 });
  const [editSettingsMode, setEditSettingsMode] = useState(false);

  // Modal notes
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  // Toast notification state & helpers
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const renderToasts = () => (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold tracking-wide transition-all duration-300 transform translate-y-0 scale-100 ${
          t.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 backdrop-blur-md' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 backdrop-blur-md'
        }`}>
          <span className="text-base">{t.type === 'success' ? '⚡' : '⚠️'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const apiCall = async (method, path, body = {}) => {
    try {
      const res = await axios({
        method,
        url: `${API_URL}${path}`,
        data: body,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
      throw err;
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await apiCall('GET', '/admin/stats');
        setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await apiCall('GET', '/admin/users');
        setUsers(res.data.users);
      } else if (activeTab === 'advertisers') {
        const res = await apiCall('GET', '/admin/advertisers');
        setAdvertisers(res.data.advertisers);
      } else if (activeTab === 'withdrawals') {
        const res = await apiCall('GET', '/admin/withdrawals');
        setWithdrawals(res.data.withdrawals);
      } else if (activeTab === 'campaigns') {
        const res = await apiCall('GET', '/admin/campaigns');
        setCampaigns(res.data);
      } else if (activeTab === 'fraud') {
        const res = await apiCall('GET', '/admin/fraud-reports');
        setFraud(res.data);
        const audits = await apiCall('GET', '/admin/audit-logs');
        setAuditLogs(audits.data);
      } else if (activeTab === 'settings') {
        const res = await apiCall('GET', '/general/settings');
        if (res.data.pricing) {
          setPricingSettings(res.data.pricing);
        }
      }
    } catch (err) {
      console.error('Failed to load admin records:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: username,
        password,
        type: 'admin'
      });
      const jwt = res.data.data.accessToken;
      setToken(jwt);
      localStorage.setItem('admin_token', jwt);
      showToast('Admin access verified successfully!', 'success');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Unauthorized admin access';
      setAuthError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const handleUserStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiCall('PUT', `/admin/users/${id}/status`, { status: nextStatus });
      showToast(`User status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to update user status', 'error');
      console.error(err);
    }
  };

  const handleAdvertiserStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiCall('PUT', `/admin/advertisers/${id}/status`, { status: nextStatus });
      showToast(`Advertiser status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to update advertiser status', 'error');
      console.error(err);
    }
  };

  const handleCampaignStatus = async (id, nextStatus) => {
    try {
      await apiCall('PUT', `/admin/campaigns/${id}/status`, { status: nextStatus });
      showToast(`Campaign status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to update campaign status', 'error');
      console.error(err);
    }
  };

  const handleProcessWithdrawal = async (status) => {
    if (!selectedWithdrawal) return;
    try {
      await apiCall('PUT', `/admin/withdrawals/${selectedWithdrawal.id}/process`, {
        status,
        adminNotes: adminNotes || 'Processed by admin representative'
      });
      showToast(`Payout withdrawal request has been ${status}!`, 'success');
      setSelectedWithdrawal(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      showToast('Failed to process withdrawal request.', 'error');
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await apiCall('PUT', '/admin/settings', {
        key: 'pricing',
        value: pricingSettings
      });
      showToast('System pricing & commissions saved successfully!', 'success');
      setEditSettingsMode(false);
      loadData();
    } catch (err) {
      showToast('Failed to save settings.', 'error');
      console.error(err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans selection:bg-rose-500 selection:text-white p-4 relative overflow-hidden">
        <div className="absolute top-[-25%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose-500/10 blur-[130px] pointer-events-none"></div>
        
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-3">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Super Admin</h1>
            <p className="text-slate-500 text-sm mt-1">Platform Control Operations</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex gap-3 items-center">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">Username or Email</label>
              <input 
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-rose-400 transition-colors"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">Secure Access Key</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-rose-400 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 duration-100">
              Access Admin Terminal
            </button>
          </form>
          {renderToasts()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-darkBg transition-colors duration-200">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ViewPay</h2>
              <span className="text-xs text-rose-500 font-bold">Admin Portal</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', name: 'Admin Dashboard', icon: ShieldCheck },
              { id: 'users', name: 'User Directory', icon: Users },
              { id: 'advertisers', name: 'Advertisers', icon: Landmark },
              { id: 'withdrawals', name: 'Payout Requests', icon: Landmark },
              { id: 'campaigns', name: 'Campaign Moderation', icon: Megaphone },
              { id: 'fraud', name: 'Security & Audit', icon: ShieldAlert },
              { id: 'settings', name: 'Platform Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isSelected 
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Night Theme</span>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-yellow-400 shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="overflow-hidden grow">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">Administrator</p>
              <p className="text-xs text-slate-400 truncate">admin@viewpay.com</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">{activeTab}</h1>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-sm text-slate-400 font-medium">Platform Management Terminal</span>
          </div>
        </header>

        <div className="p-8 flex-1">
          {/* DASHBOARD PAGE */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: 'Total Viewers', val: stats.total_users, color: 'text-rose-400' },
                  { name: 'Total Advertisers', val: stats.total_advertisers, color: 'text-indigo-400' },
                  { name: 'Total Revenue Deposits', val: `$${parseFloat(stats.total_revenue).toFixed(2)}`, color: 'text-green-400' },
                  { name: 'Platform Profits (40%)', val: `$${parseFloat(stats.total_profit).toFixed(2)}`, color: 'text-amber-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">{stat.name}</span>
                    <h3 className={`text-3xl font-black mt-3 ${stat.color}`}>{stat.val}</h3>
                  </div>
                ))}
              </div>

              {/* Quick statistics and audits summary */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Platform System Health</h3>
                <p className="text-sm text-slate-400">All modules are operating normally. Background cron scheduler is actively running and database pools are healthy.</p>
              </div>
            </div>
          )}

          {/* USER DIRECTORY PAGE */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Active and Suspended Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Wallet Balance</th>
                      <th className="pb-3">KYC Status</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="text-slate-600 dark:text-slate-300">
                        <td className="py-4 font-semibold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="py-4">{u.email}</td>
                        <td className="py-4 font-bold text-rose-400">${parseFloat(u.balance).toFixed(2)}</td>
                        <td className="py-4 capitalize">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            u.kyc_status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {u.kyc_status}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            u.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <button 
                            onClick={() => handleUserStatus(u.id, u.status)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              u.status === 'active' 
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                                : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADVERTISERS PAGE */}
          {activeTab === 'advertisers' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Advertiser Accounts Directory</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">Company</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Balance</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                    {advertisers.map((adv) => (
                      <tr key={adv.id} className="text-slate-600 dark:text-slate-300">
                        <td className="py-4 font-semibold text-slate-900 dark:text-white">{adv.company_name}</td>
                        <td className="py-4">{adv.contact_name}</td>
                        <td className="py-4">{adv.email}</td>
                        <td className="py-4 font-bold text-rose-400">${parseFloat(adv.balance).toFixed(2)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            adv.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {adv.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <button 
                            onClick={() => handleAdvertiserStatus(adv.id, adv.status)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              adv.status === 'active' 
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                                : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {adv.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WITHDRAWALS PAGE */}
          {activeTab === 'withdrawals' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Withdrawal Approval Queue</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">User Info</th>
                      <th className="pb-3">Withdrawal Amount</th>
                      <th className="pb-3">Fee Deducted</th>
                      <th className="pb-3">Net Payment</th>
                      <th className="pb-3">Payout Gateway</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="text-slate-600 dark:text-slate-300">
                        <td className="py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{w.user_name}</p>
                          <p className="text-xs text-slate-400">{w.user_email}</p>
                        </td>
                        <td className="py-4">${parseFloat(w.amount).toFixed(2)}</td>
                        <td className="py-4 text-red-400">-${parseFloat(w.fee).toFixed(2)}</td>
                        <td className="py-4 font-bold text-green-400">${parseFloat(w.net_amount).toFixed(2)}</td>
                        <td className="py-4 uppercase text-xs font-mono">{w.payment_method}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            w.status === 'completed' 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : w.status === 'pending' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-4">
                          {w.status === 'pending' ? (
                            <button 
                              onClick={() => setSelectedWithdrawal(w)}
                              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow"
                            >
                              Review & Action
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CAMPAIGN MODERATION PAGE */}
          {activeTab === 'campaigns' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Active Ad Campaigns Moderation</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">Campaign</th>
                      <th className="pb-3">Advertiser</th>
                      <th className="pb-3">Total Budget</th>
                      <th className="pb-3">Spent</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="text-slate-600 dark:text-slate-300">
                        <td className="py-4 font-semibold text-slate-900 dark:text-white">{camp.name}</td>
                        <td className="py-4">{camp.company_name}</td>
                        <td className="py-4 font-bold text-rose-400">${parseFloat(camp.budget).toFixed(2)}</td>
                        <td className="py-4">${parseFloat(camp.spent).toFixed(2)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            camp.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-4 flex gap-2">
                          <button 
                            onClick={() => handleCampaignStatus(camp.id, 'active')}
                            className="p-1 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-500/10"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleCampaignStatus(camp.id, 'rejected')}
                            className="p-1 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/10"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY & FRAUD PAGE */}
          {activeTab === 'fraud' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Duplicate IPs */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" /> Multiple Accounts Shared IP
                  </h3>
                  <div className="space-y-3">
                    {fraud.duplicateIps.length === 0 ? (
                      <p className="text-sm text-slate-400">No multi-account fingerprint IP conflicts found.</p>
                    ) : (
                      fraud.duplicateIps.map((ip, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-red-500/5 flex justify-between items-center">
                          <div>
                            <p className="font-mono text-sm text-slate-900 dark:text-white">{ip.ip_address}</p>
                            <p className="text-xs text-slate-400">Shared between {ip.user_count} user accounts.</p>
                          </div>
                          <span className="text-xs font-bold text-red-400 uppercase">Suspicious</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Click Spammers */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" /> Click Spamming Alerts
                  </h3>
                  <div className="space-y-3">
                    {fraud.clickSpammers.length === 0 ? (
                      <p className="text-sm text-slate-400">No abnormal click spammers detected today.</p>
                    ) : (
                      fraud.clickSpammers.map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-red-500/5 flex justify-between items-center">
                          <div>
                            <p className="font-mono text-sm text-slate-900 dark:text-white">User Ref: {c.user_id}</p>
                            <p className="text-xs text-slate-400">CTR Click Rate: {c.ctr.toFixed(1)}% ({c.clicks} clicks / {c.views} views)</p>
                          </div>
                          <span className="text-xs font-bold text-red-400 uppercase">High Risk</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Audit trail */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Administrative Audit Logs</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="text-sm p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-wider">{log.action}</span>
                        <p className="text-xs text-slate-400 mt-0.5">Admin ID: {log.performer_id} | IP: {log.ip_address}</p>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PLATFORM SETTINGS PAGE */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Global Pricing Configuration</h3>
                <button 
                  onClick={() => setEditSettingsMode(!editSettingsMode)}
                  className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> {editSettingsMode ? 'Cancel Edit' : 'Edit Configuration'}
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Cost Per Ad View ($ USD)</label>
                    <input 
                      type="number" step="0.001" disabled={!editSettingsMode} value={pricingSettings.cost_per_view}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, cost_per_view: parseFloat(e.target.value) })}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Cost Per Ad Click ($ USD)</label>
                    <input 
                      type="number" step="0.001" disabled={!editSettingsMode} value={pricingSettings.cost_per_click}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, cost_per_click: parseFloat(e.target.value) })}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">User Reward Percentage (%)</label>
                    <input 
                      type="number" disabled={!editSettingsMode} value={pricingSettings.reward_percentage}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, reward_percentage: parseFloat(e.target.value) })}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Min Withdrawal Balance ($ USD)</label>
                    <input 
                      type="number" disabled={!editSettingsMode} value={pricingSettings.min_withdrawal_limit}
                      onChange={(e) => setPricingSettings({ ...pricingSettings, min_withdrawal_limit: parseFloat(e.target.value) })}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 disabled:opacity-60"
                    />
                  </div>
                </div>

                {editSettingsMode && (
                  <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg">
                    Save Ratios Config
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </main>

      {/* WITHDRAWAL REVIEW DIALOG */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 w-full max-w-md p-6 rounded-2xl space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">Action Payout Request</h4>
              <button onClick={() => setSelectedWithdrawal(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="space-y-2 text-sm">
              <p><strong>Viewer:</strong> {selectedWithdrawal.user_name} ({selectedWithdrawal.user_email})</p>
              <p><strong>Net payout:</strong> ${parseFloat(selectedWithdrawal.net_amount).toFixed(2)}</p>
              <p><strong>Method:</strong> {selectedWithdrawal.payment_method}</p>
              <p><strong>Target Destination:</strong> {JSON.stringify(selectedWithdrawal.payment_details)}</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-slate-400 font-bold uppercase">Processing Notes</label>
              <input 
                type="text" placeholder="Transferred via Mpesa Ref ID / PayPal transaction ID" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleProcessWithdrawal('completed')}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                Approve & Release
              </button>
              <button 
                onClick={() => handleProcessWithdrawal('rejected')}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                Reject & Revert
              </button>
            </div>
          </div>
        </div>
      )}
      {renderToasts()}
    </div>
  );
}
