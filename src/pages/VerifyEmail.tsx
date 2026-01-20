import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { verifyVerificationCode, resendVerificationCode, getVerificationTimeRemaining } from "@/lib/verificationStore";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { markEmailAsVerified, firebaseUser, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPageGuide, setShowPageGuide] = useState(false);
  
  const email = location.state?.email || "";
  const type = location.state?.type || "signup";

  useEffect(() => {
    if (shouldShowPageGuide('verify-email')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('verify-email');
  };

  // Update countdown timer and prevent back navigation
  useEffect(() => {
    if (!email) {
      navigate("/signup");
      return;
    }

    // Prevent back navigation during verification
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      toast.error("Please complete email verification first");
      window.history.pushState(null, '', window.location.pathname);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    const updateTimer = async () => {
      const remaining = await getVerificationTimeRemaining(email);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [email, navigate]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify the code using Firestore
      const result = await verifyVerificationCode(email, code);
      
      if (!result.success) {
        toast.error(result.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // If verification successful and it's signup, mark email as verified
      if (type === 'signup') {
        if (!firebaseUser) {
          toast.error("User session not found. Please try signing up again.");
          navigate("/signup");
          return;
        }

        // Mark email as verified in our database
        const verificationResult = await markEmailAsVerified(firebaseUser.uid);
        
        if (verificationResult.success) {
          // Send welcome email
          try {
            const pendingSignup = sessionStorage.getItem('pendingSignup');
            const userName = pendingSignup 
              ? `${JSON.parse(pendingSignup).firstName} ${JSON.parse(pendingSignup).lastName}`
              : firebaseUser.displayName || "User";
            
            await sendWelcomeEmail(email, userName);
            console.log('✅ Welcome email sent successfully');
          } catch (emailError) {
            console.warn('⚠️ Welcome email failed (non-critical):', emailError);
            // Don't block the flow if welcome email fails
          }
          
          // Clean up session storage
          sessionStorage.removeItem('pendingSignup');
          toast.success("Email verified successfully! Welcome to Hostel Ledger!");
          navigate("/download-app");
        } else {
          console.error('❌ Failed to mark email as verified:', verificationResult.error);
          toast.error("Failed to complete verification. Please try again.");
        }
      } else {
        // Handle other verification types (password reset, etc.)
        toast.success("Email verified successfully!");
        navigate("/reset-password", { state: { email, verified: true } });
      }

    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeRemaining > 0) {
      toast.error(`Please wait ${formatTime(timeRemaining)} before requesting a new code`);
      return;
    }

    setIsResending(true);

    try {
      // Generate new code using Firestore
      const newCode = await resendVerificationCode(email);
      if (!newCode) {
        toast.error("Unable to resend code. Please try signing up again.");
        navigate("/signup");
        return;
      }

      // Get user name for email
      const pendingSignup = sessionStorage.getItem('pendingSignup');
      const userName = pendingSignup 
        ? `${JSON.parse(pendingSignup).firstName} ${JSON.parse(pendingSignup).lastName}`
        : "User";

      // Send new verification email
      const emailResult = await sendVerificationEmail(email, newCode, userName);
      
      if (emailResult.success) {
        toast.success("New verification code sent to your email!");
      } else {
        toast.error("Failed to send verification email. Please try again.");
      }

    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6) {
      // Small delay to show the complete code before verifying
      setTimeout(() => {
        handleVerifyWithCode(value);
      }, 300);
    }
  };

  const handleVerifyWithCode = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify the code using Firestore
      const result = await verifyVerificationCode(email, codeToVerify);
      
      if (!result.success) {
        toast.error(result.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // If verification successful and it's signup, mark email as verified
      if (type === 'signup') {
        if (!firebaseUser) {
          toast.error("User session not found. Please try signing up again.");
          navigate("/signup");
          return;
        }

        // Mark email as verified in our database
        const verificationResult = await markEmailAsVerified(firebaseUser.uid);
        
        if (verificationResult.success) {
          // Send welcome email
          try {
            const pendingSignup = sessionStorage.getItem('pendingSignup');
            const userName = pendingSignup 
              ? `${JSON.parse(pendingSignup).firstName} ${JSON.parse(pendingSignup).lastName}`
              : firebaseUser.displayName || "User";
            
            await sendWelcomeEmail(email, userName);
            console.log('✅ Welcome email sent successfully');
          } catch (emailError) {
            console.warn('⚠️ Welcome email failed (non-critical):', emailError);
            // Don't block the flow if welcome email fails
          }
          
          // Clean up session storage
          sessionStorage.removeItem('pendingSignup');
          toast.success("Email verified successfully! Welcome to Hostel Ledger!");
          navigate("/download-app");
        } else {
          console.error('❌ Failed to mark email as verified:', verificationResult.error);
          toast.error("Failed to complete verification. Please try again.");
        }
      } else {
        // Handle other verification types (password reset, etc.)
        toast.success("Email verified successfully!");
        navigate("/reset-password", { state: { email, verified: true } });
      }

    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Top Accent Border - iPhone Style */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>
      
      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-[#4a6850]/10 pt-4 pb-5 px-4 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
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
        title="Verify Your Email 📧"
        description="Check your email for a 6-digit verification code to complete your account setup."
        tips={[
          "Enter the 6-digit code sent to your email address",
          "Check your spam folder if you don't see the email",
          "The code expires in 10 minutes for security"
        ]}
        emoji="🔐"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      <div className="w-full max-w-md pt-20">
        {/* Header - iPhone Style */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Verify Your Email</h2>
          <p className="text-[#4a6850]/80 font-bold mb-2">
            Enter the 6-digit code sent to your email
          </p>
          <p className="text-[#4a6850] font-black">{email}</p>
        </div>

        {/* Form - iPhone Style */}
        <div className="space-y-8">
          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">
              Verification Code
            </label>
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerifyWithCode(code)}
              className="h-16 text-center text-3xl font-mono tracking-widest rounded-3xl border-[#4a6850]/20 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="text-sm text-[#4a6850]/80 mt-3 text-center font-bold">
              Enter the 6-digit code from your email
            </p>
          </div>

          <Button
            onClick={() => handleVerifyWithCode(code)}
            disabled={isLoading || code.length !== 6}
            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                Verify Email
              </div>
            )}
          </Button>

          {/* Resend Section - iPhone Style */}
          <div className="text-center pt-6 border-t border-[#4a6850]/20">
            <p className="text-[#4a6850]/80 mb-6 font-bold">Didn't receive the code?</p>
            
            {timeRemaining > 0 ? (
              <p className="text-sm text-[#4a6850]/80 font-bold">
                Resend available in {formatTime(timeRemaining)}
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="w-full h-14 rounded-3xl border-2 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/5 font-black shadow-lg hover:shadow-xl transition-all"
              >
                {isResending ? (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5" />
                    Resend Code
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Help Text - iPhone Style */}
        <div className="mt-10 pt-8 border-t border-[#4a6850]/20 text-center text-sm text-[#4a6850]/80 font-bold">
          <p>Check your spam folder if you don't see the email</p>
          <p className="mt-2">The code expires in 10 minutes</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
