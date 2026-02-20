import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sendPasswordResetEmail, checkEmailExists, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('forgot-password')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('forgot-password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error(t('common.error'), { description: "Please enter your email address" });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t('common.error'), { description: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);

    try {
      // First check if user exists (Explicit check as requested)
      const exists = await checkEmailExists(email);

      if (!exists) {
        toast.error("No account found with this email address.");
        setIsLoading(false);
        return;
      }

      // If exists, proceed to send reset email
      toast.loading("Sending reset email...", { id: "sending-reset" });
      const result = await sendPasswordResetEmail(email);
      toast.dismiss("sending-reset");

      if (result.success) {
        setEmailSent(true);
        toast.success(t('auth.reset_instructions_sent'), { description: "Password reset email sent! Check your inbox." });
      } else {
        // Handle specific Firebase errors
        if (result.error?.includes('user-not-found') || result.error === "No account found with this email address") {
          // Since checkEmailExists returned true, but Firebase Auth says user not found,
          // it must be an INVITED user (exists in DB but not Auth)
          toast.error("This email is linked to an INVITED account. Please Sign Up to set your password.");
        } else if (result.error?.includes('too-many-requests')) {
          toast.error("Too many reset attempts. Please wait a few minutes before trying again.");
        } else {
          toast.error(result.error || "Failed to send reset email. Please try again.");
        }
      }

    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(t('common.error'), { description: "Failed to send reset email. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        {/* Top Accent Border - iPhone Style */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

        {/* App Header - iPhone Style Enhanced with #4a6850 */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <div className="w-10" />
            {/* App Logo and Name - Enhanced */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
                <img
                  src="/only-logo.png"
                  alt="Hostel Ledger"
                  className="w-6 h-6 object-contain filter brightness-0 invert"
                />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
            </div>
            <LanguageSelector />
          </div>
        </div>

        <div className="w-full max-w-md pt-20">
          {/* Success State - iPhone Style */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{t('auth.reset_instructions_sent')}</h2>
            <p className="text-[#4a6850]/80 font-bold mb-2">
              {t('auth.reset_email_body')}
            </p>
            <p className="text-[#4a6850] font-black">{email}</p>
          </div>

          <div className="space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-[0_25px_70px_rgba(34,197,94,0.3)]">
                <Send className="w-10 h-10 text-white font-bold" />
              </div>

              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('auth.email_sent_title')}</h3>

              <p className="text-[#4a6850]/80 font-bold leading-relaxed">
                {t('auth.reset_link_help')}
              </p>

              <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 border border-[#4a6850]/20 rounded-3xl p-6 shadow-lg">
                <p className="text-sm text-[#4a6850] font-bold">
                  {t('auth.check_spam_instructions')}
                </p>
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="flex-1 h-14 rounded-3xl border-2 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/5 font-black shadow-lg hover:shadow-xl transition-all"
                >
                  {t('auth.try_different_email')}
                </Button>

                <Button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
                >
                  {t('auth.back_to_login')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Top Accent Border - iPhone Style */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="w-10" />
          {/* App Logo and Name - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-6 h-6 object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
              <p className="text-xs text-[#4a6850]/80 font-bold">{t('sidebar.motto')}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Page Guide */}
      <PageGuide
        title="Reset Your Password 🔑"
        description="Enter your email address and we'll send you instructions to reset your password."
        tips={[
          "Make sure to enter the email address you used to create your account",
          "Check your spam folder if you don't see the reset email",
          "The reset link will expire after 24 hours for security"
        ]}
        emoji="📧"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      <div className="w-full max-w-md pt-20">
        {/* Header - iPhone Style */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{t('auth.forgot_password_title')}</h2>
          <p className="text-[#4a6850]/80 font-bold leading-relaxed">
            {t('auth.forgot_password_subtitle')}
          </p>
        </div>


        {/* Form - iPhone Style */}
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  type="email"
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 pl-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5" />
                  {t('auth.send_reset_link')}
                </div>
              )}
            </Button>
          </form>

          {/* Back to Login - iPhone Style */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-3 text-[#4a6850]/80 hover:text-[#4a6850] transition-colors font-bold"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('auth.back_to_login')}
            </Link>
          </div>
        </div>

        {/* Help Text - iPhone Style */}
        <div className="mt-10 pt-8 border-t border-[#4a6850]/20 text-center text-sm text-[#4a6850]/80 font-bold">
          <p>{t('auth.already_have_account')} <Link to="/login" className="text-[#4a6850] hover:underline font-black">{t('auth.back_to_login')}</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;