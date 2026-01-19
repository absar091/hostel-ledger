import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Wallet } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Welcome back!");
      console.log(" LOGIN SUCCESS - Login result:", result);
      console.log(" LOGIN SUCCESS - Should redirect now...");
    } else {
      toast.error(result.error || "Login failed");
      console.log(" LOGIN FAILED - Error:", result.error);
    }
  };

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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 bg-white/80 border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300"
                autoComplete="current-password"
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

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="mt-8 text-center text-gray-500 animate-fade-in">
          Don't have an account?{" "}
          <Link to="/signup" className="text-emerald-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>

        {/* Forgot password link */}
        <p className="mt-4 text-center text-gray-500 animate-fade-in">
          <Link to="/forgot-password" className="text-emerald-600 font-medium hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
