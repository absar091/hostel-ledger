import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { sendPasswordResetEmail, checkEmailExists } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      // Check if email exists in our system
      toast.loading("Checking email...", { id: "email-check" });
      const emailExists = await checkEmailExists(email);
      toast.dismiss("email-check");

      if (!emailExists) {
        toast.error("No account found with this email address");
        setIsLoading(false);
        return;
      }

      // Use Firebase's built-in password reset
      const result = await sendPasswordResetEmail(email);
      
      if (result.success) {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to send reset email. Please try again.");
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Success State */}
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
              We've sent password reset instructions to
            </p>
            <p className="text-emerald-600 font-medium mt-1">{email}</p>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900">Email Sent!</h3>
              
              <p className="text-gray-600">
                Click the link in your email to reset your password.
              </p>

              <div className="bg-gray-50 border border-emarld-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-emarld-800">
                  <strong>Don't Forget To</strong>
                  <br />
                   Check your spam folder if you don't see it within a few minutes.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="flex-1 h-12"
                >
                  Try Different Email
                </Button>
                
                <Button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Forgot Password?</h2>
          <p className="text-gray-600">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Reset Instructions
                </div>
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Remember your password? <Link to="/login" className="text-emerald-600 hover:underline font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;