import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Wallet, User, Phone } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useFirebaseAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const result = await signup({ email, password, name, phone: phone || undefined });
    setIsLoading(false);

    if (result.success) {
      toast.success("Account created successfully!");
      navigate("/");
    } else {
      toast.error(result.error || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1 text-sm">Join Hostel Wallet today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Full Name *</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 pl-12 bg-white/70 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Email *</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-12 bg-white/70 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-400"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Phone Number (optional)</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                placeholder="03XX-XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 pl-12 bg-white/70 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Password *</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 bg-white/70 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pl-12 bg-white/70 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg" 
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-gray-500 animate-fade-in">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
