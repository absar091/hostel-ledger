import { AuthHelp } from "@/components/AuthHelp";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
      toast.error(t('common.error'), { description: "Please fill in all fields" });
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    // On success, we keep loading state true for smooth redirection UX
    // On error, we turn it off

    if (result.success) {
      toast.success(t('common.success'), { description: "Welcome back!" });
      navigate("/", { replace: true });
    } else {
      setIsLoading(false);
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
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
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{t('auth.login_title')}</h2>
          <p className="text-[#4a6850]/80 font-bold text-lg">{t('dashboard.welcome_back')}</p>
        </div>

        {/* Form - iPhone Style */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-slide-up">
          <div>
            <label htmlFor="email" className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-14 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4a6850]/60 hover:text-[#4a6850] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {user ? t('common.loading') : t('common.loading')}
              </>
            ) : (
              t('auth.login_btn')
            )}
          </Button>
        </form>

        {/* Sign up link - iPhone Style */}
        <p className="mt-8 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          {t('auth.no_account')}{" "}
          <Link to="/signup" className="text-[#4a6850] font-black hover:underline transition-all">
            {t('auth.signup')}
          </Link>
        </p>

        {/* Forgot password link - iPhone Style */}
        <p className="mt-4 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          <Link to="/forgot-password" className="text-[#4a6850] font-black hover:underline transition-all">
            {t('auth.forgot_password')}
          </Link>
        </p>

        {/* System Status Link - NEW */}
        <div className="mt-6 text-center">
            <a 
                href="https://status.hostelledger.aarx.online" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#4a6850]/5 text-[#4a6850] font-black hover:bg-[#4a6850]/10 transition-all text-sm"
            >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                System Status
            </a>
        </div>

        <div className="mt-8"><AuthHelp /></div>
      </div>
    </div>
  );
};

export default Login;
