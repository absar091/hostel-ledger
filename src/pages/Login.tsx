import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Wallet } from "lucide-react";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('login')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Welcome back!");
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Accent Border - iPhone Style */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="bg-white border-b border-[#4a6850]/10 pt-4 pb-5 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="flex items-center justify-center">
          {/* App Logo and Name - Enhanced */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-7 h-7 object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
              <p className="text-sm text-[#4a6850]/80 font-bold">Split expenses with ease</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Guide */}
      <PageGuide
        title="Welcome Back! 👋"
        description="Sign in to access your expense tracking dashboard and manage your shared finances."
        tips={[
          "Use your registered email and password to sign in",
          "Forgot your password? Use the reset link below the form",
          "New to Hostel Ledger? Create an account to get started"
        ]}
        emoji="🔐"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Page Description */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Welcome Back</h2>
          <p className="text-[#4a6850]/80 font-bold text-lg">Login as user to access your dashboard</p>
        </div>

        {/* Form - iPhone Style */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-slide-up">
          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-14 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4a6850]/60 hover:text-[#4a6850] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Sign up link - iPhone Style */}
        <p className="mt-8 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#4a6850] font-black hover:underline transition-all">
            Sign up
          </Link>
        </p>

        {/* Forgot password link - iPhone Style */}
        <p className="mt-4 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          <Link to="/forgot-password" className="text-[#4a6850] font-black hover:underline transition-all">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
