import React, { useState } from 'react';
import { 
  Sparkles, Smartphone, Landmark, ShieldCheck, 
  HelpCircle, ChevronDown, CheckCircle2, ArrowRight, DollarSign, Users, Award
} from 'lucide-react';

export default function App() {
  const [budget, setBudget] = useState(500);
  const [adType, setAdType] = useState('rewarded_video');
  const [activeFaq, setActiveFaq] = useState(null);

  // Pricing calculations
  const costPerView = adType === 'rewarded_video' ? 0.05 : adType === 'video' ? 0.04 : 0.02;
  const platformFeePercent = 40;
  const userRewardPercent = 60;

  const estimatedViews = Math.floor(budget / costPerView);
  const userRewardShare = budget * (userRewardPercent / 100);
  const platformProfit = budget * (platformFeePercent / 100);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Background neon grids */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-sky-500/10 via-transparent to-transparent blur-[120px] pointer-events-none"></div>

      {/* HEADER NAVBAR */}
      <header className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between border-b border-slate-900 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">ViewPay</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#calculator" className="hover:text-white transition-colors">Reach Calculator</a>
          <a href="#pricing" className="hover:text-white transition-colors">Campaign Pricing</a>
          <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
        </nav>
        <div className="flex items-center gap-4">
          <a href="http://localhost:3000" className="text-sm font-semibold hover:text-sky-400 transition-colors">Advertiser Login</a>
          <a href="#calculator" className="bg-sky-400 hover:bg-sky-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-sky-400/20">
            Launch Ads
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-400/20 bg-sky-400/5 text-xs font-semibold text-sky-400 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rewarding Viewers. Empowering Brands.</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent max-w-4xl mx-auto leading-[1.15]">
          The Next-Generation Rewarded Ad Platform
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
          Advertisers launch high-conversion video or banner campaigns, and viewers earn real money for watching. Built-in fraud prevention, direct payouts, and custom targeting filters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <a href="#calculator" className="w-full sm:w-auto bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
            Compute Estimated Reach <ArrowRight className="w-5 h-5" />
          </a>
          <a href="http://localhost:3000" className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-800/80 font-bold px-8 py-4 rounded-xl transition-all">
            Join as Advertiser
          </a>
        </div>
      </section>

      {/* VALUE PROPOSITION GRID */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
        <h2 className="text-3xl font-bold text-center mb-16">Platform Core Advantages</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: ShieldCheck, 
              title: 'Verified Watch Action', 
              desc: 'Our advanced tracking algorithms guarantee advertisements are viewed in full. No automated clicks, emulator bots, or fake views.' 
            },
            { 
              icon: Landmark, 
              title: 'Instant Mobile Payouts', 
              desc: 'Users withdraw their earnings directly to M-Pesa, PayPal, or Bank Transfer as soon as they reach the minimum threshold.' 
            },
            { 
              icon: Smartphone, 
              title: 'Dynamic Targeting Filters', 
              desc: 'Restrict ad views by user countries, mobile operating systems, browser agents, age brackets, or genders.' 
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-slate-900/50 border border-slate-900 p-8 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-400">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* REACH CALCULATOR WIDGET */}
      <section id="calculator" className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-900">
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight">Campaign Reach Calculator</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Adjust your target budget and choose your advertisement style to calculate how many guaranteed completed views or impressions you will achieve.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 font-semibold">
                  <span>Target Ad Budget</span>
                  <span className="text-sky-400">${budget} USD</span>
                </div>
                <input 
                  type="range" min="100" max="10000" step="100" value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value))}
                  className="w-full accent-sky-400 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ad Media Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'rewarded_video', name: 'Rewarded Video' },
                    { id: 'video', name: 'Standard Video' },
                    { id: 'image', name: 'Banner Image' }
                  ].map((style) => (
                    <button 
                      key={style.id} onClick={() => setAdType(style.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        adType === style.id 
                          ? 'bg-sky-400 border-sky-400 text-slate-950' 
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Output Display */}
          <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800/80 space-y-6 shadow-xl">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Reach Metrics Estimates</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-900 pb-3">
                <span className="text-slate-400 text-sm">Guaranteed Views:</span>
                <span className="text-2xl font-black text-sky-400">{estimatedViews.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-3">
                <span className="text-slate-400 text-sm">Viewer Payout Pool (60%):</span>
                <span className="text-lg font-bold text-green-400">${userRewardShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-3">
                <span className="text-slate-400 text-sm">Platform Commission (40%):</span>
                <span className="text-lg font-bold text-slate-200">${platformProfit.toFixed(2)}</span>
              </div>
            </div>

            <a href="http://localhost:3000" className="block text-center bg-sky-400 hover:bg-sky-500 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg transition-all">
              Launch Campaign Now
            </a>
          </div>
        </div>
      </section>

      {/* PRICING PLANS */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Simple, Pay-As-You-Go Pricing</h2>
          <p className="text-slate-400 text-sm mt-3">Pay only for active impressions or watched videos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              name: 'Starter Tier', 
              budget: '$100', 
              features: ['Min budget limit of $100', 'Standard video ads', 'Target by country', 'Direct Mpesa/PayPal payments', 'Standard support desk'] 
            },
            { 
              name: 'Growth Plan', 
              budget: '$500', 
              features: ['Min budget limit of $500', 'Rewarded video + Carousel ads', 'Target by device & browser type', 'CSV campaign performance reports', 'Priority support chat'] 
            },
            { 
              name: 'Enterprise Hub', 
              budget: 'Custom', 
              features: ['Custom target budgets', 'Interactive sponsored posts', 'A/B test campaign variables', 'Dedicated account manager', 'API webhooks log integrations'] 
            }
          ].map((plan, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-900 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-colors">
              <div className="space-y-6">
                <h4 className="text-sm uppercase font-extrabold tracking-wider text-sky-400">{plan.name}</h4>
                <div className="text-4xl font-black">{plan.budget}</div>
                <ul className="space-y-3 text-slate-400 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href="http://localhost:3000" className="block text-center border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold py-3 rounded-xl mt-8 transition-colors">
                Select Plan
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faqs" className="max-w-4xl mx-auto px-6 py-20 border-t border-slate-900">
        <h2 className="text-3xl font-bold text-center mb-16">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { 
              q: 'How does ViewPay ensure ads are actually viewed?', 
              a: 'Our video players utilize focus-tracking logic to verify that the viewer is actively watching the screen. If the tab becomes inactive or the window is blurred, the timer automatically pauses.' 
            },
            { 
              q: 'What payout methods do you support?', 
              a: 'For viewers, we support M-Pesa mobile payments, bank transfers, and PayPal. Payouts require a verified KYC status and are approved within 24-48 hours.' 
            },
            { 
              q: 'How much does it cost to set up a campaign?', 
              a: 'Varying on the selected ad format: banner image views cost $0.02, standard video ads cost $0.04, and rewarded video ads cost $0.05 per fully completed view.' 
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-900 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleFaq(idx)}
                className="w-full p-6 text-left font-semibold flex items-center justify-between hover:bg-slate-900 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="p-6 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-950">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">ViewPay</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 ViewPay Rewarded Ads Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
