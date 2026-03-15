import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseDataProvider, useFirebaseData } from "@/contexts/FirebaseDataContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmailVerificationGate from "@/components/EmailVerificationGate";
import TwoFactorVerification from "@/components/TwoFactorVerification";
import ScrollToTop from "@/components/ScrollToTop";
import { OfflineScreen } from "@/components/OfflineScreen";
import { UpdateNotification } from "@/components/UpdateNotification";
import { useTranslation } from "react-i18next";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import AdminRoute from "@/components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import BroadcastBanner from "@/components/BroadcastBanner";


// Full-page banned screen - matches app theme
const BannedScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

      <div
        className="w-full max-w-md backdrop-blur-xl bg-white/5 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative z-10"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="text-center">
          {/* Circular restricted icon with glow */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-500">Security Restriction</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Access Suspended</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-[280px] mx-auto">
            Your account access is currently restricted. If you believe this is a mistake, please reach out to our team.
          </p>
        </div>

        {/* Feature info strip */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 mb-8">
            <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs font-semibold text-white mb-1">Appeal your status</p>
                    <p className="text-[11px] text-zinc-500 leading-normal">Our support team reviews appeals within 24 hours to ensure account safety.</p>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@aarx.online"
            className="group relative w-full overflow-hidden rounded-2xl bg-teal-500 py-3.5 text-center text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10">Contact Support</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </a>

          <button
            onClick={onLogout}
            className="w-full py-3.5 rounded-2xl text-sm font-medium text-zinc-400 bg-transparent border border-white/5 hover:bg-white/5 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>

      <p className="absolute bottom-8 text-[10px] text-zinc-600 font-medium tracking-widest uppercase">Hostel Ledger Security</p>
    </div>
  );
};


// Direct imports for better reliability in production
import Index from "./pages/Index";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import GroupDetail from "./pages/GroupDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RecoverAccount from "./pages/RecoverAccount";
import Profile from "./pages/Profile";
import Budget from "./pages/Budget";
import PersonalSpace from "./pages/PersonalSpace";
import Activity from "./pages/Activity";
import DownloadApp from "./pages/DownloadApp";
import InstallApp from "./pages/InstallApp";
import InstallGuide from "./pages/InstallGuide";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import GroupTerms from "./pages/GroupTerms";
import GroupPrivacy from "./pages/GroupPrivacy";
import ToReceive from "./pages/ToReceive";
import ToPay from "./pages/ToPay";
import Notifications from "./pages/Notifications";
import Security from "./pages/Security";
import JoinGroup from "./pages/JoinGroup";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ReceiptPage from "./pages/ReceiptPage";
import VerificationPage from "./pages/VerificationPage";
import Support from "./pages/Support";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    },
  },
});

// iPhone-style Loading Screen Component with Offline Detection
const SplashScreen = ({ offline = false }: { offline?: boolean }) => {
  const { t } = useTranslation();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Show message faster when offline (300ms), slower when online (1000ms)
    const delay = offline ? 300 : 1000;
    const timer = setTimeout(() => setShowMessage(true), delay);
    return () => clearTimeout(timer);
  }, [offline]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

      <div className="flex flex-col items-center">
        {/* App Logo with iPhone-style design */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-[0_25px_70px_rgba(74,104,80,0.3)] mb-8 border-t-2 border-[#5a7860]/40">
          <img
            src="/only-logo.png"
            alt="Hostel Ledger"
            className="w-12 h-12 object-contain filter brightness-0 invert"
            onError={(e) => {
              // Fallback if image fails to load offline
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* App Name */}
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Hostel Ledger</h1>
        <p className="text-[#4a6850]/80 font-bold mb-8">{t('sidebar.motto')}</p>

        {/* Loading Animation or Offline Message */}
        {offline && showMessage ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">{t('dashboard.offline_queue')}</p>
            <p className="text-xs text-gray-500">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
            {showMessage && <p className="text-xs text-gray-500">{t('common.loading')}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route wrapper with mobile-first loading and email verification
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, is2FAVerified, logout } = useFirebaseAuth();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { setOffline(false); };
    const handleOffline = () => { setOffline(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show loading screen with offline indicator
  if (isLoading) {
    return <SplashScreen offline={offline} />;
  }

  // If no user, check if we should redirect or show offline screen
  if (!user) {
    // If offline, check for cached user before showing offline screen
    if (offline) {
      try {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          console.log('⚠️ Cached user exists but not loaded in context yet');
          return <SplashScreen offline={true} />;
        } else {
          console.log('❌ No cached user found - showing offline screen');
          return <OfflineScreen onRetry={() => window.location.reload()} />;
        }
      } catch (error) {
        console.error('Failed to check cached user:', error);
      }
    }

    // No user and online - redirect to login
    return <Navigate to="/login" replace />;
  }

  // 🚨 Banned user check — show ban screen before anything else
  if (user.accountStatus === 'banned') {
    return <BannedScreen onLogout={logout} />;
  }

  // User is loaded - check 2FA first
  if (user.is2FAEnabled && !is2FAVerified) {
    return <TwoFactorVerification />;
  }

  // Then check email verification
  return (
    <EmailVerificationGate>
      {children}
    </EmailVerificationGate>
  );
};

// Public Route wrapper with mobile-first loading
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useFirebaseAuth();
  const { maintenanceMode } = useFirebaseData();

  if (maintenanceMode && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <BroadcastBanner />
  <Routes>
    {/* Verification Routes */}
    <Route path="/verify-sheets" element={<VerificationPage />} />
    <Route path="/verify-2fa" element={<TwoFactorVerification />} />

    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/recover-account" element={<PublicRoute><RecoverAccount /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/download-app" element={<ProtectedRoute><DownloadApp /></ProtectedRoute>} />
    <Route path="/install-app" element={<InstallApp />} />
    <Route path="/install-guide" element={<InstallGuide />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/secure-admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    <Route path="/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
    <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
    <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
    <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
    <Route path="/to-receive" element={<ProtectedRoute><ToReceive /></ProtectedRoute>} />
    <Route path="/to-pay" element={<ProtectedRoute><ToPay /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
    <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-of-service" element={<TermsOfService />} />
    <Route path="/group-terms" element={<GroupTerms />} />
    <Route path="/group-privacy" element={<GroupPrivacy />} />
    <Route path="/join/:id" element={<JoinGroup />} />
    <Route path="/personal-space" element={<ProtectedRoute><PersonalSpace /></ProtectedRoute>} />
    <Route path="/receipt" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    <Route path="/support-admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        <Route path="*" element={<NotFound />} />
  </Routes>
    </>
  );
};

const App = () => {
  useEffect(() => {
    // Request persistent storage to prevent data eviction
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(isPersisted => {
        console.log(`Persistent storage granted: ${isPersisted}`);
      });
    }
  }, []);

  return (
  <ErrorBoundary>
    <div className="min-h-screen bg-background">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner
            position="top-center"
            expand={false}
            richColors
            toastOptions={{
              style: {
                background: 'white',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              className: 'sonner-toast',
            }}
          />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <SidebarProvider>
              <FirebaseAuthProvider>
                <CurrencyProvider>
                  <FirebaseDataProvider>
                    <AppRoutes />
                    {/* Global Indicators */}
                    <UpdateNotification />
                  </FirebaseDataProvider>
                </CurrencyProvider>
              </FirebaseAuthProvider>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
  );
};

export default App;
