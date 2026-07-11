import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Megaphone, Receipt, Headphones, User, 
  LogOut, Plus, ShieldCheck, Sun, Moon, ArrowUpRight, 
  Send, Sparkles, AlertCircle, RefreshCw, Smartphone, Globe, CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { authAPI, campaignAPI, supportAPI } from './services/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('advertiser_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('advertiser_user')) || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);

  // Authentication states
  const [authMode, setAuthMode] = useState('login'); // login, signup, otp, forgot
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCompanyName, setAuthCompanyName] = useState('');
  const [authContactName, setAuthContactName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Data states
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState({ summary: { impressions: 0, views: 0, clicks: 0, spent: 0 }, daily: [] });
  const [billing, setBilling] = useState({ deposits: [], invoices: [] });
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [profileBalance, setProfileBalance] = useState(0.00);

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('stripe');
  const [depositRef, setDepositRef] = useState('');
  const [depositErr, setDepositErr] = useState('');

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campBudget, setCampBudget] = useState('');
  const [campDailyBudget, setCampDailyBudget] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campCountries, setCampCountries] = useState(['KE', 'US']);
  const [campDevices, setCampDevices] = useState(['mobile', 'desktop']);
  
  // Ad details within Campaign creation
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adType, setAdType] = useState('rewarded_video');
  const [adMediaUrl, setAdMediaUrl] = useState('');
  const [adActionUrl, setAdActionUrl] = useState('');
  const [campErr, setCampErr] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Toast notification state & helpers
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthMessage('');
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

  // Auto load data on token verification
  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, activeTab]);

  useEffect(() => {
    // Sync dark mode class
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadDashboardData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const stats = await campaignAPI.getAnalytics();
        setAnalytics(stats.data);
        const campList = await campaignAPI.list();
        setCampaigns(campList.data);
      } else if (activeTab === 'campaigns') {
        const campList = await campaignAPI.list();
        setCampaigns(campList.data);
      } else if (activeTab === 'billing') {
        const bill = await campaignAPI.getBilling();
        setBilling(bill.data);
      } else if (activeTab === 'support') {
        const tkts = await supportAPI.listTickets();
        setTickets(tkts.data);
      }
      
      // Update local wallet balance preview
      const bill = await campaignAPI.getBilling();
      const totalDeposited = bill.data.deposits.reduce((acc, d) => acc + parseFloat(d.amount), 0);
      const totalSpent = analytics.summary.spent || 0;
      setProfileBalance(Math.max(0, totalDeposited - totalSpent));
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await authAPI.login(authEmail, authPassword);
      setToken(res.data.accessToken);
      setUser(res.data.user);
      localStorage.setItem('advertiser_token', res.data.accessToken);
      localStorage.setItem('advertiser_user', JSON.stringify(res.data.user));
      showToast('Welcome back! Login successful.', 'success');
    } catch (err) {
      if (err.response?.data?.unverified) {
        showToast('Email not verified. Verification code sent.', 'error');
        setAuthMessage('Email not verified. OTP sent to your mailbox.');
        setAuthMode('otp');
      } else {
        const errMsg = err.response?.data?.message || 'Login credentials incorrect';
        setAuthError(errMsg);
        showToast(errMsg, 'error');
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      await authAPI.signup(authCompanyName, authContactName, authEmail, authPassword);
      showToast('Registration successful! OTP verification sent.', 'success');
      setAuthMessage('Registration successful! Check your email for OTP verification code.');
      setAuthMode('otp');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Signup failed. Please try again.';
      setAuthError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      await authAPI.verifyOtp(authEmail, otpCode);
      showToast('Email verified successfully! You can now log in.', 'success');
      setAuthMessage('Email verified successfully! You can now log in.');
      setAuthMode('login');
      setOtpCode('');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid or expired OTP code';
      setAuthError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error(err);
    }
    setToken(null);
    setUser(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setCampErr('');

    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await axios.post(`${API_URL}/campaigns/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setAdMediaUrl(res.data.data.url);
    } catch (err) {
      setCampErr(err.response?.data?.message || 'Failed to upload media to Cloudinary');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setCampErr('');
    try {
      if (!campName || !campBudget || !campDailyBudget || !campStart || !campEnd || !adTitle || !adMediaUrl) {
        setCampErr('Please fill in all required fields');
        return;
      }

      // Format custom pricing configuration ratios based on system presets
      const costPerView = adType.includes('video') ? 0.05 : 0.03;
      const costPerClick = 0.10;
      const rewardAmount = costPerView * 0.6; // 60% reward payout default

      const campaignPayload = {
        name: campName,
        budget: parseFloat(campBudget),
        dailyBudget: parseFloat(campDailyBudget),
        startDate: campStart,
        endDate: campEnd,
        targetAudience: {
          countries: campCountries,
          devices: campDevices
        },
        ads: [
          {
            title: adTitle,
            description: adDesc,
            adType: adType,
            mediaUrls: [adMediaUrl],
            actionUrl: adActionUrl,
            rewardAmount,
            costPerView,
            costPerClick
          }
        ]
      };

      await campaignAPI.create(campaignPayload);
      showToast('Ad campaign deployed successfully!', 'success');
      setShowCampaignModal(false);
      loadDashboardData();
      
      // Clear forms
      setCampName('');
      setCampBudget('');
      setCampDailyBudget('');
      setAdTitle('');
      setAdDesc('');
      setAdMediaUrl('');
      setAdActionUrl('');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create campaign. Verify wallet balance.';
      setCampErr(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setDepositErr('');
    try {
      if (!depositAmount || !depositRef) {
        setDepositErr('All fields are required');
        return;
      }
      await campaignAPI.deposit(depositAmount, depositMethod, depositRef);
      showToast('Deposit submitted for transaction review!', 'success');
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositRef('');
      loadDashboardData();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to process deposit log';
      setDepositErr(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await supportAPI.createTicket(ticketSubject, ticketMessage);
      showToast('Help ticket opened. Our support will contact you.', 'success');
      setTicketSubject('');
      setTicketMessage('');
      loadDashboardData();
    } catch (err) {
      showToast('Failed to submit ticket.', 'error');
      console.error(err);
    }
  };

  const handleSelectTicket = async (id) => {
    try {
      const res = await supportAPI.getTicket(id);
      setSelectedTicket(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!chatReply.trim()) return;
    try {
      const res = await supportAPI.replyTicket(selectedTicket.ticket.id, chatReply);
      setChatReply('');
      handleSelectTicket(selectedTicket.ticket.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth pages view
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans selection:bg-sky-500 selection:text-white p-4 relative overflow-hidden">
        {/* Neon blur background circles */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border border-slate-700/60 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">ViewPay</h1>
            <p className="text-slate-400 text-sm mt-1">Advertiser Campaign Console</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMessage && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-300 text-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{authMessage}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">Business Email</label>
                <input 
                  type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">Password</label>
                <input 
                  type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 duration-100">
                Sign In to Console
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => switchAuthMode('signup')} className="text-sm text-sky-400 hover:underline">
                  Don't have an advertiser account? Register
                </button>
              </div>
            </form>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-medium">Company Name</label>
                <input 
                  type="text" required value={authCompanyName} onChange={(e) => setAuthCompanyName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="Acme Advertising Corp"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-medium">Contact Person Name</label>
                <input 
                  type="text" required value={authContactName} onChange={(e) => setAuthContactName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-medium">Corporate Email</label>
                <input 
                  type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="ads@company.com"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-medium">Password</label>
                <input 
                  type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 duration-100">
                Register Advertiser Account
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setAuthMode('login')} className="text-sm text-sky-400 hover:underline">
                  Already registered? Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <p className="text-sm text-slate-300 mb-4 text-center">
                  We've dispatched a 6-digit confirmation code to <strong>{authEmail}</strong>.
                </p>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium text-center">6-Digit Verification Code</label>
                <input 
                  type="text" required maxLength="6" value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-center tracking-[8px] text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-sky-400 transition-colors"
                  placeholder="000000"
                />
              </div>
              <button type="submit" className="w-full bg-sky-400 hover:bg-sky-500 text-slate-900 font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95">
                Confirm OTP Code
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => switchAuthMode('login')} className="text-sm text-sky-400 hover:underline">
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
          {renderToasts()}
        </div>
      </div>
    );
  }

  // Dashboard Console layout
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-darkBg transition-colors duration-200">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ViewPay</h2>
              <span className="text-xs text-slate-400 font-medium">Campaign Hub</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
              { id: 'campaigns', name: 'Campaigns', icon: Megaphone },
              { id: 'billing', name: 'Billing & Invoices', icon: Receipt },
              { id: 'support', name: 'Help Desk', icon: Headphones },
              { id: 'profile', name: 'Company Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isSelected 
                      ? 'bg-sky-400/10 text-sky-400 border border-sky-400/20' 
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
          {/* Dark Mode toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Night Theme</span>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-yellow-400 shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* User brief info */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 uppercase">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden grow">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* TOP NAVBAR */}
        <header className="h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">{activeTab}</h1>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-sm text-slate-400">Advertiser Control Console</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-5 py-2.5 flex items-center gap-3 border border-slate-200 dark:border-slate-700/50">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Ad Account Balance</p>
                <p className="text-lg font-black text-slate-800 dark:text-sky-400">${profileBalance.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => setShowDepositModal(true)}
                className="bg-sky-400 hover:bg-sky-500 text-slate-900 rounded-lg p-1.5 shadow-md shadow-sky-400/20"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <div className="p-8 flex-1">
          {/* DASHBOARD PAGE */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Analytics metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: 'Impressions', val: analytics.summary.impressions, color: 'text-sky-400' },
                  { name: 'Ad Views', val: analytics.summary.views, color: 'text-indigo-400' },
                  { name: 'Ad Clicks', val: analytics.summary.clicks, color: 'text-emerald-400' },
                  { name: 'Total Spent', val: `$${(analytics.summary.spent || 0).toFixed(2)}`, color: 'text-pink-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">{stat.name}</span>
                    <h3 className={`text-3xl font-black mt-3 ${stat.color}`}>{stat.val}</h3>
                    <div className="absolute right-3 bottom-3 opacity-10 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-12 h-12" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Area Chart view */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Daily Ad Performance Analytics</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1}/>
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12}/>
                      <YAxis stroke="#94a3b8" fontSize={12}/>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff' }}/>
                      <Area type="monotone" dataKey="views" name="Views" stroke="#38bdf8" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2}/>
                      <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#818cf8" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Active Campaigns summary */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">My Active Campaigns</h3>
                  <button onClick={() => setActiveTab('campaigns')} className="text-sm font-semibold text-sky-400 hover:underline flex items-center gap-1">
                    Manage Campaigns <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-400 uppercase">
                        <th className="pb-3">Campaign Info</th>
                        <th className="pb-3">Overall Budget</th>
                        <th className="pb-3">Spent</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Dates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                      {campaigns.slice(0, 5).map((camp) => (
                        <tr key={camp.id} className="text-slate-600 dark:text-slate-300">
                          <td className="py-4 font-semibold text-slate-900 dark:text-white">{camp.name}</td>
                          <td className="py-4 font-bold text-sky-400">${parseFloat(camp.budget).toFixed(2)}</td>
                          <td className="py-4">${parseFloat(camp.spent).toFixed(2)}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                              camp.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-4 text-xs text-slate-400">
                            {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CAMPAIGNS PAGE */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Active & Draft Campaigns</h3>
                  <p className="text-sm text-slate-400">Create target filters and view ad performance results.</p>
                </div>
                <button 
                  onClick={() => setShowCampaignModal(true)}
                  className="bg-sky-400 hover:bg-sky-500 text-slate-900 font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Launch New Campaign
                </button>
              </div>

              {/* Grid lists of campaigns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg truncate pr-2">{camp.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        camp.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {camp.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Total Budget:</span>
                        <span className="font-bold text-slate-800 dark:text-white">${parseFloat(camp.budget).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Budget Limit:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">${parseFloat(camp.daily_budget).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Spent:</span>
                        <span className="font-medium text-red-400">${parseFloat(camp.spent).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Simple budget bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-2">
                      <div 
                        className="bg-sky-400 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (parseFloat(camp.spent) / parseFloat(camp.budget)) * 100)}%` }}
                      ></div>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                      <span>Timeline:</span>
                      <span>{new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BILLING PAGE */}
          {activeTab === 'billing' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Deposits and Funding column */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Account Funding Logs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 uppercase font-bold">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Reference ID</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                        {billing.deposits.map((dep) => (
                          <tr key={dep.id} className="text-slate-600 dark:text-slate-300">
                            <td className="py-3.5">{new Date(dep.created_at).toLocaleDateString()}</td>
                            <td className="py-3.5 font-mono text-xs">{dep.transaction_reference}</td>
                            <td className="py-3.5 uppercase">{dep.payment_method}</td>
                            <td className="py-3.5 font-bold text-green-400">+${parseFloat(dep.amount).toFixed(2)}</td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold">
                                {dep.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Invoices summary */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Generated Invoices</h3>
                  <div className="space-y-4">
                    {billing.invoices.map((inv) => (
                      <div key={inv.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{inv.invoice_number}</p>
                          <p className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-800 dark:text-white">${parseFloat(inv.total).toFixed(2)}</p>
                          <span className="text-[10px] text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Paid</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HELP DESK PAGE */}
          {activeTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ticket lists column */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Active Help Tickets</h3>
                  
                  {/* Create Ticket Form */}
                  <form onSubmit={handleCreateTicket} className="space-y-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/60">
                    <input 
                      type="text" required placeholder="Subject / Dispute title" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sky-400"
                    />
                    <textarea 
                      required placeholder="Explain your issue in detail..." value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} rows="3"
                      className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sky-400"
                    />
                    <button type="submit" className="w-full bg-sky-400 hover:bg-sky-500 text-slate-950 font-bold py-2 rounded-xl text-sm shadow-md">
                      Open New Support Ticket
                    </button>
                  </form>

                  {/* List Tickets */}
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <button 
                        key={t.id} 
                        onClick={() => handleSelectTicket(t.id)}
                        className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                          selectedTicket?.ticket?.id === t.id 
                            ? 'bg-sky-400/10 border-sky-400/40 text-sky-400' 
                            : 'bg-slate-100/40 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm truncate max-w-[180px]">{t.subject}</p>
                          <p className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                          t.status === 'open' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {t.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Viewport column */}
              <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm flex flex-col h-[580px] overflow-hidden">
                {selectedTicket ? (
                  <>
                    {/* Header */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{selectedTicket.ticket.subject}</h4>
                        <span className="text-xs text-slate-400">Ticket Ref: {selectedTicket.ticket.id}</span>
                      </div>
                      <span className="px-3 py-1 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20 text-xs font-semibold uppercase">
                        {selectedTicket.ticket.status}
                      </span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                      {selectedTicket.messages.map((m) => {
                        const isMe = m.sender_type === 'advertiser';
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-4 rounded-2xl text-sm ${
                              isMe 
                                ? 'bg-sky-400 text-slate-950 rounded-br-none' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
                            }`}>
                              <p className="font-semibold text-[10px] uppercase tracking-wider mb-1 opacity-70">
                                {m.sender_type === 'advertiser' ? 'You' : m.sender_type}
                              </p>
                              <p className="leading-relaxed">{m.message}</p>
                              <span className="block text-[8px] text-right mt-1 opacity-60">
                                {new Date(m.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Input Bar */}
                    <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex gap-3 shrink-0">
                      <input 
                        type="text" value={chatReply} onChange={(e) => setChatReply(e.target.value)}
                        placeholder="Write a message response..."
                        className="flex-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-sky-400 text-sm"
                      />
                      <button type="submit" className="bg-sky-400 hover:bg-sky-500 text-slate-950 rounded-xl px-5 flex items-center justify-center font-bold">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                    <Headphones className="w-16 h-16 mb-4 opacity-55 text-sky-400" />
                    <p className="font-bold">Select a Support Ticket</p>
                    <p className="text-xs text-center max-w-sm mt-1">Select an active ticket from the left panel to review chat logs or send messages to our support team.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE PAGE */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-8 rounded-2xl shadow-sm space-y-6">
              <h3 className="text-xl font-bold border-b border-slate-200 dark:border-slate-700/60 pb-3 text-slate-800 dark:text-white">Advertiser Profile</h3>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Company Identity</p>
                  <p className="text-slate-800 dark:text-white font-medium mt-1">{user?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Account Class</p>
                  <p className="text-sky-400 font-semibold mt-1 uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Advertiser Premium
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Primary Email Address</p>
                  <p className="text-slate-800 dark:text-white font-medium mt-1">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Access Status</p>
                  <p className="text-green-400 font-bold mt-1 uppercase">Active</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Deposit Wallet Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 w-full max-w-md p-6 rounded-2xl space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">Fund Advertiser Balance</h4>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            {depositErr && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depositErr}</span>
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Deposit Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'stripe', name: 'Stripe' },
                    { id: 'paypal', name: 'PayPal' },
                    { id: 'mpesa', name: 'M-Pesa' }
                  ].map((m) => (
                    <button 
                      key={m.id} type="button" onClick={() => setDepositMethod(m.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        depositMethod === m.id 
                          ? 'bg-sky-400 border-sky-400 text-slate-950' 
                          : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Deposit Amount ($ USD)</label>
                <input 
                  type="number" required min="10" placeholder="Min $10.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase">Transaction Reference Code</label>
                <input 
                  type="text" required placeholder="Stripe ID or Mpesa Ref Code" value={depositRef} onChange={(e) => setDepositRef(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                />
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 duration-100">
                Confirm Fund Deposit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 w-full max-w-2xl p-6 rounded-2xl space-y-5 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">Launch New Ad Campaign</h4>
              <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            {campErr && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{campErr}</span>
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Campaign Name</label>
                  <input 
                    type="text" required placeholder="Summer Flash Sale" value={campName} onChange={(e) => setCampName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Ad Type</label>
                  <select 
                    value={adType} onChange={(e) => setAdType(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  >
                    <option value="rewarded_video">Rewarded Video ($0.05/View)</option>
                    <option value="video">Standard Video ($0.04/View)</option>
                    <option value="image">Image Banner ($0.03/Impression)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Total Budget ($ USD)</label>
                  <input 
                    type="number" required min="10" placeholder="e.g. 500" value={campBudget} onChange={(e) => setCampBudget(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Daily Budget Limit ($ USD)</label>
                  <input 
                    type="number" required min="1" placeholder="e.g. 20" value={campDailyBudget} onChange={(e) => setCampDailyBudget(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Start Date</label>
                  <input 
                    type="date" required value={campStart} onChange={(e) => setCampStart(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">End Date</label>
                  <input 
                    type="date" required value={campEnd} onChange={(e) => setCampEnd(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Ad Item details */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100/40 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Ad Media Assets & Creative</h5>
                
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Ad Title</label>
                  <input 
                    type="text" required placeholder="Summer Promotion - 20% Off" value={adTitle} onChange={(e) => setAdTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Ad Description</label>
                  <input 
                    type="text" placeholder="Sign up today and claim discounts on all categories" value={adDesc} onChange={(e) => setAdDesc(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Upload Media file (Cloudinary)</label>
                    <input 
                      type="file" accept="image/*,video/*" onChange={handleFileUpload}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-400/10 file:text-sky-400 hover:file:bg-sky-400/20 bg-slate-900 border border-slate-700 rounded-lg"
                    />
                    {isUploading && <p className="text-[10px] text-sky-400 mt-1 animate-pulse">Uploading to Cloudinary...</p>}
                    {adMediaUrl && !isUploading && (
                      <p className="text-[10px] text-green-400 mt-1 truncate">Uploaded: {adMediaUrl}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Action URL (Website Destination)</label>
                    <input 
                      type="url" placeholder="https://mycompany.com/landing" value={adActionUrl} onChange={(e) => setAdActionUrl(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-sky-400 hover:bg-sky-500 text-slate-900 font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 duration-100">
                Fund & Deploy Campaign Ads
              </button>
            </form>
          </div>
        </div>
      )}
      {renderToasts()}
    </div>
  );
}
