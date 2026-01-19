import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { validatePasswordStrength } from "@/lib/validation";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const ResetPassword = () => {
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
      toast.error("Invalid password reset link. Please request a new password reset.");
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
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
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
        toast.success("Password reset successfully! You can now sign in with your new password.");
        navigate("/login");
      } else {
        toast.error(result.error || "Failed to reset password. Please try again.");
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
    if (score <= 2) return "Weak";
    if (score <= 4) return "Medium";
    return "Strong";
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 text-center animate-fade-in">
          <img 
            src="/only-logo.png" 
            alt="Hostel Ledger Logo" 
            className="w-40 h-40 mx-auto object-contain opacity-90 mb-6"
            loading="eager"
            fetchpriority="high"
            width="160"
            height="160"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-2">Hostel Ledger</h1>
            <p className="text-gray-500 text-lg">Split expenses with ease</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-slide-up">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600">Create a new password for your account</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score <= 2 ? 'bg-red-500' :
                        passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pl-12 pr-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-2">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-red-500" />
                    <span className="text-xs text-red-600">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !passwordStrength.isStrong || password !== confirmPassword}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
          >
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>

        {/* Back to login link */}
        <p className="mt-8 text-center text-gray-500 animate-fade-in">
          Remember your password?{" "}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;