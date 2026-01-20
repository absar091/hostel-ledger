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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        {/* iPhone-style top accent border */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
        
        <div className="text-center">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="bg-white border-b border-[#4a6850]/10 pt-4 pb-5 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
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
      
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Form - iPhone Style */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Reset Password</h2>
            <p className="text-[#4a6850]/80 font-bold">Create a new password for your account</p>
          </div>

          <div>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">New Password</label>
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
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator - iPhone Style */}
            {password && (
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score <= 2 ? 'bg-red-500' :
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
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Confirm New Password</label>
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
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Match Indicator - iPhone Style */}
            {confirmPassword && (
              <div className="mt-3 flex items-center gap-3">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#4a6850]" />
                    <span className="text-xs text-[#4a6850] font-black">Passwords match</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-red-500" />
                    <span className="text-xs text-red-600 font-black">Passwords don't match</span>
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
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>

        {/* Back to login link - iPhone Style */}
        <p className="mt-8 text-center text-[#4a6850]/80 animate-fade-in font-bold">
          Remember your password?{" "}
          <Link to="/login" className="text-[#4a6850] font-black hover:underline transition-all">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;