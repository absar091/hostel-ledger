import React, { useState } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, HelpCircle, LogOut, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

const TwoFactorVerification = () => {
  const { verify2FA, logout } = useFirebaseAuth();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTrusted, setIsTrusted] = useState(true);
  const navigate = useNavigate();

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!token || token.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const result = await verify2FA(token, isTrusted, deviceInfo);
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
    // Changed root container to full screen, removed fixed overlay and Card
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">

      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-[#4a6850]/10 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-[#4a6850]" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Two-Factor Authentication</h1>
          <p className="text-base text-[#4a6850]/80 font-bold max-w-xs mx-auto">
            Enter the 6-digit code from your authenticator app to verify your identity.
          </p>
        </div>

        {/* Input Section */}
        <div className="w-full space-y-8">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={token}
              onChange={(val) => {
                setToken(val);
                if (val.length === 6) {
                  // Allow auto-submit logic if needed
                }
              }}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="w-12 h-14 text-2xl font-black border-2 border-[#4a6850]/20 rounded-2xl focus:border-[#4a6850] focus:ring-4 focus:ring-[#4a6850]/10 transition-all bg-gray-50/50"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center space-x-3 justify-center bg-[#4a6850]/5 p-4 rounded-2xl border border-[#4a6850]/10">
            <Checkbox
              id="trust-device"
              checked={isTrusted}
              onCheckedChange={(checked) => setIsTrusted(checked as boolean)}
              className="border-2 border-[#4a6850]/50 data-[state=checked]:bg-[#4a6850] data-[state=checked]:border-[#4a6850] rounded-lg w-5 h-5"
            />
            <Label htmlFor="trust-device" className="text-sm font-bold text-[#4a6850] cursor-pointer">
              Trust this device for 30 days
            </Label>
          </div>

          <Button
            className="w-full h-14 text-lg font-black rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
            onClick={() => handleVerify()}
            disabled={isLoading || token.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify Identity"
            )}
          </Button>
        </div>

        {/* Footer Section */}
        <div className="w-full pt-8 flex flex-col items-center gap-4 border-t border-[#4a6850]/10">
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              variant="outline"
              onClick={() => navigate('/recover-account')}
              className="h-12 rounded-2xl border-2 border-[#4a6850]/20 text-[#4a6850] font-bold hover:bg-[#4a6850]/5 hover:text-[#4a6850]"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Recover
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-12 rounded-2xl text-[#4a6850]/70 font-bold hover:bg-[#4a6850]/10 hover:text-[#4a6850]"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">Open your Google Authenticator or Authy app to find the code.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button
            variant="link"
            size="sm"
            onClick={() => logout()}
            className="text-gray-400 hover:text-red-500 font-bold transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out and try with another account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;