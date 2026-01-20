import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const ForgotPassword = () => {
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
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Check if account exists with this email
      toast.loading("Checking account...", { id: "email-check" });
      const emailExists = await checkEmailExists(email);
      toast.dismiss("email-check");

      if (!emailExists) {
        toast.error("No account found with this email address. Please check your email or create a new account.");
        setIsLoading(false);
        return;
      }

      // Send password reset email using Firebase
      toast.loading("Sending reset email...", { id: "sending-reset" });
      const result = await sendPasswordResetEmail(email);
      toast.dismiss("sending-reset");
      
      if (result.success) {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        // Handle specific Firebase errors
        if (result.error?.includes('user-not-found')) {
          toast.error("No account found with this email address. Please check your email or create a new account.");
        } else if (result.error?.includes('too-many-requests')) {
          toast.error("Too many reset attempts. Please wait a few minutes before trying again.");
        } else {
          toast.error(result.error || "Failed to send reset email. Please try again.");
        }
      }

    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset email. Please try again.");
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
          <div className="flex items-center justify-center">
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
          </div>
        </div>
        
        <div className="w-full max-w-md pt-20">
          {/* Success State - iPhone Style */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Check Your Email</h2>
            <p className="text-[#4a6850]/80 font-bold mb-2">
              We've sent password reset instructions to
            </p>
            <p className="text-[#4a6850] font-black">{email}</p>
          </div>

          <div className="space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-[0_25px_70px_rgba(34,197,94,0.3)]">
                <Send className="w-10 h-10 text-white font-bold" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Email Sent!</h3>
              
              <p className="text-[#4a6850]/80 font-bold leading-relaxed">
                Click the link in your email to reset your password.
              </p>

              <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 border border-[#4a6850]/20 rounded-3xl p-6 shadow-lg">
                <p className="text-sm text-[#4a6850] font-bold">
                  <span className="font-black">Don't Forget To</span>
                  <br />
                  Check your spam folder if you don't see it within a few minutes.
                </p>
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="flex-1 h-14 rounded-3xl border-2 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/5 font-black shadow-lg hover:shadow-xl transition-all"
                >
                  Try Different Email
                </Button>
                
                <Button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
                >
                  Back to Login
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
        <div className="flex items-center justify-center">
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
              <p className="text-xs text-[#4a6850]/80 font-bold">Split expenses with ease</p>
            </div>
          </div>
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
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Forgot Password?</h2>
          <p className="text-[#4a6850]/80 font-bold leading-relaxed">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-sm text-blue-800 font-bold">
              💡 <span className="font-black">Note:</span> We can only send reset instructions to registered email addresses.
            </p>
          </div>
        </div>

        {/* Form - iPhone Style */}
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
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
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5" />
                  Send Reset Instructions
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
              Back to Login
            </Link>
          </div>
        </div>

        {/* Help Text - iPhone Style */}
        <div className="mt-10 pt-8 border-t border-[#4a6850]/20 text-center text-sm text-[#4a6850]/80 font-bold">
          <p>Remember your password? <Link to="/login" className="text-[#4a6850] hover:underline font-black">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;