import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { verifyVerificationCode, resendVerificationCode, getVerificationTimeRemaining } from "@/lib/verificationStore";
import { sendVerificationEmail } from "@/lib/email";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useFirebaseAuth();
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const email = location.state?.email || "";
  const type = location.state?.type || "signup";

  // Update countdown timer
  useEffect(() => {
    if (!email) {
      navigate("/signup");
      return;
    }

    const updateTimer = () => {
      const remaining = getVerificationTimeRemaining(email);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [email, navigate]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify the code
      const result = verifyVerificationCode(email, code);
      
      if (!result.success) {
        toast.error(result.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // If verification successful and it's signup, complete the signup process
      if (type === 'signup') {
        const pendingSignup = sessionStorage.getItem('pendingSignup');
        if (!pendingSignup) {
          toast.error("Signup data not found. Please try signing up again.");
          navigate("/signup");
          return;
        }

        const signupData = JSON.parse(pendingSignup);
        
        // Complete Firebase signup
        const signupResult = await signup(signupData.email, signupData.password, {
          firstName: signupData.firstName,
          lastName: signupData.lastName,
          phone: signupData.phone,
          dateOfBirth: signupData.dateOfBirth,
          university: signupData.university,
          hostelName: signupData.hostelName,
          roomNumber: signupData.roomNumber,
          emergencyContact: signupData.emergencyContact,
          emailVerified: true
        });

        if (signupResult.success) {
          // Clean up
          sessionStorage.removeItem('pendingSignup');
          toast.success("Account created successfully! Welcome to Hostel Ledger!");
          navigate("/dashboard");
        } else {
          toast.error(signupResult.error || "Failed to create account");
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
      // Generate new code
      const newCode = resendVerificationCode(email);
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-600">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-emerald-600 font-medium">{email}</p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/50">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Verification Code
              </label>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                className="h-14 text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <Button
              type="submit"
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
          </form>

          {/* Resend Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
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
                className="w-full"
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

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Check your spam folder if you don't see the email</p>
          <p>The code expires in 10 minutes</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;