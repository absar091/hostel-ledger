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
  Shield,
  Loader2,
  Sparkles,
  Heart
} from "lucide-react";
import { sendVerificationEmail } from "@/lib/email";
import { storeVerificationCode } from "@/lib/verificationStore";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { checkEmailExists } = useFirebaseAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simple form state with proper typing
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    university: "",
    termsAccepted: false,
    privacyAccepted: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Simple validation function
  const validateForm = () => {
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

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.university || formData.university.length < 2) {
      newErrors.university = "University name is required";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Check if email already exists BEFORE sending verification code
      console.log("Checking if email already exists...");
      toast.loading("Checking email availability...", { id: "email-check" });
      
      const emailExists = await checkEmailExists(formData.email);
      toast.dismiss("email-check");
      
      if (emailExists) {
        toast.error("An account with this email already exists. Please use a different email or try logging in.");
        setIsLoading(false);
        return;
      }

      // Step 2: Generate verification code
      toast.loading("Sending verification code...", { id: "sending-code" });
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Step 3: Store verification code in Firestore (without userId since user doesn't exist yet)
      await storeVerificationCode(formData.email, verificationCode, 'signup');
      
      // Step 4: Send verification email
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
      
      // Step 5: Store user data temporarily in sessionStorage (only for form data, not verification code)
      sessionStorage.setItem('pendingSignup', JSON.stringify(formData));
      
      toast.success("Verification code sent to your email!");
      navigate("/verify-email", { state: { email: formData.email, type: 'signup' } });

    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Handle specific error cases
      if (error.message?.includes('email-already-in-use') || error.message?.includes('already exists')) {
        toast.error("An account with this email already exists. Please use a different email or try logging in.");
      } else if (error.message?.includes('Failed to send verification email')) {
        toast.error("Failed to send verification email. Please check your email address and try again.");
      } else {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-10 h-10 text-white" />
            <Sparkles className="w-4 h-4 text-white absolute -top-1 -right-1 animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Join Hostel Ledger
          </h1>
          <p className="text-gray-600 text-lg">Create your account</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-emerald-600">
            <Heart className="w-4 h-4 fill-current" />
            <span>Split expenses with Ease</span>
          </div>
        </div>

        {/* Simple Form */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-100 to-emerald-100 rounded-full translate-y-12 -translate-x-12 opacity-50"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                <p className="text-gray-600">Fill in your details to get started</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="John"
                      className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Doe"
                      className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    type="email"
                    placeholder="john.doe@university.edu.pk"
                    className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Already have an account? <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">Sign in here</Link>
                </p>
              </div>

              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">University</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input
                    value={formData.university}
                    onChange={(e) => handleInputChange('university', e.target.value)}
                    placeholder="University of Punjab"
                    className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                  />
                </div>
                {errors.university && (
                  <p className="text-red-500 text-sm mt-1">{errors.university}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="h-12 pl-12 pr-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
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

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm"
                      className="h-12 pl-12 pr-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
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
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    Terms & Privacy
                  </h3>
                  
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
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Create Account
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </div>
          </form>

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
    </div>
  );
};

export default Signup;