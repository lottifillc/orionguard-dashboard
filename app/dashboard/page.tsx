'use client';

import React from 'react';
import { 
  LayoutDashboard, Users, MonitorSmartphone, Activity, 
  Image as ImageIcon, Bell, Settings, Search, ChevronDown, 
  Calendar, ArrowUpRight, ArrowDownRight, Zap, ShieldAlert,
  Clock, Server, BrainCircuit, ActivitySquare
} from 'lucide-react';

// --- ARABIC MOCK DATA ---
const kpiData = [
  { title: "الموظفون النشطون", value: "1,284", trend: "+4.2%", isPositive: true, icon: Users, color: "text-blue-400" },
  { title: "الأجهزة المتصلة", value: "1,150", trend: "-1.1%", isPositive: false, icon: MonitorSmartphone, color: "text-indigo-400" },
  { title: "متوسط الإنتاجية", value: "87.4%", trend: "+2.4%", isPositive: true, icon: Activity, color: "text-emerald-400" },
  { title: "معدل الخمول", value: "12.6%", trend: "-0.8%", isPositive: true, icon: Clock, color: "text-amber-400" },
  { title: "درجة المخاطر", value: "14/100", trend: "-5.0%", isPositive: true, icon: ShieldAlert, color: "text-rose-400" },
  { title: "إجمالي ساعات العمل", value: "8,420س", trend: "+12.5%", isPositive: true, icon: Zap, color: "text-blue-500" },
];

const insights = [
  { id: 1, text: "تنخفض الإنتاجية بنسبة 18٪ باستمرار بعد الساعة 2:00 مساءً في قسم الهندسة.", severity: "warning" },
  { id: 2, text: "تم اكتشاف معدل خمول مرتفع (22٪) في قسم المبيعات عن بُعد اليوم.", severity: "alert" },
  { id: 3, text: "انخفضت درجة المخاطر الإجمالية للنظام بعد تطبيق سياسة البرامج الجديدة.", severity: "success" }
];

const activities = [
  { id: 1, user: "أحمد م.", action: "بدأ جلسة آمنة", time: "الآن", status: "success" },
  { id: 2, user: "الجهاز #8842", action: "انقطع الاتصال بشكل غير متوقع", time: "منذ دقيقتين", status: "error" },
  { id: 3, user: "سارة ج.", action: "تسببت في تنبيه خمول مطول", time: "منذ 15 دقيقة", status: "warning" },
  { id: 4, user: "النظام", action: "تم إنشاء التقرير اليومي التلقائي", time: "منذ ساعة", status: "info" },
  { id: 5, user: "ديفيد ك.", action: "تم تسجيل الدخول من عنوان IP جديد", time: "منذ ساعتين", status: "warning" },
];

// --- COMPONENTS ---

// Converted ml-auto to ms-auto for RTL support
const SidebarItem = ({ icon: Icon, label, active }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; active?: boolean }) => (
  <button 
    className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all duration-300 group
    ${active 
      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(0,102,255,0.15)]' 
      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
  >
    <Icon size={20} className={`${active ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
    <span className="font-medium text-sm">{label}</span>
    {active && <div className="ms-auto w-1 h-5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(0,102,255,0.8)]" />}
  </button>
);

type KPIDataItem = {
  title: string
  value: string
  trend: string
  isPositive: boolean
  icon: React.ComponentType<{ size?: number }>
  color: string
}

const KPICard = ({ data }: { data: KPIDataItem }) => (
  <div className="relative group rounded-2xl bg-linear-to-br from-white/10 to-transparent p-px overflow-hidden">
    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
    
    <div className="relative h-full bg-[#080B14] rounded-[15px] p-6 flex flex-col justify-between overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg bg-white/5 border border-white/10 ${data.color}`}>
          <data.icon size={22} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border 
          ${data.isPositive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'}`}>
          {data.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span dir="ltr">{data.trend}</span>
        </div>
      </div>
      
      <div>
        <div className="text-slate-400 text-sm font-medium mb-1">{data.title}</div>
        <div className="text-3xl font-bold text-white tracking-tight">{data.value}</div>
      </div>
      
      <div className="absolute -inset-e-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
        <data.icon size={100} />
      </div>
    </div>
  </div>
);

// --- MOCK CHARTS ---
// Preserved exact visualizations
const AreaChart = () => (
  <div className="h-full w-full flex flex-col justify-end relative" dir="ltr">
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="blueGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0066FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0066FF" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d="M0,100 L0,60 C20,50 30,80 50,60 C70,40 80,30 100,20 L100,100 Z" fill="url(#blueGradient)" />
      <path d="M0,60 C20,50 30,80 50,60 C70,40 80,30 100,20" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
      <circle cx="50" cy="60" r="3" fill="#fff" stroke="#0066FF" strokeWidth="1.5" className="animate-pulse" />
      <circle cx="100" cy="20" r="3" fill="#fff" stroke="#0066FF" strokeWidth="1.5" />
    </svg>
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
      <div className="border-b border-white w-full h-1/4"></div>
      <div className="border-b border-white w-full h-1/4"></div>
      <div className="border-b border-white w-full h-1/4"></div>
      <div className="w-full h-1/4"></div>
    </div>
  </div>
);

const BarChart = () => {
  const bars = [40, 70, 45, 90, 65, 80, 55];
  return (
    <div className="h-full w-full flex items-end justify-between gap-2 pt-4" dir="ltr">
      {bars.map((height, i) => (
        <div key={i} className="w-full flex flex-col justify-end group">
          <div 
            style={{ height: `${height}%` }} 
            className="w-full bg-slate-800 rounded-t-sm relative transition-all duration-300 group-hover:bg-slate-700 overflow-hidden"
          >
            <div 
              style={{ height: `${height * 0.8}%` }} 
              className="absolute bottom-0 w-full bg-linear-to-t from-[#0044CC] to-[#00AAFF] shadow-[0_0_10px_rgba(0,102,255,0.5)] rounded-t-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// --- MAIN LAYOUT ---
export default function Dashboard() {
  return (
    <div className="h-screen w-full bg-[#050811] text-white flex overflow-hidden font-sans">
      {/* Background Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* --- SIDEBAR --- */}
      {/* Converted border-r to border-e */}
      <aside className="w-72 border-e border-white/5 bg-[#080B14]/80 backdrop-blur-xl flex flex-col z-20">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-blue-500/20 to-blue-900/20 border border-blue-500/30">
              <ShieldAlert className="text-blue-500" size={20} />
              <div className="absolute inset-0 blur-md bg-blue-500/20 rounded-lg" />
            </div>
            <div>
              {/* Maintained English Brand per Enterprise standards, localized subtitle */}
              <h1 className="font-bold text-lg tracking-widest text-white leading-tight" dir="ltr">ORION<span className="text-blue-500">GUARD</span></h1>
              <p className="text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">نظام ذكاء الإنتاجية</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
          <div className="text-xs font-semibold text-slate-600 mb-4 px-4 tracking-wider uppercase">اللوحة الرئيسية</div>
          <SidebarItem icon={LayoutDashboard} label="نظرة عامة" active={true} />
          <SidebarItem icon={Users} label="الموظفون" />
          <SidebarItem icon={MonitorSmartphone} label="الأجهزة" />
          <SidebarItem icon={ActivitySquare} label="التحليلات" />
          
          <div className="text-xs font-semibold text-slate-600 mb-4 mt-8 px-4 tracking-wider uppercase">المراقبة</div>
          <SidebarItem icon={ImageIcon} label="لقطات الشاشة" />
          <SidebarItem icon={Bell} label="التنبيهات" />
          
          <div className="text-xs font-semibold text-slate-600 mb-4 mt-8 px-4 tracking-wider uppercase">النظام</div>
          <SidebarItem icon={Settings} label="الإعدادات" />
        </div>

        <div className="p-4 border-t border-white/5 bg-white/2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold shadow-[0_0_10px_rgba(0,102,255,0.4)]">
              AD
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">بوابة الإدارة</div>
              <div className="text-xs text-slate-400 truncate">عقدة خادم المقر الرئيسي</div>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        
        {/* --- TOP HEADER --- */}
        <header className="h-20 border-b border-white/5 bg-[#080B14]/50 backdrop-blur-md flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-white tracking-wide">نظرة عامة على المؤسسة</h2>
            <div className="h-6 w-px bg-white/10" />
            
            <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
              <Server size={16} className="text-blue-500" />
              <span>شركة جلوبال تك</span>
              {/* Converted ml-1 to ms-1 */}
              <ChevronDown size={14} className="ms-1 text-slate-500" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block group">
              {/* Converted left-3 to start-3 */}
              <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition" size={16} />
              {/* Converted pl-10 pr-4 to ps-10 pe-4 */}
              <input 
                type="text" 
                placeholder="البحث في الكيانات..." 
                className="bg-[#0B101E] border border-white/10 rounded-lg ps-10 pe-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition w-64"
              />
            </div>

            <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
              <Calendar size={16} className="text-slate-400" />
              <span>اليوم، 24 أكتوبر</span>
            </button>

            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition">
              <Bell size={20} />
              {/* Converted right-1.5 to end-1.5 */}
              <span className="absolute top-1.5 inset-e-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#050811]"></span>
              <span className="absolute top-1.5 inset-e-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping opacity-75"></span>
            </button>
          </div>
        </header>

        {/* --- SCROLLABLE DASHBOARD --- */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth no-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {kpiData.map((data, idx) => (
                <KPICard key={idx} data={data} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 rounded-2xl bg-[#0B101E] border border-white/5 p-6 relative overflow-hidden flex flex-col">
                {/* Converted right-0 translate-x-1/2 to end-0 rtl:-translate-x-1/2 */}
                <div className="absolute top-0 inset-e-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 rtl:-translate-x-1/2 ltr:translate-x-1/2 pointer-events-none" />
                <div className="flex justify-between items-center mb-6 z-10">
                  <div>
                    <h3 className="text-lg font-semibold">اتجاه الإنتاجية</h3>
                    <p className="text-sm text-slate-500">منحنى الأداء لـ 7 أيام عبر جميع العقد</p>
                  </div>
                  <div className="flex gap-2" dir="ltr">
                    {['1D', '7D', '1M', 'YTD'].map((t, i) => (
                      <button key={i} className={`text-xs px-3 py-1 rounded-md transition ${i === 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-[160px] relative z-10">
                  <AreaChart />
                </div>
              </div>

              <div className="rounded-2xl bg-linear-to-b from-[#0B101E] to-[#0A0D18] border border-white/5 p-6 flex flex-col relative overflow-hidden">
                {/* Converted -right-10 to -end-10 */}
                <div className="absolute -inset-e-10 -top-10 text-white/5">
                  <BrainCircuit size={150} />
                </div>
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_15px_rgba(0,102,255,0.2)]">
                    <BrainCircuit size={20} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">رؤى أوريون للذكاء الاصطناعي</h3>
                </div>

                <div className="flex-1 flex flex-col gap-4 relative z-10">
                  {insights.map((insight) => (
                    <div key={insight.id} className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition cursor-default">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] shrink-0
                          ${insight.severity === 'warning' ? 'bg-amber-400 text-amber-400' : 
                            insight.severity === 'alert' ? 'bg-rose-400 text-rose-400' : 'bg-emerald-400 text-emerald-400'}`} />
                        <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="mt-6 w-full py-2.5 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition relative z-10">
                  إنشاء تحليل عميق
                </button>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
              
              <div className="rounded-2xl bg-[#0B101E] border border-white/5 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">نشاط القسم</h3>
                  <button className="p-1.5 hover:bg-white/10 rounded-md transition text-slate-400">
                    <Settings size={16} />
                  </button>
                </div>
                <div className="flex-1 min-h-[200px]">
                  <BarChart />
                </div>
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> نشط</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700"></div> خامل</div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0B101E] border border-white/5 p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-6">توزيع فئات التطبيقات</h3>
                <div className="flex-1 flex items-center justify-center relative">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1E293B" strokeWidth="15" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0066FF" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="50" className="hover:opacity-80 transition-opacity cursor-pointer" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366F1" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="180" className="hover:opacity-80 transition-opacity cursor-pointer" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#14B8A6" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="220" className="hover:opacity-80 transition-opacity cursor-pointer" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-white" dir="ltr">3.2k</span>
                    <span className="text-xs text-slate-500">تطبيق مسجل</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div> <span className="text-slate-300" dir="ltr">أدوات التطوير (60%)</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#6366F1]"></div> <span className="text-slate-300" dir="ltr">تواصل (25%)</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#14B8A6]"></div> <span className="text-slate-300" dir="ltr">تصميم (10%)</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#1E293B]"></div> <span className="text-slate-300" dir="ltr">أخرى (5%)</span></div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0B101E] border border-white/5 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">سجل النشاط المباشر</h3>
                  <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                    مباشر
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-0 relative">
                  {/* Converted left-2.5 to start-2.5 */}
                  <div className="absolute inset-s-2.5 top-2 bottom-2 w-px bg-white/10 z-0"></div>
                  
                  {activities.map((act) => (
                    <div key={act.id} className="relative z-10 flex gap-4 p-3 hover:bg-white/2 rounded-lg transition group">
                      <div className="mt-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0B101E] relative z-10
                          ${act.status === 'success' ? 'bg-emerald-500' : 
                            act.status === 'error' ? 'bg-rose-500' : 
                            act.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0B101E]"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{act.user}</span>
                          <span className="text-[10px] text-slate-500">{act.time}</span>
                        </div>
                        <p className="text-xs text-slate-400">{act.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}