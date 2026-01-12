import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Calendar, 
  GraduationCap, 
  Building, 
  Home,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Heart
} from "lucide-react";
import { 
  signupSchema, 
  type SignupFormData, 
  validatePasswordStrength, 
  checkEmailDomain,
  sanitizeInput,
  rateLimiter
} from "@/lib/validation";
import { generateVerificationCode } from "@/lib/verificationStore";
import { sendVerificationEmail } from "@/lib/email";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Updated signup schema without emergency contact
const signupSchemaWithoutEmergency = signupSchema;

type SignupFormDataWithoutEmergency = SignupFormData;

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useFirebaseAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], isStrong: false });
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger
  } = useForm<SignupFormDataWithoutEmergency>({
    resolver: zodResolver(signupSchemaWithoutEmergency),
    mode: "onChange"
  });

  const watchedPassword = watch("password");
  const watchedEmail = watch("email");

  // Update password strength in real-time
  useEffect(() => {
    if (watchedPassword) {
      const strength = validatePasswordStrength(watchedPassword);
      setPasswordStrength(strength);
    }
  }, [watchedPassword]);

  // Check email existence when email changes
  useEffect(() => {
    const checkEmailExists = async () => {
      if (watchedEmail && watchedEmail.includes('@') && watchedEmail.length > 5) {
        setIsCheckingEmail(true);
        try {
          const methods = await fetchSignInMethodsForEmail(auth, watchedEmail);
          setEmailExists(methods.length > 0);
        } catch (error) {
          console.error("Error checking email:", error);
          setEmailExists(null);
        } finally {
          setIsCheckingEmail(false);
        }
      } else {
        setEmailExists(null);
      }
    };

    const timeoutId = setTimeout(checkEmailExists, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [watchedEmail]);

  const onSubmit = async (data: SignupFormDataWithoutEmergency) => {
    // Check if email already exists
    if (emailExists) {
      toast.error("An account with this email already exists. Please try logging in instead.");
      return;
    }

    // Rate limiting check
    if (!rateLimiter.canAttempt(`signup_${data.email}`, 3, 15 * 60 * 1000)) {
      const remainingTime = rateLimiter.getRemainingTime(`signup_${data.email}`, 15 * 60 * 1000);
      const minutes = Math.ceil(remainingTime / (60 * 1000));
      toast.error(`Too many signup attempts. Please try again in ${minutes} minutes.`);
      return;
    }

    // Check email domain
    if (!checkEmailDomain(data.email)) {
      toast.error("Please use a valid educational or common email domain.");
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize inputs
      const sanitizedData = {
        ...data,
        firstName: sanitizeInput(data.firstName),
        lastName: sanitizeInput(data.lastName),
        email: data.email.toLowerCase().trim(),
        university: sanitizeInput(data.university),
        hostelName: data.hostelName ? sanitizeInput(data.hostelName) : undefined,
        roomNumber: data.roomNumber ? sanitizeInput(data.roomNumber) : undefined,
      };

      // Generate verification code
      const verificationCode = generateVerificationCode(sanitizedData.email, 'signup');
      
      // Send verification email
      const emailResult = await sendVerificationEmail(
        sanitizedData.email, 
        verificationCode, 
        `${sanitizedData.firstName} ${sanitizedData.lastName}`
      );

      if (!emailResult.success) {
        throw new Error('Failed to send verification email');
      }

      // Store user data temporarily (in production, use secure storage)
      sessionStorage.setItem('pendingSignup', JSON.stringify(sanitizedData));
      
      toast.success("Verification code sent to your email!");
      navigate("/verify-email", { state: { email: sanitizedData.email, type: 'signup' } });

    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['firstName', 'lastName', 'email', 'phone'] 
      : currentStep === 2 
      ? ['password', 'confirmPassword']
      : ['dateOfBirth', 'university', 'hostelName', 'roomNumber'];
    
    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
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
          <p className="text-gray-600 text-lg">Create your account to start managing shared expenses</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-emerald-600">
            <Heart className="w-4 h-4 fill-current" />
            <span>Trusted by 1000+ students</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step <= currentStep 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-110' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{step}</span>
                )}
                {step <= currentStep && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-ping opacity-20"></div>
                )}
              </div>
              {step < 3 && (
                <div className={`w-12 h-1 mx-3 rounded-full transition-all duration-500 ${
                  step < currentStep ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mb-8 text-xs text-gray-500">
          <span className={currentStep >= 1 ? 'text-emerald-600 font-medium' : ''}>Personal Info</span>
          <span className={currentStep >= 2 ? 'text-emerald-600 font-medium' : ''}>Security</span>
          <span className={currentStep >= 3 ? 'text-emerald-600 font-medium' : ''}>Academic Details</span>
        </div>

        {/* Form */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-100 to-emerald-100 rounded-full translate-y-12 -translate-x-12 opacity-50"></div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
                  <p className="text-gray-600">We'll need some basic information to get started</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        {...register("firstName")}
                        placeholder="John"
                        className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                        <XCircle className="w-4 h-4" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        {...register("lastName")}
                        placeholder="Doe"
                        className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                        <XCircle className="w-4 h-4" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="john.doe@university.edu.pk"
                      className="h-12 pl-12 pr-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isCheckingEmail ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : emailExists === false ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : emailExists === true ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : watchedEmail && checkEmailDomain(watchedEmail) ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : null}
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.email.message}
                    </p>
                  )}
                  {emailExists === true && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      This email is already registered. Try logging in instead.
                    </p>
                  )}
                  {emailExists === false && watchedEmail && (
                    <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Great! This email is available.
                    </p>
                  )}
                  {watchedEmail && !checkEmailDomain(watchedEmail) && !errors.email && emailExists !== true && (
                    <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Consider using an educational email for better verification
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("phone")}
                      type="tel"
                      placeholder="03XX-XXXXXXX"
                      className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Password Setup */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure your account</h2>
                  <p className="text-gray-600">Choose a strong password to protect your data</p>
                </div>
                
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
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
                  
                  {/* Enhanced Password Strength Indicator */}
                  {watchedPassword && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              passwordStrength.score <= 2 ? 'bg-red-500' :
                              passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${getPasswordStrengthColor(passwordStrength.score)}`}>
                          {getPasswordStrengthText(passwordStrength.score)}
                        </span>
                      </div>
                      
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-2 text-gray-700">💡 Tips to improve:</p>
                          <ul className="space-y-1">
                            {passwordStrength.feedback.map((feedback, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                {feedback}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
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
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Academic Information & Terms */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Academic details</h2>
                  <p className="text-gray-600">Help us personalize your experience</p>
                </div>
                
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("dateOfBirth")}
                      type="date"
                      className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">University</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      {...register("university")}
                      placeholder="University of Punjab"
                      className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                    />
                  </div>
                  {errors.university && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                      <XCircle className="w-4 h-4" />
                      {errors.university.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Hostel Name (Optional)</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        {...register("hostelName")}
                        placeholder="New Hostel"
                        className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                      />
                    </div>
                    {errors.hostelName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                        <XCircle className="w-4 h-4" />
                        {errors.hostelName.message}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Room Number (Optional)</label>
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        {...register("roomNumber")}
                        placeholder="101"
                        className="h-12 pl-12 border-2 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300"
                      />
                    </div>
                    {errors.roomNumber && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-shake">
                        <XCircle className="w-4 h-4" />
                        {errors.roomNumber.message}
                      </p>
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
                          {...register("termsAccepted")}
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
                            <p className="text-red-500 text-sm mt-1">{errors.termsAccepted.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          {...register("privacyAccepted")}
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
                            <p className="text-red-500 text-sm mt-1">{errors.privacyAccepted.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          {...register("marketingEmails")}
                          className="mt-1 border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <label className="text-sm text-gray-700">
                          I want to receive updates and tips about expense management (optional)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-6">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 h-12 border-2 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-300"
                >
                  Previous
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={emailExists === true}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="flex items-center gap-2">
                    Next Step
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-xs">→</span>
                    </div>
                  </span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !isValid || emailExists === true}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
              )}
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