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
  const { signup, checkEmailExists, checkUsernameAvailable, user } = useFirebaseAuth();
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
    username: "",
    email: "",
    university: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    privacyAccepted: false
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

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

    // Username validation
    const normalizedUsername = formData.username.toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!normalizedUsername || normalizedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (normalizedUsername.length > 20) {
      newErrors.username = "Username cannot exceed 20 characters";
    } else if (usernameStatus === 'taken') {
      newErrors.username = "This username is already taken";
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

    // Check username availability with debounce
    if (field === 'username' && typeof value === 'string') {
      const normalizedUsername = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
      if (normalizedUsername.length >= 3) {
        setUsernameStatus('checking');
        // Debounce the check
        const timeoutId = setTimeout(async () => {
          const isAvailable = await checkUsernameAvailable(normalizedUsername);
          setUsernameStatus(isAvailable ? 'available' : 'taken');
        }, 500);
        return () => clearTimeout(timeoutId);
      } else {
        setUsernameStatus('idle');
      }
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
        toast.error("Account already exists!", {
          description: "This email is registered. Try logging in.",
          action: {
            label: "Log In",
            onClick: () => {
              // Reset form and switch to login mode if possible, or just notify
              // Ideally navigate or change parent state. 
              // Since we are inside Signup page which is usually separate, we might need navigation.
              // Assuming this component is used where navigation is accessible.
            }
          }
        });
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
        username: formData.username.toLowerCase().replace(/[^a-z0-9._]/g, ''),
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Top Accent Border - iPhone Style */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-[#4a6850]/10 pt-4 pb-5 px-4 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="flex items-center justify-center">
          {/* App Logo and Name - Enhanced */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-7 h-7 object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
              <p className="text-sm text-[#4a6850]/80 font-bold">Split expenses with ease</p>
            </div>
          </div>
        </div>
      </div>

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

      <div className="w-full max-w-md pt-20">
        {/* Page Description */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Create Account</h2>
          <p className="text-[#4a6850]/80 font-bold text-lg">Sign up as new user to get started</p>
        </div>

        {/* Basic Information View - iPhone Style */}
        {currentView === 'basic' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Absar"
                    className="h-14 pl-12 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-2 font-bold">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ahmad Rao"
                    className="h-14 pl-12 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-2 font-bold">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  type="email"
                  placeholder="absar.ahmad.rao@aarx.online"
                  className="h-14 pl-12 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-2 font-bold">{errors.email}</p>
              )}
              <p className="text-xs text-[#4a6850]/80 mt-2 font-bold">
                Already have an account? <Link to="/login" className="text-[#4a6850] hover:text-[#3d5643] font-black underline">Sign in here</Link>
              </p>
            </div>

            {/* Username Field - Collaborative Feature */}
            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Choose Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a6850]/60 font-bold">@</span>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  placeholder="john_doe"
                  className="h-14 pl-10 pr-12 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                />
                {/* Status indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-5 h-5 text-[#4a6850] animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-2 font-bold">{errors.username}</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-green-500 text-sm mt-2 font-bold">✓ Username is available!</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-red-500 text-sm mt-2 font-bold">✗ Username is already taken</p>
              )}
              <p className="text-xs text-[#4a6850]/80 mt-2 font-bold">
                Friends will find you with this username (3-20 chars, letters, numbers, dots, underscore)
              </p>
            </div>

            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">University</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  value={formData.university}
                  onChange={(e) => handleInputChange('university', e.target.value)}
                  placeholder="University of Punjab"
                  className="h-14 pl-12 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                />
              </div>
              {errors.university && (
                <p className="text-red-500 text-sm mt-2 font-bold">{errors.university}</p>
              )}
            </div>

            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Password View - iPhone Style */}
        {currentView === 'password' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Set Your Password</h2>
              <p className="text-[#4a6850]/80 text-sm font-bold">Choose a strong password for your account</p>
            </div>

            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-14 pl-12 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a6850]/60 hover:text-[#4a6850] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-2 font-bold">{errors.password}</p>
              )}
            </div>

            {/* Password Strength Indicator - iPhone Style */}
            {formData.password && (
              <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-5 border border-[#4a6850]/20 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-black text-[#4a6850]/80 uppercase tracking-wide">Password Strength:</span>
                  <span className={`text-sm font-black px-3 py-1 rounded-2xl ${passwordStrength.strength === 'weak' ? 'bg-red-100 text-red-600' :
                    passwordStrength.strength === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                    }`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`flex items-center gap-2 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.length ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="font-bold">8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.uppercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="font-bold">Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.lowercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="font-bold">Lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.checks.numbers ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.checks.numbers ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="font-bold">Number</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                <Input
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="h-14 pl-12 pr-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a6850]/60 hover:text-[#4a6850] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-2 font-bold">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions - iPhone Style */}
            <div>
              <div className="flex items-center space-x-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                <Checkbox
                  checked={formData.termsAccepted && formData.privacyAccepted}
                  onCheckedChange={(checked) => {
                    handleInputChange('termsAccepted', checked);
                    handleInputChange('privacyAccepted', checked);
                  }}
                  className="border-2 data-[state=checked]:bg-[#4a6850] data-[state=checked]:border-[#4a6850] w-5 h-5"
                />
                <label className="text-sm text-[#4a6850]/80 cursor-pointer flex-1 font-bold">
                  I agree to the{" "}
                  <Link to="/terms" className="text-[#4a6850] hover:text-[#3d5643] font-black underline">
                    Terms & Conditions
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-[#4a6850] hover:text-[#3d5643] font-black underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {(errors.termsAccepted || errors.privacyAccepted) && (
                <p className="text-red-500 text-sm mt-2 font-bold">You must accept the terms and privacy policy to continue</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentView('basic')}
                variant="outline"
                className="h-14 px-8 rounded-3xl border-2 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/5 font-black shadow-lg hover:shadow-xl transition-all"
              >
                Back
              </Button>

              <Button
                onClick={handleCreateAccount}
                disabled={isLoading || !formData.termsAccepted || !formData.privacyAccepted}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
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

        {/* Login Link - iPhone Style */}
        <div className="text-center mt-10 pt-8 border-t border-[#4a6850]/20">
          <p className="text-[#4a6850]/80 font-bold">
            Already have an account?{" "}
            <Link to="/login" className="text-[#4a6850] hover:text-[#3d5643] font-black hover:underline transition-all">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;