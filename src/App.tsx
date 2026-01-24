import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseDataProvider } from "@/contexts/FirebaseDataContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmailVerificationGate from "@/components/EmailVerificationGate";
import ScrollToTop from "@/components/ScrollToTop";
import { OfflineScreen } from "@/components/OfflineScreen";

// Direct imports for better reliability in production
import Index from "./pages/Index";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Budget from "./pages/Budget";
import Activity from "./pages/Activity";
import DownloadApp from "./pages/DownloadApp";
import InstallApp from "./pages/InstallApp";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ToReceive from "./pages/ToReceive";
import ToPay from "./pages/ToPay";
import Notifications from "./pages/Notifications";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";

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
        <p className="text-[#4a6850]/80 font-bold mb-8">Split expenses with ease</p>
        
        {/* Loading Animation or Offline Message */}
        {offline && showMessage ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">Loading offline data...</p>
            <p className="text-xs text-gray-500">Just a moment</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
            {showMessage && <p className="text-xs text-gray-500">Loading...</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route wrapper with mobile-first loading and email verification
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFirebaseAuth();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showOfflineScreen, setShowOfflineScreen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      setShowOfflineScreen(false);
    };
    const handleOffline = () => {
      setOffline(true);
    };

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

  // If no user and offline, check localStorage for cached user
  if (!user) {
    // Don't redirect to login if offline - user might have cached data
    if (offline) {
      try {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          // User has cached data, let them through
          console.log('✅ Allowing access with cached user data (offline mode)');
          return <>{children}</>;
        } else {
          // No cached user - show offline screen
          setShowOfflineScreen(true);
          return <OfflineScreen onRetry={() => window.location.reload()} />;
        }
      } catch (error) {
        console.error('Failed to check cached user:', error);
      }
    }
    
    // No user and either online or no cached data - redirect to login
    return <Navigate to="/login" replace />;
  }

  // Show offline screen if offline and no cached data
  if (offline && showOfflineScreen) {
    return <OfflineScreen onRetry={() => window.location.reload()} />;
  }

  // Wrap with EmailVerificationGate to ensure email is verified
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

const AppRoutes = () => (
  <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/download-app" element={<ProtectedRoute><DownloadApp /></ProtectedRoute>} />
      <Route path="/install-app" element={<InstallApp />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/to-receive" element={<ProtectedRoute><ToReceive /></ProtectedRoute>} />
      <Route path="/to-pay" element={<ProtectedRoute><ToPay /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
);

const App = () => (
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
              <FirebaseDataProvider>
                <AppRoutes />
              </FirebaseDataProvider>
            </FirebaseAuthProvider>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
