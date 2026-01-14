import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storeVerificationCode } from "@/lib/verificationStore";
import { sendVerificationEmail } from "@/lib/email";

/**
 * EmailVerificationGate - Blocks unverified users from accessing the app
 * This prevents fake users and database pollution
 */
const EmailVerificationGate = ({ children }: { children: React.ReactNode }) => {
  const { user, firebaseUser, logout } = useFirebaseAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Check if user email is verified
  const isEmailVerified = user?.emailVerified === true;

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before resending`);
      return;
    }

    setIsResending(true);

    try {
      // Generate a fresh verification code (not resend, since user might not have one)
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code
      await storeVerificationCode(user.email, newCode, 'signup', user.uid);
      
      // Send verification email
      const emailResult = await sendVerificationEmail(
        user.email, 
        newCode, 
        user.name || "User"
      );
      
      if (emailResult.success) {
        toast.success("Verification code sent! Check your email.");
        setCooldown(60); // 60 second cooldown
        navigate("/verify-email", { state: { email: user.email, type: 'signup' } });
      } else {
        toast.error("Failed to send verification email");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to send verification code");
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // If email is verified, render the app
  if (isEmailVerified) {
    return <>{children}</>;
  }

  // If not verified, show verification required screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/only-logo.png" 
            alt="Hostel Ledger Logo" 
            className="w-32 h-32 mx-auto object-contain opacity-90 mb-4"
          />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Verification Required</h2>
          <p className="text-gray-600">
            Please verify your email to access Hostel Ledger
          </p>
        </div>

        {/* Verification Required Card */}
        <div className="space-y-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-yellow-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Verify Your Email Address
            </h3>
            
            <p className="text-gray-600 mb-4">
              We sent a verification code to:
            </p>
            <p className="text-emerald-600 font-medium mb-4">{user?.email}</p>
            
            <p className="text-sm text-gray-500 mb-6">
              You must verify your email before you can create groups, add expenses, or use any features. 
              This helps us prevent fake accounts and keep your data secure.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending || cooldown > 0}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {isResending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </div>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Resend Verification Code
                  </div>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full h-12 border-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            <p>Check your spam folder if you don't see the email</p>
            <p className="mt-1">Need help? Contact support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationGate;
