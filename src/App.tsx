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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Reusable Splash Screen Component
const SplashScreen = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-400 via-teal-300 to-green-300">
      <div className="flex flex-col items-center">
        
        {/* LOGO - SVG for crisp display */}
        <img
          src="/only-logo.png"
          alt="Hostel Ledger"
          style={{ 
            width: 200, 
            height: 200,
            mixBlendMode: "multiply",
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.1))",
            animation: "logoFadeIn 1s ease-out, logoPulse 2s ease-in-out infinite"
          }}
        />
        
        {/* TITLE - More  Closer to logo, slightly smaller for balance */}
        <div
          style={{
            marginTop: 0,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "1px",
            color: "#ffffffd4",
            textAlign: "center",
          }}
        >
          Hostel Ledger
        </div>
        
        {/* LOADER */}
        <div
          style={{
            marginTop: 40,
            width: 35,
            height: 35,
            position: "relative",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.9)",
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 45}deg) translateY(-12px)`,
                animation: "fade 1s linear infinite",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
        
        <style>{`
          @keyframes fade {
            0% { opacity: 1; }
            100% { opacity: 0.15; }
          }
          
          @keyframes logoFadeIn {
            0% { 
              opacity: 0;
              transform: scale(0.8);
            }
            100% { 
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes logoPulse {
            0%, 100% { 
              transform: scale(1);
            }
            50% { 
              transform: scale(1.05);
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
