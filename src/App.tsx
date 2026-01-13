import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseDataProvider } from "@/contexts/FirebaseDataContext";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route wrapper with mobile-first loading
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center mobile-padding relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-teal-200/30 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 text-center shadow-2xl border border-white/50 relative z-10 max-w-md w-full">
          {/* Logo and Brand */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Hostel Ledger
            </h1>
            <p className="text-gray-600 text-sm">Smart expense sharing for students</p>
          </div>

          {/* Innovative Loading Animation */}
          <div className="mb-8">
            {/* Money flow animation */}
            <div className="relative h-16 mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '1.5s'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              
              {/* Floating money icons */}
              <div className="absolute top-0 left-1/4 animate-bounce delay-300">
                <span className="text-2xl">💰</span>
              </div>
              <div className="absolute top-0 right-1/4 animate-bounce delay-700">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="absolute bottom-0 left-1/3 animate-bounce delay-1000">
                <span className="text-2xl">👥</span>
              </div>
            </div>

            {/* Progress bar with gradient */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 rounded-full animate-pulse"></div>
            </div>

            {/* Loading text with typewriter effect */}
            <div className="text-gray-700 font-medium">
              <span className="inline-block animate-pulse">Preparing your financial dashboard</span>
              <span className="animate-ping ml-1">...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route wrapper with mobile-first loading
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center mobile-padding relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-teal-200/30 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 text-center shadow-2xl border border-white/50 relative z-10 max-w-md w-full">
          {/* Logo and Brand */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Hostel Ledger
            </h1>
            <p className="text-gray-600 text-sm">Welcome back! Getting things ready...</p>
          </div>

          {/* Innovative Loading Animation */}
          <div className="mb-8">
            {/* Money flow animation */}
            <div className="relative h-16 mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '1.5s'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              
              {/* Floating icons */}
              <div className="absolute top-0 left-1/4 animate-bounce delay-300">
                <span className="text-2xl">🔐</span>
              </div>
              <div className="absolute top-0 right-1/4 animate-bounce delay-700">
                <span className="text-2xl">✨</span>
              </div>
              <div className="absolute bottom-0 left-1/3 animate-bounce delay-1000">
                <span className="text-2xl">🚀</span>
              </div>
            </div>

            {/* Progress bar with gradient */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 rounded-full animate-pulse"></div>
            </div>

            {/* Loading text with typewriter effect */}
            <div className="text-gray-700 font-medium">
              <span className="inline-block animate-pulse">Initializing your session</span>
              <span className="animate-ping ml-1">...</span>
            </div>
          </div>
        </div>
      </div>
    );
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
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
    <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
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
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
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
