import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  GraduationCap, 
  Loader2,
  ArrowRight,
  Check,
  X,
  CreditCard
} from "lucide-react";
import { sendVerificationEmail } from "@/lib/email";
import { storeVerificationCode } from "@/lib/verificationStore";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, checkEmailExists, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [currentView, setCurrentView] = useState<'basic' | 'password'>('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    university: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    privacyAccepted: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shouldShowPageGuide('signup')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('signup');
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.values(checks).forEach(check => check && score++);
    
    return {
      score,
      checks,
      strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  // Validation functions
  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName || formData.firstName.length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    if (!formData.lastName || formData.lastName.length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.university || formData.university.length < 2) {
      newErrors.university = "University name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = "You must accept the terms and conditions";
    }

    if (!formData.privacyAccepted) {
      newErrors.privacyAccepted = "You must accept the privacy policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContinue = async () => {
    if (!validateBasicInfo()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      // Check if email already exists
      console.log('🔍 Checking email availability for:', formData.email);
      toast.loading("Checking email availability...", { id: "email-check" });
      
      const emailExists = await checkEmailExists(formData.email);
      toast.dismiss("email-check");
      
      if (emailExists) {
        console.log('❌ Email already exists:', formData.email);
        toast.error("An account with this email already exists. Please use a different email or try logging in.");
        setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
        setIsLoading(false);
        return;
      }

      console.log('✅ Email is available, proceeding to password step');
      toast.success("Email is available! Please set your password.");
      
      // Move to password step
      setCurrentView('password');
      
    } catch (error: any) {
      console.error("❌ Email check error:", error);
      toast.dismiss("email-check");
      toast.error("Failed to verify email availability. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validatePassword()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create Firebase user immediately (with emailVerified: false)
      console.log('🔍 Creating user account...');
      const signupResult = await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        university: formData.university,
        emailVerified: false // Mark as unverified initially
      });

      if (!signupResult.success) {
        throw new Error(signupResult.error || 'Failed to create account');
      }

      // Step 2: Generate and store verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await storeVerificationCode(formData.email, verificationCode, 'signup');
      
      // Step 3: Send verification email
      toast.loading("Sending verification code...", { id: "sending-code" });
      const emailResult = await sendVerificationEmail(
        formData.email, 
        verificationCode, 
        `${formData.firstName} ${formData.lastName}`
      );

      if (!emailResult.success) {
        toast.dismiss("sending-code");
        throw new Error('Failed to send verification email');
      }

      toast.dismiss("sending-code");
      
      // Step 4: Store minimal user data for verification page (NO PASSWORD!)
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        university: formData.university,
        isNewUser: true // Mark as new user for download page
        // NEVER store password in browser storage - it's already in Firebase Auth
      }));
      
      toast.success("Account created! Please check your email for verification code.");
      navigate("/verify-email", { state: { email: formData.email, type: 'signup' } });

    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.message?.includes('email-already-in-use') || error.message?.includes('already exists')) {
        toast.error("An account with this email already exists. Please try logging in instead.");
      } else if (error.message?.includes('admin-restricted-operation')) {
        toast.error("Account creation is currently disabled. Please contact support.");
      } else {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      {/* Page Guide */}
      <PageGuide
        title="Create Your Account 🚀"
        description="Join Hostel Ledger to start tracking shared expenses with your roommates and friends."
        tips={[
          "Fill in your basic information first, then set a secure password",
          "Use your real name so friends can easily find and add you",
          "Choose a strong password with uppercase, lowercase, numbers, and symbols"
        ]}
        emoji="📝"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-8">
            <img 
              src="/only-logo.png" 
              alt="Hostel Ledger Logo" 
              className="w-32 h-32 mx-auto object-contain opacity-90 mb-4"
              loading="eager"
              fetchpriority="high"
              width="128"
              height="128"
            />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join Hostel Ledger</h2>
            <p className="text-gray-600">Create your account</p>
          </div>
        </div>

        {/* Basic Information View */}
        {currentView === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Absar"
                    className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ahmad Rao"
                    className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  type="email"
                  placeholder="absar.ahmad.rao@aarx.online"
                  className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Already have an account? <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">Sign in here</Link>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">University</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.university}
                  onChange={(e) => handleInputChange('university', e.target.value)}
                  placeholder="University of Punjab"
                  className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                />
              </div>
              {errors.university && (
                <p className="text-red-500 text-sm mt-1">{errors.university}</p>
              )}
            </div>

            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Password View */}
        {currentView === 'password' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Set Your Password</h2>
              <p className="text-gray-600 text-sm">Choose a strong password for your account</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-12 pl-12 pr-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Password Strength:</span>
                  <span className={`text-sm font-medium ${
                    passwordStrength.strength === 'weak' ? 'text-red-500' :
                    passwordStrength.strength === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Uppercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Lowercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.checks.numbers ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.numbers ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Number
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="h-12 pl-12 pr-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions - Single Line */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <Checkbox 
                  checked={formData.termsAccepted && formData.privacyAccepted}
                  onCheckedChange={(checked) => {
                    handleInputChange('termsAccepted', checked);
                    handleInputChange('privacyAccepted', checked);
                  }}
                  className="border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <label className="text-sm text-gray-700 cursor-pointer flex-1">
                  I agree to the{" "}
                  <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    Terms & Conditions
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {(errors.termsAccepted || errors.privacyAccepted) && (
                <p className="text-red-500 text-sm">You must accept the terms and privacy policy to continue</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentView('basic')}
                variant="outline"
                className="h-12 px-6 border-2 text-gray-600 hover:bg-gray-50"
              >
                Back
              </Button>
              
              <Button
                onClick={handleCreateAccount}
                disabled={isLoading || !formData.termsAccepted || !formData.privacyAccepted}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Login Link */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-all duration-300">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;