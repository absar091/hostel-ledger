import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { verifyVerificationCode, resendVerificationCode, getVerificationTimeRemaining } from "@/lib/verificationStore";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { markEmailAsVerified, firebaseUser } = useFirebaseAuth();
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const email = location.state?.email || "";
  const type = location.state?.type || "signup";

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/only-logo.png" 
            alt="Hostel Ledger Logo" 
            className="w-32 h-32 mx-auto object-contain opacity-90 mb-4"
            loading="eager"
            fetchpriority="high"
            width="128"
            height="128"
          />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-emerald-600 font-medium mt-1">{email}</p>
        </div>

        {/* Form - Direct on page like signup */}
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Verification Code
            </label>
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerifyWithCode(code)}
              className="h-14 text-center text-2xl font-mono tracking-widest bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          <Button
            onClick={() => handleVerifyWithCode(code)}
            disabled={isLoading || code.length !== 6}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Verify Email
              </div>
            )}
          </Button>

          {/* Resend Section */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 mb-4">Didn't receive the code?</p>
            
            {timeRemaining > 0 ? (
              <p className="text-sm text-gray-500">
                Resend available in {formatTime(timeRemaining)}
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="w-full h-12 border-2 hover:border-emerald-500 transition-all duration-300"
              >
                {isResending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Resend Code
                  </div>
                )}
              </Button>
            )}
          </div>

          {/* Back Link - Removed to prevent skipping verification */}
          {/* Users must verify their email to continue */}
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Check your spam folder if you don't see the email</p>
          <p className="mt-1">The code expires in 10 minutes</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
