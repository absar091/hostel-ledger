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
import { lazy, Suspense } from "react";

// Lazy load all page components for better performance
const Index = lazy(() => import("./pages/Index"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Budget = lazy(() => import("./pages/Budget"));
const Activity = lazy(() => import("./pages/Activity"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ToReceive = lazy(() => import("./pages/ToReceive"));
const ToPay = lazy(() => import("./pages/ToPay"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Lightweight loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-sm text-gray-600">Loading...</div>
    </div>
  </div>
);

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
        
        {/* INSPIRATIONAL QUOTE - Elegant and motivational */}
        <div
          style={{
            marginTop: 48,
            maxWidth: 320,
            textAlign: "center",
            padding: "0 20px",
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontStyle: "italic",
              color: "#6b7280",
              lineHeight: 1.6,
              fontWeight: 500,
              animation: "quoteSlideUp 1s ease-out 0.5s both",
            }}
          >
            "Every penny saved is a penny earned. Track smart, spend wise! 💡"
          </p>
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
          
          @keyframes quoteSlideUp {
            0% { 
              opacity: 0;
              transform: translateY(20px);
            }
            100% { 
              opacity: 1;
              transform: translateY(0);
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
  <Suspense fallback={<PageLoader />}>
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
  </Suspense>
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
