import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { validatePasswordStrength } from "@/lib/validation";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirmPasswordReset } = useFirebaseAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], isStrong: false });

  // Verify Firebase reset code on component mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode !== 'resetPassword' || !oobCode) {
      toast.error(t('auth.invalid_link'));
      navigate("/forgot-password");
      return;
    }

    setIsValidToken(true);
    setResetCode(oobCode);
  }, [searchParams, navigate]);

  // Update password strength in real-time
  useEffect(() => {
    if (password) {
      const strength = validatePasswordStrength(password);
      setPasswordStrength(strength);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error(t('common.error'), { description: "Please fill in all fields" });
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.passwords_dont_match'));
      return;
    }

    if (!passwordStrength.isStrong) {
      toast.error("Please choose a stronger password");
      return;
    }

    setIsLoading(true);

    try {
      // Use Firebase's confirmPasswordReset with the reset code
      const result = await confirmPasswordReset(resetCode, password);

      if (result.success) {
        toast.success(t('auth.reset_success'));
        navigate("/login");
      } else {
        toast.error(result.error || t('common.error'));
      }

    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return "text-red-500";
    if (score <= 4) return "text-yellow-500";
    return "text-green-500";
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return t('common.weak');
    if (score <= 4) return t('common.medium');
    return t('common.strong');
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Form - iPhone Style */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{t('auth.reset_password')}</h2>
            <p className="text-[#4a6850]/80 font-bold">{t('auth.set_password_subtitle')}</p>
          </div>

          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">{t('auth.new_password')}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-14 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="new-password"
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

            {/* Password Strength Indicator - iPhone Style */}
            {password && (
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.score <= 2 ? 'bg-red-500' :
                        passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-[#4a6850]'
                        }`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-black ${getPasswordStrengthColor(passwordStrength.score)}`}>
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">{t('auth.confirm_new_password')}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 pl-14 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4a6850]/60 hover:text-[#4a6850] transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>

            {/* Password Match Indicator - iPhone Style */}
            {confirmPassword && (
              <div className="mt-3 flex items-center gap-3">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#4a6850]" />
                    <span className="text-xs text-[#4a6850] font-black">{t('auth.passwords_match')}</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-red-500" />
                    <span className="text-xs text-red-600 font-black">{t('auth.passwords_dont_match')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !passwordStrength.isStrong || password !== confirmPassword}
            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
          >
            {isLoading ? t('auth.resetting_password') : t('auth.reset_password')}
          </Button>
        </form>

        {/* Back to login link - iPhone Style */}
        <p className="mt-8 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          {t('auth.already_have_account')}{" "}
          <Link to="/login" className="text-[#4a6850] font-black hover:underline transition-all">
            {t('auth.back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;