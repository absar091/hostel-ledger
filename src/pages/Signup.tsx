import { useState } from "react";
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

const Signup = () => {
  const navigate = useNavigate();
  const { signup, checkEmailExists } = useFirebaseAuth();
  const [currentView, setCurrentView] = useState<'basic' | 'password'>('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
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
      toast.loading("Checking email availability...", { id: "email-check" });
      
      const emailExists = await checkEmailExists(formData.email);
      toast.dismiss("email-check");
      
      if (emailExists) {
        toast.error("An account with this email already exists. Please use a different email or try logging in.");
        setIsLoading(false);
        return;
      }

      // Move to password step
      setCurrentView('password');
      
    } catch (error: any) {
      console.error("Email check error:", error);
      toast.error("Failed to verify email. Please try again.");
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
      
      // Step 4: Store user data for verification page
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        university: formData.university,
        password: formData.password // Store for completion after verification
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
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Hostel Ledger</h1>
          <p className="text-gray-600">Create your account</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-emerald-600">
            <CreditCard className="w-4 h-4" />
            <span>Split expenses with ease</span>
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
                    placeholder="John"
                    className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300"
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
                    placeholder="Doe"
                    className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300"
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
                  placeholder="john.doe@university.edu.pk"
                  className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300"
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
                  className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300"
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
                  className="h-12 pl-12 pr-12 border-2 focus:border-emerald-500 transition-all duration-300"
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
                  className="h-12 pl-12 pr-12 border-2 focus:border-emerald-500 transition-all duration-300"
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

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => handleInputChange('termsAccepted', checked)}
                  className="mt-1 border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="text-sm">
                  <label className="text-gray-700">
                    I agree to the{" "}
                    <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                      Terms and Conditions
                    </Link>
                  </label>
                  {errors.termsAccepted && (
                    <p className="text-red-500 text-sm mt-1">{errors.termsAccepted}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  checked={formData.privacyAccepted}
                  onCheckedChange={(checked) => handleInputChange('privacyAccepted', checked)}
                  className="mt-1 border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="text-sm">
                  <label className="text-gray-700">
                    I agree to the{" "}
                    <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                      Privacy Policy
                    </Link>
                  </label>
                  {errors.privacyAccepted && (
                    <p className="text-red-500 text-sm mt-1">{errors.privacyAccepted}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentView('basic')}
                variant="outline"
                className="flex-1 h-12"
              >
                Back
              </Button>
              
              <Button
                onClick={handleCreateAccount}
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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