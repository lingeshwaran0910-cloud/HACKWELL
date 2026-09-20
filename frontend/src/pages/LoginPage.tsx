import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, ShieldCheck, Lock, PlusCircle } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, UserProfile } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [operatorId, setOperatorId] = useState<string>('EOC-001');
  const [password, setPassword] = useState<string>('safecity2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedAccount, setSelectedAccount] = useState<UserProfile>(DEMO_ACCOUNTS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectAccount = (acc: UserProfile) => {
    setSelectedAccount(acc);
    setOperatorId(acc.operatorId);
    setPassword('safecity2026');
    setErrorMsg(null);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim()) {
      setErrorMsg('Invalid operator ID or password.');
      return;
    }

    const success = login(operatorId, password);
    if (success) {
      navigate('/');
    } else {
      setErrorMsg('Invalid operator ID or password.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased p-4 sm:p-6 overflow-y-auto select-none">
      
      {/* 1. TOP BRAND & ACTION BAR */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 dark:bg-blue-950/80 border border-blue-500/30 rounded-xl text-blue-600 dark:text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-slate-100">
              SafeCity AI
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Emergency Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Public Report Button */}
          <Link
            to="/report-emergency"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer border border-rose-500/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report an Emergency</span>
            <span className="sm:hidden">Report</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN SPLIT WORKSPACE */}
      <div className="max-w-5xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Operator Candidates Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 text-[10px] font-bold font-mono uppercase tracking-wider rounded">
              SELECT OPERATOR
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Sign in to SafeCity
            </h2>
          </div>

          {/* Candidate Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedAccount.id === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-[#0b1329] hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400">
                        {acc.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          {acc.name}
                        </h3>
                        <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          {acc.operatorId}
                        </span>
                      </div>
                    </div>
                    {isSelected && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="truncate">{acc.role}</span>
                    <span className="font-mono text-slate-400 shrink-0 ml-1">{acc.department}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sign In Form Box (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-mono mb-1">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>AUTHENTICATION</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sign In</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter credentials for <strong className="text-slate-900 dark:text-slate-100">{selectedAccount.name}</strong>
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4 text-xs font-sans">
            <div className="space-y-1.5">
              <label htmlFor="operatorId" className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Operator ID or Email
              </label>
              <input
                id="operatorId"
                type="text"
                value={operatorId}
                onChange={(e) => {
                  setOperatorId(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. EOC-001 or Lingeshwaran"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Password"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Small Inline Error State */}
            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-0.5">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              <span>Sign In as {selectedAccount.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Secondary Public Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              to="/report-emergency"
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Report an emergency</span>
              <span>→</span>
            </Link>
          </div>
        </div>

      </div>

      {/* 3. SMALL FOOTER */}
      <footer className="max-w-5xl w-full mx-auto pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
        <div>SafeCity AI Emergency Operations</div>
        <div>Secure Operations</div>
      </footer>

    </div>
  );
};

export default LoginPage;
