import { useState } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";

const TwoFactorVerification = () => {
  const { verify2FA, logout } = useFirebaseAuth();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || token.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verify2FA(token);
      if (result.success) {
        toast.success("Verified successfully");
      } else {
        toast.error(result.error || "Verification failed");
        setToken("");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
            <Shield className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-gray-500">
            Your account is protected with 2FA. Please enter the code from your authenticator app to continue.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              className="pl-10 text-center text-2xl tracking-widest h-14 font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || token.length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="text-sm">
          <button
            onClick={() => logout()}
            className="text-gray-400 hover:text-gray-600 underline"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
