import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  UserCheck,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
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

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useFirebaseAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], isStrong: false });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange"
  });

  const watchedPassword = watch("password");
  const watchedEmail = watch("email");

  // Update password strength in real-time
  useState(() => {
    if (watchedPassword) {
      const strength = validatePasswordStrength(watchedPassword);
      setPasswordStrength(strength);
    }
  }, [watchedPassword]);

  const onSubmit = async (data: SignupFormData) => {
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
        emergencyContact: {
          name: sanitizeInput(data.emergencyContact.name),
          phone: data.emergencyContact.phone.trim(),
          relation: sanitizeInput(data.emergencyContact.relation)
        }
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
    if (isStepValid) {
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Hostel Ledger</h1>
          <p className="text-gray-600">Create your account to start managing shared expenses</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step <= currentStep 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-8 h-1 mx-2 ${
                  step < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        {...register("firstName")}
                        placeholder="John"
                        className="h-12 pl-12"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        {...register("lastName")}
                        placeholder="Doe"
                        className="h-12 pl-12"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="john.doe@university.edu.pk"
                      className="h-12 pl-12"
                    />
                    {watchedEmail && checkEmailDomain(watchedEmail) && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.email.message}
                    </p>
                  )}
                  {watchedEmail && !checkEmailDomain(watchedEmail) && !errors.email && (
                    <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Consider using an educational email for better verification
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("phone")}
                      type="tel"
                      placeholder="03XX-XXXXXXX"
                      className="h-12 pl-12"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Password Setup */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Secure Your Account</h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className="h-12 pl-12 pr-12"
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
                  {watchedPassword && (
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
                        <span className={`text-sm font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                          {getPasswordStrengthText(passwordStrength.score)}
                        </span>
                      </div>
                      
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-1">To improve your password:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {passwordStrength.feedback.map((feedback, index) => (
                              <li key={index}>{feedback}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="h-12 pl-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Academic Information */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Academic & Hostel Details</h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("dateOfBirth")}
                      type="date"
                      className="h-12 pl-12"
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">University</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("university")}
                      placeholder="University of Punjab"
                      className="h-12 pl-12"
                    />
                  </div>
                  {errors.university && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.university.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Hostel Name (Optional)</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        {...register("hostelName")}
                        placeholder="New Hostel"
                        className="h-12 pl-12"
                      />
                    </div>
                    {errors.hostelName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.hostelName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Room Number (Optional)</label>
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        {...register("roomNumber")}
                        placeholder="101"
                        className="h-12 pl-12"
                      />
                    </div>
                    {errors.roomNumber && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.roomNumber.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Emergency Contact & Terms */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact & Terms</h2>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Emergency Contact Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register("emergencyContact.name")}
                      placeholder="Parent/Guardian Name"
                      className="h-12 pl-12"
                    />
                  </div>
                  {errors.emergencyContact?.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {errors.emergencyContact.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Emergency Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        {...register("emergencyContact.phone")}
                        type="tel"
                        placeholder="03XX-XXXXXXX"
                        className="h-12 pl-12"
                      />
                    </div>
                    {errors.emergencyContact?.phone && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.emergencyContact.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Relation</label>
                    <Select onValueChange={(value) => setValue("emergencyContact.relation", value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.emergencyContact?.relation && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {errors.emergencyContact.relation.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      {...register("termsAccepted")}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <label className="text-gray-700">
                        I agree to the{" "}
                        <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium">
                          Terms and Conditions
                        </Link>
                      </label>
                      {errors.termsAccepted && (
                        <p className="text-red-500 text-sm mt-1">{
errors.termsAccepted.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      {...register("privacyAccepted")}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <label className="text-gray-700">
                        I agree to the{" "}
                        <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium">
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
                      className="mt-1"
                    />
                    <label className="text-sm text-gray-700">
                      I want to receive updates and tips about expense management (optional)
                    </label>
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
                  className="flex-1 h-12"
                >
                  Previous
                </Button>
              )}
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !isValid}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Create Account
                    </div>
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
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