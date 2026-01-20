import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseDataProvider } from "@/contexts/FirebaseDataContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmailVerificationGate from "@/components/EmailVerificationGate";
import ScrollToTop from "@/components/ScrollToTop";

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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    },
  },
});

// iPhone-style Loading Screen Component
const SplashScreen = () => {
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
          />
        </div>
        
        {/* App Name */}
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Hostel Ledger</h1>
        <p className="text-[#4a6850]/80 font-bold mb-8">Split expenses with ease</p>
        
        {/* Loading Animation */}
        <div className="w-8 h-8 border-2 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

// Protected Route wrapper with mobile-first loading and email verification
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
