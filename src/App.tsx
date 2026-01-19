import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseDataProvider } from "@/contexts/FirebaseDataContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmailVerificationGate from "@/components/EmailVerificationGate";
import ScrollToTop from "@/components/ScrollToTop";
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

const queryClient = new QueryClient();

// Reusable Splash Screen Component
const SplashScreen = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      <div className="flex flex-col items-center">
        
        {/* LOGO - SVG for crisp display */}
        <img
          src="/only-logo.png"
          alt="Hostel Ledger"
          style={{ 
            width: 120, 
            height: 120,
            filter: "drop-shadow(0 4px 12px rgba(16, 185, 129, 0.15))",
            animation: "logoFadeIn 0.8s ease-out, logoFloat 3s ease-in-out infinite"
          }}
        />
        
        {/* TITLE - More refined and subtle */}
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#047857",
            textAlign: "center",
          }}
        >
          Hostel Ledger
        </div>
        
        {/* LOADER - More subtle and refined */}
        <div
          style={{
            marginTop: 32,
            width: 32,
            height: 32,
            position: "relative",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                width: 3,
                height: 3,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 45}deg) translateY(-12px)`,
                animation: "fade 1.2s linear infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        
        <style>{`
          @keyframes fade {
            0% { opacity: 1; }
            100% { opacity: 0.2; }
          }
          
          @keyframes logoFadeIn {
            0% { 
              opacity: 0;
              transform: scale(0.9) translateY(10px);
            }
            100% { 
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          @keyframes logoFloat {
            0%, 100% { 
              transform: translateY(0px);
            }
            50% { 
              transform: translateY(-8px);
            }
          }
        `}</style>
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
            <FirebaseAuthProvider>
              <FirebaseDataProvider>
                <AppRoutes />
              </FirebaseDataProvider>
            </FirebaseAuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
